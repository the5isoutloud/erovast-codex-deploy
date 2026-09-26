#!/usr/bin/env python3
"""
Read Discord channels (campaign-info and player-introductions) for the Erovast
campaign. Downloads images, extracts NPC name spellings, and cross-references
with session dates.

Usage:
    source venv/bin/activate && python3 scripts/discord_reader.py [--download-images] [--post]

Options:
    --download-images  Download image attachments to Erovast Vault/Attachments/
    --post             Allow posting clarification questions and ✅ reactions
    --since YYYY-MM-DD Only read messages after this date (ISO)
    --channel NAME     Which channel to read: campaign-info, player-intro, or both (default: both)

Output: JSON with messages, images, and NPC name references.
"""
import os
import sys
import json
import re
import urllib.request
from datetime import datetime, timezone, timedelta

DISCORD_TOKEN = os.environ.get("DISCORD_BOT_TOKEN", "")
GUILD_ID = os.environ.get("DISCORD_GUILD_ID", "1491190889480192152")
CHANNEL_CAMPAIGN_INFO = "1491236961992835154"
CHANNEL_PLAYER_INTRO = "1493783273623519352"

# Also try reading from Hermes .env
if not DISCORD_TOKEN:
    for env_path in [
        os.path.expanduser("~/.hermes/.env"),
        os.path.expanduser("~/profiles/erovast-scribe/.env"),
        os.path.expanduser("/opt/data/profiles/erovast-scribe/.env"),
    ]:
        if os.path.exists(env_path):
            with open(env_path) as f:
                for line in f:
                    if line.startswith("DISCORD_BOT_TOKEN="):
                        DISCORD_TOKEN = line.split("=", 1)[1].strip()

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ATTACHMENTS_DIR = os.path.join(REPO_ROOT, "Erovast Vault", "Attachments")
API_BASE = "https://discord.com/api/v10"


import subprocess

def api_get(path):
    """Make a Discord API GET request."""
    result = subprocess.run(
        ["curl", "-s", "-H", f"Authorization: Bot {DISCORD_TOKEN}",
         f"{API_BASE}{path}"],
        capture_output=True, text=True,
    )
    return json.loads(result.stdout)

def api_post(path, data):
    """Make a Discord API POST request."""
    body = json.dumps(data)
    result = subprocess.run(
        ["curl", "-s", "-X", "POST",
         "-H", f"Authorization: Bot {DISCORD_TOKEN}",
         "-H", "Content-Type: application/json",
         "-d", body,
         f"{API_BASE}{path}"],
        capture_output=True, text=True,
    )
    return json.loads(result.stdout)

def api_put(path, data=None):
    """Make a Discord API PUT request."""
    body = json.dumps(data) if data else "{}"
    result = subprocess.run(
        ["curl", "-s", "-X", "PUT",
         "-H", f"Authorization: Bot {DISCORD_TOKEN}",
         "-H", "Content-Type: application/json",
         "-d", body,
         f"{API_BASE}{path}"],
        capture_output=True, text=True,
    )
    return result.stdout


def fetch_messages(channel_id, limit=100, before=None, after=None):
    """Fetch messages from a channel, paginating if needed."""
    messages = []
    params = f"?limit={min(limit, 100)}"
    if before:
        params += f"&before={before}"
    if after:
        params += f"&after={after}"

    batch = api_get(f"/channels/{channel_id}/messages{params}")
    messages.extend(batch)

    # If we got 100 messages, there might be more
    while len(batch) == 100 and len(messages) < limit:
        before = batch[-1]["id"]
        params = f"?limit=100&before={before}"
        if after:
            params += f"&after={after}"
        batch = api_get(f"/channels/{channel_id}/messages{params}")
        if not batch:
            break
        messages.extend(batch)

    return messages


def parse_timestamp(ts_str):
    """Parse ISO 8601 timestamp from Discord."""
    return datetime.fromisoformat(ts_str.replace("Z", "+00:00"))


def download_attachment(url, filename, message_id=None):
    """Download an attachment to the vault's Attachments folder.

    If a file with the same name already exists, prefix with the message ID
    to avoid overwriting different images that share Discord's generic 'content.png' name.
    """
    os.makedirs(ATTACHMENTS_DIR, exist_ok=True)
    out_path = os.path.join(ATTACHMENTS_DIR, filename)

    # If the file already exists and it's a different image, prefix with message ID
    if os.path.exists(out_path) and message_id:
        name, ext = os.path.splitext(filename)
        out_path = os.path.join(ATTACHMENTS_DIR, f"{name}_{message_id}{ext}")

    result = subprocess.run(
        ["curl", "-s", "-o", out_path, url],
        capture_output=True,
    )
    if result.returncode == 0:
        size = os.path.getsize(out_path)
        return os.path.basename(out_path), size
    raise Exception(f"curl failed: {result.stderr}")


def extract_npc_names(text):
    """Extract potential NPC names from DM messages.

    The DM often posts NPC names as standalone lines or with brief descriptions.
    """
    names = []
    # Patterns: "House X", "Father X", "Ser X", "Captain X", "Sir X", "Lady X",
    # or Title Case names on their own lines
    patterns = [
        r"(?:House|Father|Ser|Captain|Sir|Lady|Duke|Duchess|Lord)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)",
        r"^\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s*$",  # standalone Title Case lines
    ]
    for pattern in patterns:
        for m in re.finditer(pattern, text, re.MULTILINE):
            name = m.group(1) if m.lastindex else m.group(0)
            if len(name) > 3 and name not in str(names):
                names.append(name.strip())
    return names


def match_to_session(timestamp, session_dates):
    """Match a Discord message timestamp to a session date (YYYY.MM.DD).

    Sessions are evening US time, so UTC date is often the next day.
    """
    ts_date = timestamp.strftime("%Y.%m.%d")
    prev_date = (timestamp - timedelta(days=1)).strftime("%Y.%m.%d")

    if ts_date in session_dates:
        return ts_date
    if prev_date in session_dates:
        return prev_date
    return None


def add_reaction(channel_id, message_id, emoji):
    """Add a reaction to a message."""
    try:
        api_put(f"/channels/{channel_id}/messages/{message_id}/reactions/{emoji}/@me")
        return True
    except Exception as e:
        print(f"Failed to add reaction: {e}", file=sys.stderr)
        return False


def send_message(channel_id, content):
    """Send a message to a channel."""
    try:
        result = api_post(f"/channels/{channel_id}/messages", {"content": content})
        return result.get("id")
    except Exception as e:
        print(f"Failed to send message: {e}", file=sys.stderr)
        return None


def main():
    download_images = "--download-images" in sys.argv
    can_post = "--post" in sys.argv
    since_date = None
    channel_filter = "both"

    for i, arg in enumerate(sys.argv):
        if arg == "--since" and i + 1 < len(sys.argv):
            since_date = sys.argv[i + 1]
        if arg == "--channel" and i + 1 < len(sys.argv):
            channel_filter = sys.argv[i + 1]

    if not DISCORD_TOKEN:
        print(json.dumps({"error": "No DISCORD_BOT_TOKEN found"}))
        sys.exit(1)

    # Known session dates from the vault
    session_dates = set()
    log_dir = os.path.join(REPO_ROOT, "Erovast Vault", "00 - Campaign Log")
    if os.path.isdir(log_dir):
        for f in os.listdir(log_dir):
            m = re.match(r"(\d{4}\.\d{2}\.\d{2})\.md$", f)
            if m:
                session_dates.add(m.group(1))

    channels = {}
    if channel_filter in ("campaign-info", "both"):
        channels["campaign-info"] = CHANNEL_CAMPAIGN_INFO
    if channel_filter in ("player-intro", "both"):
        channels["player-introductions"] = CHANNEL_PLAYER_INTRO

    all_results = {}
    for ch_name, ch_id in channels.items():
        msgs = fetch_messages(ch_id, limit=500)

        # Filter by date if --since is given
        if since_date:
            since_dt = datetime.fromisoformat(since_date + "T00:00:00+00:00")
            msgs = [m for m in msgs if parse_timestamp(m["timestamp"]) >= since_dt]

        processed = []
        images_downloaded = []
        npc_names = []

        for m in msgs:
            ts = parse_timestamp(m["timestamp"])
            author = m["author"]["username"]
            content = m.get("content", "")
            attachments = m.get("attachments", [])
            session_match = match_to_session(ts, session_dates)

            # Download image attachments
            for att in attachments:
                content_type = att.get("content_type", "")
                if content_type.startswith("image/") or att["filename"].lower().endswith(
                    (".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg")
                ):
                    if download_images:
                        try:
                            saved_name, size = download_attachment(att["url"], att["filename"], m["id"])
                            images_downloaded.append({
                                "filename": saved_name,
                                "original_filename": att["filename"],
                                "size_bytes": size,
                                "discord_url": att["url"],
                            })
                        except Exception as e:
                            print(f"Failed to download {att['filename']}: {e}", file=sys.stderr)
                    else:
                        images_downloaded.append({
                            "filename": att["filename"],
                            "discord_url": att["url"],
                            "width": att.get("width"),
                            "height": att.get("height"),
                        })

            # Extract NPC names from DM messages
            if author in ("kingb00my", "KINGBOOMY"):
                names = extract_npc_names(content)
                if names:
                    npc_names.extend(names)

            processed.append({
                "timestamp": m["timestamp"],
                "author": author,
                "content": content,
                "session_match": session_match,
                "has_attachments": len(attachments) > 0,
                "attachment_filenames": [a["filename"] for a in attachments],
                "message_id": m["id"],
            })

        all_results[ch_name] = {
            "message_count": len(processed),
            "messages": processed,
            "images": images_downloaded,
            "npc_names_mentioned": list(set(npc_names)),
            "session_matches": [m for m in processed if m["session_match"]],
        }

    output = {
        "channels": all_results,
        "known_session_dates": list(session_dates),
        "images_count": sum(len(r["images"]) for r in all_results.values()),
        "npc_names_found": list(set(
            n for r in all_results.values() for n in r["npc_names_mentioned"]
        )),
    }

    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()

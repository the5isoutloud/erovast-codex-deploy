#!/usr/bin/env python3
"""
Monitor Dropbox /Apps/CraigChat for new Craig recordings.
Downloads the zip, extracts the transcript, and saves it to the vault.

Usage:
    source venv/bin/activate && python3 scripts/dropbox_monitor.py [--dry-run]

Outputs JSON describing what was found and what was done, so the cron job
agent can decide whether to run the full scribe workflow.
"""
import dropbox
import zipfile
import os
import re
import sys
import json
import tempfile
from datetime import datetime, timezone, timedelta

# Dropbox credentials
APP_KEY = os.environ.get("DROPBOX_APP_KEY", "")
APP_SECRET = os.environ.get("DROPBOX_APP_SECRET", "")
REFRESH_TOKEN = os.environ.get("DROPBOX_REFRESH_TOKEN", "")

# Also try reading from the Hermes .env file if env vars aren't set
if not REFRESH_TOKEN:
    env_path = os.path.expanduser("~/.hermes/.env")
    if not os.path.exists(env_path):
        env_path = os.path.expanduser("~/profiles/erovast-scribe/.env")
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                if line.startswith("DROPBOX_REFRESH_TOKEN="):
                    REFRESH_TOKEN = line.split("=", 1)[1].strip()
                elif line.startswith("DROPBOX_APP_KEY="):
                    APP_KEY = line.split("=", 1)[1].strip()
                elif line.startswith("DROPBOX_APP_SECRET="):
                    APP_SECRET = line.split("=", 1)[1].strip()

DROPBOX_PATH = "/Apps/CraigChat"
VAULT_TRANSCRIPTS = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "Erovast Vault", "00 - Campaign Log", "Transcripts"
)
VAULT_LOGS = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "Erovast Vault", "00 - Campaign Log"
)

# Craig filenames have timestamps in UTC. Sessions are evening US time,
# so the UTC date is often the next day. We map by comparing the first line
# of the transcript to existing ones, or by the date being close.
# Existing vault sessions (YYYY.MM.DD format):
# 2026.05.05, 2026.05.12, 2026.05.19, 2026.06.02, 2026.06.11,
# 2026.06.23, 2026.07.14, 2026.08.11, 2026.08.18, 2026.08.25,
# 2026.09.08, 2026.09.15, 2026.09.22


def parse_craig_date(filename):
    """Extract the date from a Craig filename like craig_VNqXLozOEBy3_2026-9-23_0-41-50.aac.zip"""
    m = re.search(r"(\d{4})-(\d{1,2})-(\d{1,2})", filename)
    if not m:
        return None
    return int(m.group(1)), int(m.group(2)), int(m.group(3))


def get_existing_transcripts():
    """Return set of existing transcript basenames in the vault."""
    existing = set()
    if os.path.isdir(VAULT_TRANSCRIPTS):
        for f in os.listdir(VAULT_TRANSCRIPTS):
            if f.endswith(".md"):
                existing.add(f)
    return existing


def get_existing_logs():
    """Return set of existing session log dates (YYYY.MM.DD) in the vault."""
    logs = set()
    if os.path.isdir(VAULT_LOGS):
        for f in os.listdir(VAULT_LOGS):
            m = re.match(r"(\d{4}\.\d{2}\.\d{2})\.md$", f)
            if m:
                logs.add(m.group(1))
    return logs


def find_matching_transcript(existing, craig_date):
    """Check if a transcript matching this Craig date already exists."""
    if not craig_date:
        return None
    year, month, day = craig_date
    # The session date is usually the UTC date minus 1 (evening US = next day UTC)
    # Check both the same day and the previous day
    for offset in [0, -1]:
        d = datetime(year, month, day, tzinfo=timezone.utc) + timedelta(days=offset)
        candidate = f"{d.year:04}.{d.month:02}.{d.day:02} - Transcript.md"
        if candidate in existing:
            return candidate
        # Also check without zero-padding
        candidate2 = f"{d.year}.{d.month:02}.{d.day:02} - Transcript.md"
        if candidate2 in existing:
            return candidate2
    return None


def format_transcript(content, craig_date, filename):
    """Format the raw transcript text into the vault's markdown format.

    Matches the existing transcript frontmatter format:
      ---
      cssclasses:
        - wide-page
        - wide-backlinks
      dateCreated: YYYY-MM-DD
      Kristofer: Odine
      KINGBOOMY: GM
      Phauxtographer: Cassian
      DigitalARG: Azrith
      ƤΔŘŽƗVΔŁ: Aldric
      ---

    The speaker map is constant across all existing transcripts.
    """
    year, month, day = craig_date

    # Determine the session date by checking if a session log already exists
    # Craig timestamps are UTC; sessions are evening US time, so the vault
    # date is usually the day before the UTC date.
    existing_logs = get_existing_logs()
    session_date = None
    for offset in [0, -1]:
        test_date = datetime(year, month, day, tzinfo=timezone.utc) + timedelta(days=offset)
        test_str = f"{test_date.year:04}.{test_date.month:02}.{test_date.day:02}"
        if test_str in existing_logs:
            session_date = test_str
            break

    if not session_date:
        # Default: use the previous day (UTC → US evening)
        prev = datetime(year, month, day, tzinfo=timezone.utc) - timedelta(days=1)
        session_date = f"{prev.year:04}.{prev.month:02}.{prev.day:02}"

    # Convert session_date (YYYY.MM.DD) to YYYY-MM-DD for dateCreated
    date_created = f"{session_date[:4]}-{session_date[5:7]}-{session_date[8:10]}"

    # Build frontmatter matching the existing transcript format exactly.
    # The speaker map is constant across all existing transcripts.
    header = (
        "---\n"
        "cssclasses:\n"
        "  - wide-page\n"
        "  - wide-backlinks\n"
        f"dateCreated: {date_created}\n"
        "Kristofer: Odine\n"
        "KINGBOOMY: GM\n"
        "Phauxtographer: Cassian\n"
        "DigitalARG: Azrith\n"
        "ƤΔŘŽƗVΔŁ: Aldric\n"
        "---\n\n"
    )

    return header, session_date, content


def main():
    dry_run = "--dry-run" in sys.argv

    if not REFRESH_TOKEN:
        print(json.dumps({"error": "No DROPBOX_REFRESH_TOKEN found"}))
        sys.exit(1)

    dbx = dropbox.Dropbox(
        oauth2_refresh_token=REFRESH_TOKEN,
        app_key=APP_KEY,
        app_secret=APP_SECRET,
    )

    # List all Craig recordings
    result = dbx.files_list_folder(DROPBOX_PATH)
    recordings = list(result.entries)
    while result.has_more:
        result = dbx.files_list_folder_continue(result.cursor)
        recordings.extend(result.entries)

    existing_transcripts = get_existing_transcripts()
    existing_logs = get_existing_logs()

    new_transcripts = []
    already_processed = []

    for rec in recordings:
        craig_date = parse_craig_date(rec.name)
        if not craig_date:
            continue

        # Check if this recording's transcript already exists in the vault
        match = find_matching_transcript(existing_transcripts, craig_date)
        if match:
            already_processed.append({
                "dropbox_file": rec.name,
                "vault_transcript": match,
            })
            continue

        # This is a new recording!
        new_transcripts.append({
            "dropbox_file": rec.name,
            "dropbox_path": rec.path_display,
            "size_bytes": rec.size,
            "craig_date": f"{craig_date[0]:04}-{craig_date[1]:02}-{craig_date[2]:02}",
        })

    # Download and extract new transcripts (unless dry-run)
    extracted = []
    if not dry_run:
        for nt in new_transcripts:
            try:
                # Download
                md, response = dbx.files_download(nt["dropbox_path"])
                content = response.content

                # Save to temp file
                with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as tmp:
                    tmp.write(content)
                    tmp_path = tmp.name

                # Check if it's a zip
                if zipfile.is_zipfile(tmp_path):
                    with zipfile.ZipFile(tmp_path) as zf:
                        # Find the transcript file
                        transcript_name = None
                        for name in zf.namelist():
                            if "transcription" in name.lower() or "transcript" in name.lower():
                                transcript_name = name
                                break

                        if transcript_name:
                            transcript_content = zf.read(transcript_name).decode("utf-8")
                            header, session_date, body = format_transcript(
                                transcript_content, parse_craig_date(nt["dropbox_file"]), nt["dropbox_file"]
                            )

                            # Save to vault
                            out_path = os.path.join(
                                VAULT_TRANSCRIPTS,
                                f"{session_date} - Transcript.md"
                            )
                            with open(out_path, "w", encoding="utf-8") as f:
                                f.write(header + body)

                            extracted.append({
                                "dropbox_file": nt["dropbox_file"],
                                "vault_path": f"Erovast Vault/00 - Campaign Log/Transcripts/{session_date} - Transcript.md",
                                "session_date": session_date,
                                "transcript_chars": len(transcript_content),
                            })
                        else:
                            print(f"WARNING: No transcript file found in {nt['dropbox_file']}", file=sys.stderr)
                else:
                    # Not a zip — it's a raw audio file, skip
                    pass

                os.unlink(tmp_path)
            except Exception as e:
                print(f"ERROR downloading {nt['dropbox_file']}: {e}", file=sys.stderr)

    output = {
        "total_recordings": len(recordings),
        "already_processed": len(already_processed),
        "new_found": len(new_transcripts),
        "new_extracted": len(extracted),
        "already_processed_list": already_processed,
        "new_transcripts": new_transcripts,
        "extracted": extracted,
    }

    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()

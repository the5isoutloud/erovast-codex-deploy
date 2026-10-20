#!/usr/bin/env python3
"""Deterministically intake new Craig ZIP transcripts from Dropbox.

Detection and intake are deliberately isolated from ``Erovast Vault``. A successful
intake writes only beneath the automation inbox/state roots and creates an
idempotent prepare -> author -> publish chain on the ``erovast`` Kanban board.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import stat
import subprocess
import sys
import zipfile
from pathlib import Path, PurePosixPath
from typing import Any, Callable

DROPBOX_PATH = "/Apps/CraigChat"
AUTOMATION_ROOT = Path("/opt/data/workspace/erovast-automation")
DEFAULT_INBOX = AUTOMATION_ROOT / "inbox"
DEFAULT_STATE = AUTOMATION_ROOT / "state" / "dropbox-monitor.json"
REPO_ROOT = Path("/opt/data/workspace/erovast-codex-deploy")
MAX_ARCHIVE_BYTES = 500 * 1024 * 1024
MAX_TRANSCRIPT_BYTES = 25 * 1024 * 1024


def extract_transcript(
    archive_path: Path | str,
    destination_dir: Path | str,
    max_bytes: int = MAX_TRANSCRIPT_BYTES,
) -> Path:
    """Extract exactly one transcript.txt without trusting ZIP member paths."""
    archive_path = Path(archive_path)
    destination_dir = Path(destination_dir)
    try:
        bundle = zipfile.ZipFile(archive_path)
    except zipfile.BadZipFile as exc:
        raise ValueError("download is not a valid ZIP archive") from exc

    with bundle:
        transcripts: list[zipfile.ZipInfo] = []
        for info in bundle.infolist():
            member = PurePosixPath(info.filename)
            if member.is_absolute() or ".." in member.parts or "\\" in info.filename:
                raise ValueError(f"unsafe ZIP member: {info.filename}")
            mode = info.external_attr >> 16
            if stat.S_ISLNK(mode):
                raise ValueError(f"unsafe ZIP symlink: {info.filename}")
            if member.name.lower() == "transcript.txt" and not info.is_dir():
                transcripts.append(info)

        if len(transcripts) != 1:
            raise ValueError("archive must contain exactly one transcript.txt")
        transcript = transcripts[0]
        if transcript.flag_bits & 0x1:
            raise ValueError("encrypted transcript.txt is not supported")
        if transcript.file_size > max_bytes:
            raise ValueError("transcript exceeds size limit")

        destination_dir.mkdir(parents=True, exist_ok=True)
        output = destination_dir / "transcript.txt"
        temporary = destination_dir / ".transcript.txt.part"
        written = 0
        try:
            with bundle.open(transcript) as source, temporary.open("wb") as target:
                while chunk := source.read(1024 * 1024):
                    written += len(chunk)
                    if written > max_bytes:
                        raise ValueError("transcript exceeds size limit")
                    target.write(chunk)
            temporary.replace(output)
        finally:
            temporary.unlink(missing_ok=True)
        return output


def select_unseen(entries: list[Any], state: dict[str, Any]) -> list[dict[str, Any]]:
    """Return Craig ZIP metadata not recorded by durable Dropbox id/revision."""
    processed = state.get("processed", {})
    unseen = []
    for entry in entries:
        name = getattr(entry, "name", "")
        file_id = getattr(entry, "id", "")
        revision = getattr(entry, "rev", "")
        if not name.lower().endswith(".zip") or "craig" not in name.lower():
            continue
        if not file_id or not revision:
            continue
        identity = f"{file_id}:{revision}"
        if identity in processed:
            continue
        unseen.append(
            {
                "identity": identity,
                "file_id": file_id,
                "revision": revision,
                "name": name,
                "path": entry.path_display,
                "size_bytes": int(entry.size),
            }
        )
    return sorted(unseen, key=lambda item: (item["file_id"], item["revision"], item["name"]))


def create_task_chain(
    archive: dict[str, Any],
    transcript_path: Path,
    runner: Callable[..., Any] = subprocess.run,
    repo_root: Path = REPO_ROOT,
    hermes_bin: str = "hermes",
) -> dict[str, str]:
    """Create the idempotent prepare -> author -> publish Kanban chain."""
    identity = archive["identity"]
    workspace = f"dir:{repo_root}"

    def create(
        title: str, assignee: str, body: str, stage: str, parent: str | None = None
    ) -> str:
        command = [
            hermes_bin,
            "kanban",
            "--board",
            "erovast",
            "create",
            title,
            "--assignee",
            assignee,
            "--body",
            body,
            "--workspace",
            workspace,
            "--idempotency-key",
            f"craig:{identity}:{stage}",
            "--completion-contract",
            "local-only",
            "--json",
        ]
        if parent:
            command.extend(["--parent", parent])
        result = runner(command, check=True, text=True, capture_output=True)
        task_id = json.loads(result.stdout)["id"]
        if not task_id:
            raise RuntimeError(f"Kanban did not return an id for {stage}")
        return task_id

    prepare_body = (
        f"Prepare and synchronise Craig intake {identity}. Source archive: "
        f"{archive['name']}; extracted transcript: {transcript_path}. Verify the "
        "intake identity/revision, then require a clean main checkout, fetch origin, "
        "and fast-forward-only pull. Do not edit Erovast Vault and do not publish. "
        "Hand the verified current main SHA and transcript path to the author task."
    )
    prepare = create(
        f"Prepare Craig transcript {archive['name']}",
        "swiftquill-dev",
        prepare_body,
        "prepare",
    )

    author_body = (
        f"Author the campaign update from {transcript_path} (Dropbox identity "
        f"{identity}). Read Erovast Vault/vault-index.md first. Add the transcript "
        "using existing transcript frontmatter conventions; create/update the dated "
        "session log, every affected lore note, Campaign Synopsis, and vault-index. "
        "Validate all Attachments links and Obsidian wikilinks. Preserve campaign "
        "facts; do not invent lore or alter the Hugo theme. Commit nothing and publish "
        "nothing; leave a precise changed-file and validation handoff."
    )
    author = create(
        f"Author Craig transcript {archive['name']}",
        "default",
        author_body,
        "author",
        parent=prepare,
    )

    publish_body = (
        "Review the author handoff and production diff. Require a clean/current main "
        "that can be fast-forwarded from origin/main. Validate front matter, Obsidian "
        "links, Attachments paths, and generated-site inputs with the existing checker. "
        "Use Hugo Extended 0.165.0 without Docker; do not alter the theme. Build, commit "
        "and push main once, then split Erovast Vault to obsidian and site/public to "
        "do-deploy without force-pushing. Verify all three remote SHAs, poll the "
        "DigitalOcean app deployment to success, and HTTP-smoke-test the intended public "
        "page before completion. If publication partially succeeds, preserve exact SHAs "
        "and retry only incomplete steps."
    )
    publish = create(
        f"Publish Craig transcript {archive['name']}",
        "swiftquill-dev",
        publish_body,
        "publish",
        parent=author,
    )
    return {"prepare": prepare, "author": author, "publish": publish}


def _load_state(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {"version": 1, "processed": {}}
    state = json.loads(path.read_text(encoding="utf-8"))
    if state.get("version") != 1 or not isinstance(state.get("processed"), dict):
        raise ValueError("unsupported or invalid monitor state")
    return state


def _write_state(path: Path, state: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".part")
    temporary.write_text(
        json.dumps(state, sort_keys=True, indent=2) + "\n", encoding="utf-8"
    )
    temporary.replace(path)


def _list_all(dbx: Any, dropbox_path: str) -> list[Any]:
    result = dbx.files_list_folder(dropbox_path)
    entries = list(result.entries)
    while result.has_more:
        result = dbx.files_list_folder_continue(result.cursor)
        entries.extend(result.entries)
    return entries


def _intake_directory(inbox: Path, archive: dict[str, Any]) -> Path:
    file_id = re.sub(r"[^A-Za-z0-9_.-]+", "_", archive["file_id"])
    revision = re.sub(r"[^A-Za-z0-9_.-]+", "_", archive["revision"])
    if not file_id or not revision:
        raise ValueError("Dropbox identity cannot be represented safely on disk")
    return inbox / f"{file_id}-{revision}"


def run_monitor(
    dbx: Any,
    inbox: Path,
    state_path: Path,
    *,
    dry_run: bool = False,
    bootstrap: bool = False,
    dropbox_path: str = DROPBOX_PATH,
    task_creator: Callable[[dict[str, Any], Path], dict[str, str]] = create_task_chain,
) -> dict[str, Any]:
    """Poll Dropbox, intake unseen revisions, create tasks, and persist completion."""
    state = _load_state(state_path)
    unseen = select_unseen(_list_all(dbx, dropbox_path), state)
    if bootstrap:
        for archive in unseen:
            state["processed"][archive["identity"]] = {
                "file_id": archive["file_id"],
                "revision": archive["revision"],
                "name": archive["name"],
                "bootstrap": True,
            }
        _write_state(state_path, state)
        return {
            "status": "bootstrapped",
            "new_count": len(unseen),
            "intakes": [],
        }
    if dry_run:
        return {
            "status": "would_change" if unseen else "unchanged",
            "new_count": len(unseen),
            "intakes": [
                {
                    "identity": item["identity"],
                    "name": item["name"],
                    "revision": item["revision"],
                    "size_bytes": item["size_bytes"],
                }
                for item in unseen
            ],
        }

    intakes = []
    for archive in unseen:
        if archive["size_bytes"] > MAX_ARCHIVE_BYTES:
            raise ValueError(f"archive exceeds size limit: {archive['name']}")
        _, response = dbx.files_download(archive["path"])
        content = response.content
        if len(content) > MAX_ARCHIVE_BYTES:
            raise ValueError(f"archive exceeds size limit: {archive['name']}")

        intake_dir = _intake_directory(inbox, archive)
        intake_dir.mkdir(parents=True, exist_ok=True)
        archive_path = intake_dir / "archive.zip"
        temporary = intake_dir / ".archive.zip.part"
        try:
            temporary.write_bytes(content)
            temporary.replace(archive_path)
        finally:
            temporary.unlink(missing_ok=True)
        transcript_path = extract_transcript(archive_path, intake_dir)
        tasks = task_creator(archive, transcript_path)

        record = {
            "file_id": archive["file_id"],
            "revision": archive["revision"],
            "name": archive["name"],
            "archive_path": str(archive_path),
            "transcript_path": str(transcript_path),
            "tasks": tasks,
        }
        state["processed"][archive["identity"]] = record
        _write_state(state_path, state)
        intakes.append(
            {
                "identity": archive["identity"],
                "name": archive["name"],
                "revision": archive["revision"],
                "tasks": tasks,
                "transcript_path": str(transcript_path),
            }
        )

    return {
        "status": "changed" if intakes else "unchanged",
        "new_count": len(intakes),
        "intakes": intakes,
    }


def _build_dropbox_client() -> Any:
    required = ("DROPBOX_APP_KEY", "DROPBOX_APP_SECRET", "DROPBOX_REFRESH_TOKEN")
    missing = [name for name in required if not os.environ.get(name)]
    if missing:
        raise RuntimeError(f"missing required environment variable(s): {', '.join(missing)}")
    try:
        import dropbox
    except ImportError as exc:
        raise RuntimeError("Dropbox SDK is not installed in the automation environment") from exc
    return dropbox.Dropbox(
        oauth2_refresh_token=os.environ["DROPBOX_REFRESH_TOKEN"],
        app_key=os.environ["DROPBOX_APP_KEY"],
        app_secret=os.environ["DROPBOX_APP_SECRET"],
    )


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--dry-run", action="store_true")
    mode.add_argument(
        "--bootstrap",
        action="store_true",
        help="record all current revisions without downloading or creating tasks",
    )
    parser.add_argument("--inbox", type=Path, default=DEFAULT_INBOX)
    parser.add_argument("--state", type=Path, default=DEFAULT_STATE)
    parser.add_argument("--dropbox-path", default=DROPBOX_PATH)
    parser.add_argument("--hermes-bin", default=os.environ.get("HERMES_BIN", "hermes"))
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    try:
        client = _build_dropbox_client()
        creator = lambda archive, transcript: create_task_chain(  # noqa: E731
            archive, transcript, hermes_bin=args.hermes_bin
        )
        output = run_monitor(
            client,
            args.inbox,
            args.state,
            dry_run=args.dry_run,
            bootstrap=args.bootstrap,
            dropbox_path=args.dropbox_path,
            task_creator=creator,
        )
    except Exception as exc:
        print(json.dumps({"error": str(exc)}, sort_keys=True, separators=(",", ":")))
        return 1
    print(json.dumps(output, sort_keys=True, separators=(",", ":")))
    return 0


if __name__ == "__main__":
    sys.exit(main())

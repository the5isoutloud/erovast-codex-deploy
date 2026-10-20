#!/usr/bin/env python3
"""Validate Obsidian front matter, wikilinks, and attachment references."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path
from urllib.parse import unquote, urlsplit

WIKILINK_RE = re.compile(r"(!?)\[\[([^\]]+)\]\]")
MARKDOWN_IMAGE_RE = re.compile(r"!\[[^\]]*\]\(([^)\s]+)(?:\s+[^)]*)?\)")
HTML_IMAGE_RE = re.compile(r"<img\b[^>]*\bsrc=[\"']([^\"']+)[\"']", re.IGNORECASE)
IMAGE_EXTENSIONS = {
    ".avif", ".gif", ".jpeg", ".jpg", ".pdf", ".png", ".svg", ".webp",
}


def _frontmatter_error(path: Path, text: str, vault: Path) -> str | None:
    if not text.startswith("---\n"):
        return None
    lines = text.splitlines()
    try:
        closing = lines.index("---", 1)
    except ValueError:
        return f"{path.relative_to(vault)}: front matter is not closed"
    for number, line in enumerate(lines[1:closing], start=2):
        stripped = line.strip()
        if not stripped or stripped.startswith("-") or line[:1].isspace():
            continue
        if ":" not in line:
            return f"{path.relative_to(vault)}:{number}: invalid front matter entry"
    return None


def validate_vault(vault: Path) -> list[str]:
    vault = Path(vault)
    if not vault.is_dir():
        return [f"vault directory does not exist: {vault}"]

    notes = sorted(vault.rglob("*.md"))
    note_names = {path.name[:-3].casefold() for path in notes}
    attachment_names = {
        path.name.casefold()
        for path in vault.rglob("*")
        if path.is_file() and path.suffix.casefold() in IMAGE_EXTENSIONS
    }
    errors: list[str] = []

    for note in notes:
        text = note.read_text(encoding="utf-8")
        frontmatter_error = _frontmatter_error(note, text, vault)
        if frontmatter_error:
            errors.append(frontmatter_error)

        for embedded, raw_target in WIKILINK_RE.findall(text):
            target = raw_target.replace("\\|", "|").split("|", 1)[0].split("#", 1)[0].strip()
            if not target:
                continue
            name = Path(target).name
            suffix = Path(name).suffix.casefold()
            if embedded or suffix in IMAGE_EXTENSIONS:
                if name.casefold() not in attachment_names:
                    errors.append(
                        f"{note.relative_to(vault)}: missing attachment [[{raw_target}]]"
                    )
            elif name.removesuffix(".md").casefold() not in note_names:
                errors.append(
                    f"{note.relative_to(vault)}: unresolved wikilink [[{raw_target}]]"
                )

        for raw_path in MARKDOWN_IMAGE_RE.findall(text) + HTML_IMAGE_RE.findall(text):
            parsed = urlsplit(raw_path)
            if parsed.scheme or parsed.netloc or raw_path.startswith(("#", "data:")):
                continue
            decoded = unquote(parsed.path)
            if decoded.startswith("/vault/"):
                target = vault / decoded.removeprefix("/vault/")
            elif decoded.startswith("/"):
                target = vault / decoded.lstrip("/")
            else:
                target = note.parent / decoded
            try:
                target.resolve().relative_to(vault.resolve())
            except ValueError:
                errors.append(
                    f"{note.relative_to(vault)}: unsafe attachment path {raw_path}"
                )
                continue
            if not target.is_file():
                errors.append(
                    f"{note.relative_to(vault)}: missing attachment path {raw_path}"
                )

    return sorted(set(errors))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("vault", nargs="?", type=Path, default=Path("Erovast Vault"))
    args = parser.parse_args(argv)
    errors = validate_vault(args.vault)
    if errors:
        for error in errors:
            print(error)
        print(f"vault validation failed: {len(errors)} error(s)")
        return 1
    print("vault validation passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())

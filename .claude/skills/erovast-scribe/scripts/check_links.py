#!/usr/bin/env python3
"""Report problems in the Erovast Vault: broken wikilinks, curly apostrophes,
unrendered Templater tags, and <img src> paths that don't resolve.

Usage (from the repo root):
    python3 .claude/skills/erovast-scribe/scripts/check_links.py
Exit code is 1 if any problem is found.
"""
import os
import re
import sys

VAULT = os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "Erovast Vault")
VAULT = os.path.normpath(VAULT)
SKIP_DIRS = {".obsidian", ".trash"}

names, notes = set(), []
for root, dirs, files in os.walk(VAULT):
    dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
    for f in files:
        names.add(os.path.splitext(f)[0].lower())
        names.add(f.lower())
        if f.endswith(".md"):
            path = os.path.join(root, f)
            notes.append(path)
            text = open(path, encoding="utf-8").read()
            fm = re.match(r"---\n(.*?)\n---", text, re.S)
            if fm:
                al = re.search(r"aliases:\n((?:[ \t]+- .*\n?)*)", fm.group(1))
                if al:
                    names |= {a.strip().strip("\"'").lower() for a in re.findall(r"- (.*)", al.group(1))}

problems = 0
for path in notes:
    rel = os.path.relpath(path, VAULT)
    if "Transcripts" in rel.split(os.sep):
        continue
    text = open(path, encoding="utf-8").read()
    for link in re.findall(r"\[\[([^\]|#\\]+)", text):
        if link.strip().lower() not in names:
            print(f"BROKEN LINK   {rel} → [[{link}]]")
            problems += 1
    if "’" in os.path.basename(path) or re.search(r"\[\[[^\]]*’", text):
        print(f"CURLY ’       {rel} (use a straight ' in file names and links)")
        problems += 1
    if "tp.file" in text or "<%" in text:
        print(f"TEMPLATER     {rel} (unrendered Templater tag)")
        problems += 1
    for src in re.findall(r'<img[^>]*src="([^"]+)"', text):
        if not src.startswith(("http:", "https:")) and not os.path.exists(os.path.join(os.path.dirname(path), src)):
            print(f"BAD IMG PATH  {rel} → {src}")
            problems += 1

print(f"\n{problems} problem(s) found in {len(notes)} notes." if problems else f"OK: {len(notes)} notes checked, no problems.")
sys.exit(1 if problems else 0)

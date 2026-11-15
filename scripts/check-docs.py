#!/usr/bin/env python3
"""Check active relative documentation links without modifying historical evidence."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
paths = [ROOT / name for name in (
    "AGENTS.md", "CONTRIBUTING.md", "README.md", "PRIVACY.md", "SUPPORT.md",
    "store/README.md", "store/PUBLISHING.md", "docs/history/publication-docs-2026-11-15.md",
)] + sorted((ROOT / "docs").glob("*.md"))
errors = []
checked = 0
for path in paths:
    text = re.sub(r"```.*?```", "", path.read_text(), flags=re.S)
    for target in re.findall(r"!?\[[^\]]*\]\(([^\s)]+)(?:\s+[^)]*)?\)", text):
        if target.startswith(("#", "http:", "https:", "mailto:", "data:")):
            continue
        target = target.split("#", 1)[0]
        if not target:
            continue
        checked += 1
        if not (path.parent / target).exists():
            errors.append(str(path.relative_to(ROOT)) + ": " + target)
if errors:
    raise SystemExit("\n".join(errors))
print("Active documentation links PASS:", checked)

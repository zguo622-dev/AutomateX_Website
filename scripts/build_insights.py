"""Generate insights.html from content.json.

Idempotent: re-running against an unchanged manifest rewrites byte-identical
output. Never hand-edit insights.html — edit content.json and re-run.

Usage:  python scripts/build_insights.py
"""

import html
import json
from datetime import date as _date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "content.json"
TEMPLATE = Path(__file__).resolve().parent / "insights_template.html"
OUTPUT = ROOT / "insights.html"
INDEX = ROOT / "index.html"

VALID_TYPES = {"read", "watch", "listen"}
REQUIRED = {"type", "title", "url", "date", "blurb"}
CARDS_MARKER = "<!-- INSIGHTS_CARDS -->"
STRIP_START = "<!-- INSIGHTS_STRIP_START -->"
STRIP_END = "<!-- INSIGHTS_STRIP_END -->"


def load_manifest(path=MANIFEST):
    items = json.loads(Path(path).read_text(encoding="utf-8"))
    for i, item in enumerate(items):
        missing = REQUIRED - set(item)
        if missing:
            raise ValueError(f"item {i} is missing: {', '.join(sorted(missing))}")
        if item["type"] not in VALID_TYPES:
            raise ValueError(f"item {i} has bad type {item['type']!r}")
        try:
            _date.fromisoformat(item["date"])
        except ValueError:
            raise ValueError(f"item {i} has a bad date {item['date']!r}")
    return items


def human_date(iso):
    """2026-07-17 -> '17 July 2026'. No leading zero on the day."""
    d = _date.fromisoformat(iso)
    return f"{d.day} {d.strftime('%B')} {d.year}"


def sort_items(items):
    """Newest first. Returns a new list; does not mutate the input."""
    return sorted(items, key=lambda i: i["date"], reverse=True)

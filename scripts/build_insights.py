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
            parsed = _date.fromisoformat(item["date"])
        except ValueError:
            parsed = None
        if parsed is None or parsed.isoformat() != item["date"]:
            raise ValueError(f"item {i} has a bad date {item['date']!r}")
    return items


def human_date(iso):
    """2026-07-17 -> '17 July 2026'. No leading zero on the day."""
    d = _date.fromisoformat(iso)
    return f"{d.day} {d.strftime('%B')} {d.year}"


def sort_items(items):
    """Newest first. Returns a new list; does not mutate the input."""
    return sorted(items, key=lambda i: i["date"], reverse=True)


TYPE_LABEL = {"read": "Read", "watch": "Watch", "listen": "Listen"}


def render_card(item):
    e = html.escape
    external = bool(item.get("external", False))
    link_attrs = ' target="_blank" rel="noopener"' if external else ""
    thumb = item.get("thumb", "")
    source = item.get("source", "")

    img = ""
    if thumb:
        img = (
            f'    <img class="insight-card-img" src="{e(thumb)}" alt="" '
            f'loading="lazy">\n'
        )

    source_line = ""
    if source:
        source_line = f'      <span class="insight-card-source">{e(source)}</span>\n'

    return (
        f'  <a class="insight-card" data-type="{e(item["type"])}" '
        f'href="{e(item["url"])}"{link_attrs}>\n'
        f"{img}"
        f'    <div class="insight-card-body">\n'
        f'      <span class="insight-card-type">{TYPE_LABEL[item["type"]]}</span>\n'
        f'      <h3 class="insight-card-title">{e(item["title"])}</h3>\n'
        f'      <p class="insight-card-blurb">{e(item["blurb"])}</p>\n'
        f"{source_line}"
        f'      <time class="insight-card-date" datetime="{e(item["date"])}">'
        f'{e(human_date(item["date"]))}</time>\n'
        f"    </div>\n"
        f"  </a>"
    )


def render_cards(items):
    return "\n".join(render_card(i) for i in sort_items(items))


def render_page(items, template_path=TEMPLATE):
    template = Path(template_path).read_text(encoding="utf-8")
    if CARDS_MARKER not in template:
        raise ValueError(f"template is missing the {CARDS_MARKER} marker")
    return template.replace(CARDS_MARKER, render_cards(items))


def main():
    items = load_manifest()
    OUTPUT.write_text(render_page(items), encoding="utf-8")
    print(f"wrote {OUTPUT.name}: {len(items)} cards")


if __name__ == "__main__":
    main()

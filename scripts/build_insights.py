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

# Scroll-reveal stagger classes already defined by the site shell. Cards cycle
# through them so a row animates in as a sweep rather than all at once.
STAGGER_CYCLE = 4


def render_card(item, position=0, featured=False):
    """One card. `featured` renders the lead item across the full grid width."""
    e = html.escape
    external = bool(item.get("external", False))
    link_attrs = ' target="_blank" rel="noopener"' if external else ""
    thumb = item.get("thumb", "")
    source = item.get("source", "")
    kind = item["type"]

    # Only video gets a thumbnail. The article covers are title cards, so
    # rendering them would print each headline twice - once baked into the
    # image, once as the card heading - and at card width their type is
    # illegible. Articles are typographic instead, which also gives the grid
    # a deliberate rhythm rather than eleven identical picture boxes.
    show_media = kind == "watch" and bool(thumb)

    # Entrance is a CSS-only staggered cascade on load. Deliberately NOT the
    # shell's scroll-reveal: that gates visibility on JS, and on this shell it
    # stranded whole rows invisible when a lazy image shifted the layout.
    classes = ["insight-card"]
    classes.append("insight-card--media" if show_media else "insight-card--text")
    if featured:
        classes.append("insight-card--feature")
    classes.append(f"insight-in-{(position % STAGGER_CYCLE) + 1}")

    chip = f'<span class="insight-card-chip">{TYPE_LABEL[kind]}</span>'

    media = ""
    kicker = ""
    if show_media:
        media = (
            f'    <span class="insight-card-media">\n'
            f'      <img class="insight-card-img" src="{e(thumb)}" alt="" loading="lazy">\n'
            f'      <span class="insight-card-play" aria-hidden="true"></span>\n'
            f"      {chip}\n"
            f"    </span>\n"
        )
    else:
        src = f'<span class="insight-card-source">{e(source)}</span>' if source else ""
        kicker = f'      <span class="insight-card-kicker">{chip}{src}</span>\n'

    lead = ""
    if featured:
        lead = '      <span class="insight-card-lead">Latest</span>\n'

    # On media cards the source belongs in the footer; on text cards it is
    # already in the kicker, so don't repeat it.
    source_line = ""
    if source and show_media:
        source_line = f'        <span class="insight-card-source">{e(source)}</span>\n'

    heading = "h2" if featured else "h3"
    cue = "Read the article" if kind == "read" else "Watch the demo"

    return (
        f'  <a class="{" ".join(classes)}" data-type="{e(kind)}" '
        f'href="{e(item["url"])}"{link_attrs}>\n'
        f"{media}"
        f'    <span class="insight-card-body">\n'
        f"{lead}"
        f"{kicker}"
        f'      <{heading} class="insight-card-title">{e(item["title"])}</{heading}>\n'
        f'      <p class="insight-card-blurb">{e(item["blurb"])}</p>\n'
        f'      <span class="insight-card-foot">\n'
        f"{source_line}"
        f'        <time class="insight-card-date" datetime="{e(item["date"])}">'
        f'{e(human_date(item["date"]))}</time>\n'
        f'        <span class="insight-card-go">{cue}<i aria-hidden="true">&rarr;</i></span>\n'
        f"      </span>\n"
        f"    </span>\n"
        f"  </a>"
    )


def render_cards(items):
    """Newest item leads at full width; the rest follow as a staggered stream."""
    ordered = sort_items(items)
    if not ordered:
        return ""
    out = [render_card(ordered[0], featured=True)]
    out += [render_card(it, position=i) for i, it in enumerate(ordered[1:])]
    return "\n".join(out)


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

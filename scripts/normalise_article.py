"""One-off migration helper: normalise a LinkedIn article folder for re-hosting.

The five source folders use three different asset conventions. This module
rewrites them all to `assets/`, adds a canonical link back to the LinkedIn
original, and replaces internal 'Review copy of...' meta descriptions.
"""

import re
from pathlib import Path

CANONICAL_RE = re.compile(r'<link rel="canonical"[^>]*>')
DESCRIPTION_RE = re.compile(r'(<meta name="description" content=")([^"]*)(">)')


def rewrite_asset_paths(source_html, asset_dir_names):
    """Point every asset reference at `assets/`, preserving any ?query."""
    out = source_html
    for name in asset_dir_names:
        if name == "assets":
            continue
        out = out.replace(f'src="{name}/', 'src="assets/')
        out = out.replace(f"url({name}/", "url(assets/")
        out = out.replace(f'href="{name}/', 'href="assets/')
    return out


def add_canonical(source_html, canonical_url):
    """Insert (or replace) the canonical link. Idempotent."""
    tag = f'<link rel="canonical" href="{canonical_url}">'
    if CANONICAL_RE.search(source_html):
        return CANONICAL_RE.sub(tag, source_html)
    return source_html.replace("</head>", f"{tag}\n</head>", 1)


def replace_description(source_html, description):
    return DESCRIPTION_RE.sub(
        lambda m: f"{m.group(1)}{description}{m.group(3)}", source_html, count=1
    )

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import normalise_article as na


def test_rewrite_paths_maps_named_asset_folder_to_assets():
    src = '<img src="uk-rail-fails-2026-05-21-assets/graphic-A.png">'
    out = na.rewrite_asset_paths(src, ["uk-rail-fails-2026-05-21-assets", "screenshots"])
    assert out == '<img src="assets/graphic-A.png">'


def test_rewrite_paths_maps_screenshots_folder():
    src = '<img src="screenshots/fig1.png">'
    out = na.rewrite_asset_paths(src, ["screenshots"])
    assert out == '<img src="assets/fig1.png">'


def test_rewrite_paths_leaves_already_normalised_paths_alone():
    src = '<img src="assets/graphics/graphic-A.png">'
    assert na.rewrite_asset_paths(src, ["assets"]) == src


def test_rewrite_paths_preserves_cache_busting_query():
    src = '<img src="screenshots/fig1.png?v=20260718-2">'
    out = na.rewrite_asset_paths(src, ["screenshots"])
    assert out == '<img src="assets/fig1.png?v=20260718-2">'


def test_add_canonical_inserts_link_before_head_close():
    src = "<head><title>T</title></head>"
    out = na.add_canonical(src, "https://www.linkedin.com/pulse/abc")
    assert '<link rel="canonical" href="https://www.linkedin.com/pulse/abc">' in out
    assert out.index("canonical") < out.index("</head>")


def test_add_canonical_is_idempotent():
    src = "<head><title>T</title></head>"
    once = na.add_canonical(src, "https://example.com/a")
    twice = na.add_canonical(once, "https://example.com/a")
    assert once == twice


def test_replace_review_copy_description():
    src = '<meta name="description" content="Review copy of Assurance by Bill Guo.">'
    out = na.replace_description(src, "A real buyer-facing description.")
    assert "Review copy" not in out
    assert "A real buyer-facing description." in out

import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent))
import build_insights as bi


def write_manifest(tmp_path, items):
    p = tmp_path / "content.json"
    p.write_text(json.dumps(items), encoding="utf-8")
    return p


VALID = {
    "type": "read",
    "title": "A Title",
    "url": "blog-rag-truths.html",
    "external": False,
    "date": "2026-05-20",
    "blurb": "A blurb.",
    "thumb": "images/x.jpg",
    "source": "AutomateX",
}


def test_load_manifest_returns_items(tmp_path):
    p = write_manifest(tmp_path, [VALID])
    assert bi.load_manifest(p) == [VALID]


def test_load_manifest_rejects_unknown_type(tmp_path):
    bad = dict(VALID, type="skim")
    p = write_manifest(tmp_path, [bad])
    with pytest.raises(ValueError, match="bad type"):
        bi.load_manifest(p)


def test_load_manifest_rejects_missing_field(tmp_path):
    bad = {k: v for k, v in VALID.items() if k != "blurb"}
    p = write_manifest(tmp_path, [bad])
    with pytest.raises(ValueError, match="blurb"):
        bi.load_manifest(p)


def test_human_date_formats_british_long_form():
    assert bi.human_date("2026-07-17") == "17 July 2026"


def test_human_date_has_no_leading_zero_on_day():
    assert bi.human_date("2026-05-06") == "6 May 2026"


def test_sort_items_is_newest_first():
    items = [
        dict(VALID, title="old", date="2026-05-20"),
        dict(VALID, title="new", date="2026-07-17"),
        dict(VALID, title="mid", date="2026-06-19"),
    ]
    assert [i["title"] for i in bi.sort_items(items)] == ["new", "mid", "old"]


def test_sort_items_does_not_mutate_input():
    items = [dict(VALID, date="2026-05-20"), dict(VALID, date="2026-07-17")]
    before = [i["date"] for i in items]
    bi.sort_items(items)
    assert [i["date"] for i in items] == before


def test_load_manifest_rejects_malformed_date(tmp_path):
    bad = dict(VALID, date="2026-7-9")
    p = write_manifest(tmp_path, [bad])
    with pytest.raises(ValueError, match="bad date"):
        bi.load_manifest(p)


def test_load_manifest_rejects_non_dashed_iso_date(tmp_path):
    bad = dict(VALID, date="20260709")
    p = write_manifest(tmp_path, [bad])
    with pytest.raises(ValueError, match="bad date"):
        bi.load_manifest(p)

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

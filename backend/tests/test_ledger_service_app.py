"""Tests for backend.app.services.ledger_service (append-only hash chain)."""
from __future__ import annotations

import json

from backend.app.services.ledger_service import AuditLedger, get_ledger


def test_append_returns_changing_head(tmp_path):
    path = tmp_path / "ledger.jsonl"
    ledger = AuditLedger(path)
    h1 = ledger.append("risk_engine::e1", "merchant_protection", 10.0,
                       refs={"event_id": "e1"})
    h2 = ledger.append("risk_engine::e2", "merchant_protection", 20.0,
                       refs={"event_id": "e2"})
    assert h1 != h2
    assert len(h1) == 64 and len(h2) == 64
    assert ledger.state()["intact"] is True
    assert ledger.state()["entries"] == 4  # two double-entries


def test_chain_survives_writes(tmp_path):
    path = tmp_path / "ledger.jsonl"
    ledger = AuditLedger(path)
    ledger.append("a", "b", 10.0, refs={"event_id": "e1"})
    ledger.append("a", "c", 20.0, refs={"event_id": "e2"})
    assert ledger.verify_chain() is True


def test_tamper_detected(tmp_path):
    path = tmp_path / "ledger.jsonl"
    ledger = AuditLedger(path)
    ledger.append("a", "b", 10.0, refs={"event_id": "e1"})
    ledger.append("a", "c", 20.0, refs={"event_id": "e2"})
    # corrupt the amount of the first entry (breaks the hash chain)
    lines = path.read_text(encoding="utf-8").splitlines()
    rec = json.loads(lines[0])
    rec["amount"] = 999.0
    lines[0] = json.dumps(rec)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    reloaded = AuditLedger(path)
    assert reloaded._boot_intact is False
    assert reloaded.state()["intact"] is False


def test_state_is_o1_snapshot(tmp_path):
    path = tmp_path / "ledger.jsonl"
    ledger = AuditLedger(path)
    for i in range(5):
        ledger.append("a", "b", float(i), refs={"event_id": f"e{i}"})
    state = ledger.state()
    assert set(state) == {"intact", "entries", "head", "multi_writer"}
    assert state["entries"] == 10
    assert len(state["head"]) == 16
    assert state["multi_writer"] is False


def test_external_writer_is_detected_and_resynced(tmp_path):
    """A second in-process writer must not fork the on-disk chain."""
    path = tmp_path / "ledger.jsonl"
    writer_a = AuditLedger(path)
    writer_b = AuditLedger(path)  # both boot from the empty file
    writer_a.append("a", "b", 10.0, refs={"event_id": "ext_1"})
    writer_b.append("a", "b", 20.0, refs={"event_id": "ext_2"})
    # writer_b noticed writer_a's append and adopted its tail as head
    assert writer_b.state()["multi_writer"] is True
    assert writer_b.state()["entries"] == 4  # re-counted after resync
    # the file chain is linear end-to-end (no fork)
    assert AuditLedger(path).verify_chain() is True


def test_torn_line_is_flagged_and_writer_keeps_going(tmp_path):
    """A partial trailing line (crash mid-write) is flagged, not fatal."""
    path = tmp_path / "ledger.jsonl"
    ledger = AuditLedger(path)
    ledger.append("a", "b", 10.0, refs={"event_id": "ok_1"})
    with path.open("a", encoding="utf-8") as fh:
        fh.write('{"side": "DEBIT", "partial')  # torn write: no newline, bad JSON
    ledger.append("a", "b", 20.0, refs={"event_id": "after_torn"})
    # integrity reflects the torn line, but the new entry was still chained
    assert ledger.state()["intact"] is False
    assert ledger.state()["multi_writer"] is True
    recent = ledger.read_recent(limit=5)
    assert recent[0]["event_id"] == "after_torn"


def test_get_ledger_singleton_and_path_override(tmp_path):
    l1 = get_ledger(tmp_path / "one.jsonl")
    l2 = get_ledger()  # cached singleton (no path) — different file in this proc
    assert isinstance(l2, AuditLedger)
    # explicit path always rebuilds
    l3 = get_ledger(tmp_path / "two.jsonl")
    assert l3.path != l1.path or l1.path.name == "two.jsonl"

"""Shared fixtures — one app instance per test session."""
from __future__ import annotations

import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


@pytest.fixture(scope="session")
def client(tmp_path_factory) -> TestClient:
    # Isolate the audit ledger: the app lifespan appends to whatever
    # ledger_service.LEDGER_PATH points at, and tests must never write into
    # the live demo ledger (data/ledger.jsonl) — concurrent writers fork the
    # hash chain. Redirect to a session-scoped temp file before app creation.
    from backend.app.services import ledger_service

    ledger_service.LEDGER_PATH = tmp_path_factory.mktemp("test_ledger") / "ledger.jsonl"
    ledger_service._ledger = None

    from backend.main import create_app

    with TestClient(create_app()) as c:
        yield c


@pytest.fixture()
def normal_upi() -> dict:
    return {
        "event_id": "pay_TEST_NORM_001",
        "event_type": "payment.captured",
        "amount": 1499.0,
        "instrument": {"method": "upi", "vpa": "demo.normal@okhdfcbank"},
        "customer": {"id": "cust_demo_ok", "account_age_days": 900},
        "context": {"device_id": "DEV-DEMO-OK-1", "ip": "49.36.12.10",
                    "email": "demo.ok@gmail.com", "hour_of_day": 14},
    }

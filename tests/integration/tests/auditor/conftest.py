import json
import time
from http import HTTPStatus
from typing import Any

import docker
import pytest
import requests
from testcontainers.core.container import Network

from fixtures import types
from fixtures.auth import find_user_by_email
from fixtures.signoz import create_signoz

# Path to the audit log file inside the SigNoz container. /tmp is guaranteed
# to exist in the integration image, so the file provider's os.OpenFile call
# succeeds without provisioning a directory first.
AUDIT_FILE_PATH = "/tmp/signoz-audit.log"


@pytest.fixture(name="signoz", scope="package")
def signoz(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    network: Network,
    zeus: types.TestContainerDocker,
    gateway: types.TestContainerDocker,
    sqlstore: types.TestContainerSQL,
    clickhouse: types.TestContainerClickhouse,
    request: pytest.FixtureRequest,
    pytestconfig: pytest.Config,
) -> types.SigNoz:
    """Package-scoped SigNoz container configured to use the file auditor.

    BatchSize is set to 1 so every audited request flushes to disk on the
    moreC path without waiting on the periodic ticker. FlushInterval stays
    short so the periodic flush has bounded lag if BatchSize is ever raised.
    """
    return create_signoz(
        network=network,
        zeus=zeus,
        gateway=gateway,
        sqlstore=sqlstore,
        clickhouse=clickhouse,
        request=request,
        pytestconfig=pytestconfig,
        cache_key="signoz_auditor",
        env_overrides={
            "SIGNOZ_AUDITOR_PROVIDER": "file",
            "SIGNOZ_AUDITOR_FILE_PATH": AUDIT_FILE_PATH,
            "SIGNOZ_AUDITOR_BATCH__SIZE": "1",
            "SIGNOZ_AUDITOR_FLUSH__INTERVAL": "100ms",
        },
    )


def read_audit_records(signoz: types.SigNoz) -> list[dict[str, Any]]:
    """Read every audit log record persisted to the file inside the SigNoz container.

    Each line of the file is one OTLP-Logs JSON object containing all events
    flushed in a single export batch. Returns the flattened list of LogRecord
    dicts across every line, with the parent resource attributes merged into
    each record's attributes so signoz.audit.resource.kind and
    signoz.audit.resource.id are reachable via attr_value.
    """
    client = docker.from_env()
    container = client.containers.get(signoz.self.id)
    result = container.exec_run(["cat", AUDIT_FILE_PATH])
    if result.exit_code != 0:
        return []

    records: list[dict[str, Any]] = []
    for line in result.output.decode().splitlines():
        if not line:
            continue
        payload = json.loads(line)
        for resource_log in payload.get("resourceLogs", []):
            resource_attrs = resource_log.get("resource", {}).get("attributes", [])
            for scope_log in resource_log.get("scopeLogs", []):
                for record in scope_log.get("logRecords", []):
                    merged = dict(record)
                    merged["attributes"] = list(record.get("attributes", [])) + list(resource_attrs)
                    records.append(merged)
    return records


def ensure_user_active(
    signoz: types.SigNoz,
    admin_token: str,
    email: str,
    role: str,
    password: str,
    name: str = "",
) -> str:
    """Invite + activate a user, or return the existing user's id if already present.

    Idempotent counterpart to fixtures.auth.create_active_user — needed because the
    auditor suite reuses a long-lived SigNoz container across pytest runs and would
    otherwise hit a 409 on the second invite.
    """
    invite = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/invite"),
        json={"email": email, "role": role, "name": name},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    if invite.status_code == HTTPStatus.CONFLICT:
        return find_user_by_email(signoz, admin_token, email)["id"]
    assert invite.status_code == HTTPStatus.CREATED, invite.text

    invited_user = invite.json()["data"]
    activate = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/resetPassword"),
        json={"password": password, "token": invited_user["token"]},
        timeout=5,
    )
    assert activate.status_code == HTTPStatus.NO_CONTENT, activate.text
    return invited_user["id"]


def attr_value(record: dict[str, Any], key: str) -> Any:
    """Return the value of an OTLP-JSON attribute by key, or None if absent."""
    for kv in record.get("attributes", []):
        if kv.get("key") != key:
            continue
        value = kv.get("value", {})
        for kind in ("stringValue", "intValue", "boolValue", "doubleValue"):
            if kind in value:
                return value[kind]
        return None
    return None


def find_event(records: list[dict[str, Any]], event_name: str, **filters: Any) -> dict[str, Any] | None:
    """Find the first record whose eventName matches and whose audit attributes match every filter."""
    for record in records:
        if record.get("eventName") != event_name:
            continue
        if all(attr_value(record, k) == v for k, v in filters.items()):
            return record
    return None


def wait_for_event(
    signoz: types.SigNoz,
    event_name: str,
    timeout: float = 2.0,
    interval: float = 0.1,
    **filters: Any,
) -> dict[str, Any]:
    """Poll the audit file until an event matching event_name + filters appears."""
    deadline = time.monotonic() + timeout
    last_records: list[dict[str, Any]] = []
    while time.monotonic() < deadline:
        last_records = read_audit_records(signoz)
        event = find_event(last_records, event_name, **filters)
        if event is not None:
            return event
        time.sleep(interval)
    raise AssertionError(f"audit event {event_name!r} matching {filters} not found within {timeout}s (saw {len(last_records)} records: {[r.get('eventName') for r in last_records]})")

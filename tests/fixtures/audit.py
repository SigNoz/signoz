import datetime
import json
from abc import ABC
from collections.abc import Callable, Generator
from typing import Any

import numpy as np
import pytest
from ksuid import KsuidMs

from fixtures import types
from fixtures.fingerprint import LogsOrTracesFingerprint

ALICE_CREATED_DASHBOARD = "alice@acme.com (user-001) created dashboard (dash-001)"
ALICE_UPDATED_DASHBOARD = "alice@acme.com (user-001) updated dashboard (dash-001)"
VIEWER_FAILED_DELETE_DASHBOARD = "viewer@acme.com (user-002) failed to delete dashboard (dash-001): forbidden"
SA_CREATED_ALERT_RULE = "sa-001 created alert-rule (alert-001)"
ALICE_UPDATED_USER = "alice@acme.com (user-001) updated user (user-020)"


class AuditResource(ABC):
    labels: str
    fingerprint: str
    seen_at_ts_bucket_start: np.int64

    def __init__(
        self,
        labels: dict[str, str],
        fingerprint: str,
        seen_at_ts_bucket_start: np.int64,
    ) -> None:
        self.labels = json.dumps(labels, separators=(",", ":"))
        self.fingerprint = fingerprint
        self.seen_at_ts_bucket_start = seen_at_ts_bucket_start

    def np_arr(self) -> np.array:
        return np.array(
            [
                self.labels,
                self.fingerprint,
                self.seen_at_ts_bucket_start,
            ]
        )


class AuditLog(ABC):
    ts_bucket_start: np.uint64
    resource_fingerprint: str
    timestamp: np.uint64
    observed_timestamp: np.uint64
    id: str
    trace_id: str
    span_id: str
    trace_flags: np.uint32
    severity_text: str
    severity_number: np.uint8
    body: dict[str, str]
    scope: dict[str, Any]
    attributes: dict[str, Any]
    resource_json: dict[str, Any]
    event_name: str

    resource: list[AuditResource]

    def __init__(
        self,
        timestamp: datetime.datetime | None = None,
        resources: dict[str, Any] = {},
        attributes: dict[str, Any] = {},
        body: str = "",
        event_name: str = "",
        severity_text: str = "INFO",
        trace_id: str = "",
        span_id: str = "",
        trace_flags: np.uint32 = 0,
        scope_name: str = "signoz.audit",
        scope_version: str = "",
    ) -> None:
        if timestamp is None:
            timestamp = datetime.datetime.now()

        self.timestamp = np.uint64(int(timestamp.timestamp() * 1e9))
        self.observed_timestamp = self.timestamp

        minute = timestamp.minute
        bucket_minute = 0 if minute < 30 else 30
        bucket_start = timestamp.replace(minute=bucket_minute, second=0, microsecond=0)
        self.ts_bucket_start = np.uint64(int(bucket_start.timestamp()))

        self.id = str(KsuidMs(datetime=timestamp))

        self.trace_id = trace_id
        self.span_id = span_id
        self.trace_flags = trace_flags

        self.severity_text = severity_text
        self.severity_number = np.uint8(9 if severity_text == "INFO" else 17)

        self.body = {"message": body}
        self.event_name = event_name

        resource_attributes = {k: str(v) for k, v in resources.items()}
        self.resource_json = {"attributes": resource_attributes}
        self.resource_fingerprint = LogsOrTracesFingerprint(resource_attributes).calculate()

        self.attributes = dict(attributes)
        self.scope = {"name": scope_name, "version": scope_version, "attributes": {}}

        self.resource = [
            AuditResource(
                labels=resource_attributes,
                fingerprint=self.resource_fingerprint,
                seen_at_ts_bucket_start=self.ts_bucket_start,
            )
        ]

    def np_arr(self) -> np.array:
        return np.array(
            [
                self.ts_bucket_start,
                self.resource_fingerprint,
                self.timestamp,
                self.observed_timestamp,
                self.id,
                self.trace_id,
                self.span_id,
                self.trace_flags,
                self.severity_text,
                self.severity_number,
                self.body,
                self.scope,
                self.attributes,
                self.resource_json,
                self.event_name,
            ],
            dtype=object,
        )


@pytest.fixture(name="insert_audit_logs", scope="function")
def insert_audit_logs(
    clickhouse: types.TestContainerClickhouse,
) -> Generator[Callable[[list[AuditLog]], None], Any]:
    def _insert_audit_logs(logs: list[AuditLog]) -> None:
        resources: list[AuditResource] = []
        for log in logs:
            resources.extend(log.resource)

        if len(resources) > 0:
            clickhouse.conn.insert(
                database="signoz_audit",
                table="distributed_logs_resource",
                data=[resource.np_arr() for resource in resources],
                column_names=[
                    "labels",
                    "fingerprint",
                    "seen_at_ts_bucket_start",
                ],
            )

        clickhouse.conn.insert(
            database="signoz_audit",
            table="distributed_logs",
            data=[log.np_arr() for log in logs],
            column_names=[
                "ts_bucket_start",
                "resource_fingerprint",
                "timestamp",
                "observed_timestamp",
                "id",
                "trace_id",
                "span_id",
                "trace_flags",
                "severity_text",
                "severity_number",
                "body",
                "scope",
                "attributes",
                "resource",
                "event_name",
            ],
        )

    yield _insert_audit_logs

    cluster = clickhouse.env["SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_CLUSTER"]
    for table in ["logs", "logs_resource"]:
        clickhouse.conn.query(f"TRUNCATE TABLE signoz_audit.{table} ON CLUSTER '{cluster}' SYNC")


def sample_audit_logs(now: datetime.datetime) -> list[AuditLog]:
    return [
        AuditLog(
            timestamp=now - datetime.timedelta(seconds=5),
            resources={"service.name": "signoz", "signoz.resource.kind": "dashboard", "signoz.resource.id": "dash-001"},
            attributes={
                "signoz.principal.id": "user-001",
                "signoz.principal.email": "alice@acme.com",
                "signoz.principal.type": "user",
                "signoz.audit.verb": "create",
                "signoz.audit.outcome": "success",
                "signoz.audit.fields_changed": 3,
            },
            body=ALICE_CREATED_DASHBOARD,
            event_name="signoz.audit.create",
            scope_version="1.0.0",
        ),
        AuditLog(
            timestamp=now - datetime.timedelta(seconds=4),
            resources={"service.name": "signoz", "signoz.resource.kind": "dashboard", "signoz.resource.id": "dash-001"},
            attributes={
                "signoz.principal.id": "user-001",
                "signoz.principal.email": "alice@acme.com",
                "signoz.principal.type": "user",
                "signoz.audit.verb": "update",
                "signoz.audit.outcome": "success",
                "signoz.audit.fields_changed": 8,
            },
            body=ALICE_UPDATED_DASHBOARD,
            event_name="signoz.audit.update",
            scope_version="1.0.0",
        ),
        AuditLog(
            timestamp=now - datetime.timedelta(seconds=3),
            resources={"service.name": "signoz", "signoz.resource.kind": "dashboard", "signoz.resource.id": "dash-001"},
            attributes={
                "signoz.principal.id": "user-002",
                "signoz.principal.email": "viewer@acme.com",
                "signoz.principal.type": "user",
                "signoz.audit.verb": "delete",
                "signoz.audit.outcome": "failure",
                "exception.type": "forbidden",
            },
            body=VIEWER_FAILED_DELETE_DASHBOARD,
            event_name="signoz.audit.delete",
            severity_text="ERROR",
            scope_version="1.0.0",
        ),
        AuditLog(
            timestamp=now - datetime.timedelta(seconds=2),
            resources={"service.name": "signoz", "signoz.resource.kind": "alert-rule", "signoz.resource.id": "alert-001"},
            attributes={
                "signoz.principal.id": "sa-001",
                "signoz.principal.type": "service_account",
                "signoz.audit.verb": "create",
                "signoz.audit.outcome": "success",
                "signoz.audit.fields_changed": 12,
            },
            body=SA_CREATED_ALERT_RULE,
            event_name="signoz.audit.create",
            scope_version="1.0.0",
        ),
        AuditLog(
            timestamp=now - datetime.timedelta(seconds=1),
            resources={"service.name": "signoz", "signoz.resource.kind": "user", "signoz.resource.id": "user-020"},
            attributes={
                "signoz.principal.id": "user-001",
                "signoz.principal.email": "alice@acme.com",
                "signoz.principal.type": "user",
                "signoz.audit.verb": "update",
                "signoz.audit.action_category": "access_control",
                "signoz.audit.outcome": "success",
            },
            body=ALICE_UPDATED_USER,
            event_name="signoz.audit.update",
            scope_version="2.0.0",
        ),
    ]

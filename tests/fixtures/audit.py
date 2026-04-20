import datetime
import json
from abc import ABC
from typing import Any, Callable, Generator, List, Optional

import numpy as np
import pytest
from ksuid import KsuidMs

from fixtures import types
from fixtures.fingerprint import LogsOrTracesFingerprint


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


class AuditResourceOrAttributeKeys(ABC):
    name: str
    datatype: str

    def __init__(self, name: str, datatype: str) -> None:
        self.name = name
        self.datatype = datatype

    def np_arr(self) -> np.array:
        return np.array([self.name, self.datatype])


class AuditTagAttributes(ABC):
    unix_milli: np.int64
    tag_key: str
    tag_type: str
    tag_data_type: str
    string_value: str
    int64_value: Optional[np.int64]
    float64_value: Optional[np.float64]

    def __init__(
        self,
        timestamp: datetime.datetime,
        tag_key: str,
        tag_type: str,
        tag_data_type: str,
        string_value: Optional[str],
        int64_value: Optional[np.int64],
        float64_value: Optional[np.float64],
    ) -> None:
        self.unix_milli = np.int64(int(timestamp.timestamp() * 1e3))
        self.tag_key = tag_key
        self.tag_type = tag_type
        self.tag_data_type = tag_data_type
        self.string_value = string_value or ""
        self.int64_value = int64_value
        self.float64_value = float64_value

    def np_arr(self) -> np.array:
        return np.array(
            [
                self.unix_milli,
                self.tag_key,
                self.tag_type,
                self.tag_data_type,
                self.string_value,
                self.int64_value,
                self.float64_value,
            ]
        )


class AuditLog(ABC):
    """Represents a single audit log event in signoz_audit.

    Matches the ClickHouse DDL from the schema migration (ticket #1936):
    - Database: signoz_audit
    - Local table: logs
    - Distributed table: distributed_logs
    - No resources_string column (resource JSON only)
    - Has event_name column
    - 7 materialized columns auto-populated from attributes_string at INSERT time
    """

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
    body: str
    scope_name: str
    scope_version: str
    scope_string: dict[str, str]
    attributes_string: dict[str, str]
    attributes_number: dict[str, np.float64]
    attributes_bool: dict[str, bool]
    resource_json: dict[str, str]
    event_name: str

    resource: List[AuditResource]
    tag_attributes: List[AuditTagAttributes]
    resource_keys: List[AuditResourceOrAttributeKeys]
    attribute_keys: List[AuditResourceOrAttributeKeys]

    def __init__(
        self,
        timestamp: Optional[datetime.datetime] = None,
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
        self.tag_attributes = []
        self.attribute_keys = []
        self.resource_keys = []

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

        self.body = body
        self.event_name = event_name

        # Resources — JSON column only (no resources_string in audit DDL)
        self.resource_json = {k: str(v) for k, v in resources.items()}
        for k, v in self.resource_json.items():
            self.tag_attributes.append(
                AuditTagAttributes(
                    timestamp=timestamp,
                    tag_key=k,
                    tag_type="resource",
                    tag_data_type="string",
                    string_value=str(v),
                    int64_value=None,
                    float64_value=None,
                )
            )
            self.resource_keys.append(
                AuditResourceOrAttributeKeys(name=k, datatype="string")
            )

        self.resource_fingerprint = LogsOrTracesFingerprint(
            self.resource_json
        ).calculate()

        # Process attributes by type
        self.attributes_string = {}
        self.attributes_number = {}
        self.attributes_bool = {}

        for k, v in attributes.items():
            if isinstance(v, bool):
                self.attributes_bool[k] = v
                self.tag_attributes.append(
                    AuditTagAttributes(
                        timestamp=timestamp,
                        tag_key=k,
                        tag_type="tag",
                        tag_data_type="bool",
                        string_value=None,
                        int64_value=None,
                        float64_value=None,
                    )
                )
                self.attribute_keys.append(
                    AuditResourceOrAttributeKeys(name=k, datatype="bool")
                )
            elif isinstance(v, int):
                self.attributes_number[k] = np.float64(v)
                self.tag_attributes.append(
                    AuditTagAttributes(
                        timestamp=timestamp,
                        tag_key=k,
                        tag_type="tag",
                        tag_data_type="int64",
                        string_value=None,
                        int64_value=np.int64(v),
                        float64_value=None,
                    )
                )
                self.attribute_keys.append(
                    AuditResourceOrAttributeKeys(name=k, datatype="int64")
                )
            elif isinstance(v, float):
                self.attributes_number[k] = np.float64(v)
                self.tag_attributes.append(
                    AuditTagAttributes(
                        timestamp=timestamp,
                        tag_key=k,
                        tag_type="tag",
                        tag_data_type="float64",
                        string_value=None,
                        int64_value=None,
                        float64_value=np.float64(v),
                    )
                )
                self.attribute_keys.append(
                    AuditResourceOrAttributeKeys(name=k, datatype="float64")
                )
            else:
                self.attributes_string[k] = str(v)
                self.tag_attributes.append(
                    AuditTagAttributes(
                        timestamp=timestamp,
                        tag_key=k,
                        tag_type="tag",
                        tag_data_type="string",
                        string_value=str(v),
                        int64_value=None,
                        float64_value=None,
                    )
                )
                self.attribute_keys.append(
                    AuditResourceOrAttributeKeys(name=k, datatype="string")
                )

        self.scope_name = scope_name
        self.scope_version = scope_version
        self.scope_string = {}

        self.resource = [
            AuditResource(
                labels=self.resource_json,
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
                self.scope_name,
                self.scope_version,
                self.scope_string,
                self.attributes_string,
                self.attributes_number,
                self.attributes_bool,
                self.resource_json,
                self.event_name,
            ]
        )


@pytest.fixture(name="insert_audit_logs", scope="function")
def insert_audit_logs(
    clickhouse: types.TestContainerClickhouse,
) -> Generator[Callable[[List[AuditLog]], None], Any, None]:
    def _insert_audit_logs(logs: List[AuditLog]) -> None:
        resources: List[AuditResource] = []
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

        tag_attributes: List[AuditTagAttributes] = []
        for log in logs:
            tag_attributes.extend(log.tag_attributes)

        if len(tag_attributes) > 0:
            clickhouse.conn.insert(
                database="signoz_audit",
                table="distributed_tag_attributes",
                data=[ta.np_arr() for ta in tag_attributes],
                column_names=[
                    "unix_milli",
                    "tag_key",
                    "tag_type",
                    "tag_data_type",
                    "string_value",
                    "int64_value",
                    "float64_value",
                ],
            )

        attribute_keys: List[AuditResourceOrAttributeKeys] = []
        for log in logs:
            attribute_keys.extend(log.attribute_keys)

        if len(attribute_keys) > 0:
            clickhouse.conn.insert(
                database="signoz_audit",
                table="distributed_logs_attribute_keys",
                data=[ak.np_arr() for ak in attribute_keys],
                column_names=["name", "datatype"],
            )

        resource_keys: List[AuditResourceOrAttributeKeys] = []
        for log in logs:
            resource_keys.extend(log.resource_keys)

        if len(resource_keys) > 0:
            clickhouse.conn.insert(
                database="signoz_audit",
                table="distributed_logs_resource_keys",
                data=[rk.np_arr() for rk in resource_keys],
                column_names=["name", "datatype"],
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
                "scope_name",
                "scope_version",
                "scope_string",
                "attributes_string",
                "attributes_number",
                "attributes_bool",
                "resource",
                "event_name",
            ],
        )

    yield _insert_audit_logs

    cluster = clickhouse.env["SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_CLUSTER"]
    for table in [
        "logs",
        "logs_resource",
        "tag_attributes",
        "logs_attribute_keys",
        "logs_resource_keys",
    ]:
        clickhouse.conn.query(
            f"TRUNCATE TABLE signoz_audit.{table} ON CLUSTER '{cluster}' SYNC"
        )

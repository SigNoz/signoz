import datetime
import json
from abc import ABC
from typing import Any, Callable, Generator, List

import numpy as np
import pytest
from ksuid import KsuidMs

from fixtures import types
from fixtures.fingerprint import LogsOrTracesFingerprint


class LogsResource(ABC):
    labels: str
    fingerprint: str
    seen_at_ts_bucket_start: np.int64

    def __init__(
        self,
        labels: dict[str, str],
        fingerprint: str,
        seen_at_ts_bucket_start: np.int64,
    ) -> None:
        self.labels = json.dumps(
            labels, separators=(",", ":")
        )  # clickhouse treats {"a": "b"} differently from {"a":"b"}. In the first case it is not able to run json functions
        self.fingerprint = fingerprint
        self.seen_at_ts_bucket_start = seen_at_ts_bucket_start

    def np_arr(self) -> np.array:
        return np.array(
            [
                self.labels,
                self.fingerprint,
                self.seen_at_ts_bucket_start,
                np.uint64(10),
                np.uint64(15),
            ]
        )


class LogsResourceOrAttributeKeys(ABC):
    name: str
    datatype: str

    def __init__(self, name: str, datatype: str) -> None:
        self.name = name
        self.datatype = datatype

    def np_arr(self) -> np.array:
        return np.array([self.name, self.datatype])


class LogsTagAttributes(ABC):
    unix_milli: np.int64
    tag_key: str
    tag_type: str
    tag_data_type: str
    string_value: str
    number_value: np.float64

    def __init__(
        self,
        timestamp: datetime.datetime,
        tag_key: str,
        tag_type: str,
        tag_data_type: str,
        string_value: str,
        number_value: np.float64,
    ) -> None:
        self.unix_milli = np.int64(int(timestamp.timestamp() * 1e3))
        self.tag_key = tag_key
        self.tag_type = tag_type
        self.tag_data_type = tag_data_type
        self.string_value = string_value or ""
        self.number_value = number_value

    def np_arr(self) -> np.array:
        return np.array(
            [
                self.unix_milli,
                self.tag_key,
                self.tag_type,
                self.tag_data_type,
                self.string_value,
                self.number_value,
            ]
        )


class Logs(ABC):
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
    attributes_string: dict[str, str]
    attributes_number: dict[str, np.float64]
    attributes_bool: dict[str, bool]
    resources_string: dict[str, str]
    scope_name: str
    scope_version: str
    scope_string: dict[str, str]

    resource: List[LogsResource]
    tag_attributes: List[LogsTagAttributes]
    resource_keys: List[LogsResourceOrAttributeKeys]
    attribute_keys: List[LogsResourceOrAttributeKeys]

    def __init__(
        self,
        timestamp: datetime.datetime = datetime.datetime.now(),
        resources: dict[str, Any] = {},
        attributes: dict[str, Any] = {},
        body: str = "default body",
        severity_text: str = "INFO",
        trace_id: str = "",
        span_id: str = "",
        trace_flags: np.uint32 = 0,
        scope_name: str = "",
        scope_version: str = "",
        scope_attributes: dict[str, str] = {},
    ) -> None:
        self.tag_attributes = []
        self.attribute_keys = []
        self.resource_keys = []

        # Convert timestamp to uint64 nanoseconds
        self.timestamp = np.uint64(int(timestamp.timestamp() * 1e9))
        self.observed_timestamp = self.timestamp

        # Calculate ts_bucket_start (30mins bucket)
        # Round down to nearest 30-minute interval
        minute = timestamp.minute
        if minute < 30:
            bucket_minute = 0
        else:
            bucket_minute = 30

        bucket_start = timestamp.replace(minute=bucket_minute, second=0, microsecond=0)
        self.ts_bucket_start = np.uint64(int(bucket_start.timestamp()))

        # Generate ksuid by using the timestamp
        self.id = str(KsuidMs(datetime=timestamp))

        # Initialize trace fields
        self.trace_id = trace_id
        self.span_id = span_id
        self.trace_flags = trace_flags

        # Set severity fields
        self.severity_text = severity_text
        self.severity_number = self._get_severity_number(severity_text)

        # Set body
        self.body = body

        # Process resources and attributes
        self.resources_string = {k: str(v) for k, v in resources.items()}
        for k, v in self.resources_string.items():
            self.tag_attributes.append(
                LogsTagAttributes(
                    timestamp=timestamp,
                    tag_key=k,
                    tag_type="resource",
                    tag_data_type="string",
                    string_value=v,
                    number_value=None,
                )
            )
            self.resource_keys.append(
                LogsResourceOrAttributeKeys(name=k, datatype="string")
            )

        # Calculate resource fingerprint
        self.resource_fingerprint = LogsOrTracesFingerprint(
            self.resources_string
        ).calculate()

        # Process attributes by type
        self.attributes_string = {}
        self.attributes_number = {}
        self.attributes_bool = {}

        for k, v in attributes.items():
            if isinstance(v, bool):
                self.attributes_bool[k] = v
                self.tag_attributes.append(
                    LogsTagAttributes(
                        timestamp=timestamp,
                        tag_key=k,
                        tag_type="tag",
                        tag_data_type="bool",
                        string_value=None,
                        number_value=None,
                    )
                )
                self.attribute_keys.append(
                    LogsResourceOrAttributeKeys(name=k, datatype="bool")
                )
            elif isinstance(v, (int, float)):
                self.attributes_number[k] = np.float64(v)
                self.tag_attributes.append(
                    LogsTagAttributes(
                        timestamp=timestamp,
                        tag_key=k,
                        tag_type="tag",
                        tag_data_type="float64",
                        string_value=None,
                        number_value=np.float64(v),
                    )
                )
                self.attribute_keys.append(
                    LogsResourceOrAttributeKeys(name=k, datatype="float64")
                )
            else:
                self.attributes_string[k] = str(v)
                self.tag_attributes.append(
                    LogsTagAttributes(
                        timestamp=timestamp,
                        tag_key=k,
                        tag_type="tag",
                        tag_data_type="string",
                        string_value=str(v),
                        number_value=None,
                    )
                )
                self.attribute_keys.append(
                    LogsResourceOrAttributeKeys(name=k, datatype="string")
                )

        # Initialize scope fields
        self.scope_name = scope_name
        self.scope_version = scope_version
        self.scope_string = {k: str(v) for k, v in scope_attributes.items()}
        for k, v in self.scope_string.items():
            self.tag_attributes.append(
                LogsTagAttributes(
                    timestamp=timestamp,
                    tag_key=k,
                    tag_type="scope",
                    tag_data_type="string",
                    string_value=v,
                    number_value=None,
                )
            )

        self.resource = []
        self.resource.append(
            LogsResource(
                labels=self.resources_string,
                fingerprint=self.resource_fingerprint,
                seen_at_ts_bucket_start=self.ts_bucket_start,
            )
        )

        # Log fields (severity)
        self.tag_attributes.append(
            LogsTagAttributes(
                timestamp=timestamp,
                tag_key="severity_text",
                tag_type="logfield",
                tag_data_type="string",
                string_value=self.severity_text,
                number_value=None,
            )
        )
        self.attribute_keys.append(
            LogsResourceOrAttributeKeys(name="severity_text", datatype="string")
        )

        self.tag_attributes.append(
            LogsTagAttributes(
                timestamp=timestamp,
                tag_key="severity_number",
                tag_type="logfield",
                tag_data_type="float64",
                string_value=None,
                number_value=float(self.severity_number),
            )
        )
        self.attribute_keys.append(
            LogsResourceOrAttributeKeys(name="severity_number", datatype="float64")
        )

    def _get_severity_number(self, severity_text: str) -> np.uint8:
        """Convert severity text to numeric value"""
        severity_map = {
            "TRACE": 1,
            "DEBUG": 5,
            "INFO": 9,
            "WARN": 13,
            "ERROR": 17,
            "FATAL": 21,
        }

        return np.uint8(severity_map.get(severity_text.upper(), 9))  # Default to INFO

    def np_arr(self) -> np.array:
        """Return log data as numpy array for database insertion"""
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
                self.attributes_string,
                self.attributes_number,
                self.attributes_bool,
                self.resources_string,
                self.scope_name,
                self.scope_version,
                self.scope_string,
                np.uint64(10),
                np.uint64(15),
                self.resources_string,
            ]
        )


@pytest.fixture(name="insert_logs", scope="function")
def insert_logs(
    clickhouse: types.TestContainerClickhouse,
) -> Generator[Callable[[List[Logs]], None], Any, None]:
    def _insert_logs(logs: List[Logs]) -> None:
        """
        Insert logs into ClickHouse tables following the same logic as the Go exporter.
        This function handles insertion into multiple tables:
        - distributed_logs_v2 (main logs table)
        - distributed_logs_v2_resource (resource fingerprints)
        - distributed_tag_attributes_v2 (tag attributes)
        - distributed_logs_attribute_keys (attribute keys)
        - distributed_logs_resource_keys (resource keys)
        """
        resources: List[LogsResource] = []
        for log in logs:
            resources.extend(log.resource)

        if len(resources) > 0:
            clickhouse.conn.insert(
                database="signoz_logs",
                table="distributed_logs_v2_resource",
                data=[resource.np_arr() for resource in resources],
            )

        tag_attributes: List[LogsTagAttributes] = []
        for log in logs:
            tag_attributes.extend(log.tag_attributes)

        if len(tag_attributes) > 0:
            clickhouse.conn.insert(
                database="signoz_logs",
                table="distributed_tag_attributes_v2",
                data=[tag_attribute.np_arr() for tag_attribute in tag_attributes],
            )

        attribute_keys: List[LogsResourceOrAttributeKeys] = []
        for log in logs:
            attribute_keys.extend(log.attribute_keys)

        if len(attribute_keys) > 0:
            clickhouse.conn.insert(
                database="signoz_logs",
                table="distributed_logs_attribute_keys",
                data=[attribute_key.np_arr() for attribute_key in attribute_keys],
            )

        resource_keys: List[LogsResourceOrAttributeKeys] = []
        for log in logs:
            resource_keys.extend(log.resource_keys)

        if len(resource_keys) > 0:
            clickhouse.conn.insert(
                database="signoz_logs",
                table="distributed_logs_resource_keys",
                data=[resource_key.np_arr() for resource_key in resource_keys],
            )

        clickhouse.conn.insert(
            database="signoz_logs",
            table="distributed_logs_v2",
            data=[log.np_arr() for log in logs],
        )

    yield _insert_logs

    clickhouse.conn.query(
        f"TRUNCATE TABLE signoz_logs.logs_v2 ON CLUSTER '{clickhouse.env['SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_CLUSTER']}' SYNC"
    )
    clickhouse.conn.query(
        f"TRUNCATE TABLE signoz_logs.logs_v2_resource ON CLUSTER '{clickhouse.env['SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_CLUSTER']}' SYNC"
    )
    clickhouse.conn.query(
        f"TRUNCATE TABLE signoz_logs.tag_attributes_v2 ON CLUSTER '{clickhouse.env['SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_CLUSTER']}' SYNC"
    )
    clickhouse.conn.query(
        f"TRUNCATE TABLE signoz_logs.logs_attribute_keys ON CLUSTER '{clickhouse.env['SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_CLUSTER']}' SYNC"
    )
    clickhouse.conn.query(
        f"TRUNCATE TABLE signoz_logs.logs_resource_keys ON CLUSTER '{clickhouse.env['SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_CLUSTER']}' SYNC"
    )


@pytest.fixture(name="ttl_legacy_logs_v2_table_setup", scope="function")
def ttl_legacy_logs_v2_table_setup(request, signoz: types.SigNoz):
    """
    Fixture to setup and teardown legacy TTL test environment.
    It renames existing logs tables to backup names and creates new empty tables for testing.
    After the test, it restores the original tables.
    """

    # Setup code
    result = signoz.telemetrystore.conn.query(
        "RENAME TABLE signoz_logs.logs_v2 TO signoz_logs.logs_v2_backup;"
    ).result_rows
    assert result is not None
    # Add cleanup to restore original table
    request.addfinalizer(lambda:  signoz.telemetrystore.conn.query("RENAME TABLE signoz_logs.logs_v2_backup TO signoz_logs.logs_v2;"))

    # Create new test tables
    result = signoz.telemetrystore.conn.query(
        """CREATE TABLE signoz_logs.logs_v2
                                                (
                                                    `id` String,
                                                    `timestamp` UInt64 CODEC(DoubleDelta, LZ4)

                                                )
                                                ENGINE = MergeTree()
                                                ORDER BY id;"""
    ).result_rows

    assert result is not None
    # Add cleanup to drop test table
    request.addfinalizer(lambda:  signoz.telemetrystore.conn.query("DROP TABLE IF EXISTS signoz_logs.logs_v2;"))

    yield  # Test runs here

@pytest.fixture(name="ttl_legacy_logs_v2_resource_table_setup", scope="function")
def ttl_legacy_logs_v2_resource_table_setup(request, signoz: types.SigNoz):
    """
    Fixture to setup and teardown legacy TTL test environment.
    It renames existing logs tables to backup names and creates new empty tables for testing.
    After the test, it restores the original tables.
    """

    # Setup code
    result = signoz.telemetrystore.conn.query(
        "RENAME TABLE signoz_logs.logs_v2_resource TO signoz_logs.logs_v2_resource_backup;"
    ).result_rows
    assert result is not None
    # Add cleanup to restore original table
    request.addfinalizer(lambda:  signoz.telemetrystore.conn.query("RENAME TABLE signoz_logs.logs_v2_resource_backup TO signoz_logs.logs_v2_resource;"))

    # Create new test tables
    result = signoz.telemetrystore.conn.query(
        """CREATE TABLE signoz_logs.logs_v2_resource
                                                (
                                                    `id` String,
                                                    `seen_at_ts_bucket_start` Int64 CODEC(Delta(8), ZSTD(1))
                                                )
                                                ENGINE = MergeTree()
                                                ORDER BY id;"""
    ).result_rows

    assert result is not None
    # Add cleanup to drop test table
    request.addfinalizer(lambda:  signoz.telemetrystore.conn.query("DROP TABLE IF EXISTS signoz_logs.logs_v2_resource;"))

    yield  # Test runs here
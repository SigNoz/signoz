import datetime
import hashlib
import json
import secrets
import uuid
from abc import ABC
from enum import Enum
from typing import Any, Callable, Generator, List
from urllib.parse import urlparse

import numpy as np
import pytest

from fixtures import types
from fixtures.fingerprint import LogsOrTracesFingerprint


class TracesKind(Enum):
    SPAN_KIND_UNSPECIFIED = 0
    SPAN_KIND_INTERNAL = 1
    SPAN_KIND_SERVER = 2
    SPAN_KIND_CLIENT = 3
    SPAN_KIND_PRODUCER = 4
    SPAN_KIND_CONSUMER = 5


class TracesStatusCode(Enum):
    STATUS_CODE_UNSET = 0
    STATUS_CODE_OK = 1
    STATUS_CODE_ERROR = 2


class TracesRefType(Enum):
    REF_TYPE_CHILD_OF = "CHILD_OF"
    REF_TYPE_FOLLOWS_FROM = "FOLLOWS_FROM"


class TraceIdGenerator(ABC):
    @staticmethod
    def trace_id() -> str:
        return secrets.token_hex(16)

    @staticmethod
    def span_id() -> str:
        return secrets.token_hex(8)


class TracesResource(ABC):
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
        return np.array([self.labels, self.fingerprint, self.seen_at_ts_bucket_start])


class TracesResourceOrAttributeKeys(ABC):
    name: str
    datatype: str
    tag_type: str
    is_column: bool

    def __init__(
        self, name: str, datatype: str, tag_type: str, is_column: bool = False
    ) -> None:
        self.name = name
        self.datatype = datatype
        self.tag_type = tag_type
        self.is_column = is_column

    def np_arr(self) -> np.array:
        return np.array([self.name, self.tag_type, self.datatype, self.is_column])


class TracesTagAttributes(ABC):
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


class TracesEvent(ABC):
    name: str
    time_unix_nano: np.uint64
    attribute_map: dict[str, str]

    def __init__(
        self,
        name: str,
        timestamp: datetime.datetime,
        attribute_map: dict[str, str] = {},
    ) -> None:
        self.name = name
        self.time_unix_nano = np.uint64(int(timestamp.timestamp() * 1e9))
        self.attribute_map = attribute_map

    def np_arr(self) -> np.array:
        return np.array(
            [self.name, self.time_unix_nano, json.dumps(self.attribute_map)]
        )


class TracesErrorEvent(ABC):
    event: TracesEvent
    error_id: str
    error_group_id: str

    def __init__(
        self,
        event: TracesEvent,
        error_id: str = "",
        error_group_id: str = "",
    ) -> None:
        self.event = event
        self.error_id = error_id
        self.error_group_id = error_group_id

    def np_arr(self) -> np.array:
        return np.array(
            [
                self.event.time_unix_nano,
                self.error_id,
                self.error_group_id,
                self.event.name,
                json.dumps(self.event.attribute_map),
            ]
        )


class TracesSpanAttribute(ABC):
    key: str
    tag_type: str
    data_type: str
    string_value: str
    number_value: np.float64
    is_column: bool

    def __init__(
        self,
        key: str,
        tag_type: str,
        data_type: str,
        string_value: str = "",
        number_value: np.float64 = None,
        is_column: bool = False,
    ) -> None:
        self.key = key
        self.tag_type = tag_type
        self.data_type = data_type
        self.string_value = string_value
        self.number_value = number_value
        self.is_column = is_column


class TracesLink(ABC):
    trace_id: str
    span_id: str
    ref_type: TracesRefType

    def __init__(self, trace_id: str, span_id: str, ref_type: TracesRefType) -> None:
        self.trace_id = trace_id
        self.span_id = span_id
        self.ref_type = ref_type

    def __dict__(self) -> dict[str, Any]:
        return {
            "traceId": self.trace_id,
            "spanId": self.span_id,
            "refType": self.ref_type.value,
        }


class Traces(ABC):
    ts_bucket_start: np.uint64
    resource_fingerprint: str
    timestamp: np.datetime64
    trace_id: str
    span_id: str
    trace_state: str
    parent_span_id: str
    flags: np.uint32
    name: str
    kind: np.int8
    kind_string: str
    duration_nano: np.uint64
    status_code: np.int16
    status_message: str
    status_code_string: str
    attribute_string: dict[str, str]
    attributes_number: dict[str, np.float64]
    attributes_bool: dict[str, bool]
    resources_string: dict[str, str]
    events: List[str]
    links: str
    response_status_code: str
    external_http_url: str
    http_url: str
    external_http_method: str
    http_method: str
    http_host: str
    db_name: str
    db_operation: str
    has_error: bool
    is_remote: str

    resource: List[TracesResource]
    tag_attributes: List[TracesTagAttributes]
    resource_keys: List[TracesResourceOrAttributeKeys]
    attribute_keys: List[TracesResourceOrAttributeKeys]
    span_attributes: List[TracesSpanAttribute]
    error_events: List[TracesErrorEvent]

    def __init__(
        self,
        timestamp: datetime.datetime = datetime.datetime.now(),
        duration: datetime.timedelta = datetime.timedelta(seconds=1),
        trace_id: str = "",
        span_id: str = "",
        parent_span_id: str = "",
        name: str = "default span",
        kind: TracesKind = TracesKind.SPAN_KIND_INTERNAL,
        status_code: TracesStatusCode = TracesStatusCode.STATUS_CODE_UNSET,
        status_message: str = "",
        resources: dict[str, Any] = {},
        attributes: dict[str, Any] = {},
        events: List[TracesEvent] = [],
        links: List[TracesLink] = [],
        trace_state: str = "",
        flags: np.uint32 = 0,
    ) -> None:
        self.tag_attributes = []
        self.attribute_keys = []
        self.resource_keys = []
        self.span_attributes = []
        self.error_events = []

        # Calculate ts_bucket_start (30mins bucket)
        # Round down to nearest 30-minute interval
        minute = timestamp.minute
        if minute < 30:
            bucket_minute = 0
        else:
            bucket_minute = 30

        bucket_start = timestamp.replace(minute=bucket_minute, second=0, microsecond=0)
        self.ts_bucket_start = np.uint64(int(bucket_start.timestamp()))

        self.timestamp = timestamp

        self.duration_nano = np.uint64(int(duration.total_seconds() * 1e9))

        # Initialize trace fields
        self.trace_id = trace_id
        self.span_id = span_id
        self.parent_span_id = parent_span_id
        self.trace_state = trace_state
        self.flags = flags
        self.name = name
        self.kind = kind.value
        self.kind_string = kind.name
        self.status_code = status_code.value
        self.status_message = status_message
        self.status_code_string = status_code.name
        self.has_error = status_code == TracesStatusCode.STATUS_CODE_ERROR
        self.is_remote = self._determine_is_remote(flags)

        # Initialize custom fields to empty values
        self.response_status_code = ""
        self.external_http_url = ""
        self.http_url = ""
        self.external_http_method = ""
        self.http_method = ""
        self.http_host = ""
        self.db_name = ""
        self.db_operation = ""

        # Process resources and derive service_name
        self.resources_string = {k: str(v) for k, v in resources.items()}
        self.service_name = self.resources_string.get("service.name", "default-service")

        for k, v in self.resources_string.items():
            self.tag_attributes.append(
                TracesTagAttributes(
                    timestamp=timestamp,
                    tag_key=k,
                    tag_type="resource",
                    tag_data_type="string",
                    string_value=v,
                    number_value=None,
                )
            )
            self.resource_keys.append(
                TracesResourceOrAttributeKeys(
                    name=k, datatype="string", tag_type="resource"
                )
            )
            self.span_attributes.append(
                TracesSpanAttribute(
                    key=k,
                    tag_type="resource",
                    data_type="string",
                    string_value=v,
                )
            )

        # Calculate resource fingerprint
        self.resource_fingerprint = LogsOrTracesFingerprint(
            self.resources_string
        ).calculate()

        # Process attributes by type and populate custom fields
        self.attribute_string = {}
        self.attributes_number = {}
        self.attributes_bool = {}

        for k, v in attributes.items():
            # Populate custom fields based on attribute keys (following Go exporter logic)
            self._populate_custom_attrs(k, v)

            if isinstance(v, bool):
                self.attributes_bool[k] = v
                self.tag_attributes.append(
                    TracesTagAttributes(
                        timestamp=timestamp,
                        tag_key=k,
                        tag_type="tag",
                        tag_data_type="bool",
                        string_value=None,
                        number_value=None,
                    )
                )
                self.attribute_keys.append(
                    TracesResourceOrAttributeKeys(
                        name=k, datatype="bool", tag_type="tag"
                    )
                )
                self.span_attributes.append(
                    TracesSpanAttribute(
                        key=k,
                        tag_type="tag",
                        data_type="bool",
                        number_value=None,
                    )
                )
            elif isinstance(v, (int, float)):
                self.attributes_number[k] = np.float64(v)
                self.tag_attributes.append(
                    TracesTagAttributes(
                        timestamp=timestamp,
                        tag_key=k,
                        tag_type="tag",
                        tag_data_type="float64",
                        string_value=None,
                        number_value=np.float64(v),
                    )
                )
                self.attribute_keys.append(
                    TracesResourceOrAttributeKeys(
                        name=k, datatype="float64", tag_type="tag"
                    )
                )
                self.span_attributes.append(
                    TracesSpanAttribute(
                        key=k,
                        tag_type="tag",
                        data_type="float64",
                        number_value=np.float64(v),
                    )
                )
            else:
                self.attribute_string[k] = str(v)
                self.tag_attributes.append(
                    TracesTagAttributes(
                        timestamp=timestamp,
                        tag_key=k,
                        tag_type="tag",
                        tag_data_type="string",
                        string_value=str(v),
                        number_value=None,
                    )
                )
                self.attribute_keys.append(
                    TracesResourceOrAttributeKeys(
                        name=k, datatype="string", tag_type="tag"
                    )
                )
                self.span_attributes.append(
                    TracesSpanAttribute(
                        key=k,
                        tag_type="tag",
                        data_type="string",
                        string_value=str(v),
                    )
                )

        # Process events and derive error events
        self.events = []
        for event in events:
            self.events.append(
                json.dumps([event.name, event.time_unix_nano, event.attribute_map])
            )

            # Create error events for exception events (following Go exporter logic)
            if event.name == "exception":
                error_event = self._create_error_event(event)
                self.error_events.append(error_event)

        # In Python, when you define a function with a mutable default argument (like a list []), that default object is created once when the function is defined,
        # not each time the function is called.
        # This means all calls to the function share the same default object.
        # https://stackoverflow.com/questions/1132941/least-astonishment-in-python-the-mutable-default-argument
        links_copy = links.copy() if links else []
        if self.parent_span_id != "":
            links_copy.insert(
                0,
                TracesLink(
                    trace_id=self.trace_id,
                    span_id=self.parent_span_id,
                    ref_type=TracesRefType.REF_TYPE_CHILD_OF,
                ),
            )

        self.links = json.dumps(
            [link.__dict__() for link in links_copy], separators=(",", ":")
        )

        # Initialize resource
        self.resource = []
        self.resource.append(
            TracesResource(
                labels=self.resources_string,
                fingerprint=self.resource_fingerprint,
                seen_at_ts_bucket_start=self.ts_bucket_start,
            )
        )

    def _create_error_event(self, event: TracesEvent) -> TracesErrorEvent:
        """Create error event from exception event (following Go exporter logic)"""
        error_id = str(uuid.uuid4()).replace("-", "")

        # Create error group ID based on exception type and message
        exception_type = event.attribute_map.get("exception.type", "")
        exception_message = event.attribute_map.get("exception.message", "")

        error_group_content = self.service_name + exception_type + exception_message

        error_group_id = hashlib.md5(error_group_content.encode()).hexdigest()

        return TracesErrorEvent(
            event=event,
            error_id=error_id,
            error_group_id=error_group_id,
        )

    def _determine_is_remote(self, flags: np.uint32) -> str:
        """Determine if span is remote based on flags (following Go exporter logic)"""
        has_is_remote_mask = 0x00000100
        is_remote_mask = 0x00000200

        if flags & has_is_remote_mask != 0:
            if flags & is_remote_mask != 0:
                return "yes"

            return "no"
        return "unknown"

    def _populate_custom_attrs(  # pylint: disable=too-many-branches
        self, key: str, value: Any
    ) -> None:
        """Populate custom attributes based on attribute keys (following Go exporter logic)"""
        str_value = str(value)

        if key in ["http.status_code", "http.response.status_code"]:
            # Handle both string/int http status codes
            try:
                status_int = int(str_value)
                self.response_status_code = str(status_int)
            except ValueError:
                self.response_status_code = str_value
        elif key in ["http.url", "url.full"] and self.kind == 3:  # SPAN_KIND_CLIENT
            # For client spans, extract hostname for external URL
            try:
                parsed = urlparse(str_value)
                self.external_http_url = parsed.hostname or str_value
                self.http_url = str_value
            except Exception:  # pylint: disable=broad-exception-caught
                self.external_http_url = str_value
                self.http_url = str_value
        elif (
            key in ["http.method", "http.request.method"] and self.kind == 3
        ):  # SPAN_KIND_CLIENT
            self.external_http_method = str_value
            self.http_method = str_value
        elif key in ["http.url", "url.full"] and self.kind != 3:
            self.http_url = str_value
        elif key in ["http.method", "http.request.method"] and self.kind != 3:
            self.http_method = str_value
        elif key in [
            "http.host",
            "server.address",
            "client.address",
            "http.request.header.host",
        ]:
            self.http_host = str_value
        elif key in ["db.name", "db.namespace"]:
            self.db_name = str_value
        elif key in ["db.operation", "db.operation.name"]:
            self.db_operation = str_value
        elif key == "rpc.grpc.status_code":
            # Handle both string/int status code in GRPC spans
            try:
                status_int = int(str_value)
                self.response_status_code = str(status_int)
            except ValueError:
                self.response_status_code = str_value
        elif key == "rpc.jsonrpc.error_code":
            self.response_status_code = str_value

    def np_arr(self) -> np.array:
        """Return span data as numpy array for database insertion"""
        return np.array(
            [
                self.ts_bucket_start,
                self.resource_fingerprint,
                self.timestamp,
                self.trace_id,
                self.span_id,
                self.trace_state,
                self.parent_span_id,
                self.flags,
                self.name,
                self.kind,
                self.kind_string,
                self.duration_nano,
                self.status_code,
                self.status_message,
                self.status_code_string,
                self.attribute_string,
                self.attributes_number,
                self.attributes_bool,
                self.resources_string,
                self.events,
                self.links,
                self.response_status_code,
                self.external_http_url,
                self.http_url,
                self.external_http_method,
                self.http_method,
                self.http_host,
                self.db_name,
                self.db_operation,
                self.has_error,
                self.is_remote,
                self.resources_string,
            ],
            dtype=object,
        )


@pytest.fixture(name="insert_traces", scope="function")
def insert_traces(
    clickhouse: types.TestContainerClickhouse,
) -> Generator[Callable[[List[Traces]], None], Any, None]:
    def _insert_traces(traces: List[Traces]) -> None:
        """
        Insert traces into ClickHouse tables following the same logic as the Go exporter.
        This function handles insertion into multiple tables:
        - distributed_signoz_index_v3 (main traces table)
        - distributed_traces_v3_resource (resource fingerprints)
        - distributed_tag_attributes_v2 (tag attributes)
        - distributed_span_attributes_keys (attribute keys)
        - distributed_signoz_error_index_v2 (error events)
        """
        resources: List[TracesResource] = []
        for trace in traces:
            resources.extend(trace.resource)

        if len(resources) > 0:
            clickhouse.conn.insert(
                database="signoz_traces",
                table="distributed_traces_v3_resource",
                data=[resource.np_arr() for resource in resources],
            )

        tag_attributes: List[TracesTagAttributes] = []
        for trace in traces:
            tag_attributes.extend(trace.tag_attributes)

        if len(tag_attributes) > 0:
            clickhouse.conn.insert(
                database="signoz_traces",
                table="distributed_tag_attributes_v2",
                data=[tag_attribute.np_arr() for tag_attribute in tag_attributes],
            )

        attribute_keys: List[TracesResourceOrAttributeKeys] = []
        for trace in traces:
            attribute_keys.extend(trace.attribute_keys)

        if len(attribute_keys) > 0:
            clickhouse.conn.insert(
                database="signoz_traces",
                table="distributed_span_attributes_keys",
                data=[attribute_key.np_arr() for attribute_key in attribute_keys],
            )

        # Insert main traces
        clickhouse.conn.insert(
            database="signoz_traces",
            table="distributed_signoz_index_v3",
            column_names=[
                "ts_bucket_start",
                "resource_fingerprint",
                "timestamp",
                "trace_id",
                "span_id",
                "trace_state",
                "parent_span_id",
                "flags",
                "name",
                "kind",
                "kind_string",
                "duration_nano",
                "status_code",
                "status_message",
                "status_code_string",
                "attributes_string",
                "attributes_number",
                "attributes_bool",
                "resources_string",
                "events",
                "links",
                "response_status_code",
                "external_http_url",
                "http_url",
                "external_http_method",
                "http_method",
                "http_host",
                "db_name",
                "db_operation",
                "has_error",
                "is_remote",
                "resource",
            ],
            data=[trace.np_arr() for trace in traces],
        )

        # Insert error events
        error_events: List[TracesErrorEvent] = []
        for trace in traces:
            error_events.extend(trace.error_events)

        if len(error_events) > 0:
            clickhouse.conn.insert(
                database="signoz_traces",
                table="distributed_signoz_error_index_v2",
                data=[error_event.np_arr() for error_event in error_events],
            )

    yield _insert_traces

    clickhouse.conn.query(
        f"TRUNCATE TABLE signoz_traces.signoz_index_v3 ON CLUSTER '{clickhouse.env['SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_CLUSTER']}' SYNC"
    )
    clickhouse.conn.query(
        f"TRUNCATE TABLE signoz_traces.traces_v3_resource ON CLUSTER '{clickhouse.env['SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_CLUSTER']}' SYNC"
    )
    clickhouse.conn.query(
        f"TRUNCATE TABLE signoz_traces.tag_attributes_v2 ON CLUSTER '{clickhouse.env['SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_CLUSTER']}' SYNC"
    )
    clickhouse.conn.query(
        f"TRUNCATE TABLE signoz_traces.span_attributes_keys ON CLUSTER '{clickhouse.env['SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_CLUSTER']}' SYNC"
    )
    clickhouse.conn.query(
        f"TRUNCATE TABLE signoz_traces.signoz_error_index_v2 ON CLUSTER '{clickhouse.env['SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_CLUSTER']}' SYNC"
    )

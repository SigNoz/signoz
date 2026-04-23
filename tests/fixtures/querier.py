from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from http import HTTPStatus
from typing import Any

import requests

from fixtures import types
from fixtures.logs import Logs
from fixtures.traces import TraceIdGenerator, Traces, TracesKind, TracesStatusCode

DEFAULT_STEP_INTERVAL = 60  # seconds
DEFAULT_TOLERANCE = 1e-9
QUERY_TIMEOUT = 30  # seconds


@dataclass
class TelemetryFieldKey:
    name: str
    field_data_type: str | None = None
    field_context: str | None = None

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "fieldDataType": self.field_data_type,
            "fieldContext": self.field_context,
        }


@dataclass
class OrderBy:
    key: TelemetryFieldKey
    direction: str = "asc"

    def to_dict(self) -> dict:
        return {"key": self.key.to_dict(), "direction": self.direction}


@dataclass
class BuilderQuery:
    signal: str
    name: str = "A"
    source: str | None = None
    limit: int | None = None
    filter_expression: str | None = None
    select_fields: list[TelemetryFieldKey] | None = None
    order: list[OrderBy] | None = None

    def to_dict(self) -> dict:
        spec: dict[str, Any] = {
            "signal": self.signal,
            "name": self.name,
        }
        if self.source:
            spec["source"] = self.source
        if self.limit is not None:
            spec["limit"] = self.limit
        if self.filter_expression:
            spec["filter"] = {"expression": self.filter_expression}
        if self.select_fields:
            spec["selectFields"] = [f.to_dict() for f in self.select_fields]
        if self.order:
            spec["order"] = [o.to_dict() if hasattr(o, "to_dict") else o for o in self.order]
        return {"type": "builder_query", "spec": spec}


@dataclass
class TraceOperatorQuery:
    name: str
    expression: str
    return_spans_from: str
    limit: int | None = None
    order: list[OrderBy] | None = None

    def to_dict(self) -> dict:
        spec: dict[str, Any] = {
            "name": self.name,
            "expression": self.expression,
            "returnSpansFrom": self.return_spans_from,
        }
        if self.limit is not None:
            spec["limit"] = self.limit
        if self.order:
            spec["order"] = [o.to_dict() if hasattr(o, "to_dict") else o for o in self.order]
        return {"type": "builder_trace_operator", "spec": spec}


@dataclass
class QueryRangeRequest:
    start: int  # nanoseconds
    end: int  # nanoseconds
    queries: list[BuilderQuery | TraceOperatorQuery]
    request_type: str | None = "raw"

    def to_dict(self) -> dict:
        body: dict[str, Any] = {
            "start": self.start,
            "end": self.end,
            "compositeQuery": {
                "queries": [q.to_dict() for q in self.queries],
            },
        }
        if self.request_type is not None:
            body["requestType"] = self.request_type
        return body


def make_query_request(
    signoz: types.SigNoz,
    token: str,
    start_ms: int,
    end_ms: int,
    queries: list[dict],
    *,
    request_type: str = "time_series",
    format_options: dict | None = None,
    variables: dict | None = None,
    no_cache: bool = True,
    timeout: int = QUERY_TIMEOUT,
) -> requests.Response:
    if format_options is None:
        format_options = {"formatTableResultForUI": False, "fillGaps": False}

    payload = {
        "schemaVersion": "v1",
        "start": start_ms,
        "end": end_ms,
        "requestType": request_type,
        "compositeQuery": {"queries": queries},
        "formatOptions": format_options,
        "noCache": no_cache,
    }
    if variables:
        payload["variables"] = variables

    return requests.post(
        signoz.self.host_configs["8080"].get("/api/v5/query_range"),
        timeout=timeout,
        headers={"authorization": f"Bearer {token}"},
        json=payload,
    )


def build_builder_query(
    name: str,
    metric_name: str,
    time_aggregation: str,
    space_aggregation: str,
    *,
    comparisonSpaceAggregationParam: dict | None = None,
    temporality: str | None = None,
    source: str | None = None,
    step_interval: int = DEFAULT_STEP_INTERVAL,
    group_by: list[str] | None = None,
    filter_expression: str | None = None,
    functions: list[dict] | None = None,
    disabled: bool = False,
) -> dict:
    spec: dict[str, Any] = {
        "name": name,
        "signal": "metrics",
        "aggregations": [
            {
                "metricName": metric_name,
                "timeAggregation": time_aggregation,
                "spaceAggregation": space_aggregation,
            }
        ],
        "stepInterval": step_interval,
        "disabled": disabled,
    }
    if source:
        spec["source"] = source
    if temporality:
        spec["aggregations"][0]["temporality"] = temporality
    if comparisonSpaceAggregationParam:
        spec["aggregations"][0]["comparisonSpaceAggregationParam"] = comparisonSpaceAggregationParam
    if group_by:
        spec["groupBy"] = [
            {
                "name": label,
            }
            for label in group_by
        ]

    if filter_expression:
        spec["filter"] = {"expression": filter_expression}

    if functions:
        spec["functions"] = functions

    return {"type": "builder_query", "spec": spec}


def build_formula_query(
    name: str,
    expression: str,
    *,
    functions: list[dict] | None = None,
    disabled: bool = False,
) -> dict:
    spec: dict[str, Any] = {
        "name": name,
        "expression": expression,
        "disabled": disabled,
    }
    if functions:
        spec["functions"] = functions
    return {"type": "builder_formula", "spec": spec}


def build_function(name: str, *args: Any) -> dict:
    func: dict[str, Any] = {"name": name}
    if args:
        func["args"] = [{"value": arg} for arg in args]
    return func


def get_series_values(response_json: dict, query_name: str) -> list[dict]:
    results = response_json.get("data", {}).get("data", {}).get("results", [])
    result = find_named_result(results, query_name)
    if not result:
        return []
    aggregations = result.get("aggregations", [])
    if not aggregations:
        return []
    # at the time of writing this, the series is always a list with one element
    series = aggregations[0].get("series", [])
    if not series:
        return []
    return series[0].get("values", [])


def get_all_series(response_json: dict, query_name: str) -> list[dict]:
    results = response_json.get("data", {}).get("data", {}).get("results", [])
    result = find_named_result(results, query_name)
    if not result:
        return []
    aggregations = result.get("aggregations", [])
    if not aggregations:
        return []
    # at the time of writing this, the series is always a list with one element
    return aggregations[0].get("series", [])


def get_scalar_value(response_json: dict, query_name: str) -> float | None:
    values = get_series_values(response_json, query_name)
    if values:
        return values[0].get("value")
    return None


def get_all_warnings(response_json: dict) -> list[dict]:
    return response_json.get("data", {}).get("warning", {}).get("warnings", [])


def get_error_message(response_json: dict) -> str:
    return response_json.get("error", {}).get("message", "")


def compare_values(
    v1: float,
    v2: float,
    tolerance: float = DEFAULT_TOLERANCE,
) -> bool:
    return abs(v1 - v2) <= tolerance


def compare_series_values(
    values1: list[dict],
    values2: list[dict],
    tolerance: float = DEFAULT_TOLERANCE,
) -> bool:
    if len(values1) != len(values2):
        return False

    sorted1 = sorted(values1, key=lambda x: x["timestamp"])
    sorted2 = sorted(values2, key=lambda x: x["timestamp"])

    for v1, v2 in zip(sorted1, sorted2):
        if v1["timestamp"] != v2["timestamp"]:
            return False
        if not compare_values(v1["value"], v2["value"], tolerance):
            return False
    return True


def compare_all_series(
    series1: list[dict],
    series2: list[dict],
    tolerance: float = DEFAULT_TOLERANCE,
) -> bool:
    if len(series1) != len(series2):
        return False

    # oh my lovely python
    def series_key(s: dict) -> str:
        labels = s.get("labels", [])
        return str(sorted([(lbl.get("key", {}).get("name", ""), lbl.get("value", "")) for lbl in labels]))

    sorted1 = sorted(series1, key=series_key)
    sorted2 = sorted(series2, key=series_key)

    for s1, s2 in zip(sorted1, sorted2):
        if series_key(s1) != series_key(s2):
            return False
        if not compare_series_values(
            s1.get("values", []),
            s2.get("values", []),
            tolerance,
        ):
            return False
    return True


def assert_results_equal(
    result_cached: dict,
    result_no_cache: dict,
    query_name: str,
    context: str,
    tolerance: float = DEFAULT_TOLERANCE,
) -> None:
    values_cached = get_series_values(result_cached, query_name)
    values_no_cache = get_series_values(result_no_cache, query_name)

    sorted_cached = sorted(values_cached, key=lambda x: x["timestamp"])
    sorted_no_cache = sorted(values_no_cache, key=lambda x: x["timestamp"])

    assert len(sorted_cached) == len(sorted_no_cache), f"{context}: Different number of values. Cached: {len(sorted_cached)}, No-cache: {len(sorted_no_cache)}\nCached timestamps: {[v['timestamp'] for v in sorted_cached]}\nNo-cache timestamps: {[v['timestamp'] for v in sorted_no_cache]}"

    for v_cached, v_no_cache in zip(sorted_cached, sorted_no_cache):
        assert v_cached["timestamp"] == v_no_cache["timestamp"], f"{context}: Timestamp mismatch. Cached: {v_cached['timestamp']}, No-cache: {v_no_cache['timestamp']}"
        assert compare_values(v_cached["value"], v_no_cache["value"], tolerance), f"{context}: Value mismatch at timestamp {v_cached['timestamp']}. Cached: {v_cached['value']}, No-cache: {v_no_cache['value']}"


def assert_all_series_equal(
    result_cached: dict,
    result_no_cache: dict,
    query_name: str,
    context: str,
    tolerance: float = DEFAULT_TOLERANCE,
) -> None:
    series_cached = get_all_series(result_cached, query_name)
    series_no_cache = get_all_series(result_no_cache, query_name)

    assert compare_all_series(series_cached, series_no_cache, tolerance), f"{context}: Cached series differ from non-cached series"


def expected_minutely_bucket_timestamps_ms(now: datetime) -> list[list[int]]:
    previous_five = [int((now - timedelta(minutes=m)).timestamp() * 1000) for m in range(5, 0, -1)]
    with_current = previous_five + [int(now.timestamp() * 1000)]
    return [previous_five, with_current]


def assert_minutely_bucket_timestamps(
    points: list[dict[str, Any]],
    now: datetime,
    *,
    context: str,
) -> list[int]:
    expected = expected_minutely_bucket_timestamps_ms(now)
    actual = [p["timestamp"] for p in points]
    assert actual in expected, f"Unexpected timestamps for {context}: {actual}"
    return actual


def assert_minutely_bucket_values(
    points: list[dict[str, Any]],
    now: datetime,
    *,
    expected_by_ts: dict[int, float],
    context: str,
) -> None:
    timestamps = assert_minutely_bucket_timestamps(points, now, context=context)
    expected = {ts: 0 for ts in timestamps}
    expected.update(expected_by_ts)

    for point in points:
        ts = point["timestamp"]
        assert point["value"] == expected[ts], f"Unexpected value for {context} at timestamp={ts}: got {point['value']}, expected {expected[ts]}"


def index_series_by_label(
    series: list[dict[str, Any]],
    label_name: str,
) -> dict[str, dict[str, Any]]:
    series_by_label: dict[str, dict[str, Any]] = {}
    for s in series:
        label = next(
            (l for l in s.get("labels", []) if l.get("key", {}).get("name") == label_name),
            None,
        )
        assert label is not None, f"Expected {label_name} label in series"
        series_by_label[label["value"]] = s
    return series_by_label


def find_named_result(
    results: list[dict[str, Any]],
    name: str,
) -> dict[str, Any] | None:
    return next(
        (r for r in results if r.get("name") == name or r.get("queryName") == name or (r.get("spec") or {}).get("name") == name),
        None,
    )


def build_scalar_query(
    name: str,
    signal: str,
    aggregations: list[dict],
    *,
    source: str | None = None,
    group_by: list[dict] | None = None,
    order: list[dict] | None = None,
    limit: int | None = None,
    filter_expression: str | None = None,
    having_expression: str | None = None,
    step_interval: int = DEFAULT_STEP_INTERVAL,
    disabled: bool = False,
) -> dict:
    spec: dict[str, Any] = {
        "name": name,
        "signal": signal,
        "stepInterval": step_interval,
        "disabled": disabled,
        "aggregations": aggregations,
    }

    if source:
        spec["source"] = source

    if group_by:
        spec["groupBy"] = group_by

    if order:
        spec["order"] = order

    if limit is not None:
        spec["limit"] = limit

    if filter_expression:
        spec["filter"] = {"expression": filter_expression}

    if having_expression:
        spec["having"] = {"expression": having_expression}

    return {"type": "builder_query", "spec": spec}


def build_group_by_field(
    name: str,
    field_data_type: str = "string",
    field_context: str = "resource",
) -> dict:
    return {
        "name": name,
        "fieldDataType": field_data_type,
        "fieldContext": field_context,
    }


def build_order_by(name: str, direction: str = "desc") -> dict:
    return {"key": {"name": name}, "direction": direction}


def build_logs_aggregation(expression: str, alias: str | None = None) -> dict:
    agg: dict[str, Any] = {"expression": expression}
    if alias:
        agg["alias"] = alias
    return agg


def build_metrics_aggregation(
    metric_name: str,
    time_aggregation: str,
    space_aggregation: str,
    temporality: str = "cumulative",
) -> dict:
    return {
        "metricName": metric_name,
        "temporality": temporality,
        "timeAggregation": time_aggregation,
        "spaceAggregation": space_aggregation,
    }


def get_scalar_table_data(response_json: dict) -> list[list[Any]]:
    results = response_json.get("data", {}).get("data", {}).get("results", [])
    if not results:
        return []
    return results[0].get("data", [])


def get_scalar_columns(response_json: dict) -> list[dict]:
    results = response_json.get("data", {}).get("data", {}).get("results", [])
    if not results:
        return []
    return results[0].get("columns", [])


def get_column_data_from_response(response_json: dict, column_name: str) -> list[Any]:
    results = response_json.get("data", {}).get("data", {}).get("results", [])
    if not results:
        return []
    rows = results[0].get("rows") or []
    return [row["data"][column_name] for row in rows if column_name in row.get("data", {})]


def assert_scalar_result_order(
    data: list[list[Any]],
    expected_order: list[tuple],
    context: str = "",
) -> None:
    assert len(data) == len(expected_order), f"{context}: Expected {len(expected_order)} rows, got {len(data)}. Data: {data}"

    for i, (row, expected) in enumerate(zip(data, expected_order)):
        for j, expected_val in enumerate(expected):
            actual_val = row[j]
            assert actual_val == expected_val, f"{context}: Row {i}, column {j} mismatch. Expected {expected_val}, got {actual_val}. Full row: {row}, expected: {expected}"


def assert_scalar_column_order(
    data: list[list[Any]],
    column_index: int,
    expected_values: list[Any],
    context: str = "",
) -> None:
    assert len(data) == len(expected_values), f"{context}: Expected {len(expected_values)} rows, got {len(data)}"

    actual_values = [row[column_index] for row in data]
    assert actual_values == expected_values, f"{context}: Column {column_index} order mismatch. Expected {expected_values}, got {actual_values}"


def format_timestamp(dt: datetime) -> str:
    """
    Format a datetime object to match the API's timestamp format.
    The API returns timestamps with minimal fractional seconds precision.
    Example: 2026-02-03T20:54:56.5Z for 500000 microseconds
    """
    base_str = dt.strftime("%Y-%m-%dT%H:%M:%S")
    if dt.microsecond:
        # Convert microseconds to fractional seconds and strip trailing zeros
        fractional = f"{dt.microsecond / 1000000:.6f}"[2:].rstrip("0")
        return f"{base_str}.{fractional}Z"
    return f"{base_str}Z"


def assert_identical_query_response(response1: requests.Response, response2: requests.Response) -> None:
    """
    Assert that two query responses are identical in status and data.
    """
    assert response1.status_code == response2.status_code, "Status codes do not match"
    if response1.status_code == HTTPStatus.OK:
        assert response1.json()["status"] == response2.json()["status"], "Response statuses do not match"
        assert response1.json()["data"]["data"]["results"] == response2.json()["data"]["data"]["results"], "Response data do not match"


def generate_logs_with_corrupt_metadata() -> list[Logs]:
    """
    Specifically, entries with 'id', 'timestamp', 'severity_text', 'severity_number' and 'body' fields in metadata
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)

    return [
        Logs(
            timestamp=now - timedelta(seconds=4),
            body="POST /integration request received",
            severity_text="INFO",
            resources={
                "deployment.environment": "production",
                "service.name": "http-service",
                "os.type": "linux",
                "host.name": "linux-000",
                "cloud.provider": "integration",
                "cloud.account.id": "000",
                "timestamp": "corrupt_data",
            },
            attributes={
                "net.transport": "IP.TCP",
                "http.scheme": "http",
                "http.user_agent": "Integration Test",
                "http.request.method": "POST",
                "http.response.status_code": "200",
                "severity_text": "corrupt_data",
                "timestamp": "corrupt_data",
            },
            trace_id="1",
        ),
        Logs(
            timestamp=now - timedelta(seconds=3),
            body="SELECT query executed",
            severity_text="DEBUG",
            resources={
                "deployment.environment": "production",
                "service.name": "http-service",
                "os.type": "linux",
                "host.name": "linux-000",
                "cloud.provider": "integration",
                "cloud.account.id": "000",
                "severity_number": "corrupt_data",
                "id": "corrupt_data",
            },
            attributes={
                "db.name": "integration",
                "db.operation": "SELECT",
                "db.statement": "SELECT * FROM integration",
                "trace_id": "2",
            },
        ),
        Logs(
            timestamp=now - timedelta(seconds=2),
            body="HTTP PATCH failed with 404",
            severity_text="WARN",
            resources={
                "deployment.environment": "production",
                "service.name": "http-service",
                "os.type": "linux",
                "host.name": "linux-000",
                "cloud.provider": "integration",
                "cloud.account.id": "000",
                "body": "corrupt_data",
                "trace_id": "3",
            },
            attributes={
                "http.request.method": "PATCH",
                "http.status_code": "404",
                "id": "1",
            },
        ),
        Logs(
            timestamp=now - timedelta(seconds=1),
            body="{'trace_id': '4'}",
            severity_text="ERROR",
            resources={
                "deployment.environment": "production",
                "service.name": "topic-service",
                "os.type": "linux",
                "host.name": "linux-001",
                "cloud.provider": "integration",
                "cloud.account.id": "001",
            },
            attributes={
                "message.type": "SENT",
                "messaging.operation": "publish",
                "messaging.message.id": "001",
                "body": "corrupt_data",
                "timestamp": "corrupt_data",
            },
        ),
    ]


def generate_traces_with_corrupt_metadata() -> list[Traces]:
    """
    Specifically, entries with 'id', 'timestamp', 'trace_id' and 'duration_nano' fields in metadata
    """
    http_service_trace_id = TraceIdGenerator.trace_id()
    http_service_span_id = TraceIdGenerator.span_id()
    http_service_db_span_id = TraceIdGenerator.span_id()
    http_service_patch_span_id = TraceIdGenerator.span_id()
    topic_service_trace_id = TraceIdGenerator.trace_id()
    topic_service_span_id = TraceIdGenerator.span_id()

    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)

    return [
        Traces(
            timestamp=now - timedelta(seconds=4),
            duration=timedelta(seconds=3),
            trace_id=http_service_trace_id,
            span_id=http_service_span_id,
            parent_span_id="",
            name="POST /integration",
            kind=TracesKind.SPAN_KIND_SERVER,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            status_message="",
            resources={
                "deployment.environment": "production",
                "service.name": "http-service",
                "os.type": "linux",
                "host.name": "linux-000",
                "cloud.provider": "integration",
                "cloud.account.id": "000",
                "trace_id": "corrupt_data",
            },
            attributes={
                "net.transport": "IP.TCP",
                "http.scheme": "http",
                "http.user_agent": "Integration Test",
                "http.request.method": "POST",
                "http.response.status_code": "200",
                "timestamp": "corrupt_data",
            },
        ),
        Traces(
            timestamp=now - timedelta(seconds=3.5),
            duration=timedelta(seconds=5),
            trace_id=http_service_trace_id,
            span_id=http_service_db_span_id,
            parent_span_id=http_service_span_id,
            name="SELECT",
            kind=TracesKind.SPAN_KIND_CLIENT,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            status_message="",
            resources={
                "deployment.environment": "production",
                "service.name": "http-service",
                "os.type": "linux",
                "host.name": "linux-000",
                "cloud.provider": "integration",
                "cloud.account.id": "000",
                "timestamp": "corrupt_data",
            },
            attributes={
                "db.name": "integration",
                "db.operation": "SELECT",
                "db.statement": "SELECT * FROM integration",
                "trace_d": "corrupt_data",
            },
        ),
        Traces(
            timestamp=now - timedelta(seconds=3),
            duration=timedelta(seconds=1),
            trace_id=http_service_trace_id,
            span_id=http_service_patch_span_id,
            parent_span_id=http_service_span_id,
            name="HTTP PATCH",
            kind=TracesKind.SPAN_KIND_CLIENT,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            status_message="",
            resources={
                "deployment.environment": "production",
                "service.name": "http-service",
                "os.type": "linux",
                "host.name": "linux-000",
                "cloud.provider": "integration",
                "cloud.account.id": "000",
                "duration_nano": "corrupt_data",
            },
            attributes={
                "http.request.method": "PATCH",
                "http.status_code": "404",
                "id": "1",
            },
        ),
        Traces(
            timestamp=now - timedelta(seconds=1),
            duration=timedelta(seconds=4),
            trace_id=topic_service_trace_id,
            span_id=topic_service_span_id,
            parent_span_id="",
            name="topic publish",
            kind=TracesKind.SPAN_KIND_PRODUCER,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            status_message="",
            resources={
                "deployment.environment": "production",
                "service.name": "topic-service",
                "os.type": "linux",
                "host.name": "linux-001",
                "cloud.provider": "integration",
                "cloud.account.id": "001",
            },
            attributes={
                "message.type": "SENT",
                "messaging.operation": "publish",
                "messaging.message.id": "001",
                "duration_nano": "corrupt_data",
                "id": 1,
            },
        ),
    ]

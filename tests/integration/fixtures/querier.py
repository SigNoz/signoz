from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import requests

from fixtures import types

DEFAULT_STEP_INTERVAL = 60  # seconds
DEFAULT_TOLERANCE = 1e-9
QUERY_TIMEOUT = 30  # seconds


def make_query_request(
    signoz: types.SigNoz,
    token: str,
    start_ms: int,
    end_ms: int,
    queries: List[Dict],
    *,
    request_type: str = "time_series",
    format_options: Optional[Dict] = None,
    variables: Optional[Dict] = None,
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
    temporality: str = "cumulative",
    step_interval: int = DEFAULT_STEP_INTERVAL,
    group_by: Optional[List[str]] = None,
    filter_expression: Optional[str] = None,
    functions: Optional[List[Dict]] = None,
    disabled: bool = False,
) -> Dict:
    spec: Dict[str, Any] = {
        "name": name,
        "signal": "metrics",
        "aggregations": [
            {
                "metricName": metric_name,
                "temporality": temporality,
                "timeAggregation": time_aggregation,
                "spaceAggregation": space_aggregation,
            }
        ],
        "stepInterval": step_interval,
        "disabled": disabled,
    }

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
    functions: Optional[List[Dict]] = None,
    disabled: bool = False,
) -> Dict:
    spec: Dict[str, Any] = {
        "name": name,
        "expression": expression,
        "disabled": disabled,
    }
    if functions:
        spec["functions"] = functions
    return {"type": "builder_formula", "spec": spec}


def build_function(name: str, *args: Any) -> Dict:
    func: Dict[str, Any] = {"name": name}
    if args:
        func["args"] = [{"value": arg} for arg in args]
    return func


def get_series_values(response_json: Dict, query_name: str) -> List[Dict]:
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


def get_all_series(response_json: Dict, query_name: str) -> List[Dict]:
    results = response_json.get("data", {}).get("data", {}).get("results", [])
    result = find_named_result(results, query_name)
    if not result:
        return []
    aggregations = result.get("aggregations", [])
    if not aggregations:
        return []
    # at the time of writing this, the series is always a list with one element
    return aggregations[0].get("series", [])


def get_scalar_value(response_json: Dict, query_name: str) -> Optional[float]:
    values = get_series_values(response_json, query_name)
    if values:
        return values[0].get("value")
    return None


def compare_values(
    v1: float,
    v2: float,
    tolerance: float = DEFAULT_TOLERANCE,
) -> bool:
    return abs(v1 - v2) <= tolerance


def compare_series_values(
    values1: List[Dict],
    values2: List[Dict],
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
    series1: List[Dict],
    series2: List[Dict],
    tolerance: float = DEFAULT_TOLERANCE,
) -> bool:
    if len(series1) != len(series2):
        return False

    # oh my lovely python
    def series_key(s: Dict) -> str:
        labels = s.get("labels", [])
        return str(
            sorted(
                [
                    (lbl.get("key", {}).get("name", ""), lbl.get("value", ""))
                    for lbl in labels
                ]
            )
        )

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
    result_cached: Dict,
    result_no_cache: Dict,
    query_name: str,
    context: str,
    tolerance: float = DEFAULT_TOLERANCE,
) -> None:
    values_cached = get_series_values(result_cached, query_name)
    values_no_cache = get_series_values(result_no_cache, query_name)

    sorted_cached = sorted(values_cached, key=lambda x: x["timestamp"])
    sorted_no_cache = sorted(values_no_cache, key=lambda x: x["timestamp"])

    assert len(sorted_cached) == len(sorted_no_cache), (
        f"{context}: Different number of values. "
        f"Cached: {len(sorted_cached)}, No-cache: {len(sorted_no_cache)}\n"
        f"Cached timestamps: {[v['timestamp'] for v in sorted_cached]}\n"
        f"No-cache timestamps: {[v['timestamp'] for v in sorted_no_cache]}"
    )

    for v_cached, v_no_cache in zip(sorted_cached, sorted_no_cache):
        assert v_cached["timestamp"] == v_no_cache["timestamp"], (
            f"{context}: Timestamp mismatch. "
            f"Cached: {v_cached['timestamp']}, No-cache: {v_no_cache['timestamp']}"
        )
        assert compare_values(v_cached["value"], v_no_cache["value"], tolerance), (
            f"{context}: Value mismatch at timestamp {v_cached['timestamp']}. "
            f"Cached: {v_cached['value']}, No-cache: {v_no_cache['value']}"
        )


def assert_all_series_equal(
    result_cached: Dict,
    result_no_cache: Dict,
    query_name: str,
    context: str,
    tolerance: float = DEFAULT_TOLERANCE,
) -> None:
    series_cached = get_all_series(result_cached, query_name)
    series_no_cache = get_all_series(result_no_cache, query_name)

    assert compare_all_series(
        series_cached, series_no_cache, tolerance
    ), f"{context}: Cached series differ from non-cached series"


def expected_minutely_bucket_timestamps_ms(now: datetime) -> List[List[int]]:
    previous_five = [
        int((now - timedelta(minutes=m)).timestamp() * 1000) for m in range(5, 0, -1)
    ]
    with_current = previous_five + [int(now.timestamp() * 1000)]
    return [previous_five, with_current]


def assert_minutely_bucket_timestamps(
    points: List[Dict[str, Any]],
    now: datetime,
    *,
    context: str,
) -> List[int]:
    expected = expected_minutely_bucket_timestamps_ms(now)
    actual = [p["timestamp"] for p in points]
    assert actual in expected, f"Unexpected timestamps for {context}: {actual}"
    return actual


def assert_minutely_bucket_values(
    points: List[Dict[str, Any]],
    now: datetime,
    *,
    expected_by_ts: Dict[int, float],
    context: str,
) -> None:
    timestamps = assert_minutely_bucket_timestamps(points, now, context=context)
    expected = {ts: 0 for ts in timestamps}
    expected.update(expected_by_ts)

    for point in points:
        ts = point["timestamp"]
        assert point["value"] == expected[ts], (
            f"Unexpected value for {context} at timestamp={ts}: "
            f"got {point['value']}, expected {expected[ts]}"
        )


def index_series_by_label(
    series: List[Dict[str, Any]],
    label_name: str,
) -> Dict[str, Dict[str, Any]]:
    series_by_label: Dict[str, Dict[str, Any]] = {}
    for s in series:
        label = next(
            (
                l
                for l in s.get("labels", [])
                if l.get("key", {}).get("name") == label_name
            ),
            None,
        )
        assert label is not None, f"Expected {label_name} label in series"
        series_by_label[label["value"]] = s
    return series_by_label


def find_named_result(
    results: List[Dict[str, Any]],
    name: str,
) -> Optional[Dict[str, Any]]:
    return next(
        (
            r
            for r in results
            if r.get("name") == name
            or r.get("queryName") == name
            or (r.get("spec") or {}).get("name") == name
        ),
        None,
    )


def build_scalar_query(
    name: str,
    signal: str,
    aggregations: List[Dict],
    *,
    group_by: Optional[List[Dict]] = None,
    order: Optional[List[Dict]] = None,
    limit: Optional[int] = None,
    filter_expression: Optional[str] = None,
    having_expression: Optional[str] = None,
    step_interval: int = DEFAULT_STEP_INTERVAL,
    disabled: bool = False,
) -> Dict:
    spec: Dict[str, Any] = {
        "name": name,
        "signal": signal,
        "stepInterval": step_interval,
        "disabled": disabled,
        "aggregations": aggregations,
    }

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
) -> Dict:
    return {
        "name": name,
        "fieldDataType": field_data_type,
        "fieldContext": field_context,
    }


def build_order_by(name: str, direction: str = "desc") -> Dict:
    return {"key": {"name": name}, "direction": direction}


def build_logs_aggregation(expression: str, alias: Optional[str] = None) -> Dict:
    agg: Dict[str, Any] = {"expression": expression}
    if alias:
        agg["alias"] = alias
    return agg


def build_metrics_aggregation(
    metric_name: str,
    time_aggregation: str,
    space_aggregation: str,
    temporality: str = "cumulative",
) -> Dict:
    return {
        "metricName": metric_name,
        "temporality": temporality,
        "timeAggregation": time_aggregation,
        "spaceAggregation": space_aggregation,
    }


def get_scalar_table_data(response_json: Dict) -> List[List[Any]]:
    results = response_json.get("data", {}).get("data", {}).get("results", [])
    if not results:
        return []
    return results[0].get("data", [])


def get_scalar_columns(response_json: Dict) -> List[Dict]:
    results = response_json.get("data", {}).get("data", {}).get("results", [])
    if not results:
        return []
    return results[0].get("columns", [])


def assert_scalar_result_order(
    data: List[List[Any]],
    expected_order: List[tuple],
    context: str = "",
) -> None:
    assert len(data) == len(expected_order), (
        f"{context}: Expected {len(expected_order)} rows, got {len(data)}. "
        f"Data: {data}"
    )

    for i, (row, expected) in enumerate(zip(data, expected_order)):
        for j, expected_val in enumerate(expected):
            actual_val = row[j]
            assert actual_val == expected_val, (
                f"{context}: Row {i}, column {j} mismatch. "
                f"Expected {expected_val}, got {actual_val}. "
                f"Full row: {row}, expected: {expected}"
            )


def assert_scalar_column_order(
    data: List[List[Any]],
    column_index: int,
    expected_values: List[Any],
    context: str = "",
) -> None:
    assert len(data) == len(
        expected_values
    ), f"{context}: Expected {len(expected_values)} rows, got {len(data)}"

    actual_values = [row[column_index] for row in data]
    assert actual_values == expected_values, (
        f"{context}: Column {column_index} order mismatch. "
        f"Expected {expected_values}, got {actual_values}"
    )

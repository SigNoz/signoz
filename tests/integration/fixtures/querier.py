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

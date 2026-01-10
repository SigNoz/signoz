from datetime import datetime, timedelta, timezone
from http import HTTPStatus
from typing import Any, Callable, Dict, List, Optional, Tuple

import pytest
import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.metrics import Metrics
from fixtures.metrics_generators import (
    generate_simple_gauge_series,
)
from src.querier.timeseries_utils import (
    find_named_result,
)

DEFAULT_STEP_INTERVAL = 60
DEFAULT_TOLERANCE = 1e-9
QUERY_TIMEOUT = 30

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
        return str(sorted([
            (lbl.get("key", {}).get("name", ""), lbl.get("value", ""))
            for lbl in labels
        ]))

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

    assert compare_all_series(series_cached, series_no_cache, tolerance), (
        f"{context}: Cached series differ from non-cached series"
    )

@pytest.fixture
def query_time_range() -> Callable[..., Tuple[datetime, int, int]]:
    # returns a function that generates a time range
    def _get_range(
        duration_minutes: int = 20,
        offset_minutes: int = 10,
    ) -> Tuple[datetime, int, int]:
        now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
        start_ms = int((now - timedelta(minutes=duration_minutes + offset_minutes)).timestamp() * 1000)
        end_ms = int((now - timedelta(minutes=offset_minutes)).timestamp() * 1000)
        return now, start_ms, end_ms

    return _get_range


@pytest.fixture
def auth_token(
    create_user_admin: None,
    get_token: Callable[[str, str], str],
) -> str:
    return get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)


class TestTimeAggregations:
    # test time aggregation functions across different metric types
    # time aggregations reduce multiple data points within a time bucket to a single value
    # valid combinations:
    # - gauge (unspecified): latest, sum, avg, min, max, count
    # - counter (cumulative/delta): rate, increase
    @pytest.mark.parametrize(
        "time_agg",
        ["sum", "avg", "min", "max", "count", "latest"],
    )
    def test_gauge_time_aggregations(
        self,
        signoz: types.SigNoz,
        auth_token: str,
        insert_metrics: Callable[[List[Metrics]], None],
        query_time_range: Callable[..., Tuple[datetime, int, int]],
        time_agg: str,
    ) -> None:
        now, start_ms, end_ms = query_time_range()
        metric_name = f"test_gauge_time_agg_{time_agg}"

        values = [10.0, 20.0, 30.0, 40.0, 50.0, 60.0, 70.0, 80.0, 90.0, 100.0]
        metrics = generate_simple_gauge_series(
            metric_name,
            {"service": "test"},
            values,
            start_time=now - timedelta(minutes=30),
        )
        insert_metrics(metrics)

        query = build_builder_query(
            "A",
            metric_name,
            time_agg,
            "sum",
            temporality="unspecified",
            step_interval=60,
        )

        response = make_query_request(signoz, auth_token, start_ms, end_ms, [query])
        assert response.status_code == HTTPStatus.OK

        data = response.json()
        assert data["status"] == "success"

        result_values = get_series_values(data, "A")
        assert len(result_values) > 0, f"No values returned for {time_agg}"

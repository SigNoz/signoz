from datetime import datetime, timedelta, timezone
from http import HTTPStatus
from typing import Any, Callable, Dict, List

import pytest
import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.metrics import Metrics
from fixtures.querier import (
    assert_minutely_bucket_values,
    find_named_result,
    index_series_by_label,
)

FILL_GAPS = "fillGaps"
FILL_ZERO = "fillZero"


def _build_format_options(fill_mode: str) -> Dict[str, Any]:
    return {
        "formatTableResultForUI": False,
        "fillGaps": fill_mode == FILL_GAPS,
    }


def _maybe_add_functions(
    spec: Dict[str, Any], fill_mode: str, is_formula: bool = False
) -> None:
    """Add fillZero function to the spec when using fillZero mode.

    For builder_query: functions go on the query spec.
    For builder_formula: functions go on the formula spec.
    fillGaps mode uses formatOptions instead, so nothing is added.
    """
    if fill_mode == FILL_ZERO and not is_formula:
        spec["functions"] = [{"name": "fillZero"}]


def _maybe_add_formula_functions(spec: Dict[str, Any], fill_mode: str) -> None:
    if fill_mode == FILL_ZERO:
        spec["functions"] = [{"name": "fillZero"}]


@pytest.mark.parametrize(
    "fill_mode", [FILL_GAPS, FILL_ZERO], ids=["fillGaps", "fillZero"]
)
def test_metrics_fill_no_group_by(
    fill_mode: str,
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[List[Metrics]], None],
) -> None:
    """
    Test that gaps in time series are filled with zeros (no groupBy).
    """
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    metric_name = f"test_{fill_mode}_metric"

    # Insert at minute 3 and minute 1 (gap at minute 2)
    metrics: List[Metrics] = [
        Metrics(
            metric_name=metric_name,
            labels={"service": "test-service"},
            timestamp=now - timedelta(minutes=3),
            value=10.0,
            temporality="Cumulative",
        ),
        Metrics(
            metric_name=metric_name,
            labels={"service": "test-service"},
            timestamp=now - timedelta(minutes=1),
            value=30.0,
            temporality="Cumulative",
        ),
    ]
    expected_by_ts = {
        int((now - timedelta(minutes=1)).timestamp() * 1000): 20.0,
    }

    insert_metrics(metrics)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    query_spec: Dict[str, Any] = {
        "name": "A",
        "signal": "metrics",
        "aggregations": [
            {
                "metricName": metric_name,
                "temporality": "cumulative",
                "timeAggregation": "increase",
                "spaceAggregation": "sum",
            }
        ],
        "stepInterval": 60,
        "disabled": False,
    }
    _maybe_add_functions(query_spec, fill_mode)

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v5/query_range"),
        timeout=5,
        headers={"authorization": f"Bearer {token}"},
        json={
            "schemaVersion": "v1",
            "start": start_ms,
            "end": end_ms,
            "requestType": "time_series",
            "compositeQuery": {
                "queries": [{"type": "builder_query", "spec": query_spec}]
            },
            "formatOptions": _build_format_options(fill_mode),
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1

    aggregations = results[0].get("aggregations") or []
    assert len(aggregations) == 1

    series = aggregations[0]["series"]
    assert len(series) >= 1

    assert_minutely_bucket_values(
        series[0]["values"],
        now,
        expected_by_ts=expected_by_ts,
        context=f"metrics/{fill_mode}",
    )


@pytest.mark.parametrize(
    "fill_mode", [FILL_GAPS, FILL_ZERO], ids=["fillGaps", "fillZero"]
)
def test_metrics_fill_with_group_by(
    fill_mode: str,
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[List[Metrics]], None],
) -> None:
    """
    Test that gaps are filled per group when using groupBy.
    """
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    metric_name = f"test_{fill_mode}_grouped_metric"

    metrics: List[Metrics] = [
        Metrics(
            metric_name=metric_name,
            labels={"my_tag": "service-a"},
            timestamp=now - timedelta(minutes=3),
            value=10.0,
            temporality="Cumulative",
        ),
        Metrics(
            metric_name=metric_name,
            labels={"my_tag": "service-a"},
            timestamp=now - timedelta(minutes=2),
            value=30.0,
            temporality="Cumulative",
        ),
        Metrics(
            metric_name=metric_name,
            labels={"my_tag": "service-b"},
            timestamp=now - timedelta(minutes=3),
            value=15.0,
            temporality="Cumulative",
        ),
        Metrics(
            metric_name=metric_name,
            labels={"my_tag": "service-b"},
            timestamp=now - timedelta(minutes=2),
            value=20.0,
            temporality="Cumulative",
        ),
    ]
    insert_metrics(metrics)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    query_spec: Dict[str, Any] = {
        "name": "A",
        "signal": "metrics",
        "aggregations": [
            {
                "metricName": metric_name,
                "temporality": "cumulative",
                "timeAggregation": "increase",
                "spaceAggregation": "sum",
            }
        ],
        "stepInterval": 60,
        "disabled": False,
        "groupBy": [
            {
                "name": "my_tag",
                "fieldDataType": "string",
                "fieldContext": "attribute",
            }
        ],
    }
    _maybe_add_functions(query_spec, fill_mode)

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v5/query_range"),
        timeout=5,
        headers={"authorization": f"Bearer {token}"},
        json={
            "schemaVersion": "v1",
            "start": start_ms,
            "end": end_ms,
            "requestType": "time_series",
            "compositeQuery": {
                "queries": [{"type": "builder_query", "spec": query_spec}]
            },
            "formatOptions": _build_format_options(fill_mode),
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    results = response.json()["data"]["data"]["results"]
    assert len(results) >= 1

    aggregations = results[0].get("aggregations") or []
    assert len(aggregations) == 1

    series = aggregations[0]["series"]
    assert len(series) == 2

    ts_min_2 = int((now - timedelta(minutes=2)).timestamp() * 1000)

    series_by_tag = index_series_by_label(series, "my_tag")
    assert set(series_by_tag.keys()) == {"service-a", "service-b"}

    expectations: Dict[str, Dict[int, float]] = {
        "service-a": {ts_min_2: 20.0},
        "service-b": {ts_min_2: 5.0},
    }

    for tag_value, s in series_by_tag.items():
        assert_minutely_bucket_values(
            s["values"],
            now,
            expected_by_ts=expectations[tag_value],
            context=f"metrics/{fill_mode}/{tag_value}",
        )


@pytest.mark.parametrize(
    "fill_mode", [FILL_GAPS, FILL_ZERO], ids=["fillGaps", "fillZero"]
)
def test_metrics_fill_formula(
    fill_mode: str,
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[List[Metrics]], None],
) -> None:
    """
    Test that formula results have gaps filled.
    """
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    metric_name_a = f"test_{fill_mode}_formula_a"
    metric_name_b = f"test_{fill_mode}_formula_b"

    metrics: List[Metrics] = [
        Metrics(
            metric_name=metric_name_a,
            labels={"service": "test"},
            timestamp=now - timedelta(minutes=3),
            value=100.0,
            temporality="Cumulative",
        ),
        Metrics(
            metric_name=metric_name_a,
            labels={"service": "test"},
            timestamp=now - timedelta(minutes=2),
            value=110.0,
            temporality="Cumulative",
        ),
        Metrics(
            metric_name=metric_name_b,
            labels={"service": "test"},
            timestamp=now - timedelta(minutes=2),
            value=5.0,
            temporality="Cumulative",
        ),
        Metrics(
            metric_name=metric_name_b,
            labels={"service": "test"},
            timestamp=now - timedelta(minutes=1),
            value=10.0,
            temporality="Cumulative",
        ),
    ]
    insert_metrics(metrics)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    formula_spec: Dict[str, Any] = {
        "name": "F1",
        "expression": "A + B",
        "disabled": False,
    }
    _maybe_add_formula_functions(formula_spec, fill_mode)

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v5/query_range"),
        timeout=5,
        headers={"authorization": f"Bearer {token}"},
        json={
            "schemaVersion": "v1",
            "start": start_ms,
            "end": end_ms,
            "requestType": "time_series",
            "compositeQuery": {
                "queries": [
                    {
                        "type": "builder_query",
                        "spec": {
                            "name": "A",
                            "signal": "metrics",
                            "aggregations": [
                                {
                                    "metricName": metric_name_a,
                                    "temporality": "cumulative",
                                    "timeAggregation": "increase",
                                    "spaceAggregation": "sum",
                                }
                            ],
                            "stepInterval": 60,
                            "disabled": True,
                        },
                    },
                    {
                        "type": "builder_query",
                        "spec": {
                            "name": "B",
                            "signal": "metrics",
                            "aggregations": [
                                {
                                    "metricName": metric_name_b,
                                    "temporality": "cumulative",
                                    "timeAggregation": "increase",
                                    "spaceAggregation": "sum",
                                }
                            ],
                            "stepInterval": 60,
                            "disabled": True,
                        },
                    },
                    {"type": "builder_formula", "spec": formula_spec},
                ]
            },
            "formatOptions": _build_format_options(fill_mode),
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1

    ts_min_2 = int((now - timedelta(minutes=2)).timestamp() * 1000)
    ts_min_1 = int((now - timedelta(minutes=1)).timestamp() * 1000)

    f1 = find_named_result(results, "F1")
    assert f1 is not None, "Expected formula result named F1"

    aggregations = f1.get("aggregations") or []
    assert len(aggregations) == 1
    series = aggregations[0].get("series") or []
    assert (
        len(series) >= 1
    ), f"Expected at least one series for F1, got {aggregations[0]}"

    assert_minutely_bucket_values(
        series[0]["values"],
        now,
        expected_by_ts={ts_min_2: 10.0, ts_min_1: 5.0},
        context=f"metrics/{fill_mode}/F1",
    )


@pytest.mark.parametrize(
    "fill_mode", [FILL_GAPS, FILL_ZERO], ids=["fillGaps", "fillZero"]
)
def test_metrics_fill_formula_with_group_by(
    fill_mode: str,
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[List[Metrics]], None],
) -> None:
    """
    Test that formula results with groupBy have gaps filled per group.
    """
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    metric_name_a = f"test_{fill_mode}_formula_grp_a"
    metric_name_b = f"test_{fill_mode}_formula_grp_b"

    group_by_spec = [
        {
            "name": "my_tag",
            "fieldDataType": "string",
            "fieldContext": "attribute",
        }
    ]

    metrics: List[Metrics] = [
        Metrics(
            metric_name=metric_name_a,
            labels={"my_tag": "group1"},
            timestamp=now - timedelta(minutes=4),
            value=0.0,
            temporality="Cumulative",
        ),
        Metrics(
            metric_name=metric_name_b,
            labels={"my_tag": "group1"},
            timestamp=now - timedelta(minutes=4),
            value=0.0,
            temporality="Cumulative",
        ),
        Metrics(
            metric_name=metric_name_a,
            labels={"my_tag": "group2"},
            timestamp=now - timedelta(minutes=4),
            value=0.0,
            temporality="Cumulative",
        ),
        Metrics(
            metric_name=metric_name_b,
            labels={"my_tag": "group2"},
            timestamp=now - timedelta(minutes=4),
            value=0.0,
            temporality="Cumulative",
        ),
        Metrics(
            metric_name=metric_name_a,
            labels={"my_tag": "group1"},
            timestamp=now - timedelta(minutes=3),
            value=100.0,
            temporality="Cumulative",
        ),
        Metrics(
            metric_name=metric_name_b,
            labels={"my_tag": "group1"},
            timestamp=now - timedelta(minutes=3),
            value=10.0,
            temporality="Cumulative",
        ),
        Metrics(
            metric_name=metric_name_a,
            labels={"my_tag": "group2"},
            timestamp=now - timedelta(minutes=2),
            value=200.0,
            temporality="Cumulative",
        ),
        Metrics(
            metric_name=metric_name_b,
            labels={"my_tag": "group2"},
            timestamp=now - timedelta(minutes=2),
            value=20.0,
            temporality="Cumulative",
        ),
    ]
    insert_metrics(metrics)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    formula_spec: Dict[str, Any] = {
        "name": "F1",
        "expression": "A + B",
        "disabled": False,
    }
    _maybe_add_formula_functions(formula_spec, fill_mode)

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v5/query_range"),
        timeout=5,
        headers={"authorization": f"Bearer {token}"},
        json={
            "schemaVersion": "v1",
            "start": start_ms,
            "end": end_ms,
            "requestType": "time_series",
            "compositeQuery": {
                "queries": [
                    {
                        "type": "builder_query",
                        "spec": {
                            "name": "A",
                            "signal": "metrics",
                            "aggregations": [
                                {
                                    "metricName": metric_name_a,
                                    "temporality": "cumulative",
                                    "timeAggregation": "increase",
                                    "spaceAggregation": "sum",
                                }
                            ],
                            "stepInterval": 60,
                            "disabled": True,
                            "groupBy": group_by_spec,
                        },
                    },
                    {
                        "type": "builder_query",
                        "spec": {
                            "name": "B",
                            "signal": "metrics",
                            "aggregations": [
                                {
                                    "metricName": metric_name_b,
                                    "temporality": "cumulative",
                                    "timeAggregation": "increase",
                                    "spaceAggregation": "sum",
                                }
                            ],
                            "stepInterval": 60,
                            "disabled": True,
                            "groupBy": group_by_spec,
                        },
                    },
                    {"type": "builder_formula", "spec": formula_spec},
                ]
            },
            "formatOptions": _build_format_options(fill_mode),
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1

    ts_min_2 = int((now - timedelta(minutes=2)).timestamp() * 1000)
    ts_min_3 = int((now - timedelta(minutes=3)).timestamp() * 1000)

    f1 = find_named_result(results, "F1")
    assert f1 is not None, "Expected formula result named F1"
    aggregations = f1.get("aggregations") or []
    assert len(aggregations) == 1
    series = aggregations[0]["series"]
    assert len(series) == 2

    series_by_group = index_series_by_label(series, "my_tag")
    assert set(series_by_group.keys()) == {"group1", "group2"}

    expectations: Dict[str, Dict[int, float]] = {
        "group1": {ts_min_3: 110.0},
        "group2": {ts_min_2: 220.0},
    }

    for group, s in series_by_group.items():
        assert_minutely_bucket_values(
            s["values"],
            now,
            expected_by_ts=expectations[group],
            context=f"metrics/{fill_mode}/F1/{group}",
        )



def test_metrics_heatmap(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[List[Metrics]], None],
) -> None:
    """
    Test heatmap query with metrics.
    """
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    metric_name = "test_heatmap_multi_bucket"

    metrics: List[Metrics] = []
    
    # t-3: First histogram
    # Distribution: 10 in 0-10, 10 in 10-50, 10 in 50-100, 20 in 100+
    for le, value in [("10", 10.0), ("50", 20.0), ("100", 30.0), ("+Inf", 50.0)]:
        metrics.append(
            Metrics(
                metric_name=metric_name,
                labels={"service": "test", "le": le},
                timestamp=now - timedelta(minutes=3),
                value=value,
                temporality="Cumulative",
                type_="Histogram",
            )
        )
    
    # t-2: Second histogram
    # Total: 30 in 0-10, 40 in 10-50, 50 in 50-100, 90 in 100+
    for le, value in [("10", 30.0), ("50", 60.0), ("100", 90.0), ("+Inf", 150.0)]:
        metrics.append(
            Metrics(
                metric_name=metric_name,
                labels={"service": "test", "le": le},
                timestamp=now - timedelta(minutes=2),
                value=value,
                temporality="Cumulative",
                type_="Histogram",
            )
        )
    
    # t-1: Third histogram
    # Total: 40 in 0-10, 70 in 10-50, 100 in 50-100, 170 in 100+
    for le, value in [("10", 40.0), ("50", 80.0), ("100", 120.0), ("+Inf", 200.0)]:
        metrics.append(
            Metrics(
                metric_name=metric_name,
                labels={"service": "test", "le": le},
                timestamp=now - timedelta(minutes=1),
                value=value,
                temporality="Cumulative",
                type_="Histogram",
            )
        )
    
    insert_metrics(metrics)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    start_ms = int((now - timedelta(minutes=4)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v5/query_range"),
        timeout=5,
        headers={"authorization": f"Bearer {token}"},
        json={
            "schemaVersion": "v1",
            "start": start_ms,
            "end": end_ms,
            "requestType": "heatmap",
            "compositeQuery": {
                "queries": [
                    {
                        "type": "builder_query",
                        "spec": {
                            "name": "A",
                            "signal": "metrics",
                            "aggregations": [
                                {
                                    "metricName": metric_name,
                                    "temporality": "cumulative",
                                    "timeAggregation": "increase",
                                    "spaceAggregation": "sum",
                                }
                            ],
                            "stepInterval": 60,
                            "disabled": False,
                        },
                    }
                ]
            },
            "formatOptions": {"formatTableResultForUI": False},
        },
    )

    assert response.status_code == HTTPStatus.OK, f"Expected 200, got {response.status_code}: {response.text}"
    
    response_data = response.json()
    assert response_data["status"] == "success", f"Query failed: {response_data}"

    results = response_data["data"]["data"]["results"]
    assert len(results) == 1, f"Expected 1 result, got {len(results)}"

    aggregations = results[0]["aggregations"]
    assert len(aggregations) == 1, f"Expected 1 aggregation, got {len(aggregations)}"

    series = aggregations[0]["series"]
    # Heatmap returns one series with time points
    assert len(series) == 1, f"Expected 1 series for heatmap, got {len(series)}: {series}"

    # Verify the series has proper structure
    s = series[0]
    assert "values" in s, f"Series missing 'values': {s}"
    
    values = s["values"]
    assert isinstance(values, list), f"Values should be a list, got {type(values)}"
    
    # Should have exactly 3 time points (t-3, t-2, t-1)
    assert len(values) == 3

    # Verify structure and basic invariants
    for val in values:
        assert isinstance(val, dict)
        assert "timestamp" in val
        assert "bucket" in val
        assert "values" in val

        bucket = val["bucket"]
        assert "bounds" in bucket
        bounds = bucket["bounds"]
        assert isinstance(bounds, list)
        assert len(bounds) == 4  # 10, 50, 100, +Inf

        counts = val["values"]
        assert isinstance(counts, list)
        assert len(counts) == len(bounds) - 1

        for count in counts:
            assert isinstance(count, (int, float))
            assert count >= 0

    # Verify bucket bounds
    assert values[0]["bucket"]["bounds"] == [0, 10, 50, 100]

    # Verify expected counts per timestamp
    ts_min_3 = int((now - timedelta(minutes=3)).timestamp() * 1000)
    ts_min_2 = int((now - timedelta(minutes=2)).timestamp() * 1000)
    ts_min_1 = int((now - timedelta(minutes=1)).timestamp() * 1000)

    expected_by_ts = {
        ts_min_3: [10.0, 10.0, 10.0],
        ts_min_2: [20.0, 20.0, 20.0],
        ts_min_1: [10.0, 10.0, 10.0],
    }

    for val in values:
        if val["timestamp"] in expected_by_ts:
            assert val["values"] == expected_by_ts[val["timestamp"]]


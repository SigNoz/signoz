from datetime import datetime, timedelta, timezone
from http import HTTPStatus
from typing import Callable, Dict, List

import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.metrics import Metrics
from fixtures.querier import (
    assert_minutely_bucket_values,
    find_named_result,
    index_series_by_label,
)


def test_metrics_fill_gaps(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[List[Metrics]], None],
) -> None:
    """
    Test fillGaps for metrics without groupBy.
    Verifies that gaps in time series are filled with zeros.
    """
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    metric_name = "test_fill_gaps_metric"

    # Insert metrics at minute 3 and minute 1 (gap at minute 2)
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
    insert_metrics(metrics)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

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
            "formatOptions": {"formatTableResultForUI": False, "fillGaps": True},
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1

    aggregations = results[0]["aggregations"]
    assert len(aggregations) == 1

    series = aggregations[0]["series"]
    assert len(series) >= 1

    values = series[0]["values"]
    ts_min_1 = int((now - timedelta(minutes=1)).timestamp() * 1000)
    ts_min_3 = int((now - timedelta(minutes=3)).timestamp() * 1000)
    assert_minutely_bucket_values(
        values,
        now,
        expected_by_ts={ts_min_3: 10.0, ts_min_1: 20.0},
        context="metrics/fillGaps",
    )


def test_metrics_fill_gaps_with_group_by(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[List[Metrics]], None],
) -> None:
    """
    Test fillGaps for metrics with groupBy.
    Verifies gaps are filled per group.
    """
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    metric_name = "test_fill_gaps_grouped_metric"

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
                        },
                    }
                ]
            },
            "formatOptions": {"formatTableResultForUI": False, "fillGaps": True},
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1

    aggregations = results[0]["aggregations"]
    assert len(aggregations) == 1

    series = aggregations[0]["series"]
    assert len(series) >= 1, "Expected at least one series"

    ts_min_2 = int((now - timedelta(minutes=2)).timestamp() * 1000)
    ts_min_3 = int((now - timedelta(minutes=3)).timestamp() * 1000)

    series_by_tag = index_series_by_label(series, "my_tag")
    assert set(series_by_tag.keys()) == {"service-a", "service-b"}

    expectations: Dict[str, Dict[int, float]] = {
        "service-a": {ts_min_3: 10.0},
        "service-b": {ts_min_2: 20.0},
    }

    for tag_value, s in series_by_tag.items():
        assert_minutely_bucket_values(
            s["values"],
            now,
            expected_by_ts=expectations[tag_value],
            context=f"metrics/fillGaps/{tag_value}",
        )


def test_metrics_fill_gaps_formula(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[List[Metrics]], None],
) -> None:
    """
    Test fillGaps for metrics with formula.
    Verifies formula results have gaps filled.
    """
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    metric_name_a = "test_formula_metric_a"
    metric_name_b = "test_formula_metric_b"

    metrics: List[Metrics] = [
        Metrics(
            metric_name=metric_name_a,
            labels={"service": "test"},
            timestamp=now - timedelta(minutes=3),
            value=100.0,
            temporality="Cumulative",
        ),
        Metrics(
            metric_name=metric_name_b,
            labels={"service": "test"},
            timestamp=now - timedelta(minutes=2),
            value=10.0,
            temporality="Cumulative",
        ),
    ]
    insert_metrics(metrics)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

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
                    {
                        "type": "builder_formula",
                        "spec": {
                            "name": "F1",
                            "expression": "A + B",
                            "disabled": False,
                        },
                    },
                ]
            },
            "formatOptions": {"formatTableResultForUI": False, "fillGaps": True},
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
    series = aggregations[0].get("series") or []
    assert (
        len(series) >= 1
    ), f"Expected at least one series for F1, got {aggregations[0]}"

    assert_minutely_bucket_values(
        series[0]["values"],
        now,
        expected_by_ts={ts_min_3: 100.0, ts_min_2: 10.0},
        context="metrics/fillGaps/F1",
    )


def test_metrics_fill_gaps_formula_with_group_by(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[List[Metrics]], None],
) -> None:
    """
    Test fillGaps for metrics with formula and groupBy.
    """
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    metric_name_a = "test_formula_grouped_a"
    metric_name_b = "test_formula_grouped_b"

    metrics: List[Metrics] = [
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
                            "groupBy": [
                                {
                                    "name": "my_tag",
                                    "fieldDataType": "string",
                                    "fieldContext": "attribute",
                                }
                            ],
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
                            "groupBy": [
                                {
                                    "name": "my_tag",
                                    "fieldDataType": "string",
                                    "fieldContext": "attribute",
                                }
                            ],
                        },
                    },
                    {
                        "type": "builder_formula",
                        "spec": {
                            "name": "F1",
                            "expression": "A + B",
                            "disabled": False,
                        },
                    },
                ]
            },
            "formatOptions": {"formatTableResultForUI": False, "fillGaps": True},
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
            context=f"metrics/fillGaps/F1/{group}",
        )


def test_metrics_fill_zero(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[List[Metrics]], None],
) -> None:
    """
    Test fillZero function for metrics without groupBy.
    Verifies the fillZero function fills gaps with zeros.
    """
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    metric_name = "test_fill_zero_metric"

    metrics: List[Metrics] = [
        Metrics(
            metric_name=metric_name,
            labels={"service": "test"},
            timestamp=now - timedelta(minutes=3),
            value=10.0,
            temporality="Cumulative",
        ),
    ]
    insert_metrics(metrics)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

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
                                    "metricName": metric_name,
                                    "temporality": "cumulative",
                                    "timeAggregation": "increase",
                                    "spaceAggregation": "sum",
                                }
                            ],
                            "stepInterval": 60,
                            "disabled": False,
                            "functions": [{"name": "fillZero"}],
                        },
                    }
                ]
            },
            "formatOptions": {"formatTableResultForUI": False, "fillGaps": False},
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
    values = series[0]["values"]

    ts_min_3 = int((now - timedelta(minutes=3)).timestamp() * 1000)
    assert_minutely_bucket_values(
        values,
        now,
        expected_by_ts={ts_min_3: 10.0},
        context="metrics/fillZero",
    )


def test_metrics_fill_zero_with_group_by(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[List[Metrics]], None],
) -> None:
    """
    Test fillZero function for metrics with groupBy.
    """
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    metric_name = "test_fill_zero_grouped"

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
                            "functions": [{"name": "fillZero"}],
                        },
                    }
                ]
            },
            "formatOptions": {"formatTableResultForUI": False, "fillGaps": False},
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
    ts_min_3 = int((now - timedelta(minutes=3)).timestamp() * 1000)

    series_by_tag = index_series_by_label(series, "my_tag")
    assert set(series_by_tag.keys()) == {"service-a", "service-b"}

    expectations: Dict[str, Dict[int, float]] = {
        "service-a": {ts_min_3: 10.0},
        "service-b": {ts_min_2: 20.0},
    }

    for tag_value, s in series_by_tag.items():
        assert_minutely_bucket_values(
            s["values"],
            now,
            expected_by_ts=expectations[tag_value],
            context=f"metrics/fillZero/{tag_value}",
        )


def test_metrics_fill_zero_formula(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[List[Metrics]], None],
) -> None:
    """
    Test fillZero function for metrics with formula.
    """
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    metric_name_a = "test_fz_formula_a"
    metric_name_b = "test_fz_formula_b"

    metrics: List[Metrics] = [
        Metrics(
            metric_name=metric_name_a,
            labels={"service": "test"},
            timestamp=now - timedelta(minutes=3),
            value=100.0,
            temporality="Cumulative",
        ),
        Metrics(
            metric_name=metric_name_b,
            labels={"service": "test"},
            timestamp=now - timedelta(minutes=2),
            value=10.0,
            temporality="Cumulative",
        ),
    ]
    insert_metrics(metrics)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

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
                    {
                        "type": "builder_formula",
                        "spec": {
                            "name": "F1",
                            "expression": "A + B",
                            "disabled": False,
                            "functions": [{"name": "fillZero"}],
                        },
                    },
                ]
            },
            "formatOptions": {"formatTableResultForUI": False, "fillGaps": False},
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
    series = aggregations[0].get("series") or []
    assert (
        len(series) >= 1
    ), f"Expected at least one series for F1, got {aggregations[0]}"

    assert_minutely_bucket_values(
        series[0]["values"],
        now,
        expected_by_ts={ts_min_3: 100.0, ts_min_2: 10.0},
        context="metrics/fillZero/F1",
    )


def test_metrics_fill_zero_formula_with_group_by(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[List[Metrics]], None],
) -> None:
    """
    Test fillZero function for metrics with formula and groupBy.
    """
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    metric_name_a = "test_fz_formula_grp_a"
    metric_name_b = "test_fz_formula_grp_b"

    metrics: List[Metrics] = [
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
                            "groupBy": [
                                {
                                    "name": "my_tag",
                                    "fieldDataType": "string",
                                    "fieldContext": "attribute",
                                }
                            ],
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
                            "groupBy": [
                                {
                                    "name": "my_tag",
                                    "fieldDataType": "string",
                                    "fieldContext": "attribute",
                                }
                            ],
                        },
                    },
                    {
                        "type": "builder_formula",
                        "spec": {
                            "name": "F1",
                            "expression": "A + B",
                            "disabled": False,
                            "functions": [{"name": "fillZero"}],
                        },
                    },
                ]
            },
            "formatOptions": {"formatTableResultForUI": False, "fillGaps": False},
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1  # Only F1 (A and B are disabled)

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
            context=f"metrics/fillZero/F1/{group}",
        )

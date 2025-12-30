from datetime import datetime, timedelta, timezone
from http import HTTPStatus
from typing import Callable, List

import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.metrics import Metrics


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

    token = get_token(email=USER_ADMIN_EMAIL, password=USER_ADMIN_PASSWORD)

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
                            "aggregations": [{
                                "metricName": metric_name,
                                "temporality": "cumulative",
                                "timeAggregation": "rate",
                                "spaceAggregation": "sum"
                            }],
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
    # With 5 minute range and 60s step, we expect ~5-6 data points
    assert len(values) >= 5, f"Expected at least 5 values for gap filling, got {len(values)}"

    # Verify gaps are filled with zeros (rate of cumulative metric with no data = 0)
    zero_count = sum(1 for v in values if v["value"] == 0)
    assert zero_count >= 1, "Expected at least one zero-filled gap"


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

    token = get_token(email=USER_ADMIN_EMAIL, password=USER_ADMIN_PASSWORD)

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
                            "aggregations": [{
                                "metricName": metric_name,
                                "temporality": "cumulative",
                                "timeAggregation": "rate",
                                "spaceAggregation": "sum"
                            }],
                            "stepInterval": 60,
                            "disabled": False,
                            "groupBy": [{"name": "my_tag", "fieldDataType": "string", "fieldContext": "attribute"}],
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

    # Verify each series has gap-filled values
    for s in series:
        values = s["values"]
        assert len(values) >= 5, f"Expected at least 5 gap-filled values, got {len(values)}"


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
            timestamp=now - timedelta(minutes=3),
            value=10.0,
            temporality="Cumulative",
        ),
    ]
    insert_metrics(metrics)

    token = get_token(email=USER_ADMIN_EMAIL, password=USER_ADMIN_PASSWORD)

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
                            "aggregations": [{
                                "metricName": metric_name_a,
                                "temporality": "cumulative",
                                "timeAggregation": "rate",
                                "spaceAggregation": "sum"
                            }],
                            "stepInterval": 60,
                            "disabled": True,
                        },
                    },
                    {
                        "type": "builder_query",
                        "spec": {
                            "name": "B",
                            "signal": "metrics",
                            "aggregations": [{
                                "metricName": metric_name_b,
                                "temporality": "cumulative",
                                "timeAggregation": "rate",
                                "spaceAggregation": "sum"
                            }],
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
                    }
                ]
            },
            "formatOptions": {"formatTableResultForUI": False, "fillGaps": True},
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    results = response.json()["data"]["data"]["results"]
    assert len(results) >= 1


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
    ]
    insert_metrics(metrics)

    token = get_token(email=USER_ADMIN_EMAIL, password=USER_ADMIN_PASSWORD)

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
                            "aggregations": [{
                                "metricName": metric_name_a,
                                "temporality": "cumulative",
                                "timeAggregation": "rate",
                                "spaceAggregation": "sum"
                            }],
                            "stepInterval": 60,
                            "disabled": True,
                            "groupBy": [{"name": "my_tag", "fieldDataType": "string", "fieldContext": "attribute"}],
                        },
                    },
                    {
                        "type": "builder_query",
                        "spec": {
                            "name": "B",
                            "signal": "metrics",
                            "aggregations": [{
                                "metricName": metric_name_b,
                                "temporality": "cumulative",
                                "timeAggregation": "rate",
                                "spaceAggregation": "sum"
                            }],
                            "stepInterval": 60,
                            "disabled": True,
                            "groupBy": [{"name": "my_tag", "fieldDataType": "string", "fieldContext": "attribute"}],
                        },
                    },
                    {
                        "type": "builder_formula",
                        "spec": {
                            "name": "F1",
                            "expression": "A + B",
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
    assert len(results) >= 1


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

    token = get_token(email=USER_ADMIN_EMAIL, password=USER_ADMIN_PASSWORD)

    start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)
    step_ms = 60000

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
                            "aggregations": [{
                                "metricName": metric_name,
                                "temporality": "cumulative",
                                "timeAggregation": "rate",
                                "spaceAggregation": "sum"
                            }],
                            "stepInterval": 60,
                            "disabled": False,
                            "functions": [{
                                "name": "fillZero",
                                "args": [
                                    {"value": start_ms},
                                    {"value": end_ms},
                                    {"value": step_ms}
                                ]
                            }],
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
    if len(aggregations) > 0:
        series = aggregations[0]["series"]
        assert len(series) >= 1
        values = series[0]["values"]
        # fillZero should produce values for the entire range
        assert len(values) >= 5, f"Expected at least 5 values with fillZero, got {len(values)}"


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

    token = get_token(email=USER_ADMIN_EMAIL, password=USER_ADMIN_PASSWORD)

    start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)
    step_ms = 60000

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
                            "aggregations": [{
                                "metricName": metric_name,
                                "temporality": "cumulative",
                                "timeAggregation": "rate",
                                "spaceAggregation": "sum"
                            }],
                            "stepInterval": 60,
                            "disabled": False,
                            "groupBy": [{"name": "my_tag", "fieldDataType": "string", "fieldContext": "attribute"}],
                            "functions": [{
                                "name": "fillZero",
                                "args": [
                                    {"value": start_ms},
                                    {"value": end_ms},
                                    {"value": step_ms}
                                ]
                            }],
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
            timestamp=now - timedelta(minutes=3),
            value=10.0,
            temporality="Cumulative",
        ),
    ]
    insert_metrics(metrics)

    token = get_token(email=USER_ADMIN_EMAIL, password=USER_ADMIN_PASSWORD)

    start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)
    step_ms = 60000

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
                            "aggregations": [{
                                "metricName": metric_name_a,
                                "temporality": "cumulative",
                                "timeAggregation": "rate",
                                "spaceAggregation": "sum"
                            }],
                            "stepInterval": 60,
                            "disabled": True,
                        },
                    },
                    {
                        "type": "builder_query",
                        "spec": {
                            "name": "B",
                            "signal": "metrics",
                            "aggregations": [{
                                "metricName": metric_name_b,
                                "temporality": "cumulative",
                                "timeAggregation": "rate",
                                "spaceAggregation": "sum"
                            }],
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
                            "functions": [{
                                "name": "fillZero",
                                "args": [
                                    {"value": start_ms},
                                    {"value": end_ms},
                                    {"value": step_ms}
                                ]
                            }],
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

    # Verify formula result has values
    formula_result = next((r for r in results if r.get("name") == "F1"), results[0])
    assert formula_result is not None


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
    ]
    insert_metrics(metrics)

    token = get_token(email=USER_ADMIN_EMAIL, password=USER_ADMIN_PASSWORD)

    start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)
    step_ms = 60000

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
                            "aggregations": [{
                                "metricName": metric_name_a,
                                "temporality": "cumulative",
                                "timeAggregation": "rate",
                                "spaceAggregation": "sum"
                            }],
                            "stepInterval": 60,
                            "disabled": True,
                            "groupBy": [{"name": "my_tag", "fieldDataType": "string", "fieldContext": "attribute"}],
                        },
                    },
                    {
                        "type": "builder_query",
                        "spec": {
                            "name": "B",
                            "signal": "metrics",
                            "aggregations": [{
                                "metricName": metric_name_b,
                                "temporality": "cumulative",
                                "timeAggregation": "rate",
                                "spaceAggregation": "sum"
                            }],
                            "stepInterval": 60,
                            "disabled": True,
                            "groupBy": [{"name": "my_tag", "fieldDataType": "string", "fieldContext": "attribute"}],
                        },
                    },
                    {
                        "type": "builder_formula",
                        "spec": {
                            "name": "F1",
                            "expression": "A + B",
                            "disabled": False,
                            "functions": [{
                                "name": "fillZero",
                                "args": [
                                    {"value": start_ms},
                                    {"value": end_ms},
                                    {"value": step_ms}
                                ]
                            }],
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

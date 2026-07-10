from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.querier import (
    assert_minutely_bucket_values,
    find_named_result,
    index_series_by_label,
)
from fixtures.traces import (
    TraceIdGenerator,
    Traces,
    TracesKind,
    TracesStatusCode,
)


def test_traces_fill_gaps(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """
    Test fillGaps for traces without groupBy.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    trace_id = TraceIdGenerator.trace_id()

    traces: list[Traces] = [
        Traces(
            timestamp=now - timedelta(minutes=3),
            duration=timedelta(seconds=1),
            trace_id=trace_id,
            span_id=TraceIdGenerator.span_id(),
            parent_span_id="",
            name="test-span",
            kind=TracesKind.SPAN_KIND_SERVER,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            status_message="",
            resources={"service.name": "test-service"},
            attributes={"http.method": "GET"},
        ),
    ]
    insert_traces(traces)

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
                            "signal": "traces",
                            "stepInterval": 60,
                            "disabled": False,
                            "having": {"expression": ""},
                            "aggregations": [{"expression": "count()"}],
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
    ts_min_3 = int((now - timedelta(minutes=3)).timestamp() * 1000)
    assert_minutely_bucket_values(
        values,
        now,
        expected_by_ts={ts_min_3: 1},
        context="traces/fillGaps",
    )


def test_traces_fill_gaps_with_group_by(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """
    Test fillGaps for traces with groupBy.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)

    traces: list[Traces] = [
        Traces(
            timestamp=now - timedelta(minutes=3),
            duration=timedelta(seconds=1),
            trace_id=TraceIdGenerator.trace_id(),
            span_id=TraceIdGenerator.span_id(),
            parent_span_id="",
            name="span-a",
            kind=TracesKind.SPAN_KIND_SERVER,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            status_message="",
            resources={"service.name": "service-a"},
            attributes={"http.method": "GET"},
        ),
        Traces(
            timestamp=now - timedelta(minutes=2),
            duration=timedelta(seconds=1),
            trace_id=TraceIdGenerator.trace_id(),
            span_id=TraceIdGenerator.span_id(),
            parent_span_id="",
            name="span-b",
            kind=TracesKind.SPAN_KIND_SERVER,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            status_message="",
            resources={"service.name": "service-b"},
            attributes={"http.method": "POST"},
        ),
    ]
    insert_traces(traces)

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
                            "signal": "traces",
                            "stepInterval": 60,
                            "disabled": False,
                            "groupBy": [
                                {
                                    "name": "service.name",
                                    "fieldDataType": "string",
                                    "fieldContext": "resource",
                                }
                            ],
                            "having": {"expression": ""},
                            "aggregations": [{"expression": "count()"}],
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
    assert len(series) == 2, "Expected 2 series for 2 service groups"

    ts_min_2 = int((now - timedelta(minutes=2)).timestamp() * 1000)
    ts_min_3 = int((now - timedelta(minutes=3)).timestamp() * 1000)

    series_by_service = index_series_by_label(series, "service.name")
    assert set(series_by_service.keys()) == {"service-a", "service-b"}

    expectations: dict[str, dict[int, float]] = {
        "service-a": {ts_min_3: 1},
        "service-b": {ts_min_2: 1},
    }

    for service_name, s in series_by_service.items():
        assert_minutely_bucket_values(
            s["values"],
            now,
            expected_by_ts=expectations[service_name],
            context=f"traces/fillGaps/{service_name}",
        )


def test_traces_fill_gaps_formula(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """
    Test fillGaps for traces with formula.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)

    traces: list[Traces] = [
        Traces(
            timestamp=now - timedelta(minutes=3),
            duration=timedelta(seconds=1),
            trace_id=TraceIdGenerator.trace_id(),
            span_id=TraceIdGenerator.span_id(),
            parent_span_id="",
            name="test-span",
            kind=TracesKind.SPAN_KIND_SERVER,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            status_message="",
            resources={"service.name": "test"},
            attributes={"http.method": "GET"},
        ),
        Traces(
            timestamp=now - timedelta(minutes=2),
            duration=timedelta(seconds=1),
            trace_id=TraceIdGenerator.trace_id(),
            span_id=TraceIdGenerator.span_id(),
            parent_span_id="",
            name="another-test-span",
            kind=TracesKind.SPAN_KIND_SERVER,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            status_message="",
            resources={"service.name": "another-test"},
            attributes={"http.method": "POST"},
        ),
    ]
    insert_traces(traces)

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
                            "signal": "traces",
                            "stepInterval": 60,
                            "disabled": True,
                            "filter": {"expression": "service.name = 'test'"},
                            "having": {"expression": ""},
                            "aggregations": [{"expression": "count()"}],
                        },
                    },
                    {
                        "type": "builder_query",
                        "spec": {
                            "name": "B",
                            "signal": "traces",
                            "stepInterval": 60,
                            "disabled": True,
                            "filter": {"expression": "service.name = 'another-test'"},
                            "having": {"expression": ""},
                            "aggregations": [{"expression": "count()"}],
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
    assert len(series) >= 1

    assert_minutely_bucket_values(
        series[0]["values"],
        now,
        expected_by_ts={ts_min_3: 1, ts_min_2: 1},
        context="traces/fillGaps/F1",
    )


def test_traces_fill_gaps_formula_with_group_by(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """
    Test fillGaps for traces with formula and groupBy.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)

    traces: list[Traces] = [
        Traces(
            timestamp=now - timedelta(minutes=3),
            duration=timedelta(seconds=1),
            trace_id=TraceIdGenerator.trace_id(),
            span_id=TraceIdGenerator.span_id(),
            parent_span_id="",
            name="span-group1",
            kind=TracesKind.SPAN_KIND_SERVER,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            status_message="",
            resources={"service.name": "group1"},
            attributes={"http.method": "GET"},
        ),
        Traces(
            timestamp=now - timedelta(minutes=2),
            duration=timedelta(seconds=1),
            trace_id=TraceIdGenerator.trace_id(),
            span_id=TraceIdGenerator.span_id(),
            parent_span_id="",
            name="span-group2",
            kind=TracesKind.SPAN_KIND_SERVER,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            status_message="",
            resources={"service.name": "group2"},
            attributes={"http.method": "POST"},
        ),
    ]
    insert_traces(traces)

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
                            "signal": "traces",
                            "stepInterval": 60,
                            "disabled": True,
                            "groupBy": [
                                {
                                    "name": "service.name",
                                    "fieldDataType": "string",
                                    "fieldContext": "resource",
                                }
                            ],
                            "having": {"expression": ""},
                            "aggregations": [{"expression": "count()"}],
                        },
                    },
                    {
                        "type": "builder_query",
                        "spec": {
                            "name": "B",
                            "signal": "traces",
                            "stepInterval": 60,
                            "disabled": True,
                            "groupBy": [
                                {
                                    "name": "service.name",
                                    "fieldDataType": "string",
                                    "fieldContext": "resource",
                                }
                            ],
                            "having": {"expression": ""},
                            "aggregations": [{"expression": "count()"}],
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

    series_by_service = index_series_by_label(series, "service.name")
    assert set(series_by_service.keys()) == {"group1", "group2"}

    expectations: dict[str, dict[int, float]] = {
        "group1": {ts_min_3: 2},
        "group2": {ts_min_2: 2},
    }

    for service_name, s in series_by_service.items():
        assert_minutely_bucket_values(
            s["values"],
            now,
            expected_by_ts=expectations[service_name],
            context=f"traces/fillGaps/F1/{service_name}",
        )


def test_traces_fill_zero(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """
    Test fillZero function for traces without groupBy.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)

    traces: list[Traces] = [
        Traces(
            timestamp=now - timedelta(minutes=3),
            duration=timedelta(seconds=1),
            trace_id=TraceIdGenerator.trace_id(),
            span_id=TraceIdGenerator.span_id(),
            parent_span_id="",
            name="test-span",
            kind=TracesKind.SPAN_KIND_SERVER,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            status_message="",
            resources={"service.name": "test"},
            attributes={"http.method": "GET"},
        ),
    ]
    insert_traces(traces)

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
                            "signal": "traces",
                            "stepInterval": 60,
                            "disabled": False,
                            "having": {"expression": ""},
                            "aggregations": [{"expression": "count()"}],
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
        expected_by_ts={ts_min_3: 1},
        context="traces/fillZero",
    )


def test_traces_fill_zero_with_group_by(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """
    Test fillZero function for traces with groupBy.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)

    traces: list[Traces] = [
        Traces(
            timestamp=now - timedelta(minutes=3),
            duration=timedelta(seconds=1),
            trace_id=TraceIdGenerator.trace_id(),
            span_id=TraceIdGenerator.span_id(),
            parent_span_id="",
            name="span-a",
            kind=TracesKind.SPAN_KIND_SERVER,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            status_message="",
            resources={"service.name": "service-a"},
            attributes={"http.method": "GET"},
        ),
        Traces(
            timestamp=now - timedelta(minutes=2),
            duration=timedelta(seconds=1),
            trace_id=TraceIdGenerator.trace_id(),
            span_id=TraceIdGenerator.span_id(),
            parent_span_id="",
            name="span-b",
            kind=TracesKind.SPAN_KIND_SERVER,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            status_message="",
            resources={"service.name": "service-b"},
            attributes={"http.method": "POST"},
        ),
    ]
    insert_traces(traces)

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
                            "signal": "traces",
                            "stepInterval": 60,
                            "disabled": False,
                            "groupBy": [
                                {
                                    "name": "service.name",
                                    "fieldDataType": "string",
                                    "fieldContext": "resource",
                                }
                            ],
                            "having": {"expression": ""},
                            "aggregations": [{"expression": "count()"}],
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

    aggregations = results[0]["aggregations"]
    assert len(aggregations) == 1

    series = aggregations[0]["series"]
    assert len(series) == 2, "Expected 2 series for 2 service groups"

    ts_min_2 = int((now - timedelta(minutes=2)).timestamp() * 1000)
    ts_min_3 = int((now - timedelta(minutes=3)).timestamp() * 1000)

    series_by_service = index_series_by_label(series, "service.name")
    assert set(series_by_service.keys()) == {"service-a", "service-b"}

    expectations: dict[str, dict[int, float]] = {
        "service-a": {ts_min_3: 1},
        "service-b": {ts_min_2: 1},
    }

    for service_name, s in series_by_service.items():
        assert_minutely_bucket_values(
            s["values"],
            now,
            expected_by_ts=expectations[service_name],
            context=f"traces/fillZero/{service_name}",
        )


def test_traces_fill_zero_formula(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """
    Test fillZero function for traces with formula.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)

    traces: list[Traces] = [
        Traces(
            timestamp=now - timedelta(minutes=3),
            duration=timedelta(seconds=1),
            trace_id=TraceIdGenerator.trace_id(),
            span_id=TraceIdGenerator.span_id(),
            parent_span_id="",
            name="test-span",
            kind=TracesKind.SPAN_KIND_SERVER,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            status_message="",
            resources={"service.name": "test"},
            attributes={"http.method": "GET"},
        ),
        Traces(
            timestamp=now - timedelta(minutes=2),
            duration=timedelta(seconds=1),
            trace_id=TraceIdGenerator.trace_id(),
            span_id=TraceIdGenerator.span_id(),
            parent_span_id="",
            name="another-test-span",
            kind=TracesKind.SPAN_KIND_SERVER,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            status_message="",
            resources={"service.name": "another-test"},
            attributes={"http.method": "POST"},
        ),
    ]
    insert_traces(traces)

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
                            "signal": "traces",
                            "stepInterval": 60,
                            "disabled": True,
                            "filter": {"expression": "service.name = 'test'"},
                            "having": {"expression": ""},
                            "aggregations": [{"expression": "count()"}],
                        },
                    },
                    {
                        "type": "builder_query",
                        "spec": {
                            "name": "B",
                            "signal": "traces",
                            "stepInterval": 60,
                            "disabled": True,
                            "filter": {"expression": "service.name = 'another-test'"},
                            "having": {"expression": ""},
                            "aggregations": [{"expression": "count()"}],
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
    series = aggregations[0]["series"]
    assert len(series) >= 1

    assert_minutely_bucket_values(
        series[0]["values"],
        now,
        expected_by_ts={ts_min_3: 1, ts_min_2: 1},
        context="traces/fillZero/F1",
    )


def test_traces_fill_zero_formula_with_group_by(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """
    Test fillZero function for traces with formula and groupBy.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)

    traces: list[Traces] = [
        Traces(
            timestamp=now - timedelta(minutes=3),
            duration=timedelta(seconds=1),
            trace_id=TraceIdGenerator.trace_id(),
            span_id=TraceIdGenerator.span_id(),
            parent_span_id="",
            name="span-group1",
            kind=TracesKind.SPAN_KIND_SERVER,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            status_message="",
            resources={"service.name": "group1"},
            attributes={"http.method": "GET"},
        ),
        Traces(
            timestamp=now - timedelta(minutes=2),
            duration=timedelta(seconds=1),
            trace_id=TraceIdGenerator.trace_id(),
            span_id=TraceIdGenerator.span_id(),
            parent_span_id="",
            name="span-group2",
            kind=TracesKind.SPAN_KIND_SERVER,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            status_message="",
            resources={"service.name": "group2"},
            attributes={"http.method": "POST"},
        ),
    ]
    insert_traces(traces)

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
                            "signal": "traces",
                            "stepInterval": 60,
                            "disabled": True,
                            "groupBy": [
                                {
                                    "name": "service.name",
                                    "fieldDataType": "string",
                                    "fieldContext": "resource",
                                }
                            ],
                            "having": {"expression": ""},
                            "aggregations": [{"expression": "count()"}],
                        },
                    },
                    {
                        "type": "builder_query",
                        "spec": {
                            "name": "B",
                            "signal": "traces",
                            "stepInterval": 60,
                            "disabled": True,
                            "groupBy": [
                                {
                                    "name": "service.name",
                                    "fieldDataType": "string",
                                    "fieldContext": "resource",
                                }
                            ],
                            "having": {"expression": ""},
                            "aggregations": [{"expression": "count()"}],
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
    series = aggregations[0]["series"]
    assert len(series) == 2

    series_by_service = index_series_by_label(series, "service.name")
    assert set(series_by_service.keys()) == {"group1", "group2"}

    expectations: dict[str, dict[int, float]] = {
        "group1": {ts_min_3: 2},
        "group2": {ts_min_2: 2},
    }

    for service_name, s in series_by_service.items():
        assert_minutely_bucket_values(
            s["values"],
            now,
            expected_by_ts=expectations[service_name],
            context=f"traces/fillZero/F1/{service_name}",
        )

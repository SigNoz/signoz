from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.metrics import Metrics
from fixtures.querier import (
    RequestType,
    find_named_result,
    get_scalar_table_data,
    make_query_request,
    make_scalar_query_request,
)

# PromQL scalar contract: a scalar request must return scalar data
# (columns + data rows), not time series data. PromQL has no reduceTo, so
# each series is reduced with last-value semantics.

METRIC = "test_promql_scalar_metric"


def build_promql_query(query: str, name: str = "A", step: int = 60) -> dict:
    return {"type": "promql", "spec": {"name": name, "query": query, "disabled": False, "step": step}}


def insert_gauge_samples(insert_metrics: Callable[[list[Metrics]], None], base: datetime) -> None:
    samples = []
    for service, values in [("svc-a", (10.0, 20.0, 30.0)), ("svc-b", (40.0, 50.0, 60.0))]:
        for i, value in enumerate(values):
            samples.append(
                Metrics(
                    metric_name=METRIC,
                    labels={"service": service},
                    timestamp=base - timedelta(seconds=121 - 60 * i),
                    value=value,
                    temporality="Unspecified",
                    type_="Gauge",
                    is_monotonic=False,
                )
            )
    insert_metrics(samples)


def test_promql_scalar_returns_scalar_data(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    insert_gauge_samples(insert_metrics, now)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)
    response = make_query_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [build_promql_query(f"sum by (service) ({METRIC})")],
        request_type=RequestType.SCALAR,
    )

    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["status"] == "success"

    result = find_named_result(response.json()["data"]["data"]["results"], "A")
    assert result is not None, response.text
    assert "aggregations" not in result, f"scalar result must not carry time series aggregations: {result}"
    assert "columns" in result and "data" in result, result

    group_cols = [c for c in result["columns"] if c["columnType"] == "group"]
    agg_cols = [c for c in result["columns"] if c["columnType"] == "aggregation"]
    assert [c["name"] for c in group_cols] == ["service"], result["columns"]
    assert [c["name"] for c in agg_cols] == ["__result_0"], result["columns"]

    rows = sorted(result["data"], key=lambda r: r[0])
    assert rows == [["svc-a", 30.0], ["svc-b", 60.0]], rows


def test_promql_scalar_format_for_ui(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    insert_gauge_samples(insert_metrics, now)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = make_scalar_query_request(
        signoz,
        token,
        now,
        [build_promql_query(f"sum by (service) ({METRIC})")],
    )

    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["status"] == "success"
    data = get_scalar_table_data(response.json())
    assert data == [["svc-b", 60.0], ["svc-a", 30.0]], data


def test_promql_timeseries_unaffected(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    insert_gauge_samples(insert_metrics, now)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)
    response = make_query_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [build_promql_query(f"sum by (service) ({METRIC})")],
        request_type=RequestType.TIME_SERIES,
    )

    assert response.status_code == HTTPStatus.OK, response.text
    result = find_named_result(response.json()["data"]["data"]["results"], "A")
    assert result is not None, response.text
    assert "aggregations" in result, result

    series = result["aggregations"][0]["series"]
    assert len(series) == 2, series
    last_by_service = {s["labels"][0]["value"]: s["values"][-1]["value"] for s in series}
    assert last_by_service == {"svc-a": 30.0, "svc-b": 60.0}, last_by_service


def test_promql_scalar_not_served_cached_time_series(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    base = now - timedelta(minutes=10)
    insert_gauge_samples(insert_metrics, base)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    start_ms = int((base - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(base.timestamp() * 1000)
    queries = [build_promql_query(f"sum by (service) ({METRIC})")]

    ts_response = make_query_request(
        signoz,
        token,
        start_ms,
        end_ms,
        queries,
        request_type=RequestType.TIME_SERIES,
        no_cache=False,
    )
    assert ts_response.status_code == HTTPStatus.OK, ts_response.text

    scalar_response = make_query_request(
        signoz,
        token,
        start_ms,
        end_ms,
        queries,
        request_type=RequestType.SCALAR,
        no_cache=False,
    )
    assert scalar_response.status_code == HTTPStatus.OK, scalar_response.text

    result = find_named_result(scalar_response.json()["data"]["data"]["results"], "A")
    assert result is not None, scalar_response.text
    assert "aggregations" not in result, f"scalar result served cached time series data: {result}"
    rows = sorted(result["data"], key=lambda r: r[0])
    assert rows == [["svc-a", 30.0], ["svc-b", 60.0]], rows

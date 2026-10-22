from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs
from fixtures.metrics import Metrics
from fixtures.querier import (
    build_aggregation,
    build_builder_query,
    build_raw_query,
    build_scalar_query,
    get_all_series,
    get_rows,
    get_scalar_table_data,
    make_query_request,
)
from fixtures.traces import Traces

SERVICE = "quoting-svc"

HOSTILE_KEYS = {
    "backtick": "at`tick",
    "quote": "at'quote",
    "double_quote": 'at"dq',
    "backslash": "at\\back",
    "trailing_backslash": "at\\",
    "dollar": "at$0dollar",
    "brace": "at${x}",
    "injection": "x` OR 1=1 --",
}
RESOURCE_KEYS = {
    "backtick": "rk`tick",
    "quote": "rk'quote",
    "dollar": "rk$0",
}


@pytest.mark.parametrize("key_id", list(HOSTILE_KEYS), ids=list(HOSTILE_KEYS))
def test_logs_group_by_order_by_and_select_hostile_attribute(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    key_id: str,
) -> None:
    now = datetime.now(tz=UTC)
    insert_logs(
        [
            Logs(timestamp=now - timedelta(seconds=3), resources={"service.name": SERVICE}, attributes={key: f"alpha-{k}" for k, key in HOSTILE_KEYS.items()}, body="alpha body"),
            Logs(timestamp=now - timedelta(seconds=2), resources={"service.name": SERVICE}, attributes={key: f"beta-{k}" for k, key in HOSTILE_KEYS.items()}, body="beta body"),
            Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": SERVICE}, attributes={"plain": "gamma"}, body="gamma body"),
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(minutes=2)).timestamp() * 1000)
    end_ms = int((now + timedelta(seconds=1)).timestamp() * 1000)
    key = HOSTILE_KEYS[key_id]
    field = {"name": key, "fieldContext": "attribute", "fieldDataType": "string"}

    response = make_query_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [build_scalar_query("A", "logs", [build_aggregation("count()")], group_by=[field], filter_expression=f"service.name = '{SERVICE}'")],
        request_type="scalar",
    )
    assert response.status_code == HTTPStatus.OK, response.text
    counts = {str(row[0]): int(row[-1]) for row in get_scalar_table_data(response.json()) if len(row) >= 2 and str(row[0]).startswith(("alpha-", "beta-"))}
    assert counts == {f"alpha-{key_id}": 1, f"beta-{key_id}": 1}, response.text

    response = make_query_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [build_scalar_query("A", "logs", [build_aggregation("count()")], group_by=[field], order=[{"key": {"name": key}, "direction": "asc"}], filter_expression=f"service.name = '{SERVICE}'")],
        request_type="scalar",
    )
    assert response.status_code == HTTPStatus.OK, response.text
    ordered = [str(row[0]) for row in get_scalar_table_data(response.json()) if row and str(row[0]).startswith(("alpha-", "beta-"))]
    assert ordered == [f"alpha-{key_id}", f"beta-{key_id}"], response.text

    response = make_query_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [build_raw_query("A", "logs", limit=100, filter_expression=f"service.name = '{SERVICE}'", order=[{"key": {"name": "timestamp"}, "direction": "asc"}], select_fields=[field])],
        request_type="raw",
    )
    assert response.status_code == HTTPStatus.OK, response.text
    rows = get_rows(response)
    assert len(rows) == 3, response.text
    assert [row["data"].get(key) for row in rows][:2] == [f"alpha-{key_id}", f"beta-{key_id}"], response.text
    assert not rows[2]["data"].get(key), response.text


def test_logs_filter_expression_with_dollar_in_key(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    now = datetime.now(tz=UTC)
    insert_logs(
        [
            Logs(timestamp=now - timedelta(seconds=3), resources={"service.name": SERVICE, "rk$0": "alpha-dollar"}, attributes={"at$0dollar": "alpha-dollar", "at${x}": "alpha-brace"}, body="alpha body"),
            Logs(timestamp=now - timedelta(seconds=2), resources={"service.name": SERVICE, "rk$0": "beta-dollar"}, attributes={"at$0dollar": "beta-dollar", "at${x}": "beta-brace"}, body="beta body"),
            Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": SERVICE}, attributes={"plain": "gamma"}, body="gamma body"),
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(minutes=2)).timestamp() * 1000)
    end_ms = int((now + timedelta(seconds=1)).timestamp() * 1000)

    for expression, expected_bodies in [
        ("at$0dollar = 'alpha-dollar'", {"alpha body"}),
        ("at$0dollar EXISTS", {"alpha body", "beta body"}),
        (f"at$0dollar NOT EXISTS AND service.name = '{SERVICE}'", {"gamma body"}),
        ("at${x} = 'beta-brace'", {"beta body"}),
        ("rk$0 = 'alpha-dollar'", {"alpha body"}),
    ]:
        response = make_query_request(
            signoz,
            token,
            start_ms,
            end_ms,
            [build_raw_query("A", "logs", limit=100, filter_expression=expression, order=[{"key": {"name": "timestamp"}, "direction": "asc"}])],
            request_type="raw",
        )
        assert response.status_code == HTTPStatus.OK, f"{expression}: {response.text}"
        assert {row["data"]["body"] for row in get_rows(response)} == expected_bodies, f"{expression}: {response.text}"


@pytest.mark.parametrize("key_id", list(RESOURCE_KEYS), ids=list(RESOURCE_KEYS))
def test_logs_group_by_hostile_resource_attribute(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    key_id: str,
) -> None:
    now = datetime.now(tz=UTC)
    insert_logs(
        [
            Logs(timestamp=now - timedelta(seconds=3), resources={"service.name": SERVICE, **{key: f"alpha-{k}" for k, key in RESOURCE_KEYS.items()}}, body="alpha body"),
            Logs(timestamp=now - timedelta(seconds=2), resources={"service.name": SERVICE, **{key: f"beta-{k}" for k, key in RESOURCE_KEYS.items()}}, body="beta body"),
            Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": SERVICE}, body="gamma body"),
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    key = RESOURCE_KEYS[key_id]

    response = make_query_request(
        signoz,
        token,
        int((now - timedelta(minutes=2)).timestamp() * 1000),
        int((now + timedelta(seconds=1)).timestamp() * 1000),
        [build_scalar_query("A", "logs", [build_aggregation("count()")], group_by=[{"name": key, "fieldContext": "resource", "fieldDataType": "string"}], filter_expression=f"service.name = '{SERVICE}'")],
        request_type="scalar",
    )
    assert response.status_code == HTTPStatus.OK, response.text
    counts = {str(row[0]): int(row[-1]) for row in get_scalar_table_data(response.json()) if len(row) >= 2 and str(row[0]).startswith(("alpha-", "beta-"))}
    assert counts == {f"alpha-{key_id}": 1, f"beta-{key_id}": 1}, response.text


@pytest.mark.parametrize("key_id", list(HOSTILE_KEYS), ids=list(HOSTILE_KEYS))
def test_traces_group_by_and_select_hostile_attribute(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    key_id: str,
) -> None:
    now = datetime.now(tz=UTC)
    insert_traces(
        [
            Traces(timestamp=now - timedelta(seconds=3), name="alpha span", resources={"service.name": SERVICE}, attributes={key: f"alpha-{k}" for k, key in HOSTILE_KEYS.items()}),
            Traces(timestamp=now - timedelta(seconds=2), name="beta span", resources={"service.name": SERVICE}, attributes={key: f"beta-{k}" for k, key in HOSTILE_KEYS.items()}),
            Traces(timestamp=now - timedelta(seconds=1), name="gamma span", resources={"service.name": SERVICE}, attributes={"plain": "gamma"}),
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(minutes=2)).timestamp() * 1000)
    end_ms = int((now + timedelta(seconds=1)).timestamp() * 1000)
    key = HOSTILE_KEYS[key_id]
    field = {"name": key, "fieldContext": "attribute", "fieldDataType": "string"}

    response = make_query_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [build_scalar_query("A", "traces", [build_aggregation("count()")], group_by=[field], filter_expression=f"service.name = '{SERVICE}'")],
        request_type="scalar",
    )
    assert response.status_code == HTTPStatus.OK, response.text
    counts = {str(row[0]): int(row[-1]) for row in get_scalar_table_data(response.json()) if len(row) >= 2 and str(row[0]).startswith(("alpha-", "beta-"))}
    assert counts == {f"alpha-{key_id}": 1, f"beta-{key_id}": 1}, response.text

    response = make_query_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [build_raw_query("A", "traces", limit=100, filter_expression=f"service.name = '{SERVICE}'", order=[{"key": {"name": "timestamp"}, "direction": "asc"}], select_fields=[field, {"name": "name"}])],
        request_type="raw",
    )
    assert response.status_code == HTTPStatus.OK, response.text
    assert [row["data"].get(key) for row in get_rows(response)][:2] == [f"alpha-{key_id}", f"beta-{key_id}"], response.text


@pytest.mark.parametrize("label", ["lb`tick", "lb'quote", "lb$0", "lb\\slash", "x` OR 1=1 --"], ids=["backtick", "quote", "dollar", "backslash", "injection"])
def test_metrics_group_by_hostile_label(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
    label: str,
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    metric = "quoting_gauge"
    insert_metrics([Metrics(metric_name=metric, labels={label: value, "host": host}, timestamp=now - timedelta(minutes=minute), value=1.0, type_="Gauge", is_monotonic=False) for minute in range(3) for value, host in [("alpha", "h1"), ("beta", "h2")]])
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = make_query_request(
        signoz,
        token,
        int((now - timedelta(minutes=5)).timestamp() * 1000),
        int((now + timedelta(minutes=1)).timestamp() * 1000),
        [build_builder_query("A", metric, "avg", "avg", group_by=[label])],
    )
    assert response.status_code == HTTPStatus.OK, response.text
    labels = {tuple(sorted((entry["key"]["name"], entry["value"]) for entry in item.get("labels", []))) for item in get_all_series(response.json(), "A")}
    assert labels == {((label, "alpha"),), ((label, "beta"),)}, response.text

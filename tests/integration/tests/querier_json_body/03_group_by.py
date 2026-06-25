import json
from collections.abc import Callable
from datetime import UTC, datetime, timedelta

import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs
from fixtures.querier import (
    build_group_by_field,
    build_logs_aggregation,
    build_scalar_query,
    get_all_series,
    get_all_warnings,
    get_scalar_table_data,
    make_query_request,
)

DEFAULT_GROUP_BY_LIMIT = 1000


def _uid_log(now: datetime, seq: int, service: str, uid: str) -> Logs:
    """A log with a body field `uid` and a distinct attribute `req_id`."""
    return Logs(
        timestamp=now - timedelta(seconds=5, milliseconds=seq),
        resources={"service.name": service},
        attributes={"req_id": f"r{seq:05d}"},
        body_v2=json.dumps({"uid": uid}),
        body_promoted="",
        severity_text="INFO",
    )


def _run_group_by(
    signoz: types.SigNoz,
    token: str,
    start_ms: int,
    end_ms: int,
    *,
    request_type: str,
    group_by: list[dict],
    limit: int | None,
    filter_expression: str,
) -> requests.Response:
    response = make_query_request(
        signoz=signoz,
        token=token,
        start_ms=start_ms,
        end_ms=end_ms,
        queries=[
            build_scalar_query(
                name="A",
                signal="logs",
                aggregations=[build_logs_aggregation("count()")],
                group_by=group_by,
                limit=limit,
                filter_expression=filter_expression,
            )
        ],
        request_type=request_type,
    )
    assert response.status_code == 200, response.text
    assert response.json()["status"] == "success", response.text
    return response


def _scalar_group_by(signoz: types.SigNoz, token: str, start_ms: int, end_ms: int, *, group_by: list[dict], limit: int | None, filter_expression: str) -> requests.Response:
    return _run_group_by(signoz, token, start_ms, end_ms, request_type="scalar", group_by=group_by, limit=limit, filter_expression=filter_expression)


def _timeseries_group_by(signoz: types.SigNoz, token: str, start_ms: int, end_ms: int, *, group_by: list[dict], limit: int | None, filter_expression: str) -> requests.Response:
    return _run_group_by(signoz, token, start_ms, end_ms, request_type="time_series", group_by=group_by, limit=limit, filter_expression=filter_expression)


def _series_label_key(series: dict) -> tuple:
    """A hashable identity for a series from its group-by labels (order-independent)."""
    return tuple(sorted((label["key"]["name"], str(label["value"])) for label in series.get("labels", [])))


def test_groupby_body_default_limit(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    export_json_types: Callable[[list[Logs]], None],
) -> None:
    """
    Setup:
    Seed 1001 logs, each with a distinct body `uid` and attribute `req_id`,
    under a unique service so a group by on either yields > 1000 groups.

    Tests the default group by limit:
    1. A body group by with no explicit limit is capped to 1000 results and the
       response carries a "limited to 1000" warning.
    2. The same body group by with an explicit limit is left untouched (no cap,
       no warning) — an explicit limit opts out.
    3. A non-body (attribute) group by with no limit is not capped — the default
       limit is scoped to body group by only.
    """
    service = "groupby-limit-svc"
    filter_expression = f"service.name = '{service}'"
    group_count = DEFAULT_GROUP_BY_LIMIT + 1

    now = datetime.now(tz=UTC)
    logs_list = [_uid_log(now, i, service, f"u{i:05d}") for i in range(group_count)]

    export_json_types(logs_list)
    insert_logs(logs_list)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    start_ms = int((now - timedelta(seconds=60)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    # 1. Body group by, no explicit limit -> capped to 1000 + warning.
    body_capped = _scalar_group_by(signoz, token, start_ms, end_ms, group_by=[{"name": "body.uid"}], limit=None, filter_expression=filter_expression)
    capped_rows = get_scalar_table_data(body_capped.json())
    assert len(capped_rows) == DEFAULT_GROUP_BY_LIMIT, f"expected cap to {DEFAULT_GROUP_BY_LIMIT}, got {len(capped_rows)}"
    warnings = get_all_warnings(body_capped.json())
    assert any(f"limited to {DEFAULT_GROUP_BY_LIMIT}" in w.get("message", "") for w in warnings), warnings

    # 2. Body group by with an explicit limit -> no cap, no warning.
    body_explicit = _scalar_group_by(signoz, token, start_ms, end_ms, group_by=[{"name": "body.uid"}], limit=group_count + 100, filter_expression=filter_expression)
    assert len(get_scalar_table_data(body_explicit.json())) == group_count
    assert get_all_warnings(body_explicit.json()) == []

    # 3. Non-body (attribute) group by, no limit -> not capped (body-scoped).
    attr_uncapped = _scalar_group_by(signoz, token, start_ms, end_ms, group_by=[build_group_by_field("req_id", "string", "attribute")], limit=None, filter_expression=filter_expression)
    assert len(get_scalar_table_data(attr_uncapped.json())) == group_count
    assert get_all_warnings(attr_uncapped.json()) == []


def test_groupby_body_cap_matches_explicit_limit(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    export_json_types: Callable[[list[Logs]], None],
) -> None:
    """
    Setup:
    Seed an unambiguous top-1000: 1000 body `uid` groups with count 2, plus one
    extra group with count 1 (1001 groups total). The count-1 group sits strictly
    below the boundary, so "top 1000 by count" is deterministic.

    Tests:
    The auto-capped body group by (no limit -> capped to 1000) returns exactly the
    same rows as an explicit limit=1000 query, with the cap warning present only on
    the auto-capped query.
    """
    service = "groupby-limit-match-svc"
    filter_expression = f"service.name = '{service}'"

    now = datetime.now(tz=UTC)
    logs_list: list[Logs] = []
    # 1000 groups with count 2 — the unambiguous top 1000.
    for i in range(DEFAULT_GROUP_BY_LIMIT):
        logs_list.append(_uid_log(now, len(logs_list), service, f"u{i:05d}"))
        logs_list.append(_uid_log(now, len(logs_list), service, f"u{i:05d}"))
    # One extra group with count 1 — below the boundary, dropped by both queries.
    logs_list.append(_uid_log(now, len(logs_list), service, "u-overflow"))

    export_json_types(logs_list)
    insert_logs(logs_list)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    start_ms = int((now - timedelta(seconds=60)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    capped = _scalar_group_by(signoz, token, start_ms, end_ms, group_by=[{"name": "body.uid"}], limit=None, filter_expression=filter_expression)
    explicit = _scalar_group_by(signoz, token, start_ms, end_ms, group_by=[{"name": "body.uid"}], limit=DEFAULT_GROUP_BY_LIMIT, filter_expression=filter_expression)

    capped_rows = get_scalar_table_data(capped.json())
    explicit_rows = get_scalar_table_data(explicit.json())

    assert len(capped_rows) == DEFAULT_GROUP_BY_LIMIT
    assert len(explicit_rows) == DEFAULT_GROUP_BY_LIMIT
    assert sorted(capped_rows) == sorted(explicit_rows), "capped result must equal an explicit limit=1000 query"

    # The auto-capped query warns; the explicit-limit query does not.
    assert any(f"limited to {DEFAULT_GROUP_BY_LIMIT}" in w.get("message", "") for w in get_all_warnings(capped.json()))
    assert get_all_warnings(explicit.json()) == []


def test_groupby_body_default_limit_timeseries(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    export_json_types: Callable[[list[Logs]], None],
) -> None:
    """
    Same as test_groupby_body_default_limit but for time series: the cap and the
    body-scoping apply to the number of returned series, not table rows.
    1. A body group by with no explicit limit is capped to 1000 series + warning.
    2. The same body group by with an explicit limit returns all series, no warning.
    3. A non-body (attribute) group by with no limit is not capped.
    """
    service = "groupby-limit-ts-svc"
    filter_expression = f"service.name = '{service}'"
    group_count = DEFAULT_GROUP_BY_LIMIT + 1

    now = datetime.now(tz=UTC)
    logs_list = [_uid_log(now, i, service, f"u{i:05d}") for i in range(group_count)]

    export_json_types(logs_list)
    insert_logs(logs_list)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    start_ms = int((now - timedelta(seconds=60)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    # 1. Body group by, no explicit limit -> capped to 1000 series + warning.
    body_capped = _timeseries_group_by(signoz, token, start_ms, end_ms, group_by=[{"name": "body.uid"}], limit=None, filter_expression=filter_expression)
    capped_series = get_all_series(body_capped.json(), "A")
    assert len(capped_series) == DEFAULT_GROUP_BY_LIMIT, f"expected cap to {DEFAULT_GROUP_BY_LIMIT}, got {len(capped_series)}"
    warnings = get_all_warnings(body_capped.json())
    assert any(f"limited to {DEFAULT_GROUP_BY_LIMIT}" in w.get("message", "") for w in warnings), warnings

    # 2. Body group by with an explicit limit -> no cap, no warning.
    body_explicit = _timeseries_group_by(signoz, token, start_ms, end_ms, group_by=[{"name": "body.uid"}], limit=group_count + 100, filter_expression=filter_expression)
    assert len(get_all_series(body_explicit.json(), "A")) == group_count
    assert get_all_warnings(body_explicit.json()) == []

    # 3. Non-body (attribute) group by, no limit -> not capped (body-scoped).
    attr_uncapped = _timeseries_group_by(signoz, token, start_ms, end_ms, group_by=[build_group_by_field("req_id", "string", "attribute")], limit=None, filter_expression=filter_expression)
    assert len(get_all_series(attr_uncapped.json(), "A")) == group_count
    assert get_all_warnings(attr_uncapped.json()) == []


def test_groupby_body_cap_matches_explicit_limit_timeseries(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    export_json_types: Callable[[list[Logs]], None],
) -> None:
    """
    Time series counterpart of test_groupby_body_cap_matches_explicit_limit, with
    an unambiguous top-1000 (1000 groups with count 2, one overflow group with
    count 1). The auto-capped query returns the same set of series (by group label)
    as an explicit limit=1000 query — the time series trim ranks by series total,
    so the count-2 groups are kept and the count-1 group is dropped.
    """
    service = "groupby-limit-ts-match-svc"
    filter_expression = f"service.name = '{service}'"

    now = datetime.now(tz=UTC)
    logs_list: list[Logs] = []
    # 1000 groups with count 2 — the unambiguous top 1000.
    for i in range(DEFAULT_GROUP_BY_LIMIT):
        logs_list.append(_uid_log(now, len(logs_list), service, f"u{i:05d}"))
        logs_list.append(_uid_log(now, len(logs_list), service, f"u{i:05d}"))
    # One extra group with count 1 — below the boundary, dropped by both queries.
    logs_list.append(_uid_log(now, len(logs_list), service, "u-overflow"))

    export_json_types(logs_list)
    insert_logs(logs_list)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    start_ms = int((now - timedelta(seconds=60)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    capped = _timeseries_group_by(signoz, token, start_ms, end_ms, group_by=[{"name": "body.uid"}], limit=None, filter_expression=filter_expression)
    explicit = _timeseries_group_by(signoz, token, start_ms, end_ms, group_by=[{"name": "body.uid"}], limit=DEFAULT_GROUP_BY_LIMIT, filter_expression=filter_expression)

    capped_series = get_all_series(capped.json(), "A")
    explicit_series = get_all_series(explicit.json(), "A")

    assert len(capped_series) == DEFAULT_GROUP_BY_LIMIT
    assert len(explicit_series) == DEFAULT_GROUP_BY_LIMIT
    assert {_series_label_key(s) for s in capped_series} == {_series_label_key(s) for s in explicit_series}, "capped series must match an explicit limit=1000 query"

    # The auto-capped query warns; the explicit-limit query does not.
    assert any(f"limited to {DEFAULT_GROUP_BY_LIMIT}" in w.get("message", "") for w in get_all_warnings(capped.json()))
    assert get_all_warnings(explicit.json()) == []

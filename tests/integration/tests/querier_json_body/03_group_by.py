import json
from collections.abc import Callable
from datetime import UTC, datetime, timedelta

import pytest
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
    """A log with a distinct body field `uid` and attribute `req_id`."""
    return Logs(
        timestamp=now - timedelta(seconds=5, milliseconds=seq),
        resources={"service.name": service},
        attributes={"req_id": f"r{seq:05d}"},
        body_v2=json.dumps({"uid": uid}),
        body_promoted="",
        severity_text="INFO",
    )


def _group_by(
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


def _group_count(response: requests.Response, request_type: str) -> int:
    """Number of groups returned — table rows for scalar, series for time series."""
    body = response.json()
    if request_type == "scalar":
        return len(get_scalar_table_data(body))
    return len(get_all_series(body, "A"))


def _has_limit_warning(response: requests.Response) -> bool:
    return any(f"limited to {DEFAULT_GROUP_BY_LIMIT}" in w.get("message", "") for w in get_all_warnings(response.json()))


@pytest.mark.parametrize("request_type", ["scalar", "time_series"])
def test_groupby_body_default_limit(
    request_type: str,
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    export_json_types: Callable[[list[Logs]], None],
) -> None:
    """
    An unbounded group by on a log body field is capped to a default limit; an
    explicit limit or a non-body group by opts out. Holds for both scalar and time
    series request types (the cap is on table rows / series respectively).

    Seed > 1000 groups under a unique service, then assert:
    1. Body group by, no explicit limit -> capped to 1000 groups + a "limited to
       1000" warning.
    2. Body group by, explicit limit -> no cap, no warning (an explicit limit opts
       out of the default cap).
    3. Non-body (attribute) group by, no limit -> not capped, no warning (the cap is
       scoped to body group by).
    """
    service = f"groupby-limit-{request_type}-svc"
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
    capped = _group_by(signoz, token, start_ms, end_ms, request_type=request_type, group_by=[{"name": "body.uid"}], limit=None, filter_expression=filter_expression)
    assert _group_count(capped, request_type) == DEFAULT_GROUP_BY_LIMIT
    assert _has_limit_warning(capped), get_all_warnings(capped.json())

    # 2. Body group by with an explicit limit -> no cap, no warning.
    explicit = _group_by(signoz, token, start_ms, end_ms, request_type=request_type, group_by=[{"name": "body.uid"}], limit=group_count + 100, filter_expression=filter_expression)
    assert _group_count(explicit, request_type) == group_count
    assert get_all_warnings(explicit.json()) == []

    # 3. Non-body (attribute) group by, no limit -> not capped (body-scoped).
    attr = _group_by(signoz, token, start_ms, end_ms, request_type=request_type, group_by=[build_group_by_field("req_id", "string", "attribute")], limit=None, filter_expression=filter_expression)
    assert _group_count(attr, request_type) == group_count
    assert get_all_warnings(attr.json()) == []

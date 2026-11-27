from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs
from fixtures.querier import (
    RequestType,
    build_aggregation,
    build_group_by_field,
    build_scalar_query,
    get_all_series,
    get_all_warnings,
    get_scalar_table_data,
    make_query_request,
)

DEFAULT_GROUP_BY_LIMIT = 1000


@pytest.mark.parametrize("request_type", [RequestType.SCALAR, RequestType.TIME_SERIES], ids=["scalar", "time_series"])
def test_logs_group_by_default_limit(
    request_type: str,
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """
    Setup:
    DEFAULT_GROUP_BY_LIMIT + 1 logs under one service, each with a distinct req_id.

    Tests:
    1. Group by req_id, no explicit limit -> capped to 1000 groups (table rows for
       scalar, series for time series) + a "limited to 1000" warning.
    2. Group by req_id, explicit limit -> no cap, no warning.
    """
    service = f"groupby-limit-{request_type}-svc"
    group_count = DEFAULT_GROUP_BY_LIMIT + 1
    now = datetime.now(tz=UTC)
    insert_logs(
        [
            Logs(
                timestamp=now - timedelta(seconds=5, milliseconds=i),
                resources={"service.name": service},
                attributes={"req_id": f"r{i:05d}"},
                body=f"log {i}",
            )
            for i in range(group_count)
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(seconds=60)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    capped = make_query_request(
        signoz,
        token,
        start_ms=start_ms,
        end_ms=end_ms,
        request_type=request_type,
        queries=[
            build_scalar_query(
                name="A",
                signal="logs",
                aggregations=[build_aggregation("count()")],
                group_by=[build_group_by_field("req_id", "string", "attribute")],
                filter_expression=f"service.name = '{service}'",
            )
        ],
    )
    assert capped.status_code == HTTPStatus.OK, capped.text
    capped_groups = get_scalar_table_data(capped.json()) if request_type == RequestType.SCALAR else get_all_series(capped.json(), "A")
    assert len(capped_groups) == DEFAULT_GROUP_BY_LIMIT
    capped_warnings = get_all_warnings(capped.json())
    assert any(f"limited to {DEFAULT_GROUP_BY_LIMIT}" in w.get("message", "") for w in capped_warnings), capped_warnings

    explicit = make_query_request(
        signoz,
        token,
        start_ms=start_ms,
        end_ms=end_ms,
        request_type=request_type,
        queries=[
            build_scalar_query(
                name="A",
                signal="logs",
                aggregations=[build_aggregation("count()")],
                group_by=[build_group_by_field("req_id", "string", "attribute")],
                limit=group_count + 100,
                filter_expression=f"service.name = '{service}'",
            )
        ],
    )
    assert explicit.status_code == HTTPStatus.OK, explicit.text
    explicit_groups = get_scalar_table_data(explicit.json()) if request_type == RequestType.SCALAR else get_all_series(explicit.json(), "A")
    assert len(explicit_groups) == group_count
    assert get_all_warnings(explicit.json()) == []

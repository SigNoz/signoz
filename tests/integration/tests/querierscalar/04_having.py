from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs
from fixtures.querier import (
    assert_scalar_result_order,
    build_group_by_field,
    build_logs_aggregation,
    build_order_by,
    build_scalar_query,
    get_scalar_table_data,
    make_scalar_query_request,
)

# Non-empty HAVING (a post-aggregation filter) — every existing querier test uses
# only the empty `{"expression": ""}` HAVING boilerplate.


def test_logs_scalar_group_by_having(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """A scalar group-by with `having count() > 3` returns only the qualifying groups."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    service_counts = {"service-a": 5, "service-b": 3, "service-c": 7, "service-d": 1}
    logs = []
    for service, count in service_counts.items():
        for i in range(count):
            logs.append(
                Logs(
                    timestamp=now - timedelta(seconds=i + 1),
                    resources={"service.name": service},
                    body=f"{service} log {i}",
                )
            )
    insert_logs(logs)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    query = build_scalar_query(
        name="A",
        signal="logs",
        aggregations=[build_logs_aggregation("count()")],
        group_by=[build_group_by_field("service.name", "string", "resource")],
        order=[build_order_by("count()", "desc")],
        having_expression="count() > 3",
    )
    response = make_scalar_query_request(signoz, token, now, [query])

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"
    data = get_scalar_table_data(response.json())
    # only service-c (7) and service-a (5) have count() > 3; service-b (3) and service-d (1) dropped
    assert_scalar_result_order(data, [("service-c", 7), ("service-a", 5)], "having count() > 3")

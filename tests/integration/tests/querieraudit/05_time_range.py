from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

from fixtures import types
from fixtures.audit import AuditLog
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.querier import (
    BuilderQuery,
    RequestType,
    build_aggregation,
    build_order_by,
    build_scalar_query,
    make_query_request,
)


def test_audit_time_range_is_start_inclusive_end_exclusive(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_audit_logs: Callable[[list[AuditLog]], None],
) -> None:
    """Events at start, inside, and at end minus one second are returned; one second before start, at end, and two hours earlier are not. The same window bounds a scalar count."""
    end = datetime.now(tz=UTC).replace(microsecond=0)
    start = end - timedelta(minutes=1)
    insert_audit_logs(
        [
            AuditLog(
                timestamp=timestamp,
                resources={"service.name": "signoz", "signoz.resource.kind": "dashboard", "signoz.resource.id": "dash-001"},
                attributes={"signoz.principal.id": "user-001", "signoz.principal.type": "user", "signoz.audit.verb": "update", "signoz.audit.outcome": "success"},
                body=body,
                event_name="signoz.audit.update",
            )
            for timestamp, body in [
                (start - timedelta(seconds=1), "one second before start"),
                (start, "at start"),
                (start + timedelta(seconds=30), "inside"),
                (end - timedelta(seconds=1), "one second before end"),
                (end, "at end"),
                (end - timedelta(hours=2), "two hours earlier"),
            ]
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int(start.timestamp() * 1000)
    end_ms = int(end.timestamp() * 1000)

    response = make_query_request(
        signoz,
        token,
        start_ms=start_ms,
        end_ms=end_ms,
        queries=[
            BuilderQuery(
                signal="logs",
                source="audit",
                limit=100,
                order=[build_order_by("timestamp"), build_order_by("id")],
            ).to_dict()
        ],
        request_type=RequestType.RAW,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    rows = response.json()["data"]["data"]["results"][0].get("rows") or []
    assert [row["data"]["body"]["message"] for row in rows] == ["one second before end", "inside", "at start"]

    response = make_query_request(
        signoz,
        token,
        start_ms=start_ms,
        end_ms=end_ms,
        queries=[build_scalar_query(name="A", signal="logs", source="audit", aggregations=[build_aggregation("count()")])],
        request_type=RequestType.SCALAR,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["data"]["data"]["results"][0]["data"][0][0] == 3

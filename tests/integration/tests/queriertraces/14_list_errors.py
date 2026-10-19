from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.traces import TraceIdGenerator, Traces, TracesEvent, TracesKind, TracesStatusCode


def test_list_errors_groups_exception_events(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """
    Setup:
    Two error spans with the same `exception` event, one with a different type.

    Tests:
    listErrors returns one group per (service, type, message) with its count, and
    the group's trace and span ids resolve through getErrorByGroupID.
    """
    now = datetime.now(tz=UTC).replace(microsecond=0)
    service = "list-errors-service"

    spans = [
        Traces(
            timestamp=now - timedelta(seconds=ago),
            duration=timedelta(milliseconds=50),
            trace_id=TraceIdGenerator.trace_id(),
            span_id=TraceIdGenerator.span_id(),
            name="GET /fail",
            kind=TracesKind.SPAN_KIND_SERVER,
            status_code=TracesStatusCode.STATUS_CODE_ERROR,
            resources={"service.name": service},
            events=[
                TracesEvent(
                    name="exception",
                    timestamp=now - timedelta(seconds=ago),
                    attribute_map={
                        "exception.type": exc_type,
                        "exception.message": "boom",
                        "exception.stacktrace": f"{exc_type}: boom\n  at handler",
                        "exception.escaped": "true",
                    },
                )
            ],
        )
        for ago, exc_type in ((30, "TimeoutError"), (20, "TimeoutError"), (10, "ValueError"))
    ]
    insert_traces(spans)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/listErrors"),
        json={
            "start": str(int((now - timedelta(minutes=5)).timestamp()) * 10**9),
            "end": str(int((now + timedelta(minutes=1)).timestamp()) * 10**9),
            "limit": 10,
            "orderParam": "exceptionType",
            "order": "ascending",
            "serviceName": service,
        },
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    groups = {row["exceptionType"]: row for row in response.json()["data"]}
    assert set(groups) == {"TimeoutError", "ValueError"}, groups
    assert groups["TimeoutError"]["exceptionCount"] == 2
    assert groups["ValueError"]["exceptionCount"] == 1
    assert groups["TimeoutError"]["serviceName"] == service

    timeout = groups["TimeoutError"]
    last_seen_ns = int(datetime.fromisoformat(timeout["lastSeen"]).timestamp()) * 10**9
    detail = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v1/errorFromGroupID?groupID={timeout['groupID']}&timestamp={last_seen_ns}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert detail.status_code == HTTPStatus.OK, detail.text
    body = detail.json()["data"]
    assert body["traceID"] == spans[1].trace_id
    assert body["spanID"] == spans[1].span_id
    assert body["exceptionEscaped"] is True
    assert "at handler" in body["exceptionStacktrace"]

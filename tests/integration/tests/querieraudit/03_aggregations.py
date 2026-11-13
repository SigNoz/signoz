from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

from fixtures import types
from fixtures.audit import AuditLog
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.querier import (
    RequestType,
    build_aggregation,
    build_group_by_field,
    build_scalar_query,
    get_all_series,
    index_series_by_label,
    make_query_request,
)


def test_audit_scalar_count_failures(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_audit_logs: Callable[[list[AuditLog]], None],
) -> None:
    """Alert query — count multiple failures from different principals."""
    now = datetime.now(tz=UTC)
    insert_audit_logs(
        [
            AuditLog(
                timestamp=now - timedelta(seconds=3),
                resources={
                    "service.name": "signoz",
                    "signoz.resource.kind": "dashboard",
                    "signoz.resource.id": "dash-100",
                },
                attributes={
                    "signoz.principal.id": "user-050",
                    "signoz.principal.type": "user",
                    "signoz.audit.verb": "delete",
                    "signoz.audit.outcome": "failure",
                },
                body="user-050 failed to delete dashboard",
                event_name="signoz.audit.delete",
                severity_text="ERROR",
            ),
            AuditLog(
                timestamp=now - timedelta(seconds=2),
                resources={
                    "service.name": "signoz",
                    "signoz.resource.kind": "alert-rule",
                    "signoz.resource.id": "alert-200",
                },
                attributes={
                    "signoz.principal.id": "user-060",
                    "signoz.principal.type": "user",
                    "signoz.audit.verb": "update",
                    "signoz.audit.outcome": "failure",
                },
                body="user-060 failed to update alert-rule",
                event_name="signoz.audit.update",
                severity_text="ERROR",
            ),
            AuditLog(
                timestamp=now - timedelta(seconds=1),
                resources={
                    "service.name": "signoz",
                    "signoz.resource.kind": "dashboard",
                    "signoz.resource.id": "dash-100",
                },
                attributes={
                    "signoz.principal.id": "user-050",
                    "signoz.principal.type": "user",
                    "signoz.audit.verb": "update",
                    "signoz.audit.outcome": "success",
                },
                body="user-050 updated dashboard",
                event_name="signoz.audit.update",
            ),
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    now = datetime.now(tz=UTC)
    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(seconds=30)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        queries=[
            build_scalar_query(
                name="A",
                signal="logs",
                source="audit",
                aggregations=[build_aggregation("count()")],
                filter_expression="signoz.audit.outcome = 'failure'",
            )
        ],
        request_type="scalar",
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    scalar_data = response.json()["data"]["data"]["results"][0].get("data", [])
    assert len(scalar_data) == 1
    assert scalar_data[0][0] == 2


def test_audit_scalar_distinct_principals_by_resource_kind(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_audit_logs: Callable[[list[AuditLog]], None],
) -> None:
    now = datetime.now(tz=UTC)
    insert_audit_logs(
        [
            AuditLog(
                timestamp=now - timedelta(seconds=seconds_ago),
                resources={"service.name": "signoz", "signoz.resource.kind": kind, "signoz.resource.id": resource_id},
                attributes={"signoz.principal.id": principal, "signoz.principal.type": "user", "signoz.audit.verb": verb, "signoz.audit.outcome": "success"},
                body=f"{principal} {verb} {kind} ({resource_id})",
                event_name=f"signoz.audit.{verb}",
            )
            for seconds_ago, kind, resource_id, principal, verb in [
                (5, "dashboard", "dash-001", "user-001", "update"),
                (4, "dashboard", "dash-001", "user-001", "update"),
                (3, "dashboard", "dash-002", "user-002", "delete"),
                (2, "alert-rule", "alert-001", "user-001", "create"),
                (1, "alert-rule", "alert-002", "user-001", "update"),
            ]
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(seconds=30)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        queries=[
            build_scalar_query(
                name="A",
                signal="logs",
                source="audit",
                aggregations=[build_aggregation("count_distinct(signoz.principal.id)")],
                group_by=[build_group_by_field("signoz.resource.kind", "string", "resource")],
            )
        ],
        request_type=RequestType.SCALAR,
    )
    assert response.status_code == HTTPStatus.OK, response.text

    rows = response.json()["data"]["data"]["results"][0]["data"]
    assert {row[0]: row[-1] for row in rows} == {"dashboard": 2, "alert-rule": 1}


def test_audit_time_series_count_by_verb(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_audit_logs: Callable[[list[AuditLog]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    one_minute_ago = now - timedelta(minutes=1)
    two_minutes_ago = now - timedelta(minutes=2)
    insert_audit_logs(
        [
            AuditLog(
                timestamp=timestamp,
                resources={"service.name": "signoz", "signoz.resource.kind": "dashboard", "signoz.resource.id": resource_id},
                attributes={"signoz.principal.id": principal, "signoz.principal.type": "user", "signoz.audit.verb": verb, "signoz.audit.outcome": "success"},
                body=f"{principal} {verb} dashboard ({resource_id})",
                event_name=f"signoz.audit.{verb}",
            )
            for timestamp, resource_id, principal, verb in [
                (two_minutes_ago + timedelta(seconds=10), "dash-001", "user-001", "update"),
                (two_minutes_ago + timedelta(seconds=20), "dash-002", "user-001", "update"),
                (one_minute_ago + timedelta(seconds=10), "dash-001", "user-002", "update"),
                (one_minute_ago + timedelta(seconds=30), "dash-002", "user-002", "delete"),
            ]
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(minutes=5)).timestamp() * 1000),
        end_ms=int((now + timedelta(seconds=5)).timestamp() * 1000),
        queries=[
            build_scalar_query(
                name="A",
                signal="logs",
                source="audit",
                aggregations=[build_aggregation("count()")],
                group_by=[build_group_by_field("signoz.audit.verb", "string", "attribute")],
            )
        ],
        request_type=RequestType.TIME_SERIES,
    )
    assert response.status_code == HTTPStatus.OK, response.text

    series_by_verb = index_series_by_label(get_all_series(response.json(), "A"), "signoz.audit.verb")
    counts_by_verb = {verb: {point["timestamp"]: point["value"] for point in series["values"] if point["value"]} for verb, series in series_by_verb.items()}

    two_minutes_ago_ms = int(two_minutes_ago.timestamp() * 1000)
    one_minute_ago_ms = int(one_minute_ago.timestamp() * 1000)
    assert counts_by_verb == {
        "update": {two_minutes_ago_ms: 2, one_minute_ago_ms: 1},
        "delete": {one_minute_ago_ms: 1},
    }

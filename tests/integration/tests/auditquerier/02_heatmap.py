from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest

from fixtures import types
from fixtures.audit import AuditLog
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.querier import (
    RequestType,
    build_group_by_field,
    build_heatmap_query,
    build_linear_bucket_options,
    get_all_series,
    get_heatmap_buckets,
    index_series_by_label,
    make_query_request,
)


def test_audit_heatmap(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_audit_logs: Callable[[list[AuditLog]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    changed_by_action = {"update": [3, 8], "delete": [25]}
    insert_audit_logs(
        [
            AuditLog(
                timestamp=now - timedelta(seconds=index + 1),
                resources={"service.name": "signoz", "signoz.audit.resource.kind": "dashboard"},
                attributes={"signoz.audit.action": action, "signoz.audit.fields_changed": fields_changed},
                event_name=f"dashboard.{action}",
            )
            for action, values in changed_by_action.items()
            for index, fields_changed in enumerate(values)
        ]
        # an event without the field counts as 0
        + [
            AuditLog(
                timestamp=now - timedelta(seconds=5),
                resources={"service.name": "signoz", "signoz.audit.resource.kind": "dashboard"},
                attributes={"signoz.audit.action": "update"},
                event_name="dashboard.update",
            )
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_query_request(
        signoz,
        token,
        int((now - timedelta(minutes=5)).timestamp() * 1000),
        int((now + timedelta(seconds=5)).timestamp() * 1000),
        [
            build_heatmap_query(
                "A",
                "logs",
                "signoz.audit.fields_changed",
                source="audit",
                group_by=[build_group_by_field("signoz.audit.action", "string", "attribute")],
                filter_expression="signoz.audit.resource.kind = 'dashboard'",
                bucket_options=build_linear_bucket_options(20, 4),
            )
        ],
        request_type=RequestType.HEATMAP,
    )
    assert response.status_code == HTTPStatus.OK, response.text

    data = response.json()
    # 20 split into 4 gives (0, 5], (5, 10], (10, 15], (15, 20]; the axis stops
    # at the highest bucket reached, and 25 is past 20 so it counts in the
    # trailing overflow
    buckets = get_heatmap_buckets(data, "A")
    assert buckets == pytest.approx([0.0, 5.0, 10.0])

    series_by_action = index_series_by_label(get_all_series(data, "A"), "signoz.audit.action")
    totals_by_action = {action: [sum(column["values"][slot] for column in series["values"]) for slot in range(len(buckets) + 1)] for action, series in series_by_action.items()}
    assert totals_by_action == {
        "update": [1, 1, 1, 0],
        "delete": [0, 0, 0, 1],
    }

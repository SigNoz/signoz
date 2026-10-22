from collections.abc import Callable
from datetime import timedelta
from http import HTTPStatus

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs
from fixtures.querier import (
    assert_grouped_series,
    build_aggregation,
    build_group_by_field,
    get_resource_evolution_time,
    index_series_by_label,
    make_query_request,
)


@pytest.mark.parametrize(
    "materialize_service_name",
    [
        pytest.param(False, id="map_resource_fields"),
        pytest.param(True, id="materialized_resource_field"),
    ],
)
def test_logs_resource_evolution(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    materialize_log_field: Callable[[str, str, str, str], None],
    materialize_service_name: bool,
) -> None:
    """
    # 1. Get the evolution time.
    # 2. Ingest logs before the evolution time.
    # 3. Ingest logs after the evolution time.
    # 4. Query the logs before the evolution time.
    # 5. Query the logs after the evolution time.
    # Both aggregation and group by should be checked.
    """
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    if materialize_service_name:
        materialize_log_field(token, "service.name", "string", "resources")

    evolution_time = get_resource_evolution_time(signoz, "logs")
    evolution_time = evolution_time.replace(second=0, microsecond=0)

    before_2 = evolution_time - timedelta(minutes=10)
    before_1 = evolution_time - timedelta(minutes=5)
    after_1 = evolution_time + timedelta(minutes=5)
    after_2 = evolution_time + timedelta(minutes=10)

    # Logs with timestamps before the evolution time will have resources written only to resources_string.
    # Logs with timestamps at or after the evolution time will have resources written to both resources_string and resource_json.
    insert_logs(
        [
            Logs(
                timestamp=before_2,
                resources={
                    "service.name": "svc-before-2",
                    "deployment.environment": "integration",
                },
                body="log before evolution 2",
                severity_text="INFO",
                resource_write_mode="legacy_only",
            ),
            Logs(
                timestamp=before_1,
                resources={
                    "service.name": "svc-before-1",
                    "deployment.environment": "integration",
                },
                body="log before evolution 1",
                severity_text="INFO",
                resource_write_mode="legacy_only",
            ),
            Logs(
                timestamp=after_1,
                resources={
                    "service.name": "svc-after-1",
                    "deployment.environment": "integration",
                },
                body="log after evolution 1",
                severity_text="INFO",
                resource_write_mode="dual_write",
            ),
            Logs(
                timestamp=after_2,
                resources={
                    "service.name": "svc-after-2",
                    "deployment.environment": "integration",
                },
                body="log after evolution 2",
                severity_text="INFO",
                resource_write_mode="dual_write",
            ),
        ]
    )

    for start, end, group_by, aggregation, expected_values_by_group in [
        (
            before_2 - timedelta(minutes=1),
            before_1 + timedelta(minutes=1),
            "service.name",
            "count()",
            {
                "svc-before-2": {
                    int(before_2.timestamp() * 1000): 1,
                },
                "svc-before-1": {
                    int(before_1.timestamp() * 1000): 1,
                },
            },
        ),
        (
            after_1 - timedelta(minutes=1),
            after_2 + timedelta(minutes=1),
            "service.name",
            "count()",
            {
                "svc-after-1": {
                    int(after_1.timestamp() * 1000): 1,
                },
                "svc-after-2": {
                    int(after_2.timestamp() * 1000): 1,
                },
            },
        ),
        (
            before_2,
            after_2 + timedelta(minutes=1),
            "service.name",
            "count()",
            {
                "svc-before-2": {
                    int(before_2.timestamp() * 1000): 1,
                },
                "svc-before-1": {
                    int(before_1.timestamp() * 1000): 1,
                },
                "svc-after-1": {
                    int(after_1.timestamp() * 1000): 1,
                },
                "svc-after-2": {
                    int(after_2.timestamp() * 1000): 1,
                },
            },
        ),
        # query to check aggregation on the resource field like count_distinct(service.name)
        (
            before_2,
            after_2 + timedelta(minutes=1),
            "deployment.environment",
            "count_distinct(service.name)",
            {
                "integration": {
                    int(before_2.timestamp() * 1000): 1,
                    int(before_1.timestamp() * 1000): 1,
                    int(after_1.timestamp() * 1000): 1,
                    int(after_2.timestamp() * 1000): 1,
                },
            },
        ),
    ]:
        response = make_query_request(
            signoz,
            token,
            start_ms=int(start.timestamp() * 1000),
            end_ms=int(end.timestamp() * 1000),
            request_type="time_series",
            queries=[
                {
                    "type": "builder_query",
                    "spec": {
                        "name": "A",
                        "signal": "logs",
                        "stepInterval": 60,
                        "disabled": False,
                        "groupBy": [build_group_by_field(group_by)],
                        "having": {"expression": ""},
                        "aggregations": [build_aggregation(aggregation)],
                    },
                }
            ],
        )

        assert response.status_code == HTTPStatus.OK
        assert response.json()["status"] == "success"

        results = response.json()["data"]["data"]["results"]
        assert len(results) == 1

        aggregations = results[0]["aggregations"]
        assert len(aggregations) == 1

        assert_grouped_series(
            index_series_by_label(aggregations[0]["series"], group_by),
            expected_values_by_group=expected_values_by_group,
        )

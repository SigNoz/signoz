"""Phase 2 semantic-convention checks across logs and metrics."""

from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import requests

from fixtures import querier, types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs
from fixtures.metrics import Metrics

DB_CURRENT = "db.system.name"
DB_OLD = "db.system"
METRIC_CURRENT = "container.cpu.usage"
METRIC_OLD = "container.cpu.utilization"
PREFIX = "semconv-phase2"


def test_logs_resolve_db_system_family(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(microsecond=0) - timedelta(minutes=1)
    rows = [
        ("old", {DB_OLD: "postgresql"}),
        ("current", {DB_CURRENT: "postgresql"}),
        ("conflict", {DB_OLD: "mysql", DB_CURRENT: "postgresql"}),
        ("missing", {}),
    ]
    insert_logs(
        [
            Logs(
                timestamp=now + timedelta(seconds=index),
                resources={"service.name": PREFIX, **attributes},
                attributes=attributes,
                body=f"{PREFIX}-{suffix}",
            )
            for index, (suffix, attributes) in enumerate(rows)
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(minutes=2)).timestamp() * 1000)
    end_ms = int((now + timedelta(minutes=1)).timestamp() * 1000)
    present = {f"{PREFIX}-old", f"{PREFIX}-current", f"{PREFIX}-conflict"}

    for context in ("attribute", "resource"):
        for requested in (DB_CURRENT, DB_OLD):
            field = f"{context}.{requested}"
            query_cases = {
                "equal": (f'{field} = "postgresql"', present),
                "exists": (f"{field} EXISTS", present),
                "not_exists": (f"{field} NOT EXISTS", {f"{PREFIX}-missing"}),
            }
            response = querier.make_query_request(
                signoz,
                token,
                start_ms=start_ms,
                end_ms=end_ms,
                request_type=querier.RequestType.RAW,
                queries=[querier.build_raw_query(name, "logs", limit=100, filter_expression=expression) for name, (expression, _) in query_cases.items()],
            )
            assert response.status_code == HTTPStatus.OK, response.text
            results = response.json()["data"]["data"]["results"]
            for name, (_, expected_bodies) in query_cases.items():
                result = querier.find_named_result(results, name)
                assert result is not None, name
                assert {row["data"]["body"] for row in (result.get("rows") or [])} == expected_bodies

            values_response = requests.get(
                signoz.self.host_configs["8080"].get("/api/v1/fields/values"),
                timeout=5,
                headers={"authorization": f"Bearer {token}"},
                params={
                    "signal": "logs",
                    "name": requested,
                    "fieldContext": context,
                    "fieldDataType": "string",
                },
            )
            assert values_response.status_code == HTTPStatus.OK, values_response.text
            assert set(values_response.json()["data"]["values"].get("stringValues") or []) == {"postgresql", "mysql"}


def test_metrics_resolve_label_and_metric_name_families(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    insert_metrics(
        [
            Metrics(
                metric_name=METRIC_CURRENT,
                labels={DB_CURRENT: "postgresql"},
                timestamp=now - timedelta(seconds=3),
                temporality="Unspecified",
                type_="Gauge",
                is_monotonic=False,
                value=10,
            ),
            Metrics(
                metric_name=METRIC_OLD,
                labels={"db_system": "mysql"},
                timestamp=now - timedelta(seconds=2),
                temporality="Unspecified",
                type_="Gauge",
                is_monotonic=False,
                value=20,
            ),
            Metrics(
                metric_name=METRIC_OLD,
                labels={DB_OLD: "mysql", DB_CURRENT: "postgresql", "series": "conflict"},
                timestamp=now - timedelta(seconds=1),
                temporality="Unspecified",
                type_="Gauge",
                is_monotonic=False,
                value=30,
            ),
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    for metric_name in (METRIC_CURRENT, METRIC_OLD):
        for requested_label in (DB_CURRENT, DB_OLD):
            response = querier.make_scalar_query_request(
                signoz,
                token,
                now,
                [
                    querier.build_scalar_query(
                        name="A",
                        signal="metrics",
                        aggregations=[
                            querier.build_metrics_aggregation(
                                metric_name,
                                "latest",
                                "sum",
                                "unspecified",
                                reduce_to="last",
                            )
                        ],
                        group_by=[querier.build_group_by_field(requested_label, "string", "attribute")],
                        filter_expression=f"attribute.{requested_label} EXISTS",
                    )
                ],
            )
            assert response.status_code == HTTPStatus.OK, response.text
            data = {row[0]: row[-1] for row in querier.get_scalar_table_data(response.json())}
            assert data == {"postgresql": 40.0, "mysql": 20.0}, (metric_name, requested_label, data)

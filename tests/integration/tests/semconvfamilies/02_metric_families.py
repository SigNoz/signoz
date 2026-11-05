from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.metrics import Metrics
from fixtures.querier import (
    RequestType,
    build_group_by_field,
    build_metrics_aggregation,
    build_scalar_query,
    get_scalar_columns,
    get_scalar_table_data,
    make_query_request,
)
from fixtures.semconvfamilies import (
    CURRENT_NAME_METRIC,
    LABEL_METRIC,
    OLD_NAME_METRIC,
    SPAN_METRIC,
)


@pytest.mark.parametrize("requested_key", ["deployment.environment.name", "deployment.environment"], ids=["current", "old"])
def test_metric_label_filter_merges_stored_spellings(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    metric_family_fleet: datetime,
    requested_key: str,
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_query_request(
        signoz,
        token,
        start_ms=int((metric_family_fleet - timedelta(minutes=30)).timestamp() * 1000),
        end_ms=int(metric_family_fleet.timestamp() * 1000),
        request_type=RequestType.SCALAR,
        queries=[
            build_scalar_query(
                name="A",
                signal="metrics",
                aggregations=[build_metrics_aggregation(LABEL_METRIC, "latest", "sum", "unspecified", reduce_to="last")],
                filter_expression=f"{requested_key} = 'production'",
            )
        ],
    )
    assert response.status_code == HTTPStatus.OK, response.text
    rows = get_scalar_table_data(response.json())
    # The old spelling series (2) and the current spelling series (512). The
    # conflict series (64) merges current-first to staging and stays out.
    assert rows and rows[0][-1] == 514.0, rows


def test_metric_label_group_by_merges_stored_spellings(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    metric_family_fleet: datetime,
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_query_request(
        signoz,
        token,
        start_ms=int((metric_family_fleet - timedelta(minutes=30)).timestamp() * 1000),
        end_ms=int(metric_family_fleet.timestamp() * 1000),
        request_type=RequestType.SCALAR,
        queries=[
            build_scalar_query(
                name="A",
                signal="metrics",
                aggregations=[build_metrics_aggregation(LABEL_METRIC, "latest", "sum", "unspecified", reduce_to="last")],
                group_by=[build_group_by_field("deployment.environment.name", "string", "attribute")],
            )
        ],
    )
    assert response.status_code == HTTPStatus.OK, response.text

    group_column = get_scalar_columns(response.json())[0]
    assert group_column["name"] == "deployment.environment.name", group_column
    groups = {row[0]: row[-1] for row in get_scalar_table_data(response.json())}
    assert groups.get("production") == 514.0, groups
    # The conflict series lands in the staging group: the current spelling
    # wins the merge.
    assert groups.get("staging") == 65.0, groups
    assert groups.get("") == 8.0, groups


@pytest.mark.parametrize(
    "expression,expected",
    [
        pytest.param("deployment.environment = 'production'", 384.0, id="old_spelling_reads_plain_and_resource_labels"),
        pytest.param("deployment.environment.name = 'production'", 384.0, id="current_spelling_reads_the_same_series"),
        pytest.param("deployment.environment.name = 'staging'", 4.0, id="resource_current_spelling"),
    ],
)
def test_span_metric_label_filter_reads_resource_layout(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    metric_family_fleet: datetime,
    expression: str,
    expected: float,
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_query_request(
        signoz,
        token,
        start_ms=int((metric_family_fleet - timedelta(minutes=30)).timestamp() * 1000),
        end_ms=int(metric_family_fleet.timestamp() * 1000),
        request_type=RequestType.SCALAR,
        queries=[
            build_scalar_query(
                name="A",
                signal="metrics",
                aggregations=[build_metrics_aggregation(SPAN_METRIC, "latest", "sum", "unspecified", reduce_to="last")],
                filter_expression=expression,
            )
        ],
    )
    assert response.status_code == HTTPStatus.OK, response.text
    rows = get_scalar_table_data(response.json())
    assert rows and rows[0][-1] == expected, rows


@pytest.mark.parametrize("requested", [OLD_NAME_METRIC, CURRENT_NAME_METRIC], ids=["old", "current"])
def test_metric_name_family_unions_storage_names(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    metric_family_fleet: datetime,
    requested: str,
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_query_request(
        signoz,
        token,
        start_ms=int((metric_family_fleet - timedelta(minutes=30)).timestamp() * 1000),
        end_ms=int(metric_family_fleet.timestamp() * 1000),
        request_type=RequestType.SCALAR,
        queries=[
            build_scalar_query(
                name="A",
                signal="metrics",
                aggregations=[build_metrics_aggregation(requested, "latest", "sum", "unspecified", reduce_to="last")],
            )
        ],
    )
    assert response.status_code == HTTPStatus.OK, response.text
    rows = get_scalar_table_data(response.json())
    assert rows and rows[0][-1] == 48.0, rows


def test_metric_name_union_double_counts_dual_emission(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    now = datetime.now(tz=UTC)
    seeded = now - timedelta(minutes=10)
    gauge = {"temporality": "Unspecified", "type_": "Gauge", "is_monotonic": False}
    insert_metrics(
        [
            Metrics(metric_name=OLD_NAME_METRIC, labels={"pod": "overlap"}, timestamp=seeded, value=16.0, **gauge),
            Metrics(metric_name=CURRENT_NAME_METRIC, labels={"pod": "overlap"}, timestamp=seeded, value=16.0, **gauge),
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(minutes=30)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        request_type=RequestType.SCALAR,
        queries=[
            build_scalar_query(
                name="A",
                signal="metrics",
                aggregations=[build_metrics_aggregation(CURRENT_NAME_METRIC, "latest", "sum", "unspecified", reduce_to="last")],
            )
        ],
    )
    assert response.status_code == HTTPStatus.OK, response.text
    rows = get_scalar_table_data(response.json())
    assert rows and rows[0][-1] == 32.0, rows


def test_metric_family_stays_literal_with_flag_off(
    signoz_families_off: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    metric_family_fleet: datetime,
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_query_request(
        signoz_families_off,
        token,
        start_ms=int((metric_family_fleet - timedelta(minutes=30)).timestamp() * 1000),
        end_ms=int(metric_family_fleet.timestamp() * 1000),
        request_type=RequestType.SCALAR,
        queries=[
            build_scalar_query(
                name="A",
                signal="metrics",
                aggregations=[build_metrics_aggregation(LABEL_METRIC, "latest", "sum", "unspecified", reduce_to="last")],
                filter_expression="deployment.environment.name = 'production'",
            )
        ],
    )
    assert response.status_code == HTTPStatus.OK, response.text
    rows = get_scalar_table_data(response.json())
    # Only the series stored under the requested spelling.
    assert rows and rows[0][-1] == 512.0, rows

    response = make_query_request(
        signoz_families_off,
        token,
        start_ms=int((metric_family_fleet - timedelta(minutes=30)).timestamp() * 1000),
        end_ms=int(metric_family_fleet.timestamp() * 1000),
        request_type=RequestType.SCALAR,
        queries=[
            build_scalar_query(
                name="A",
                signal="metrics",
                aggregations=[build_metrics_aggregation(OLD_NAME_METRIC, "latest", "sum", "unspecified", reduce_to="last")],
            )
        ],
    )
    assert response.status_code == HTTPStatus.OK, response.text
    rows = get_scalar_table_data(response.json())
    assert rows and rows[0][-1] == 16.0, rows

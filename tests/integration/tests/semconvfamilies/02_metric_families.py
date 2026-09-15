from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus
from time import sleep

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.metrics import Metrics
from fixtures.querier import build_group_by_field, get_scalar_columns, get_scalar_table_data
from fixtures.semconvfamilies import (
    CURRENT_NAME_METRIC,
    LABEL_METRIC,
    NORMALIZED_CURRENT_NAME_METRIC,
    NORMALIZED_OLD_NAME_METRIC,
    OLD_NAME_METRIC,
    label_metric_sum,
    scalar_query,
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
    total = label_metric_sum(signoz, token, metric_family_fleet, f"{requested_key} = 'production'")
    # The dotted old, the normalized, and the resource_ series. The conflict
    # series (64) merges current-first to staging and stays out.
    assert total == 134.0, total


def test_metric_label_group_by_merges_stored_spellings(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    metric_family_fleet: datetime,
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = scalar_query(
        signoz,
        token,
        metric_family_fleet,
        LABEL_METRIC,
        group_by=[build_group_by_field("deployment.environment.name", "string", "attribute")],
    )
    assert response.status_code == HTTPStatus.OK, response.text

    group_column = get_scalar_columns(response.json())[0]
    assert group_column["name"] == "deployment.environment.name", group_column
    groups = {row[0]: row[-1] for row in get_scalar_table_data(response.json())}
    assert groups.get("production") == 134.0, groups
    # The conflict series lands in the staging group: the current spelling
    # wins the merge.
    assert groups.get("staging") == 65.0, groups
    assert groups.get("") == 8.0, groups


def test_metric_name_family_unions_storage_names(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    metric_family_fleet: datetime,
) -> None:
    """The requested layout decides the storage names. The dotted pair and the
    normalized pair never mix."""
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    for requested in (OLD_NAME_METRIC, CURRENT_NAME_METRIC):
        response = scalar_query(signoz, token, metric_family_fleet, requested)
        assert response.status_code == HTTPStatus.OK, response.text
        rows = get_scalar_table_data(response.json())
        assert rows and rows[0][-1] == 48.0, (requested, rows)
    for requested in (NORMALIZED_OLD_NAME_METRIC, NORMALIZED_CURRENT_NAME_METRIC):
        response = scalar_query(signoz, token, metric_family_fleet, requested)
        assert response.status_code == HTTPStatus.OK, response.text
        rows = get_scalar_table_data(response.json())
        assert rows and rows[0][-1] == 768.0, (requested, rows)


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
    deadline = datetime.now(tz=UTC) + timedelta(seconds=60)
    rows = []
    while datetime.now(tz=UTC) < deadline:
        rows = get_scalar_table_data(scalar_query(signoz, token, datetime.now(tz=UTC), CURRENT_NAME_METRIC).json())
        if rows:
            break
        sleep(1)
    assert rows and rows[0][-1] == 32.0, rows


def test_metric_family_stays_literal_with_flag_off(
    signoz_families_off: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    metric_family_fleet: datetime,
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    total = label_metric_sum(signoz_families_off, token, metric_family_fleet, "deployment.environment.name = 'production'")
    assert total == 0.0, total

    response = scalar_query(signoz_families_off, token, metric_family_fleet, OLD_NAME_METRIC)
    assert response.status_code == HTTPStatus.OK, response.text
    rows = get_scalar_table_data(response.json())
    assert rows and rows[0][-1] == 16.0, rows

from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus
from time import sleep

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

LABEL_METRIC = "semconv.fam.label.metric"
OLD_NAME_METRIC = "k8s.pod.cpu.utilization"
CURRENT_NAME_METRIC = "k8s.pod.cpu.usage"
NORMALIZED_OLD_NAME_METRIC = "k8s_pod_cpu_utilization"
NORMALIZED_CURRENT_NAME_METRIC = "k8s_pod_cpu_usage"


@pytest.fixture(name="metric_family_fleet", scope="function")
def metric_family_fleet(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> datetime:
    """Yields the timestamp of the seeded series. One gauge series per label
    spelling of the deployment.environment family (dotted current, dotted old,
    the normalized old layout, and the span-metrics resource_ layout), one
    conflict series that carries both dotted spellings, and one series under
    each storage name of the k8s.pod.cpu.usage metric-name family in both the
    dotted and the normalized layouts. Power-of-two values make any missed
    member a unique wrong sum."""
    now = datetime.now(tz=UTC)
    # The querier clamps very recent metric samples (flux interval), so the
    # fleet sits safely in the past.
    seeded = now - timedelta(minutes=10)
    gauge = {"temporality": "Unspecified", "type_": "Gauge", "is_monotonic": False}
    insert_metrics(
        [
            Metrics(metric_name=LABEL_METRIC, labels={"deployment.environment.name": "staging"}, timestamp=seeded, value=1.0, **gauge),
            Metrics(metric_name=LABEL_METRIC, labels={"deployment.environment": "production"}, timestamp=seeded, value=2.0, **gauge),
            Metrics(metric_name=LABEL_METRIC, labels={"deployment_environment": "production"}, timestamp=seeded, value=4.0, **gauge),
            Metrics(metric_name=LABEL_METRIC, labels={"region": "keyless"}, timestamp=seeded, value=8.0, **gauge),
            Metrics(metric_name=OLD_NAME_METRIC, labels={"pod": "a"}, timestamp=seeded, value=16.0, **gauge),
            Metrics(metric_name=CURRENT_NAME_METRIC, labels={"pod": "b"}, timestamp=seeded, value=32.0, **gauge),
            Metrics(metric_name=LABEL_METRIC, labels={"deployment.environment.name": "staging", "deployment.environment": "production"}, timestamp=seeded, value=64.0, **gauge),
            Metrics(metric_name=LABEL_METRIC, labels={"resource_deployment_environment": "production"}, timestamp=seeded, value=128.0, **gauge),
            Metrics(metric_name=NORMALIZED_OLD_NAME_METRIC, labels={"pod": "c"}, timestamp=seeded, value=256.0, **gauge),
            Metrics(metric_name=NORMALIZED_CURRENT_NAME_METRIC, labels={"pod": "d"}, timestamp=seeded, value=512.0, **gauge),
        ]
    )

    # Metric metadata becomes queryable a beat after the insert; gate on
    # reads that only the probed series itself can satisfy (a label value
    # unique to it), so the family union of the flag-on instance cannot
    # green-light before every member is queryable.
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    probes = [
        (LABEL_METRIC, "region = 'keyless'"),
        (OLD_NAME_METRIC, "pod = 'a'"),
        (CURRENT_NAME_METRIC, "pod = 'b'"),
        (NORMALIZED_OLD_NAME_METRIC, "pod = 'c'"),
        (NORMALIZED_CURRENT_NAME_METRIC, "pod = 'd'"),
    ]
    deadline = datetime.now(tz=UTC) + timedelta(seconds=60)
    while datetime.now(tz=UTC) < deadline:
        seen = [get_scalar_table_data(scalar_query(signoz, token, datetime.now(tz=UTC), metric, filter_expression=expression).json()) for metric, expression in probes]
        if all(rows for rows in seen):
            return now
        sleep(1)
    raise AssertionError(f"seeded metrics never became queryable: {seen}")


def scalar_query(
    signoz: types.SigNoz,
    token: str,
    now: datetime,
    metric_name: str,
    filter_expression: str | None = None,
    group_by: list[dict] | None = None,
):
    return make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(minutes=30)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        request_type=RequestType.SCALAR,
        queries=[
            build_scalar_query(
                name="A",
                signal="metrics",
                aggregations=[build_metrics_aggregation(metric_name, "latest", "sum", "unspecified", reduce_to="last")],
                filter_expression=filter_expression,
                group_by=group_by,
            )
        ],
    )


def label_metric_sum(signoz: types.SigNoz, token: str, now: datetime, filter_expression: str) -> float:
    response = scalar_query(signoz, token, now, LABEL_METRIC, filter_expression=filter_expression)
    assert response.status_code == HTTPStatus.OK, response.text
    rows = get_scalar_table_data(response.json())
    return rows[0][-1] if rows else 0.0


@pytest.mark.parametrize("requested_key", ["deployment.environment.name", "deployment.environment"], ids=["current", "old"])
def test_metric_label_filter_merges_stored_spellings(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    metric_family_fleet: datetime,
    requested_key: str,
) -> None:
    """Either spelling reads the dotted pair, the normalized layout, and the
    resource_ layout; the conflict series merges current-first to staging and
    stays out."""
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    total = label_metric_sum(signoz, token, metric_family_fleet, f"{requested_key} = 'production'")
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
    """A query on either storage name reads the series of both, and the
    requested layout decides which storage names take part: the dotted pair
    never absorbs the normalized series, and the other way around."""
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
    """A target that emits both storage names during rollout overlap counts
    twice in sum(): reading both names is the feature, and the overlap cost is
    the documented trade-off."""
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

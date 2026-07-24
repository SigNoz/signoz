from collections.abc import Callable
from datetime import timedelta
from http import HTTPStatus

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.metricreduction import build_recent_gauge_data
from fixtures.querier import (
    aligned_epoch,
    build_builder_query,
    get_all_series,
    index_series_by_label,
    make_query_request,
    query_metric_values,
)

SERVICES = ("a", "b")
PODS_PER_SERVICE = 2
MINUTES = 20


def test_recent_queries_return_full_resolution_totals(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_buffer_metrics: Callable[..., None],
) -> None:
    metric_name = "test_reduction_recent_totals"
    # samples span [now-25m, now-5m); the query window sits inside the last 24h
    base_epoch = aligned_epoch(timedelta(minutes=25), step_seconds=300)
    insert_buffer_metrics(*build_recent_gauge_data(metric_name, base_epoch, SERVICES, PODS_PER_SERVICE, MINUTES))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    values = query_metric_values(signoz, token, metric_name, base_epoch, base_epoch + MINUTES * 60, "sum", "sum", step_interval=300)

    # 4 raw series x 5 samples x 1.0 per step: full raw resolution, and the
    # reduced series rows must not be counted (their fingerprints match no
    # samples, and the time-series lookup filters them out)
    assert [v["timestamp"] for v in values] == [(base_epoch + step * 300) * 1000 for step in range(4)]
    assert [v["value"] for v in values] == [float(len(SERVICES) * PODS_PER_SERVICE * 5)] * 4


def test_recent_queries_group_by_full_labels(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_buffer_metrics: Callable[..., None],
) -> None:
    """Group-by resolves against the raw buffer series rows (full labels), so
    grouping by the kept label still sees every raw series underneath."""
    metric_name = "test_reduction_recent_groupby"
    base_epoch = aligned_epoch(timedelta(minutes=25), step_seconds=300)
    insert_buffer_metrics(*build_recent_gauge_data(metric_name, base_epoch, SERVICES, PODS_PER_SERVICE, MINUTES))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_query_request(
        signoz,
        token,
        start_ms=base_epoch * 1000,
        end_ms=(base_epoch + MINUTES * 60) * 1000,
        queries=[build_builder_query("A", metric_name, "sum", "sum", step_interval=300, group_by=["service"])],
    )
    assert response.status_code == HTTPStatus.OK, response.text

    series_by_service = index_series_by_label(get_all_series(response.json(), "A"), "service")
    assert set(series_by_service.keys()) == set(SERVICES)
    for service in SERVICES:
        values = sorted(series_by_service[service]["values"], key=lambda v: v["timestamp"])
        # 2 pods x 5 samples x 1.0 per step
        assert [v["value"] for v in values] == [float(PODS_PER_SERVICE * 5)] * 4

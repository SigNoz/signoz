from collections.abc import Callable
from datetime import UTC, datetime, timedelta

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.metrics import (
    MetricsReducedSampleLast60s,
    MetricsReducedSampleSum60s,
    MetricsReducedTimeSeries,
)
from fixtures.querier import aligned_epoch, query_metric_values


# A delta, non-monotonic Sum must be treated as a Sum (read from the sum_60s
# reduced table), not downgraded to a Gauge (last_60s). The type is resolved
# server-side from the reduced time series, so the query carries no explicit
# type. sum_60s holds the true counter values; last_60s holds decoy values that
# a gauge misclassification would surface instead.
def test_reduced_delta_nonmonotonic_sum_is_treated_as_sum(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_reduced_metrics: Callable[..., None],
) -> None:
    metric_name = "test_reduction_delta_nonmonotonic_sum"
    base_epoch = aligned_epoch(timedelta(hours=30), step_seconds=300)

    time_series = MetricsReducedTimeSeries(
        metric_name=metric_name,
        kept_labels={"service": "a"},
        timestamp=datetime.fromtimestamp(base_epoch, tz=UTC),
        temporality="Delta",
        type_="Sum",
        is_monotonic=False,
    )
    assert time_series.temporality == "Delta"

    insert_reduced_metrics(
        [time_series],
        sum_samples=[
            MetricsReducedSampleSum60s(
                metric_name=metric_name,
                reduced_fingerprint=time_series.fingerprint,
                timestamp=datetime.fromtimestamp(base_epoch + minute * 60, tz=UTC),
                sum_value=30.0,
                count_series=1,
                count_samples=1,
                temporality="Delta",
            )
            for minute in range(20)
        ],
        last_samples=[
            MetricsReducedSampleLast60s(
                metric_name=metric_name,
                reduced_fingerprint=time_series.fingerprint,
                timestamp=datetime.fromtimestamp(base_epoch + minute * 60, tz=UTC),
                sum_last=999.0,
                min_value=999.0,
                max_value=999.0,
                sum_values=999.0,
                count_series=1,
                count_samples=1,
                temporality="Delta",
            )
            for minute in range(20)
        ],
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    values = query_metric_values(
        signoz,
        token,
        metric_name,
        base_epoch,
        base_epoch + 20 * 60,
        "increase",
        "sum",
        step_interval=300,
    )

    # 5 one-minute buckets x 30.0 per 300s step, read from sum_60s.
    # A gauge misclassification would read last_60s and never produce 150.0.
    assert [v["timestamp"] for v in values] == [(base_epoch + step * 300) * 1000 for step in range(4)]
    assert [v["value"] for v in values] == [150.0] * 4

from collections.abc import Callable
from datetime import UTC, datetime, timedelta

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.metrics import (
    MetricsReducedSampleLast60s,
    MetricsReducedSampleSum60s,
    MetricsReducedTimeSeries,
)
from fixtures.querier import aligned_epoch, query_metric_values


# Same setup and expected values as 02_reduced_counter, but the metric is a
# delta, non-monotonic Sum. It must still be treated as a Sum (read from the
# sum_60s table), so the values match. The last_60s rows are decoys: a gauge
# misclassification would read them (999.0) instead of the sum_60s counter.
@pytest.mark.parametrize(
    "time_agg, expected",
    [
        # 2 groups x 5 minutes x 30.0 per 300s step
        ("rate", 1.0),  # 300 / 300s
        ("increase", 300.0),
    ],
)
def test_delta_nonmonotonic_sum_rate_and_increase(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_reduced_metrics: Callable[..., None],
    time_agg: str,
    expected: float,
) -> None:
    metric_name = f"test_reduction_delta_nonmonotonic_sum_{time_agg}"
    base_epoch = aligned_epoch(timedelta(hours=30), step_seconds=300)

    # delta non-monotonic sum: MetricsReducedTimeSeries keeps the Delta temporality as-is
    time_series = [
        MetricsReducedTimeSeries(
            metric_name=metric_name,
            kept_labels={"service": service},
            timestamp=datetime.fromtimestamp(base_epoch, tz=UTC),
            temporality="Delta",
            type_="Sum",
            is_monotonic=False,
        )
        for service in ("a", "b")
    ]
    assert all(ts.temporality == "Delta" for ts in time_series)

    insert_reduced_metrics(
        time_series,
        sum_samples=[
            MetricsReducedSampleSum60s(
                metric_name=metric_name,
                reduced_fingerprint=ts.fingerprint,
                timestamp=datetime.fromtimestamp(base_epoch + minute * 60, tz=UTC),
                sum_value=30.0,
                count_series=2,
                count_samples=2,
                temporality="Delta",
            )
            for ts in time_series
            for minute in range(20)
        ],
        # Decoy last_60s rows: WhichReducedSamplesTableToUse reads this table only
        # if the metric is (mis)classified as a Gauge. The 999.0 values are chosen
        # to differ from the sum_60s result, so a regression that treats this delta
        # sum as a Gauge makes the assertion below fail instead of silently passing.
        last_samples=[
            MetricsReducedSampleLast60s(
                metric_name=metric_name,
                reduced_fingerprint=ts.fingerprint,
                timestamp=datetime.fromtimestamp(base_epoch + minute * 60, tz=UTC),
                sum_last=999.0,
                min_value=999.0,
                max_value=999.0,
                sum_values=999.0,
                count_series=2,
                count_samples=2,
                temporality="Delta",
            )
            for ts in time_series
            for minute in range(20)
        ],
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    values = query_metric_values(signoz, token, metric_name, base_epoch, base_epoch + 20 * 60, time_agg, "sum", step_interval=300)

    assert [v["timestamp"] for v in values] == [(base_epoch + step * 300) * 1000 for step in range(4)]
    assert [v["value"] for v in values] == [expected] * 4

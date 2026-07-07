import datetime
from collections.abc import Sequence

from fixtures.metrics import MetricsBufferSample, MetricsBufferTimeSeries


def build_recent_gauge_data(
    metric_name: str,
    base_epoch: int,
    services: Sequence[str],
    pods_per_service: int,
    minutes: int,
    value: float = 1.0,
) -> tuple[list[MetricsBufferTimeSeries], list[MetricsBufferSample]]:
    """Collector-shaped buffer rows for a gauge under a reduction rule that
    keeps `service`: per raw series a raw series row (is_reduced=false, full
    labels, reduced_fingerprint -> group) plus the group's reduced series row
    (is_reduced=true, kept labels), and one raw sample per series per minute
    carrying both fingerprints. Returns (time_series, samples) for
    insert_buffer_metrics."""
    reduced_series = {
        service: MetricsBufferTimeSeries(
            metric_name=metric_name,
            labels={"service": service},
            timestamp=datetime.datetime.fromtimestamp(base_epoch, tz=datetime.UTC),
            is_reduced=True,
        )
        for service in services
    }
    raw_series = [
        MetricsBufferTimeSeries(
            metric_name=metric_name,
            labels={"service": service, "pod": f"pod-{service}-{i}"},
            timestamp=datetime.datetime.fromtimestamp(base_epoch, tz=datetime.UTC),
            reduced_fingerprint=reduced_series[service].fingerprint,
        )
        for service in services
        for i in range(pods_per_service)
    ]
    samples = [
        MetricsBufferSample(
            metric_name=metric_name,
            fingerprint=ts.fingerprint,
            timestamp=datetime.datetime.fromtimestamp(base_epoch + minute * 60, tz=datetime.UTC),
            value=value,
            reduced_fingerprint=ts.reduced_fingerprint,
        )
        for ts in raw_series
        for minute in range(minutes)
    ]
    return raw_series + list(reduced_series.values()), samples

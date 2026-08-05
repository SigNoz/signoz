import datetime
from collections.abc import Sequence

import clickhouse_connect.driver.client

from fixtures.metrics import MetricsBufferSample, MetricsBufferTimeSeries


def local_series_counts(
    node_conns: list[clickhouse_connect.driver.client.Client],
    table: str,
    metric_name: str,
) -> list[int]:
    """Distinct series per node via the LOCAL (non-distributed) table."""
    return [
        int(
            conn.query(
                f"SELECT count(DISTINCT fingerprint) FROM signoz_metrics.{table} WHERE metric_name = %(metric_name)s",
                parameters={"metric_name": metric_name},
            ).result_rows[0][0]
        )
        for conn in node_conns
    ]


def assert_spans_shards(
    node_conns: list[clickhouse_connect.driver.client.Client],
    table: str,
    metric_name: str,
    total: int,
) -> None:
    """Guard for distributed tests: a green run on a cluster proves nothing
    unless the seeded series actually landed on more than one shard."""
    counts = local_series_counts(node_conns, table, metric_name)
    assert sum(counts) == total, f"expected {total} series in {table} across shards, got {counts}"
    assert min(counts) > 0, f"seeded series in {table} all landed on one shard: {counts}"


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

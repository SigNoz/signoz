import datetime
import hashlib
import json
from abc import ABC
from typing import Any, Callable, Generator, List, Optional

import numpy as np
import pytest

from fixtures import types


class MetricsTimeSeries(ABC):
    """Represents a row in the time_series_v4 table."""

    env: str
    temporality: str
    metric_name: str
    description: str
    unit: str
    type: str
    is_monotonic: bool
    fingerprint: np.uint64
    unix_milli: np.int64
    labels: str
    attrs: dict[str, str]
    scope_attrs: dict[str, str]
    resource_attrs: dict[str, str]
    __normalized: bool

    def __init__(
        self,
        metric_name: str,
        labels: dict[str, str],
        timestamp: datetime.datetime,
        temporality: str = "Unspecified",
        description: str = "",
        unit: str = "",
        type_: str = "Sum",
        is_monotonic: bool = True,
        env: str = "default",
        resource_attrs: dict[str, str] = {},
        scope_attrs: dict[str, str] = {},
    ) -> None:
        self.env = env
        self.metric_name = metric_name
        self.temporality = temporality
        self.description = description
        self.unit = unit
        self.type = type_
        self.is_monotonic = is_monotonic
        self.labels = json.dumps(labels, separators=(",", ":"))
        self.attrs = labels
        self.scope_attrs = scope_attrs
        self.resource_attrs = resource_attrs
        self.unix_milli = np.int64(int(timestamp.timestamp() * 1e3))
        self.__normalized = False

        # Calculate fingerprint from metric_name + labels
        fingerprint_str = metric_name + self.labels
        self.fingerprint = np.uint64(
            int(hashlib.md5(fingerprint_str.encode()).hexdigest()[:16], 16)
        )

    def to_row(self) -> list:
        return [
            self.env,
            self.temporality,
            self.metric_name,
            self.description,
            self.unit,
            self.type,
            self.is_monotonic,
            self.fingerprint,
            self.unix_milli,
            self.labels,
            self.attrs,
            self.scope_attrs,
            self.resource_attrs,
            self.__normalized,
        ]


class MetricsSample(ABC):
    """Represents a row in the samples_v4 table."""

    env: str
    temporality: str
    metric_name: str
    fingerprint: np.uint64
    unix_milli: np.int64
    value: np.float64
    flags: np.uint32

    def __init__(
        self,
        metric_name: str,
        fingerprint: np.uint64,
        timestamp: datetime.datetime,
        value: float,
        temporality: str = "Unspecified",
        env: str = "default",
        flags: int = 0,
    ) -> None:
        self.env = env
        self.temporality = temporality
        self.metric_name = metric_name
        self.fingerprint = fingerprint
        self.unix_milli = np.int64(int(timestamp.timestamp() * 1e3))
        self.value = np.float64(value)
        self.flags = np.uint32(flags)

    def to_row(self) -> list:
        return [
            self.env,
            self.temporality,
            self.metric_name,
            self.fingerprint,
            self.unix_milli,
            self.value,
            self.flags,
        ]


class Metrics(ABC):
    """High-level metric representation. Produces both time series and sample entries."""

    metric_name: str
    labels: dict[str, str]
    temporality: str
    timestamp: datetime.datetime
    value: float
    flags: int

    @property
    def time_series(self) -> MetricsTimeSeries:
        return self._time_series

    @property
    def sample(self) -> MetricsSample:
        return self._sample

    def __init__(
        self,
        metric_name: str,
        labels: dict[str, str] = {},
        timestamp: Optional[datetime.datetime] = None,
        value: float = 0.0,
        temporality: str = "Unspecified",
        flags: int = 0,
        description: str = "",
        unit: str = "",
        type_: str = "Sum",
        is_monotonic: bool = True,
        env: str = "default",
        resource_attributes: dict[str, str] = {},
        scope_attributes: dict[str, str] = {},
    ) -> None:
        if timestamp is None:
            timestamp = datetime.datetime.now()
        self.metric_name = metric_name
        self.labels = labels
        self.temporality = temporality
        self.timestamp = timestamp
        self.value = value
        self.flags = flags

        self._time_series = MetricsTimeSeries(
            metric_name=metric_name,
            labels=labels,
            timestamp=timestamp,
            temporality=temporality,
            description=description,
            unit=unit,
            type_=type_,
            is_monotonic=is_monotonic,
            env=env,
            resource_attrs=resource_attributes,
            scope_attrs=scope_attributes,
        )

        self._sample = MetricsSample(
            metric_name=metric_name,
            fingerprint=self._time_series.fingerprint,
            timestamp=timestamp,
            value=value,
            temporality=temporality,
            env=env,
            flags=flags,
        )


@pytest.fixture(name="insert_metrics", scope="function")
def insert_metrics(
    clickhouse: types.TestContainerClickhouse,
) -> Generator[Callable[[List[Metrics]], None], Any, None]:
    def _insert_metrics(metrics: List[Metrics]) -> None:
        """
        Insert metrics into ClickHouse tables.
        This function handles insertion into:
        - distributed_time_series_v4 (time series metadata)
        - distributed_samples_v4 (actual sample values)
        """
        time_series_map: dict[int, MetricsTimeSeries] = {}
        for metric in metrics:
            fp = int(metric.time_series.fingerprint)
            if fp not in time_series_map:
                time_series_map[fp] = metric.time_series

        if len(time_series_map) > 0:
            clickhouse.conn.insert(
                database="signoz_metrics",
                table="distributed_time_series_v4",
                column_names=[
                    "env",
                    "temporality",
                    "metric_name",
                    "description",
                    "unit",
                    "type",
                    "is_monotonic",
                    "fingerprint",
                    "unix_milli",
                    "labels",
                    "attrs",
                    "scope_attrs",
                    "resource_attrs",
                    "__normalized",
                ],
                data=[ts.to_row() for ts in time_series_map.values()],
            )

        samples = [metric.sample for metric in metrics]
        if len(samples) > 0:
            clickhouse.conn.insert(
                database="signoz_metrics",
                table="distributed_samples_v4",
                column_names=[
                    "env",
                    "temporality",
                    "metric_name",
                    "fingerprint",
                    "unix_milli",
                    "value",
                    "flags",
                ],
                data=[sample.to_row() for sample in samples],
            )

    yield _insert_metrics

    # Cleanup
    clickhouse.conn.query(
        f"TRUNCATE TABLE signoz_metrics.time_series_v4 ON CLUSTER '{clickhouse.env['SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_CLUSTER']}' SYNC"
    )
    clickhouse.conn.query(
        f"TRUNCATE TABLE signoz_metrics.samples_v4 ON CLUSTER '{clickhouse.env['SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_CLUSTER']}' SYNC"
    )


@pytest.fixture(name="remove_metrics_ttl_and_storage_settings", scope="function")
def remove_metrics_ttl_and_storage_settings(signoz: types.SigNoz):
    """
    Remove any custom TTL settings on metrics tables to revert to default retention.
    Also resets storage policy to default by recreating tables if needed.
    """
    tables = [
        "samples_v4",
        "samples_v4_agg_5m",
        "samples_v4_agg_30m",
        "time_series_v4",
        "time_series_v4_6hrs",
        "time_series_v4_1day",
        "time_series_v4_1week",
    ]

    for table in tables:
        try:
            signoz.telemetrystore.conn.query(
                f"ALTER TABLE signoz_metrics.{table} ON CLUSTER '{signoz.telemetrystore.env['SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_CLUSTER']}' REMOVE TTL"
            )
            signoz.telemetrystore.conn.query(
                f"ALTER TABLE signoz_metrics.{table} ON CLUSTER '{signoz.telemetrystore.env['SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_CLUSTER']}' RESET SETTING storage_policy;"
            )
        except Exception as e:  # pylint: disable=broad-exception-caught
            print(f"ttl and storage policy reset failed for {table}: {e}")

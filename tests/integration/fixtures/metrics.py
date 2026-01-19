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


class MetricsExpHist(ABC):
    """Represents a row in the exp_hist table for exponential histograms."""

    env: str
    temporality: str
    metric_name: str
    fingerprint: np.uint64
    unix_milli: np.int64
    count: np.uint64
    sum: np.float64
    min: np.float64
    max: np.float64
    sketch: bytes
    flags: np.uint32

    def __init__(
        self,
        metric_name: str,
        fingerprint: np.uint64,
        timestamp: datetime.datetime,
        count: int,
        sum_value: float,
        min_value: float,
        max_value: float,
        sketch: bytes = b"",
        temporality: str = "Unspecified",
        env: str = "default",
        flags: int = 0,
    ) -> None:
        self.env = env
        self.temporality = temporality
        self.metric_name = metric_name
        self.fingerprint = fingerprint
        self.unix_milli = np.int64(int(timestamp.timestamp() * 1e3))
        self.count = np.uint64(count)
        self.sum = np.float64(sum_value)
        self.min = np.float64(min_value)
        self.max = np.float64(max_value)
        self.sketch = sketch
        self.flags = np.uint32(flags)

    def to_row(self) -> list:
        return [
            self.env,
            self.temporality,
            self.metric_name,
            self.fingerprint,
            self.unix_milli,
            self.count,
            self.sum,
            self.min,
            self.max,
            self.sketch,
            self.flags,
        ]


class MetricsMetadata(ABC):
    """Represents a row in the metadata table for metric metadata."""

    temporality: str
    metric_name: str
    description: str
    unit: str
    type: str
    is_monotonic: bool
    attr_name: str
    attr_type: str
    attr_datatype: str
    attr_string_value: str
    first_reported_unix_milli: np.int64
    last_reported_unix_milli: np.int64

    def __init__(
        self,
        metric_name: str,
        attr_name: str,
        attr_type: str,
        attr_datatype: str,
        attr_string_value: str,
        timestamp: datetime.datetime,
        temporality: str = "Unspecified",
        description: str = "",
        unit: str = "",
        type_: str = "Sum",
        is_monotonic: bool = True,
    ) -> None:
        self.temporality = temporality
        self.metric_name = metric_name
        self.description = description
        self.unit = unit
        self.type = type_
        self.is_monotonic = is_monotonic
        self.attr_name = attr_name
        self.attr_type = attr_type
        self.attr_datatype = attr_datatype
        self.attr_string_value = attr_string_value
        unix_milli = np.int64(int(timestamp.timestamp() * 1e3))
        self.first_reported_unix_milli = unix_milli
        self.last_reported_unix_milli = unix_milli

    def to_row(self) -> list:
        return [
            self.temporality,
            self.metric_name,
            self.description,
            self.unit,
            self.type,
            self.is_monotonic,
            self.attr_name,
            self.attr_type,
            self.attr_datatype,
            self.attr_string_value,
            self.first_reported_unix_milli,
            self.last_reported_unix_milli,
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

    def to_dict(self) -> dict:
        return {
            "metric_name": self.metric_name,
            "labels": self.labels,
            "timestamp": self.timestamp.isoformat(),
            "value": self.value,
            "temporality": self.temporality,
            "type_": self._time_series.type,
            "is_monotonic": self._time_series.is_monotonic,
            "flags": self.flags,
            "description": self._time_series.description,
            "unit": self._time_series.unit,
            "env": self._time_series.env,
            "resource_attrs": self._time_series.resource_attrs,
            "scope_attrs": self._time_series.scope_attrs,
        }

    @classmethod
    def from_dict(
        cls,
        data: dict,
        # base_time: Optional[datetime.datetime] = None,
        metric_name_override: Optional[str] = None,
    ) -> "Metrics":
        """
        Create a Metrics instance from a dict.

        Args:
            data: The dict containing metric data
            base_time: If provided, timestamps are shifted relative to this time.
                       The earliest timestamp in the data becomes base_time.
            metric_name_override: If provided, overrides the metric_name from data
        """
        # parse timestamp from iso format
        ts_str = data["timestamp"]
        if ts_str.endswith("Z"):
            ts_str = ts_str[:-1] + "+00:00"
        timestamp = datetime.datetime.fromisoformat(ts_str)

        return cls(
            metric_name=metric_name_override or data["metric_name"],
            labels=data.get("labels", {}),
            timestamp=timestamp,
            value=data["value"],
            temporality=data.get("temporality", "Unspecified"),
            flags=data.get("flags", 0),
            description=data.get("description", ""),
            unit=data.get("unit", ""),
            type_=data.get("type_", "Sum"),
            is_monotonic=data.get("is_monotonic", True),
            env=data.get("env", "default"),
            resource_attributes=data.get("resource_attrs", {}),
            scope_attributes=data.get("scope_attrs", {}),
        )

    @classmethod
    def load_from_file(
        cls,
        file_path: str,
        base_time: Optional[datetime.datetime] = None,
        metric_name_override: Optional[str] = None,
    ) -> List["Metrics"]:
        """
        Load metrics from a JSONL file.

        Each line should be a JSON object representing a metric.

        Args:
            file_path: Path to the JSONL file
            base_time: If provided, all timestamps are shifted so the earliest
                       timestamp in the file maps to base_time
            metric_name_override: If provided, overrides metric_name for all metrics
        """
        data_list = []
        with open(file_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                data_list.append(json.loads(line))

        if not data_list:
            return []

        # If base_time provided, calculate time offset
        time_offset = datetime.timedelta(0)
        if base_time is not None:
            # Find earliest timestamp
            earliest = None
            for data in data_list:
                ts_str = data["timestamp"]
                if ts_str.endswith("Z"):
                    ts_str = ts_str[:-1] + "+00:00"
                ts = datetime.datetime.fromisoformat(ts_str)
                if earliest is None or ts < earliest:
                    earliest = ts
            if earliest is not None:
                time_offset = base_time - earliest

        metrics = []
        for data in data_list:
            ts_str = data["timestamp"]
            if ts_str.endswith("Z"):
                ts_str = ts_str[:-1] + "+00:00"
            original_ts = datetime.datetime.fromisoformat(ts_str)
            adjusted_ts = original_ts + time_offset
            data["timestamp"] = adjusted_ts.isoformat()
            metrics.append(
                cls.from_dict(data, metric_name_override=metric_name_override)
            )

        return metrics


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
        - distributed_metadata (metric attribute metadata)
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

        # (metric_name, attr_type, attr_name, attr_value) -> MetricsMetadata
        metadata_map: dict[tuple, MetricsMetadata] = {}
        for metric in metrics:
            ts = metric.time_series
            for attr_name, attr_value in metric.labels.items():
                key = (ts.metric_name, "point", attr_name, str(attr_value))
                if key not in metadata_map:
                    metadata_map[key] = MetricsMetadata(
                        metric_name=ts.metric_name,
                        attr_name=attr_name,
                        attr_type="point",
                        attr_datatype="String",
                        attr_string_value=str(attr_value),
                        timestamp=metric.timestamp,
                        temporality=ts.temporality,
                        description=ts.description,
                        unit=ts.unit,
                        type_=ts.type,
                        is_monotonic=ts.is_monotonic,
                    )
            for attr_name, attr_value in ts.resource_attrs.items():
                key = (ts.metric_name, "resource", attr_name, str(attr_value))
                if key not in metadata_map:
                    metadata_map[key] = MetricsMetadata(
                        metric_name=ts.metric_name,
                        attr_name=attr_name,
                        attr_type="resource",
                        attr_datatype="String",
                        attr_string_value=str(attr_value),
                        timestamp=metric.timestamp,
                        temporality=ts.temporality,
                        description=ts.description,
                        unit=ts.unit,
                        type_=ts.type,
                        is_monotonic=ts.is_monotonic,
                    )
            for attr_name, attr_value in ts.scope_attrs.items():
                key = (ts.metric_name, "scope", attr_name, str(attr_value))
                if key not in metadata_map:
                    metadata_map[key] = MetricsMetadata(
                        metric_name=ts.metric_name,
                        attr_name=attr_name,
                        attr_type="scope",
                        attr_datatype="String",
                        attr_string_value=str(attr_value),
                        timestamp=metric.timestamp,
                        temporality=ts.temporality,
                        description=ts.description,
                        unit=ts.unit,
                        type_=ts.type,
                        is_monotonic=ts.is_monotonic,
                    )

        if len(metadata_map) > 0:
            clickhouse.conn.insert(
                database="signoz_metrics",
                table="distributed_metadata",
                column_names=[
                    "temporality",
                    "metric_name",
                    "description",
                    "unit",
                    "type",
                    "is_monotonic",
                    "attr_name",
                    "attr_type",
                    "attr_datatype",
                    "attr_string_value",
                    "first_reported_unix_milli",
                    "last_reported_unix_milli",
                ],
                data=[m.to_row() for m in metadata_map.values()],
            )

    yield _insert_metrics

    cluster = clickhouse.env["SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_CLUSTER"]
    tables_to_truncate = [
        "time_series_v4",
        "samples_v4",
        "exp_hist",
        "metadata",
    ]
    for table in tables_to_truncate:
        clickhouse.conn.query(
            f"TRUNCATE TABLE signoz_metrics.{table} ON CLUSTER '{cluster}' SYNC"
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
        "exp_hist",
        "metadata",
    ]

    cluster = signoz.telemetrystore.env["SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_CLUSTER"]
    for table in tables:
        try:
            signoz.telemetrystore.conn.query(
                f"ALTER TABLE signoz_metrics.{table} ON CLUSTER '{cluster}' REMOVE TTL"
            )
            signoz.telemetrystore.conn.query(
                f"ALTER TABLE signoz_metrics.{table} ON CLUSTER '{cluster}' RESET SETTING storage_policy;"
            )
        except Exception as e:  # pylint: disable=broad-exception-caught
            print(f"ttl and storage policy reset failed for {table}: {e}")

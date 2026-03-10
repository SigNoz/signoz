import hashlib
import json
from datetime import datetime, timedelta
from typing import Any, Callable, Generator, List

import numpy as np
import pytest

from fixtures import types


class MeterSample:
    temporality: str
    metric_name: str
    description: str
    unit: str
    type: str
    is_monotonic: bool
    labels: str
    fingerprint: np.uint64
    unix_milli: np.int64
    value: np.float64

    def __init__(
        self,
        metric_name: str,
        labels: dict[str, str],
        timestamp: datetime,
        value: float,
        temporality: str = "Delta",
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
        self.labels = json.dumps(labels, separators=(",", ":"))
        self.unix_milli = np.int64(int(timestamp.timestamp() * 1e3))
        self.value = np.float64(value)

        fingerprint_str = metric_name + self.labels
        self.fingerprint = np.uint64(
            int(hashlib.md5(fingerprint_str.encode()).hexdigest()[:16], 16)
        )

    def to_samples_row(self) -> list:
        return [
            self.temporality,
            self.metric_name,
            self.description,
            self.unit,
            self.type,
            self.is_monotonic,
            self.labels,
            self.fingerprint,
            self.unix_milli,
            self.value,
        ]


def make_meter_samples(
    metric_name: str,
    labels: dict[str, str],
    now: datetime,
    count: int = 60,
    base_value: float = 100.0,
    **kwargs,
) -> List[MeterSample]:
    samples = []
    for i in range(count):
        ts = now - timedelta(minutes=count - i)
        samples.append(
            MeterSample(
                metric_name=metric_name,
                labels=labels,
                timestamp=ts,
                value=base_value + i,
                **kwargs,
            )
        )
    return samples


@pytest.fixture(name="insert_meter_samples", scope="function")
def insert_meter_samples(
    clickhouse: types.TestContainerClickhouse,
) -> Generator[Callable[[List[MeterSample]], None], Any, None]:
    def _insert_meter_samples(samples: List[MeterSample]) -> None:
        if len(samples) == 0:
            return

        clickhouse.conn.insert(
            database="signoz_meter",
            table="distributed_samples",
            column_names=[
                "temporality",
                "metric_name",
                "description",
                "unit",
                "type",
                "is_monotonic",
                "labels",
                "fingerprint",
                "unix_milli",
                "value",
            ],
            data=[s.to_samples_row() for s in samples],
        )

    yield _insert_meter_samples

    cluster = clickhouse.env["SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_CLUSTER"]
    for table in ["samples", "samples_agg_1d"]:
        clickhouse.conn.query(
            f"TRUNCATE TABLE signoz_meter.{table} ON CLUSTER '{cluster}' SYNC"
        )

import datetime
import json
from abc import ABC
from collections.abc import Callable, Generator
from typing import Any

import numpy as np
import pytest

from fixtures import types
from fixtures.fingerprint import LogsOrTracesFingerprint


class AttributesMetadata(ABC):
    """Represents a row in signoz_metadata.attributes_metadata.

    This is the table `getRelatedValues` reads for the related-values
    suggestions returned by /api/v1/fields/values. `data_source` is one of
    logs/traces/metrics; fingerprints mirror the collector's FNV-1a hashes so
    distinct rows are not collapsed by the ReplacingMergeTree ORDER BY key.
    """

    unix_milli: np.int64
    data_source: str
    resource_fingerprint: np.uint64
    attrs_fingerprint: np.uint64
    resource_attributes: dict[str, str]
    attributes: dict[str, str]

    def __init__(
        self,
        data_source: str,
        resource_attributes: dict[str, Any] = {},
        attributes: dict[str, Any] = {},
        timestamp: datetime.datetime | None = None,
    ) -> None:
        if timestamp is None:
            timestamp = datetime.datetime.now()
        self.data_source = data_source
        self.resource_attributes = {k: str(v) for k, v in resource_attributes.items()}
        self.attributes = {k: str(v) for k, v in attributes.items()}
        self.unix_milli = np.int64(int(timestamp.timestamp() * 1e3))
        self.resource_fingerprint = np.uint64(LogsOrTracesFingerprint.hash(self.resource_attributes))
        self.attrs_fingerprint = np.uint64(LogsOrTracesFingerprint.hash(self.attributes))

    def to_row(self) -> list:
        return [
            self.unix_milli,
            self.data_source,
            self.resource_fingerprint,
            self.attrs_fingerprint,
            self.resource_attributes,
            self.attributes,
        ]

    @classmethod
    def from_dict(cls, data: dict, timestamp: datetime.datetime | None = None) -> "AttributesMetadata":
        return cls(
            data_source=data["data_source"],
            resource_attributes=data.get("resource_attributes", {}),
            attributes=data.get("attributes", {}),
            timestamp=timestamp,
        )

    @classmethod
    def load_from_file(cls, file_path: str, timestamp: datetime.datetime | None = None) -> list["AttributesMetadata"]:
        """Load rows from a JSONL file, stamping each with `timestamp`.

        Each line is a JSON object with `data_source` and optional
        `resource_attributes` / `attributes` maps.
        """
        rows: list[AttributesMetadata] = []
        with open(file_path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                rows.append(cls.from_dict(json.loads(line), timestamp=timestamp))
        return rows


def insert_attributes_metadata_to_clickhouse(conn, rows: list[AttributesMetadata]) -> None:
    """Insert rows into signoz_metadata.distributed_attributes_metadata.

    Pure function so it can be reused outside the pytest fixture. `conn` is a
    clickhouse-connect Client.
    """
    if not rows:
        return
    conn.insert(
        database="signoz_metadata",
        table="distributed_attributes_metadata",
        column_names=[
            "unix_milli",
            "data_source",
            "resource_fingerprint",
            "attrs_fingerprint",
            "resource_attributes",
            "attributes",
        ],
        data=[row.to_row() for row in rows],
    )


def truncate_attributes_metadata_table(conn, cluster: str) -> None:
    conn.query(f"TRUNCATE TABLE signoz_metadata.attributes_metadata ON CLUSTER '{cluster}' SYNC")


@pytest.fixture(name="insert_attributes_metadata", scope="function")
def insert_attributes_metadata(
    clickhouse: types.TestContainerClickhouse,
) -> Generator[Callable[[list[AttributesMetadata]], None], Any]:
    def _insert(rows: list[AttributesMetadata]) -> None:
        insert_attributes_metadata_to_clickhouse(clickhouse.conn, rows)

    yield _insert

    truncate_attributes_metadata_table(
        clickhouse.conn,
        clickhouse.env["SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_CLUSTER"],
    )

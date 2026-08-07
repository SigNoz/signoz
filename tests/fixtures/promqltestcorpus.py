"""Shared helpers for suites that replay the frozen promqltest corpus
(tests/integration/testdata/promqltestcorpus/corpus.json)."""

import json
import math
import os
from collections.abc import Callable
from datetime import UTC, datetime, timedelta

import pytest

from fixtures.metrics import Metrics

TESTDATA_DIR = os.path.join(os.path.dirname(__file__), "..", "integration", "testdata", "promqltestcorpus")
CORPUS_FILE = os.path.join(TESTDATA_DIR, "corpus.json")

ISOLATION_GAP_MS = 2 * 3600 * 1000
SPECIALS = {"NaN": math.nan, "Inf": math.inf, "+Inf": math.inf, "-Inf": -math.inf}


def decode_corpus_value(v: float | str) -> float:
    if isinstance(v, str):
        return SPECIALS[v]
    return float(v)


def values_close(a: float, b: float) -> bool:
    """Expected corpus values carry the v5 API's rounding (>=1: three decimal
    places; <1: three significant digits). One rounding quantum covers both a
    raw-vs-rounded comparison and a boundary that rounds either way."""
    if math.isnan(a) or math.isnan(b):
        return math.isnan(a) and math.isnan(b)
    if math.isinf(a) or math.isinf(b):
        return a == b
    if a == b:
        return True
    scale = max(abs(a), abs(b))
    if scale >= 1:
        quantum = max(1e-3, scale * 1e-9)
    else:
        quantum = 10 ** (math.floor(math.log10(scale)) - 2)
    return abs(a - b) <= quantum + 1e-12


def labelset(labels: dict[str, str]) -> tuple:
    return tuple(sorted(labels.items()))


def ledger(filename: str) -> dict[str, str]:
    path = os.path.join(TESTDATA_DIR, filename)
    if not os.path.exists(path):
        return {}
    with open(path, encoding="utf-8") as f:
        return json.load(f)["divergences"]


@pytest.fixture(name="ingest_promqltest_corpus")
def ingest_promqltest_corpus(insert_metrics: Callable[[list[Metrics]], None]) -> Callable[[], tuple[dict, dict[int, int]]]:
    """Yields a callable that loads the corpus, lays its datasets end to end
    on the timeline, ingests every sample, and returns (corpus, dataset base
    timestamps).

    Dataset bases are hour-aligned: registration rows are hour-bucketed, so
    behavior depends on where samples fall relative to hour boundaries, and
    exact known-divergences enforcement needs identical placement every run.
    Datasets sit on disjoint windows (2h gaps, far beyond the 5m lookback) so
    one bulk ingest serves every case without cross-talk."""

    def ingest() -> tuple[dict, dict[int, int]]:
        with open(CORPUS_FILE, encoding="utf-8") as f:
            corpus = json.load(f)

        cases_by_dataset: dict[int, list[dict]] = {}
        for case in corpus["cases"]:
            cases_by_dataset.setdefault(case["dataset"], []).append(case)

        spans = {}
        for ds in corpus["datasets"]:
            sample_max = max((s["samples"][-1][0] for s in ds["series"] if s["samples"]), default=0)
            case_max = max((c["end_ms"] for c in cases_by_dataset.get(ds["id"], [])), default=0)
            spans[ds["id"]] = max(sample_max, case_max) + corpus["meta"]["lookback_ms"]

        hour_ms = 3_600_000
        advances = {ds["id"]: -(-(spans[ds["id"]] + ISOLATION_GAP_MS) // hour_ms) * hour_ms for ds in corpus["datasets"]}
        total = sum(advances.values())
        now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
        cursor = (int((now - timedelta(hours=1)).timestamp() * 1000) - total) // hour_ms * hour_ms

        bases: dict[int, int] = {}
        metrics: list[Metrics] = []
        for ds in corpus["datasets"]:
            bases[ds["id"]] = cursor
            for series in ds["series"]:
                labels = dict(series["labels"])
                metric_name = labels.pop("__name__")
                for off_ms, raw in series["samples"]:
                    stale = raw == "stale"
                    metrics.append(
                        Metrics(
                            metric_name=metric_name,
                            labels=labels,
                            timestamp=datetime.fromtimestamp((cursor + off_ms) / 1000, tz=UTC),
                            value=0.0 if stale else decode_corpus_value(raw),
                            flags=1 if stale else 0,
                        )
                    )
            cursor += advances[ds["id"]]

        insert_metrics(metrics)
        return corpus, bases

    return ingest

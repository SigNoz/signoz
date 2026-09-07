import json
import math
import os
from collections.abc import Callable
from datetime import UTC, datetime, timedelta

from fixtures.metrics import Metrics

TESTDATA_DIR = os.path.join(os.path.dirname(__file__), "..", "integration", "testdata", "promqltestcorpus")
CORPUS_FILE = os.path.join(TESTDATA_DIR, "corpus.json")

# Datasets sit on disjoint time windows (2h gaps, far beyond the 5m lookback)
# so one bulk ingest serves every case without cross-talk.
ISOLATION_GAP_MS = 2 * 3600 * 1000
SPECIALS = {"NaN": math.nan, "Inf": math.inf, "-Inf": -math.inf}


def ingest_promqltest_corpus(insert_metrics: Callable[[list[Metrics]], None]) -> tuple[dict, dict[int, int]]:
    """Loads the frozen corpus, lays its datasets end to end on the timeline
    (newest last, ending safely in the past), ingests every sample, and
    returns (corpus, dataset base timestamps).

    Dataset bases are hour-aligned: registration rows are hour-bucketed, so
    behavior depends on where samples fall relative to hour boundaries, and
    exact known-divergences enforcement needs identical placement every run."""
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
                        value=0.0 if stale else (SPECIALS[raw] if isinstance(raw, str) else float(raw)),
                        flags=1 if stale else 0,
                    )
                )
        cursor += advances[ds["id"]]

    insert_metrics(metrics)
    return corpus, bases

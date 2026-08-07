import json
from collections.abc import Callable
from datetime import datetime

import pytest

from fixtures.fs import get_testdata_file_path
from fixtures.metrics import Metrics
from fixtures.time import parse_timestamp

START_TIME_PLACEHOLDER = "__START_TIME__"

# All 18 PodCountsByStatus buckets (camelCase, matches inframonitoringtypes.PodCountsByStatus / the API response).
STATUS_BUCKETS = (
    "pending",
    "running",
    "failed",
    "unknown",
    "crashLoopBackOff",
    "imagePullBackOff",
    "errImagePull",
    "createContainerConfigError",
    "containerCreating",
    "oomKilled",
    "completed",
    "error",
    "containerCannotRun",
    "evicted",
    "nodeAffinity",
    "nodeLost",
    "shutdown",
    "unexpectedAdmissionError",
)

# Maps a PodStatus wire value (lowercase) to its PodCountsByStatus bucket key (camelCase).
STATUS_TO_BUCKET = {
    "pending": "pending",
    "running": "running",
    "failed": "failed",
    "unknown": "unknown",
    "crashloopbackoff": "crashLoopBackOff",
    "imagepullbackoff": "imagePullBackOff",
    "errimagepull": "errImagePull",
    "createcontainerconfigerror": "createContainerConfigError",
    "containercreating": "containerCreating",
    "oomkilled": "oomKilled",
    "completed": "completed",
    "error": "error",
    "containercannotrun": "containerCannotRun",
    "evicted": "evicted",
    "nodeaffinity": "nodeAffinity",
    "nodelost": "nodeLost",
    "shutdown": "shutdown",
    "unexpectedadmissionerror": "unexpectedAdmissionError",
}


def expected_status_counts(**nonzero: int) -> dict:
    """Full 19-bucket PodCountsByStatus with the given buckets set, rest 0."""
    counts = {bucket: 0 for bucket in STATUS_BUCKETS}
    counts.update(nonzero)
    return counts


@pytest.fixture(name="load_pods_metrics", scope="function")
def load_pods_metrics() -> Callable[..., list[Metrics]]:
    """Load pod metrics JSONL with optional k8s.pod.start_time substitution.

    Mirrors Metrics.load_from_file's base_time rebase logic but adds a hook
    for the start_time label. Lines carrying ``k8s.pod.start_time =
    __START_TIME__`` get rewritten to ``start_time.isoformat()`` before
    construction, ensuring podAge is deterministic across runs.
    """

    def _load_pods_metrics(
        file_relpath: str,
        base_time: datetime,
        start_time: datetime | None = None,
    ) -> list[Metrics]:
        path = get_testdata_file_path(file_relpath)
        start_time_iso = start_time.isoformat() if start_time else None
        rows = []
        with open(path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                data = json.loads(line)
                labels = data.get("labels", {})
                if start_time_iso and labels.get("k8s.pod.start_time") == START_TIME_PLACEHOLDER:
                    labels["k8s.pod.start_time"] = start_time_iso
                rows.append(data)
        if not rows:
            return []
        earliest = min(parse_timestamp(r["timestamp"]) for r in rows)
        offset = base_time - earliest
        metrics = []
        for r in rows:
            ts = parse_timestamp(r["timestamp"]) + offset
            r["timestamp"] = ts.isoformat()
            metrics.append(Metrics.from_dict(r))
        return metrics

    return _load_pods_metrics

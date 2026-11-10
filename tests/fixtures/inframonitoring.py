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


# All buckets of the clusters-API per-group resource counts (camelCase, matches
# inframonitoringtypes ClusterRecord.Counts / the API response).
RESOURCE_COUNT_BUCKETS = (
    "nodes",
    "namespaces",
    "deployments",
    "daemonSets",
    "jobs",
    "statefulSets",
)


def expected_resource_counts(**nonzero: int) -> dict:
    """Full resource-counts dict with the given buckets set, rest 0."""
    counts = {bucket: 0 for bucket in RESOURCE_COUNT_BUCKETS}
    counts.update(nonzero)
    return counts

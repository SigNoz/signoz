package implinframonitoring

import "github.com/SigNoz/signoz/pkg/types/inframonitoringtypes"

// The types in this file are only used within the implinframonitoring package, and are not exposed outside.
// They are primarily used for internal processing and structuring of data within the module's implementation.

type rankedGroup struct {
	labels       map[string]string
	value        float64
	compositeKey string
}

// groupHostStatusCounts holds per-group active and inactive host counts.
type groupHostStatusCounts struct {
	Active   int
	Inactive int
}

// podPhaseCounts holds per-group pod counts bucketed by latest phase in window.
type podPhaseCounts struct {
	Pending   int
	Running   int
	Succeeded int
	Failed    int
	Unknown   int
}

// podStatusCounts holds per-group pod counts bucketed by latest kubectl-style
// display status in window. Mirrors inframonitoringtypes.PodCountsByStatus.
type podStatusCounts struct {
	// Phase fallback.
	Pending int
	Running int
	Failed  int
	Unknown int

	// Container-level reasons.
	CrashLoopBackOff           int
	ImagePullBackOff           int
	ErrImagePull               int
	CreateContainerConfigError int
	ContainerCreating          int
	OOMKilled                  int
	Completed                  int
	Error                      int
	ContainerCannotRun         int

	// Pod-level reasons.
	Evicted                  int
	NodeAffinity             int
	NodeLost                 int
	Shutdown                 int
	UnexpectedAdmissionError int
}

// podStatusCountsToResponse copies the internal per-group status counts into the
// public response struct. Shared by every entity that surfaces pod status
// counts (pods, nodes, namespaces, clusters, workloads).
func podStatusCountsToResponse(podStatuses podStatusCounts) inframonitoringtypes.PodCountsByStatus {
	return inframonitoringtypes.PodCountsByStatus{
		Pending:                    podStatuses.Pending,
		Running:                    podStatuses.Running,
		Failed:                     podStatuses.Failed,
		Unknown:                    podStatuses.Unknown,
		CrashLoopBackOff:           podStatuses.CrashLoopBackOff,
		ImagePullBackOff:           podStatuses.ImagePullBackOff,
		ErrImagePull:               podStatuses.ErrImagePull,
		CreateContainerConfigError: podStatuses.CreateContainerConfigError,
		ContainerCreating:          podStatuses.ContainerCreating,
		OOMKilled:                  podStatuses.OOMKilled,
		Completed:                  podStatuses.Completed,
		Error:                      podStatuses.Error,
		ContainerCannotRun:         podStatuses.ContainerCannotRun,
		Evicted:                    podStatuses.Evicted,
		NodeAffinity:               podStatuses.NodeAffinity,
		NodeLost:                   podStatuses.NodeLost,
		Shutdown:                   podStatuses.Shutdown,
		UnexpectedAdmissionError:   podStatuses.UnexpectedAdmissionError,
	}
}

// nodeConditionCounts holds per-group node counts bucketed by latest condition_ready in window.
type nodeConditionCounts struct {
	Ready    int
	NotReady int
}

// bucketSplit carries the up-to-six entries a single spec bucket contributes
// to an checks response. Any field may be nil if the bucket doesn't
// populate that dimension.
type bucketSplit struct {
	PresentDefault  *inframonitoringtypes.MetricsComponentEntry
	PresentOptional *inframonitoringtypes.MetricsComponentEntry
	PresentAttrs    *inframonitoringtypes.AttributesComponentEntry
	MissingDefault  *inframonitoringtypes.MissingMetricsComponentEntry
	MissingOptional *inframonitoringtypes.MissingMetricsComponentEntry
	MissingAttrs    *inframonitoringtypes.MissingAttributesComponentEntry
}

// checkComponentBucket is a single collector component's contribution
// toward a single infra-monitoring tab's readiness. Any of the three dimension
// slices (DefaultMetrics, OptionalMetrics, RequiredAttrs) may be empty — the
// bucketizer in Phase 4 skips empty dimensions.
type checkComponentBucket struct {
	Component         inframonitoringtypes.AssociatedComponent
	DefaultMetrics    []string
	OptionalMetrics   []string
	RequiredAttrs     []string
	DocumentationLink string
}

// checkSpec defines, for one CheckType, the full set of
// component-scoped buckets that must be satisfied for the tab to be ready.
type checkSpec struct {
	Buckets []checkComponentBucket
}

func (s checkSpec) getAllMetrics() []string {
	var out []string
	for _, b := range s.Buckets {
		out = append(out, b.DefaultMetrics...)
		out = append(out, b.OptionalMetrics...)
	}
	return out
}

func (s checkSpec) getAllAttrs() []string {
	var out []string
	for _, b := range s.Buckets {
		out = append(out, b.RequiredAttrs...)
	}
	return out
}

// containerStatusCounts holds per-group container counts bucketed by latest
// kubectl-style display status in window. Mirrors inframonitoringtypes.ContainerCountsByStatus.
type containerStatusCounts struct {
	// State fallback.
	Running    int
	Waiting    int
	Terminated int

	// Container-level reasons.
	CrashLoopBackOff           int
	ImagePullBackOff           int
	ErrImagePull               int
	CreateContainerConfigError int
	ContainerCreating          int
	OOMKilled                  int
	Completed                  int
	Error                      int
	ContainerCannotRun         int

	Unknown int
}

// containerStatusCountsToResponse copies the internal per-group status counts
// into the public response struct.
func containerStatusCountsToResponse(c containerStatusCounts) inframonitoringtypes.ContainerCountsByStatus {
	return inframonitoringtypes.ContainerCountsByStatus{
		Running:                    c.Running,
		Waiting:                    c.Waiting,
		Terminated:                 c.Terminated,
		CrashLoopBackOff:           c.CrashLoopBackOff,
		ImagePullBackOff:           c.ImagePullBackOff,
		ErrImagePull:               c.ErrImagePull,
		CreateContainerConfigError: c.CreateContainerConfigError,
		ContainerCreating:          c.ContainerCreating,
		OOMKilled:                  c.OOMKilled,
		Completed:                  c.Completed,
		Error:                      c.Error,
		ContainerCannotRun:         c.ContainerCannotRun,
		Unknown:                    c.Unknown,
	}
}

// containerReadyCounts holds per-group container counts bucketed by latest
// readiness in window. Mirrors inframonitoringtypes.ContainerCountsByReady.
type containerReadyCounts struct {
	Ready    int
	NotReady int
}

// containerReadyCountsToResponse copies the internal per-group ready counts
// into the public response struct.
func containerReadyCountsToResponse(c containerReadyCounts) inframonitoringtypes.ContainerCountsByReady {
	return inframonitoringtypes.ContainerCountsByReady{
		Ready:    c.Ready,
		NotReady: c.NotReady,
	}
}

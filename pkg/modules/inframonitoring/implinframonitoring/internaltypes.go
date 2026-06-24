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

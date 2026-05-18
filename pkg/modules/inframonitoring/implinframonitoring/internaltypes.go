package implinframonitoring

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

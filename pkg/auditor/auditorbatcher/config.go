package auditorbatcher

import "time"

type Config struct {
	// Capacity is the maximum number of events that can be buffered.
	// When full, new events are dropped (fail-open).
	Capacity int

	// Size is the maximum number of events per export batch.
	Size int

	// FlushInterval is the maximum time between flushes.
	// A flush is triggered when either Size events accumulate or
	// FlushInterval elapses, whichever comes first.
	FlushInterval time.Duration
}

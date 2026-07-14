package auditorserver

import "time"

type Config struct {
	// BufferSize is the maximum number of events that can be buffered.
	// When full, new events are dropped (fail-open).
	BufferSize int

	// BatchSize is the maximum number of events per export batch.
	BatchSize int

	// FlushInterval is the maximum time between flushes.
	// A flush is triggered when either BatchSize events accumulate or
	// FlushInterval elapses, whichever comes first.
	FlushInterval time.Duration
}

package queryenginetypes

import "context"

type Query interface {
	// Fingerprint must return a deterministic key that uniquely identifies
	//   (query-text, params, step, etc..) but *not* the time range.
	Fingerprint() string
	// Window returns [from, to) in epoch‑ms so cache can slice/merge.
	Window() (startMS, endMS int64)
	// Execute runs the query; implementors must be side‑effect‑free.
	Execute(ctx context.Context) (Result, error)
}

type Result struct {
	Shape ResultShape // neutral data shape
	Value any         // concrete Go value (see table below)
	Stats ExecStats
}

type ExecStats struct{}

type TimeRange struct{ From, To int64 } // ms since epoch

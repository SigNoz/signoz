package querybuildertypesv5

import (
	"context"
)

type Query interface {
	// Fingerprint must return a deterministic key that uniquely identifies
	//   (query-text, params, step, etc..) but *not* the time range.
	Fingerprint() string
	// Window returns [from, to) in epoch‑ms so cache can slice/merge.
	Window() (startMS, endMS uint64)
	// Execute runs the query; implementors must be side‑effect‑free.
	Execute(ctx context.Context) (*Result, error)
}

type Result struct {
	Type           RequestType
	Value          any // concrete Go value (to be type asserted based on the RequestType)
	Stats          ExecStats
	Warnings       []string
	WarningsDocURL string
}

type ExecStats struct {
	RowsScanned  uint64 `json:"rowsScanned"`
	BytesScanned uint64 `json:"bytesScanned"`
	DurationMS   uint64 `json:"durationMs"`
}

type TimeRange struct{ From, To uint64 } // ms since epoch

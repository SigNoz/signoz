package querybuildertypesv5

import (
	"context"

	"github.com/swaggest/jsonschema-go"
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
	RowsScanned   uint64            `json:"rowsScanned" description:"Rows scanned to answer every query in the request. A cost indicator only: rows are scanned whether or not any matched, so it says nothing about whether data exists."`
	BytesScanned  uint64            `json:"bytesScanned" description:"Bytes scanned to answer every query in the request. A cost indicator only; it does not indicate whether any data matched."`
	DurationMS    uint64            `json:"durationMs" description:"Total execution time across the queries in the request, in milliseconds. A cost indicator only, not the request latency and not a sign that data exists."`
	StepIntervals map[string]uint64 `json:"stepIntervals,omitempty" description:"The step interval in seconds that was used for each query, keyed by query name."`
}

var _ jsonschema.Preparer = &ExecStats{}

// PrepareJSONSchema adds description to the ExecStats schema.
func (e *ExecStats) PrepareJSONSchema(schema *jsonschema.Schema) error {
	schema.WithDescription("Execution cost of the request: rows and bytes scanned and execution time. A measure of cost, not of whether data exists.")
	return nil
}

type TimeRange struct{ From, To uint64 } // ms since epoch

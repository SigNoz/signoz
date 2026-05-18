// Package scalarstate provides Go decoders, mergers, and finalizers for
// ClickHouse AggregateFunction state blobs. It is the application-side merge
// path described as Option 2 in the "Caching for Scalar Queries" TRD.
//
// Each registered Aggregate maps a query-builder aggregate name (e.g. "avg")
// to:
//   - a ClickHouse "-State" SQL emitter (StateFunc)
//   - a byte-level Decode that mirrors CH's serialize() for that aggregate
//   - a Merge over decoded states (matching CH's *Merge semantics)
//   - a Final that produces the user-facing scalar value
//
// The registry intentionally only carries simple/exact aggregates in v1.
// Sketch-class aggregates (quantileTDigest, uniqCombined) are out of scope
// because their on-wire layouts are CH-internal and shift between versions
// — see the TRD's "Frequency of disruption" analysis.
package scalarstate

import (
	"strings"
	"sync"
)

// State is an opaque marker for a per-aggregate decoded state. Concrete
// types live alongside each aggregate's Decode/Merge implementation.
type State interface{}

// Aggregate is the per-aggregate behavior contract.
type Aggregate interface {
	// Name is the lowercase query-builder aggregate name (e.g. "avg",
	// "p99"). Used as the registry key.
	Name() string

	// StateFunc returns the ClickHouse function expression to emit per
	// chunk. innerExpr is the rewritten column/expression argument as
	// produced by aggExprRewriter (e.g. `duration_nano`). For parametric
	// aggregates (quantiles), the parameter is baked into the returned
	// string.
	StateFunc(innerExpr string) string

	// StateColumnType returns the AggregateFunction(...) DDL form used
	// for the per-chunk state column. Currently unused at runtime
	// (clickhouse-go scans AggregateFunction columns as []byte regardless),
	// but kept in the interface so a future temp-table path stays trivial.
	StateColumnType() string

	// Decode parses the raw AggregateFunction blob bytes into a
	// per-aggregate State value.
	Decode(b []byte) (State, error)

	// Merge combines per-chunk states into a single state. Matches the
	// semantics of ClickHouse's *Merge combinator for this aggregate.
	Merge(states []State) (State, error)

	// Final produces the user-facing scalar value (typically float64,
	// uint64, or int64) from a merged state.
	Final(s State) (any, error)
}

var (
	mu       sync.RWMutex
	registry = map[string]Aggregate{}
)

// Register adds an Aggregate to the registry. Intended to be called from
// package init() functions.
func Register(a Aggregate) {
	mu.Lock()
	defer mu.Unlock()
	registry[strings.ToLower(a.Name())] = a
}

// Lookup returns the Aggregate for the given query-builder aggregate name
// (case-insensitive).
func Lookup(name string) (Aggregate, bool) {
	mu.RLock()
	defer mu.RUnlock()
	a, ok := registry[strings.ToLower(name)]
	return a, ok
}

// IsCacheable is true when an aggregate has a registered Go merge path.
func IsCacheable(name string) bool {
	_, ok := Lookup(name)
	return ok
}

// stripNullableFlag peels the 1-byte "had a non-null value" flag that CH's
// AggregateFunctionNullUnary<serialize_flag=true> wrapper writes around the
// nested aggregate state when the input column is Nullable. SigNoz's
// expression rewriter emits multiIf(..., NULL) for unmatched rows, so the
// flag is always present for avg/sum/min/max (count is special-cased
// inside CH and ships unwrapped).
//
// Returns:
//
//	(nestedBytes, true)  when the wrapper says a nested state follows
//	(nil, false)         when the wrapper says no non-null value was ever seen
//
// If the buffer doesn't fit either wrapped shape (e.g. b[0] not in {0,1},
// or flag=0 with extra trailing bytes), returns (b, true) so callers fall
// through to the unwrapped decode path. The caller's own length / varint
// checks will then surface a precise error including the hex.
func stripNullableFlag(b []byte) ([]byte, bool) {
	if len(b) == 0 {
		return b, true
	}
	switch b[0] {
	case 0:
		if len(b) == 1 {
			return nil, false
		}
	case 1:
		return b[1:], true
	}
	return b, true
}

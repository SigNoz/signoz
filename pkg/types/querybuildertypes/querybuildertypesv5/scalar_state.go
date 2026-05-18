package querybuildertypesv5

// ScalarStateRow is a single per-(chunk × group_key × aggregation) entry
// holding the raw ClickHouse AggregateFunction(state, ...) blob bytes.
type ScalarStateRow struct {
	GroupKey []any  `json:"groupKey"`
	AggIdx   int    `json:"aggIdx"`
	State    []byte `json:"state"`
}

// ScalarStateData is the cache-side payload for a chunked scalar query.
// It is the value carried in Result.Value when the internal request type
// is RequestTypeScalarState. After merging, it is materialized into the
// user-facing ScalarData via the scalarstate registry.
type ScalarStateData struct {
	QueryName string              `json:"queryName"`
	GroupCols []*ColumnDescriptor `json:"groupCols"`
	AggCols   []*ColumnDescriptor `json:"aggCols"`
	// AggNames is the registry lookup key per AggCols index (e.g., "avg",
	// "sum", "p99"). Lets the merger find the matching Go decoder/merger.
	AggNames []string `json:"aggNames"`
	// RateMask[i] is true when AggNames[i] is a rate-style aggregate
	// (rate, rate_sum, rate_avg, rate_min, rate_max). Per-chunk SQL
	// emits the underlying state (count/sum/avg/min/max), and the
	// rate-window division is applied after Final() at materialize
	// time using the full query window.
	RateMask []bool `json:"rateMask,omitempty"`
	// Order and Limit are applied post-merge in materializeScalarData
	// (chunk SQL skips them to avoid losing groups that are globally
	// top-N but never per-chunk top-N).
	Order []OrderBy        `json:"order,omitempty"`
	Limit int              `json:"limit,omitempty"`
	Rows  []ScalarStateRow `json:"rows"`
}

// Adopt copies metadata fields from src onto s when s's matching field
// is empty, then appends src.Rows. This is the "first non-empty payload
// wins" policy used by both the cross-chunk merge in the querier and
// the cache-side bucket merge — keep them in sync via this method so
// RateMask/Order/Limit can't silently drift between the two callers.
func (s *ScalarStateData) Adopt(src *ScalarStateData) {
	if src == nil {
		return
	}
	if s.QueryName == "" {
		s.QueryName = src.QueryName
	}
	if len(s.GroupCols) == 0 {
		s.GroupCols = src.GroupCols
	}
	if len(s.AggCols) == 0 {
		s.AggCols = src.AggCols
	}
	if len(s.AggNames) == 0 {
		s.AggNames = src.AggNames
	}
	if len(s.RateMask) == 0 {
		s.RateMask = src.RateMask
	}
	if len(s.Order) == 0 {
		s.Order = src.Order
	}
	if s.Limit == 0 {
		s.Limit = src.Limit
	}
	s.Rows = append(s.Rows, src.Rows...)
}

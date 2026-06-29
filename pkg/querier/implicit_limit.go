package querier

import (
	"fmt"
	"slices"
	"strings"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

var implicitLimitWarn = "Query %s returned too many results; output has been limited to %d. Add an explicit limit to the query to override this."

// enforceImplicitLimit trims each query that QueryRangeRequest.Normalize capped down to its
// implicit limit, honoring its order, and returns a warning per trimmed query.
func enforceImplicitLimit(results map[string]any, requestType qbtypes.RequestType, queries []qbtypes.QueryEnvelope) []string {
	var warnings []string
	for idx := range queries {
		qe := &queries[idx]

		limit := qe.GetImplicitLimit()
		if limit == 0 {
			continue
		}

		name := qe.GetQueryName()
		result, ok := results[name]
		if !ok {
			continue
		}

		if requestType.IsAggregation() {
			if trimGroupsToLimit(result, limit, qe.GetOrder()) {
				warnings = append(warnings, fmt.Sprintf(implicitLimitWarn, name, limit))
			}
		}
	}

	return warnings
}

// trimGroupsToLimit clips a result to at most limit groups and reports whether it had to trim.
func trimGroupsToLimit(result any, limit int, orderBy []qbtypes.OrderBy) bool {
	switch value := result.(type) {
	case *qbtypes.TimeSeriesData:
		if len(value.Aggregations) == 0 || len(value.Aggregations[0].Series) <= limit {
			return false
		}

		// consume yields series in map (non-deterministic) order, so re-derive the CTE's top-N by
		// the query order: aggregation keys rank by series total (not per-bucket average), group
		// keys by label. All buckets share the same group set, so pick survivors once and filter.
		ranked := append([]*qbtypes.TimeSeries(nil), value.Aggregations[0].Series...)
		slices.SortStableFunc(ranked, func(a, b *qbtypes.TimeSeries) int {
			return compareSeriesForTrim(a, b, orderBy)
		})

		keep := make(map[string]struct{}, limit)
		for _, s := range ranked[:limit] {
			keep[qbtypes.GetUniqueSeriesKey(s.Labels)] = struct{}{}
		}

		for _, bucket := range value.Aggregations {
			kept := make([]*qbtypes.TimeSeries, 0, len(keep))
			for _, s := range bucket.Series {
				if _, ok := keep[qbtypes.GetUniqueSeriesKey(s.Labels)]; ok {
					kept = append(kept, s)
				}
			}
			bucket.Series = kept
		}
		return true
	case *qbtypes.ScalarData:
		if len(value.Data) <= limit {
			return false
		}

		// Rows arrive SQL-ordered; re-sort by the aggregation only when no order was given.
		if len(orderBy) == 0 {
			sortByFirstAggregation(value.Data, value.Columns)
		}
		value.Data = value.Data[:limit]
		return true
	}

	return false
}

// compareSeriesForTrim orders two series by the query order for trimming: a group by key is
// compared by its label value, anything else (an aggregation) by series total. With no order it
// falls back to total descending.
func compareSeriesForTrim(a, b *qbtypes.TimeSeries, orderBy []qbtypes.OrderBy) int {
	if len(orderBy) == 0 {
		return cmpFloat(seriesTotal(b), seriesTotal(a))
	}

	for _, o := range orderBy {
		var c int
		if va, ok := seriesLabelValue(a, o.Key.Name); ok {
			vb, _ := seriesLabelValue(b, o.Key.Name)
			c = strings.Compare(va, vb)
		} else {
			c = cmpFloat(seriesTotal(a), seriesTotal(b))
		}

		if c != 0 {
			if o.Direction == qbtypes.OrderDirectionDesc {
				return -c
			}
			return c
		}
	}

	return 0
}

// seriesTotal sums a series' evaluable values — the per-group total the limit CTE ranks by.
func seriesTotal(s *qbtypes.TimeSeries) float64 {
	var total float64
	for _, v := range s.EvaluableValues() {
		total += v.Value
	}
	return total
}

// seriesLabelValue returns the string value of the series label with the given key name.
func seriesLabelValue(s *qbtypes.TimeSeries, name string) (string, bool) {
	for _, l := range s.Labels {
		if l.Key.Name == name {
			if str, ok := l.Value.(string); ok {
				return str, true
			}
			return fmt.Sprintf("%v", l.Value), true
		}
	}
	return "", false
}

func cmpFloat(a, b float64) int {
	switch {
	case a < b:
		return -1
	case a > b:
		return 1
	default:
		return 0
	}
}

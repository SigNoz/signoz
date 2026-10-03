package querier

import (
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/require"
)

func tsWithValue(label string, value float64) *qbtypes.TimeSeries {
	return &qbtypes.TimeSeries{
		Labels: []*qbtypes.Label{{Key: telemetrytypes.TelemetryFieldKey{Name: "body.k"}, Value: label}},
		Values: []*qbtypes.TimeSeriesValue{{Timestamp: 1, Value: value}},
	}
}

func tsWithValues(label string, values ...float64) *qbtypes.TimeSeries {
	pts := make([]*qbtypes.TimeSeriesValue, len(values))
	for i, v := range values {
		pts[i] = &qbtypes.TimeSeriesValue{Timestamp: int64(i + 1), Value: v}
	}
	return &qbtypes.TimeSeries{
		Labels: []*qbtypes.Label{{Key: telemetrytypes.TelemetryFieldKey{Name: "body.k"}, Value: label}},
		Values: pts,
	}
}

func seriesLabel(s *qbtypes.TimeSeries) string { return s.Labels[0].Value.(string) }

// A is spread thin (total 5, avg ~1.25); B/C are concentrated (avg 3, 2). Ranking by average
// would drop the high-total A. The fix keeps the top groups by total: A and B.
func TestTrimGroupsToLimit_TimeSeriesKeepsTopByTotalNotAverage(t *testing.T) {
	tsd := &qbtypes.TimeSeriesData{
		Aggregations: []*qbtypes.AggregationBucket{{
			Series: []*qbtypes.TimeSeries{
				tsWithValues("A", 1, 1, 1, 1, 1), // total 5, avg 1
				tsWithValue("B", 3),              // total 3, avg 3
				tsWithValue("C", 2),              // total 2, avg 2
			},
		}},
	}

	trimmed := trimGroupsToLimit(tsd, 2, nil)

	require.True(t, trimmed)
	kept := []string{seriesLabel(tsd.Aggregations[0].Series[0]), seriesLabel(tsd.Aggregations[0].Series[1])}
	require.ElementsMatch(t, []string{"A", "B"}, kept, "must keep top-2 by total (A=5, B=3), not by average")
}

// Series in ascending value order: a naive Series[:limit] keeps the lowest; the trim must not.
func TestTrimGroupsToLimit_TimeSeriesKeepsTopByValue(t *testing.T) {
	tsd := &qbtypes.TimeSeriesData{
		Aggregations: []*qbtypes.AggregationBucket{{
			Series: []*qbtypes.TimeSeries{
				tsWithValue("a", 1),
				tsWithValue("b", 2),
				tsWithValue("c", 3),
			},
		}},
	}

	trimmed := trimGroupsToLimit(tsd, 2, nil)

	require.True(t, trimmed)
	require.Len(t, tsd.Aggregations[0].Series, 2)

	kept := []float64{
		tsd.Aggregations[0].Series[0].Values[0].Value,
		tsd.Aggregations[0].Series[1].Values[0].Value,
	}
	require.ElementsMatch(t, []float64{3, 2}, kept, "must keep the top-2 by value, not an arbitrary subset")
}

func TestTrimGroupsToLimit_ScalarKeepsTopByValueViaSeriesLimit(t *testing.T) {
	// Rows not in value order: the trim must re-sort and keep b=3, c=2, not the leading rows.
	sd := &qbtypes.ScalarData{
		Columns: []*qbtypes.ColumnDescriptor{
			{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "body.k"}, Type: qbtypes.ColumnTypeGroup},
			{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "__result_0"}, Type: qbtypes.ColumnTypeAggregation},
		},
		Data: [][]any{{"a", 1.0}, {"b", 3.0}, {"c", 2.0}},
	}

	trimmed := trimGroupsToLimit(sd, 2, nil)

	require.True(t, trimmed)
	require.Len(t, sd.Data, 2)
	require.Equal(t, []any{"b", 3.0}, sd.Data[0])
	require.Equal(t, []any{"c", 2.0}, sd.Data[1])
}

func TestTrimGroupsToLimit_NoTrimWhenUnderLimit(t *testing.T) {
	tsd := &qbtypes.TimeSeriesData{
		Aggregations: []*qbtypes.AggregationBucket{{
			Series: []*qbtypes.TimeSeries{tsWithValue("a", 1), tsWithValue("b", 2)},
		}},
	}

	require.False(t, trimGroupsToLimit(tsd, 5, nil))
	require.Len(t, tsd.Aggregations[0].Series, 2)
}

func TestEnforceImplicitLimit_WarnsAndTrimsOnlyLimitedQueries(t *testing.T) {
	results := map[string]any{
		"A": &qbtypes.TimeSeriesData{QueryName: "A", Aggregations: []*qbtypes.AggregationBucket{{
			Series: []*qbtypes.TimeSeries{tsWithValue("a", 1), tsWithValue("b", 2), tsWithValue("c", 3)},
		}}},
		"B": &qbtypes.TimeSeriesData{QueryName: "B", Aggregations: []*qbtypes.AggregationBucket{{
			Series: []*qbtypes.TimeSeries{tsWithValue("x", 9), tsWithValue("y", 8), tsWithValue("z", 7)},
		}}},
	}

	// Only A is marked as capped; B must be left untouched even though it also has 3 series.
	warnings := enforceImplicitLimitForTest(t, results, map[string]bool{"A": true}, 2)

	require.Len(t, warnings, 1)
	require.Contains(t, warnings[0], "A")
	require.Len(t, results["A"].(*qbtypes.TimeSeriesData).Aggregations[0].Series, 2)
	require.Len(t, results["B"].(*qbtypes.TimeSeriesData).Aggregations[0].Series, 3)
}

// enforceImplicitLimitForTest mirrors enforceImplicitLimit with a test-pinned limit.
func enforceImplicitLimitForTest(t *testing.T, results map[string]any, limited map[string]bool, limit int) []string {
	t.Helper()

	var warnings []string
	for name := range limited {
		result, ok := results[name]
		if !ok {
			continue
		}
		if trimGroupsToLimit(result, limit, nil) {
			warnings = append(warnings, "Query "+name+" returned too many groups")
		}
	}
	return warnings
}

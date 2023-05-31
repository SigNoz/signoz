package queryBuilder

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
	metricsv3 "go.signoz.io/signoz/pkg/query-service/app/metrics/v3"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

func TestBuildQueryWithMultipleQueriesAndFormula(t *testing.T) {
	t.Run("TestBuildQueryWithFilters", func(t *testing.T) {
		q := &v3.QueryRangeParamsV3{
			Start: 1650991982000,
			End:   1651078382000,
			Step:  60,
			CompositeQuery: &v3.CompositeQuery{
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:          "A",
						DataSource:         v3.DataSourceMetrics,
						AggregateAttribute: v3.AttributeKey{Key: "name"},
						Filters: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
							{Key: v3.AttributeKey{Key: "in"}, Value: []interface{}{"a", "b", "c"}, Operator: v3.FilterOperatorIn},
						}},
						AggregateOperator: v3.AggregateOperatorRateMax,
						Expression:        "A",
					},
					"B": {
						QueryName:          "B",
						AggregateAttribute: v3.AttributeKey{Key: "name2"},
						DataSource:         v3.DataSourceMetrics,
						AggregateOperator:  v3.AggregateOperatorRateAvg,
						Expression:         "B",
					},
					"C": {
						QueryName:  "C",
						Expression: "A/B",
					},
				},
			},
		}
		qbOptions := QueryBuilderOptions{
			BuildMetricQuery: metricsv3.PrepareMetricQuery,
		}
		qb := NewQueryBuilder(qbOptions)

		queries, err := qb.PrepareQueries(q)

		require.NoError(t, err)

		require.Contains(t, queries["C"], "SELECT A.ts as ts, A.value / B.value")
		require.Contains(t, queries["C"], "WHERE metric_name = 'name' AND JSONExtractString(labels, 'in') IN ['a','b','c']")
		require.Contains(t, queries["C"], "runningDifference(value)/runningDifference(ts)")
	})
}

func TestBuildQueryWithIncorrectQueryRef(t *testing.T) {
	t.Run("TestBuildQueryWithFilters", func(t *testing.T) {
		q := &v3.QueryRangeParamsV3{
			Start: 1650991982000,
			End:   1651078382000,
			Step:  60,
			CompositeQuery: &v3.CompositeQuery{
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:          "A",
						DataSource:         v3.DataSourceMetrics,
						AggregateAttribute: v3.AttributeKey{Key: "name"},
						Filters: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
							{Key: v3.AttributeKey{Key: "in"}, Value: []interface{}{"a", "b", "c"}, Operator: v3.FilterOperatorIn},
						}},
						AggregateOperator: v3.AggregateOperatorRateMax,
						Expression:        "A",
					},
					"C": {
						QueryName:  "C",
						Expression: "A*2",
					},
				},
			},
		}

		qbOptions := QueryBuilderOptions{
			BuildMetricQuery: metricsv3.PrepareMetricQuery,
		}
		qb := NewQueryBuilder(qbOptions)

		_, err := qb.PrepareQueries(q)

		require.NoError(t, err)
	})
}

func TestBuildQueryWithThreeOrMoreQueriesRefAndFormula(t *testing.T) {
	t.Run("TestBuildQueryWithFilters", func(t *testing.T) {
		q := &v3.QueryRangeParamsV3{
			Start: 1650991982000,
			End:   1651078382000,
			Step:  60,
			CompositeQuery: &v3.CompositeQuery{
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:          "A",
						DataSource:         v3.DataSourceMetrics,
						AggregateAttribute: v3.AttributeKey{Key: "name"},
						Filters: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
							{Key: v3.AttributeKey{Key: "in"}, Value: []interface{}{"a", "b", "c"}, Operator: v3.FilterOperatorIn},
						}},
						AggregateOperator: v3.AggregateOperatorRateMax,
						Expression:        "A",
						Disabled:          true,
					},
					"B": {
						QueryName:          "B",
						AggregateAttribute: v3.AttributeKey{Key: "name2"},
						DataSource:         v3.DataSourceMetrics,

						AggregateOperator: v3.AggregateOperatorRateMax,
						Expression:        "B",
						Disabled:          true,
					},
					"C": {
						QueryName:          "C",
						AggregateAttribute: v3.AttributeKey{Key: "name3"},
						DataSource:         v3.DataSourceMetrics,

						AggregateOperator: v3.AggregateOperatorSumRate,
						Expression:        "C",
						Disabled:          true,
					},
					"F1": {
						QueryName:  "F1",
						Expression: "A/B",
					},
					"F2": {
						QueryName:  "F2",
						Expression: "A/(B+C)",
					},
					"F3": {
						QueryName:  "F3",
						Expression: "A*A",
					},
					"F4": {
						QueryName:  "F4",
						Expression: "A*B*C",
					},
					"F5": {
						QueryName:  "F5",
						Expression: "((A - B) / B) * 100",
					},
				},
			},
		}

		qbOptions := QueryBuilderOptions{
			BuildMetricQuery: metricsv3.PrepareMetricQuery,
		}
		qb := NewQueryBuilder(qbOptions)

		queries, err := qb.PrepareQueries(q)

		require.NoError(t, err)

		require.Contains(t, queries["F1"], "SELECT A.ts as ts, A.value / B.value")
		require.Equal(t, 1, strings.Count(queries["F1"], " ON "))

		require.Contains(t, queries["F2"], "SELECT A.ts as ts, A.value / (B.value + C.value)")
		require.Equal(t, 2, strings.Count(queries["F2"], " ON "))

		// Working with same query multiple times should not join on itself
		require.NotContains(t, queries["F3"], " ON ")

		require.Contains(t, queries["F4"], "SELECT A.ts as ts, A.value * B.value * C.value")
		require.Equal(t, 2, strings.Count(queries["F4"], " ON "))

		require.Contains(t, queries["F5"], "SELECT A.ts as ts, ((A.value - B.value) / B.value) * 100")
		require.Equal(t, 1, strings.Count(queries["F5"], " ON "))

		for _, query := range q.CompositeQuery.BuilderQueries {
			if query.Disabled {
				require.NotContains(t, queries, query.QueryName)
			}
		}

		// res := PrepareBuilderMetricQueries(q, "table")
		// So(res.Err, ShouldBeNil)
		// queries := res.Queries
		// So(len(queries), ShouldEqual, 5)
		// So(queries["F1"], ShouldContainSubstring, "SELECT A.ts as ts, A.value / B.value")
		// So(strings.Count(queries["F1"], " ON "), ShouldEqual, 1)

		// So(queries["F2"], ShouldContainSubstring, "SELECT A.ts as ts, A.value / (B.value + C.value)")
		// So(strings.Count(queries["F2"], " ON "), ShouldEqual, 2)

		// // Working with same query multiple times should not join on itself
		// So(queries["F3"], ShouldNotContainSubstring, " ON ")

		// So(queries["F4"], ShouldContainSubstring, "SELECT A.ts as ts, A.value * B.value * C.value")
		// // Number of times JOIN ON appears is N-1 where N is number of unique queries
		// So(strings.Count(queries["F4"], " ON "), ShouldEqual, 2)

		// So(queries["F5"], ShouldContainSubstring, "SELECT A.ts as ts, ((A.value - B.value) / B.value) * 100")
		// So(strings.Count(queries["F5"], " ON "), ShouldEqual, 1)
	})
}

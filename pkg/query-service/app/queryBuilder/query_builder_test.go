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
		require.Contains(t, queries["C"], "WHERE metric_name = 'name' AND temporality IN ['Cumulative', 'Unspecified'] AND JSONExtractString(labels, 'in') IN ['a','b','c']")
		require.Contains(t, queries["C"], "runningDifference(value) / runningDifference(ts)")
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

func TestDeltaQueryBuilder(t *testing.T) {
	cases := []struct {
		name        string
		query       *v3.QueryRangeParamsV3
		queryToTest string
		expected    string
	}{
		{
			name: "TestQueryWithName - Request rate",
			query: &v3.QueryRangeParamsV3{
				Start: 1650991982000,
				End:   1651078382000,
				Step:  60,
				CompositeQuery: &v3.CompositeQuery{
					QueryType: v3.QueryTypeBuilder,
					PanelType: v3.PanelTypeGraph,
					BuilderQueries: map[string]*v3.BuilderQuery{
						"A": {
							DataSource:         v3.DataSourceMetrics,
							QueryName:          "A",
							AggregateAttribute: v3.AttributeKey{Key: "signoz_latency_count"},
							StepInterval:       60,
							AggregateOperator:  v3.AggregateOperatorSumRate,
							Expression:         "A",
							Temporality:        v3.Delta,
							Filters: &v3.FilterSet{
								Items: []v3.FilterItem{
									{
										Key:      v3.AttributeKey{Key: "service_name"},
										Operator: v3.FilterOperatorIn,
										Value:    []interface{}{"frontend"},
									},
									{
										Key:      v3.AttributeKey{Key: "operation"},
										Operator: v3.FilterOperatorIn,
										Value:    []interface{}{"HTTP GET /dispatch"},
									},
								},
							},
						},
					},
				},
			},
			queryToTest: "A",
			expected:    "SELECT  toStartOfInterval(toDateTime(intDiv(timestamp_ms, 1000)), INTERVAL 60 SECOND) as ts, sum(value)/60 as value FROM signoz_metrics.distributed_samples_v2 INNER JOIN (SELECT  fingerprint FROM signoz_metrics.time_series_v2 WHERE metric_name = 'signoz_latency_count' AND temporality = 'Delta'  AND JSONExtractString(labels, 'service_name') IN ['frontend'] AND JSONExtractString(labels, 'operation') IN ['HTTP GET /dispatch'] AND JSONExtractString(labels, '__temporality__') = 'Delta') as filtered_time_series USING fingerprint WHERE metric_name = 'signoz_latency_count' AND timestamp_ms >= 1650991982000 AND timestamp_ms <= 1651078382000 GROUP BY ts ORDER BY  ts",
		},
		{
			name: "TestQueryWithExpression - Error rate",
			query: &v3.QueryRangeParamsV3{
				Start: 1650991982000,
				End:   1651078382000,
				Step:  60,
				CompositeQuery: &v3.CompositeQuery{
					QueryType: v3.QueryTypeBuilder,
					PanelType: v3.PanelTypeGraph,
					BuilderQueries: map[string]*v3.BuilderQuery{
						"A": {
							QueryName:          "A",
							DataSource:         v3.DataSourceMetrics,
							AggregateAttribute: v3.AttributeKey{Key: "signoz_latency_count"},
							StepInterval:       60,
							AggregateOperator:  v3.AggregateOperatorSumRate,
							Expression:         "A",
							Temporality:        v3.Delta,
							Filters: &v3.FilterSet{
								Items: []v3.FilterItem{
									{
										Key:      v3.AttributeKey{Key: "service_name"},
										Operator: v3.FilterOperatorIn,
										Value:    []interface{}{"frontend"},
									},
									{
										Key:      v3.AttributeKey{Key: "operation"},
										Operator: v3.FilterOperatorIn,
										Value:    []interface{}{"HTTP GET /dispatch"},
									},
									{
										Key:      v3.AttributeKey{Key: "status_code"},
										Operator: v3.FilterOperatorIn,
										Value:    []interface{}{"STATUS_CODE_ERROR"},
									},
								},
							},
						},
						"B": {
							QueryName:          "B",
							DataSource:         v3.DataSourceMetrics,
							AggregateAttribute: v3.AttributeKey{Key: "signoz_latency_count"},
							StepInterval:       60,
							AggregateOperator:  v3.AggregateOperatorSumRate,
							Expression:         "B",
							Temporality:        v3.Delta,
							Filters: &v3.FilterSet{
								Items: []v3.FilterItem{
									{
										Key:      v3.AttributeKey{Key: "service_name"},
										Operator: v3.FilterOperatorIn,
										Value:    []interface{}{"frontend"},
									},
									{
										Key:      v3.AttributeKey{Key: "operation"},
										Operator: v3.FilterOperatorIn,
										Value:    []interface{}{"HTTP GET /dispatch"},
									},
								},
							},
						},
						"C": {
							QueryName:  "C",
							Expression: "A*100/B",
						},
					},
				},
			},
			queryToTest: "C",
			expected:    "SELECT A.ts as ts, A.value * 100 / B.value as value FROM (SELECT  toStartOfInterval(toDateTime(intDiv(timestamp_ms, 1000)), INTERVAL 60 SECOND) as ts, sum(value)/60 as value FROM signoz_metrics.distributed_samples_v2 INNER JOIN (SELECT  fingerprint FROM signoz_metrics.time_series_v2 WHERE metric_name = 'signoz_latency_count' AND temporality = 'Delta'  AND JSONExtractString(labels, 'service_name') IN ['frontend'] AND JSONExtractString(labels, 'operation') IN ['HTTP GET /dispatch'] AND JSONExtractString(labels, 'status_code') IN ['STATUS_CODE_ERROR'] AND JSONExtractString(labels, '__temporality__') = 'Delta') as filtered_time_series USING fingerprint WHERE metric_name = 'signoz_latency_count' AND timestamp_ms >= 1650991982000 AND timestamp_ms <= 1651078382000 GROUP BY ts ORDER BY  ts) as A  INNER JOIN (SELECT  toStartOfInterval(toDateTime(intDiv(timestamp_ms, 1000)), INTERVAL 60 SECOND) as ts, sum(value)/60 as value FROM signoz_metrics.distributed_samples_v2 INNER JOIN (SELECT  fingerprint FROM signoz_metrics.time_series_v2 WHERE metric_name = 'signoz_latency_count' AND temporality = 'Delta'  AND JSONExtractString(labels, 'service_name') IN ['frontend'] AND JSONExtractString(labels, 'operation') IN ['HTTP GET /dispatch'] AND JSONExtractString(labels, '__temporality__') = 'Delta') as filtered_time_series USING fingerprint WHERE metric_name = 'signoz_latency_count' AND timestamp_ms >= 1650991982000 AND timestamp_ms <= 1651078382000 GROUP BY ts ORDER BY  ts) as B  ON A.ts = B.ts",
		},
		{
			name: "TestQuery - Quantile",
			query: &v3.QueryRangeParamsV3{
				Start: 1650991982000,
				End:   1651078382000,
				Step:  60,
				CompositeQuery: &v3.CompositeQuery{
					QueryType: v3.QueryTypeBuilder,
					PanelType: v3.PanelTypeGraph,
					BuilderQueries: map[string]*v3.BuilderQuery{
						"A": {
							QueryName:          "A",
							DataSource:         v3.DataSourceMetrics,
							AggregateAttribute: v3.AttributeKey{Key: "signoz_latency_bucket"},
							StepInterval:       60,
							AggregateOperator:  v3.AggregateOperatorHistQuant95,
							Expression:         "A",
							Temporality:        v3.Delta,
							GroupBy: []v3.AttributeKey{
								{Key: "service_name"},
							},
						},
					},
				},
			},
			queryToTest: "A",
			expected:    "SELECT service_name,  ts, histogramQuantile(arrayMap(x -> toFloat64(x), groupArray(le)), groupArray(value), 0.950) as value FROM (SELECT service_name,le,  toStartOfInterval(toDateTime(intDiv(timestamp_ms, 1000)), INTERVAL 60 SECOND) as ts, sum(value)/60 as value FROM signoz_metrics.distributed_samples_v2 INNER JOIN (SELECT  JSONExtractString(labels, 'service_name') as service_name, JSONExtractString(labels, 'le') as le, fingerprint FROM signoz_metrics.time_series_v2 WHERE metric_name = 'signoz_latency_bucket' AND temporality = 'Delta' ) as filtered_time_series USING fingerprint WHERE metric_name = 'signoz_latency_bucket' AND timestamp_ms >= 1650991982000 AND timestamp_ms <= 1651078382000 GROUP BY service_name,le,ts ORDER BY service_name ASC,le ASC, ts) GROUP BY service_name,ts ORDER BY service_name ASC, ts",
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			qbOptions := QueryBuilderOptions{
				BuildMetricQuery: metricsv3.PrepareMetricQuery,
			}
			qb := NewQueryBuilder(qbOptions)
			queries, err := qb.PrepareQueries(c.query)

			require.NoError(t, err)
			require.Equal(t, c.expected, queries[c.queryToTest])
		})
	}
}

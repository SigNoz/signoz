package queryBuilder

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
	logsV3 "go.signoz.io/signoz/pkg/query-service/app/logs/v3"
	logsV4 "go.signoz.io/signoz/pkg/query-service/app/logs/v4"
	metricsv3 "go.signoz.io/signoz/pkg/query-service/app/metrics/v3"
	"go.signoz.io/signoz/pkg/query-service/constants"
	"go.signoz.io/signoz/pkg/query-service/featureManager"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

func TestBuildQueryWithMultipleQueriesAndFormula(t *testing.T) {
	t.Run("TestBuildQueryWithFilters", func(t *testing.T) {
		q := &v3.QueryRangeParamsV3{
			Start: 1650991982000,
			End:   1651078382000,
			CompositeQuery: &v3.CompositeQuery{
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:          "A",
						StepInterval:       60,
						DataSource:         v3.DataSourceMetrics,
						AggregateAttribute: v3.AttributeKey{Key: "name"},
						Filters: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
							{Key: v3.AttributeKey{Key: "in"}, Value: []interface{}{"a", "b", "c"}, Operator: v3.FilterOperatorIn},
						}},
						AggregateOperator: v3.AggregateOperatorRateMax,
						Temporality:       v3.Cumulative,
						Expression:        "A",
					},
					"B": {
						QueryName:          "B",
						StepInterval:       60,
						AggregateAttribute: v3.AttributeKey{Key: "name2"},
						DataSource:         v3.DataSourceMetrics,
						AggregateOperator:  v3.AggregateOperatorRateAvg,
						Temporality:        v3.Cumulative,
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
		fm := featureManager.StartManager()
		qb := NewQueryBuilder(qbOptions, fm)

		queries, err := qb.PrepareQueries(q)

		require.NoError(t, err)

		require.Contains(t, queries["C"], "SELECT A.`ts` as `ts`, A.value / B.value")
		require.Contains(t, queries["C"], "WHERE metric_name IN ['name'] AND temporality = 'Cumulative' AND unix_milli >= 1650931200000 AND unix_milli < 1651078380000 AND JSONExtractString(labels, 'in') IN ['a','b','c']")
		require.Contains(t, queries["C"], "(value - lagInFrame(value, 1, 0) OVER rate_window) / (ts - lagInFrame(ts, 1, toDate('1970-01-01')) OVER rate_window)))")
	})
}

func TestBuildQueryWithIncorrectQueryRef(t *testing.T) {
	t.Run("TestBuildQueryWithFilters", func(t *testing.T) {
		q := &v3.QueryRangeParamsV3{
			Start: 1650991982000,
			End:   1651078382000,
			CompositeQuery: &v3.CompositeQuery{
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:          "A",
						StepInterval:       60,
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
		fm := featureManager.StartManager()
		qb := NewQueryBuilder(qbOptions, fm)

		_, err := qb.PrepareQueries(q)

		require.NoError(t, err)
	})
}

func TestBuildQueryWithThreeOrMoreQueriesRefAndFormula(t *testing.T) {
	t.Run("TestBuildQueryWithFilters", func(t *testing.T) {
		q := &v3.QueryRangeParamsV3{
			Start: 1650991982000,
			End:   1651078382000,
			CompositeQuery: &v3.CompositeQuery{
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:          "A",
						StepInterval:       60,
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
						StepInterval:       60,
						AggregateAttribute: v3.AttributeKey{Key: "name2"},
						DataSource:         v3.DataSourceMetrics,

						AggregateOperator: v3.AggregateOperatorRateMax,
						Expression:        "B",
						Disabled:          true,
					},
					"C": {
						QueryName:          "C",
						StepInterval:       60,
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
		fm := featureManager.StartManager()
		qb := NewQueryBuilder(qbOptions, fm)

		queries, err := qb.PrepareQueries(q)

		require.NoError(t, err)

		require.Contains(t, queries["F1"], "SELECT A.`ts` as `ts`, A.value / B.value")
		require.Equal(t, 1, strings.Count(queries["F1"], " ON "))

		require.Contains(t, queries["F2"], "SELECT A.`ts` as `ts`, A.value / (B.value + C.value)")
		require.Equal(t, 2, strings.Count(queries["F2"], " ON "))

		// Working with same query multiple times should not join on itself
		require.NotContains(t, queries["F3"], " ON ")

		require.Contains(t, queries["F4"], "SELECT A.`ts` as `ts`, A.value * B.value * C.value")
		require.Equal(t, 2, strings.Count(queries["F4"], " ON "))

		require.Contains(t, queries["F5"], "SELECT A.`ts` as `ts`, ((A.value - B.value) / B.value) * 100")
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
	t.Run("TestBuildQueryWithDotMetricNameAndAttribute", func(t *testing.T) {
		q := &v3.QueryRangeParamsV3{
			Start: 1735036101000,
			End:   1735637901000,
			Step:  60,
			Variables: map[string]interface{}{
				"SIGNOZ_START_TIME": 1735034992000,
				"SIGNOZ_END_TIME":   1735036792000,
			},
			FormatForWeb: false,
			CompositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeBuilder,
				PanelType: v3.PanelTypeGraph,
				FillGaps:  false,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:         "A",
						DataSource:        v3.DataSourceMetrics,
						AggregateOperator: v3.AggregateOperatorAvg,
						AggregateAttribute: v3.AttributeKey{
							Key:      "system.memory.usage",
							DataType: v3.AttributeKeyDataTypeFloat64,
							Type:     v3.AttributeKeyType("Gauge"),
							IsColumn: true,
						},
						TimeAggregation:  v3.TimeAggregationAvg,
						SpaceAggregation: v3.SpaceAggregationSum,
						Filters: &v3.FilterSet{
							Operator: "AND",
							Items: []v3.FilterItem{
								{
									Key: v3.AttributeKey{
										Key:      "os.type",
										DataType: v3.AttributeKeyDataTypeString,
										Type:     v3.AttributeKeyTypeTag,
										IsColumn: false,
									},
									Operator: v3.FilterOperatorEqual,
									Value:    "linux",
								},
							},
						},
						Expression:   "A",
						Disabled:     true,
						StepInterval: 60,
						OrderBy: []v3.OrderBy{
							{
								ColumnName: "#SIGNOZ_VALUE",
								Order:      v3.DirectionAsc,
							},
						},
						GroupBy: []v3.AttributeKey{
							{
								Key:      "os.type",
								DataType: v3.AttributeKeyDataTypeString,
								Type:     v3.AttributeKeyTypeTag,
								IsColumn: false,
							},
						},
						Legend:   "",
						ReduceTo: v3.ReduceToOperatorAvg,
						Having:   []v3.Having{},
					},
					"B": {
						QueryName:         "B",
						DataSource:        v3.DataSourceMetrics,
						AggregateOperator: v3.AggregateOperatorSum,
						AggregateAttribute: v3.AttributeKey{
							Key:      "system.network.io",
							DataType: v3.AttributeKeyDataTypeFloat64,
							Type:     v3.AttributeKeyType("Sum"),
							IsColumn: true,
						},
						TimeAggregation:  v3.TimeAggregationIncrease,
						SpaceAggregation: v3.SpaceAggregationSum,
						Filters: &v3.FilterSet{
							Operator: "AND",
							Items:    []v3.FilterItem{},
						},
						Expression:   "B",
						Disabled:     true,
						StepInterval: 60,
						OrderBy: []v3.OrderBy{
							{
								Key:      "os.type",
								DataType: v3.AttributeKeyDataTypeString,
								Type:     v3.AttributeKeyTypeTag,
								IsColumn: false,
							},
						},
						GroupBy: []v3.AttributeKey{
							{
								Key:      "os.type",
								DataType: v3.AttributeKeyDataTypeString,
								Type:     v3.AttributeKeyTypeTag,
								IsColumn: false,
							},
						},
						Legend:   "",
						ReduceTo: v3.ReduceToOperatorAvg,
						Having: []v3.Having{
							{
								ColumnName: "SUM(system.network.io)",
								Operator:   v3.HavingOperatorGreaterThan,
								Value:      4,
							},
						},
					},
					"F1": {
						QueryName:  "F1",
						Expression: "A + B",
						Disabled:   false,
						Legend:     "",
						OrderBy:    []v3.OrderBy{},
						Limit:      2,
					},
				},
			},
		}
		qbOptions := QueryBuilderOptions{
			BuildMetricQuery: metricsv3.PrepareMetricQuery,
		}
		fm := featureManager.StartManager()
		qb := NewQueryBuilder(qbOptions, fm)

		queries, err := qb.PrepareQueries(q)
		require.Contains(t, queries["F1"], "SELECT A.`os.type` as `os.type`, A.`ts` as `ts`, A.value + B.value as value FROM (SELECT `os.type`,  toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), INTERVAL 60 SECOND) as ts, avg(value) as value FROM signoz_metrics.distributed_samples_v4 INNER JOIN (SELECT DISTINCT JSONExtractString(labels, 'os.type') as `os.type`, fingerprint FROM signoz_metrics.time_series_v4_1day WHERE metric_name IN ['system.memory.usage'] AND temporality = '' AND unix_milli >= 1734998400000 AND unix_milli < 1735637880000 AND JSONExtractString(labels, 'os.type') = 'linux') as filtered_time_series USING fingerprint WHERE metric_name IN ['system.memory.usage'] AND unix_milli >= 1735036080000 AND unix_milli < 1735637880000 GROUP BY `os.type`, ts ORDER BY `os.type` ASC, ts) as A  INNER JOIN (SELECT * FROM (SELECT `os.type`,  toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), INTERVAL 60 SECOND) as ts, sum(value) as value FROM signoz_metrics.distributed_samples_v4 INNER JOIN (SELECT DISTINCT JSONExtractString(labels, 'os.type') as `os.type`, fingerprint FROM signoz_metrics.time_series_v4_1day WHERE metric_name IN ['system.network.io'] AND temporality = '' AND unix_milli >= 1734998400000 AND unix_milli < 1735637880000) as filtered_time_series USING fingerprint WHERE metric_name IN ['system.network.io'] AND unix_milli >= 1735036020000 AND unix_milli < 1735637880000 GROUP BY `os.type`, ts ORDER BY `os.type` ASC, ts) HAVING value > 4) as B  ON A.`os.type` = B.`os.type` AND A.`ts` = B.`ts`")
		require.NoError(t, err)

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
				Start: 1650991982000, // 2022-04-25 10:53:02
				End:   1651078382000, // 2022-04-26 10:53:02
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
			expected:    "SELECT  toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), INTERVAL 60 SECOND) as ts, sum(value)/60 as value FROM signoz_metrics.distributed_samples_v4 INNER JOIN (SELECT DISTINCT fingerprint FROM signoz_metrics.time_series_v4_1day WHERE metric_name IN ['signoz_latency_count'] AND temporality = 'Delta' AND unix_milli >= 1650931200000 AND unix_milli < 1651078380000 AND JSONExtractString(labels, 'service_name') IN ['frontend'] AND JSONExtractString(labels, 'operation') IN ['HTTP GET /dispatch'] AND JSONExtractString(labels, '__temporality__') = 'Delta') as filtered_time_series USING fingerprint WHERE metric_name IN ['signoz_latency_count'] AND unix_milli >= 1650991980000 AND unix_milli <= 1651078380000 GROUP BY ts ORDER BY  ts",
		},
		{
			name: "TestQueryWithExpression - Error rate",
			query: &v3.QueryRangeParamsV3{
				Start: 1650991982000, // 2022-04-25 10:53:02
				End:   1651078382000, // 2022-04-26 10:53:02
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
			expected:    "SELECT A.`ts` as `ts`, A.value * 100 / B.value as value FROM (SELECT  toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), INTERVAL 60 SECOND) as ts, sum(value)/60 as value FROM signoz_metrics.distributed_samples_v4 INNER JOIN (SELECT DISTINCT fingerprint FROM signoz_metrics.time_series_v4_1day WHERE metric_name IN ['signoz_latency_count'] AND temporality = 'Delta' AND unix_milli >= 1650931200000 AND unix_milli < 1651078380000 AND JSONExtractString(labels, 'service_name') IN ['frontend'] AND JSONExtractString(labels, 'operation') IN ['HTTP GET /dispatch'] AND JSONExtractString(labels, 'status_code') IN ['STATUS_CODE_ERROR'] AND JSONExtractString(labels, '__temporality__') = 'Delta') as filtered_time_series USING fingerprint WHERE metric_name IN ['signoz_latency_count'] AND unix_milli >= 1650991980000 AND unix_milli <= 1651078380000 GROUP BY ts ORDER BY  ts) as A  INNER JOIN (SELECT  toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), INTERVAL 60 SECOND) as ts, sum(value)/60 as value FROM signoz_metrics.distributed_samples_v4 INNER JOIN (SELECT DISTINCT fingerprint FROM signoz_metrics.time_series_v4_1day WHERE metric_name IN ['signoz_latency_count'] AND temporality = 'Delta' AND unix_milli >= 1650931200000 AND unix_milli < 1651078380000 AND JSONExtractString(labels, 'service_name') IN ['frontend'] AND JSONExtractString(labels, 'operation') IN ['HTTP GET /dispatch'] AND JSONExtractString(labels, '__temporality__') = 'Delta') as filtered_time_series USING fingerprint WHERE metric_name IN ['signoz_latency_count'] AND unix_milli >= 1650991980000 AND unix_milli <= 1651078380000 GROUP BY ts ORDER BY  ts) as B  ON A.`ts` = B.`ts`",
		},
		{
			name: "TestQuery - Quantile",
			query: &v3.QueryRangeParamsV3{
				Start: 1650991982000,
				End:   1651078382000,
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
								{Key: "le"},
							},
						},
					},
				},
			},
			queryToTest: "A",
			expected:    "SELECT service_name,  ts, histogramQuantile(arrayMap(x -> toFloat64(x), groupArray(le)), groupArray(value), 0.950) as value FROM (SELECT service_name,le,  toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), INTERVAL 60 SECOND) as ts, sum(value)/60 as value FROM signoz_metrics.distributed_samples_v4 INNER JOIN (SELECT DISTINCT JSONExtractString(labels, 'service_name') as service_name, JSONExtractString(labels, 'le') as le, fingerprint FROM signoz_metrics.time_series_v4_1day WHERE metric_name IN ['signoz_latency_bucket'] AND temporality = 'Delta' AND unix_milli >= 1650931200000 AND unix_milli < 1651078380000) as filtered_time_series USING fingerprint WHERE metric_name IN ['signoz_latency_bucket'] AND unix_milli >= 1650991980000 AND unix_milli <= 1651078380000 GROUP BY service_name,le,ts ORDER BY service_name ASC,le ASC, ts) GROUP BY service_name,ts ORDER BY service_name ASC, ts",
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			qbOptions := QueryBuilderOptions{
				BuildMetricQuery: metricsv3.PrepareMetricQuery,
			}
			fm := featureManager.StartManager()
			qb := NewQueryBuilder(qbOptions, fm)
			queries, err := qb.PrepareQueries(c.query)

			require.NoError(t, err)
			require.Equal(t, c.expected, queries[c.queryToTest])
		})
	}
}

var testLogsWithFormula = []struct {
	Name          string
	Query         *v3.QueryRangeParamsV3
	ExpectedQuery string
}{
	{
		Name: "test formula without dot in filter and group by attribute",
		Query: &v3.QueryRangeParamsV3{
			Start: 1702979275000000000,
			End:   1702981075000000000,
			CompositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeBuilder,
				PanelType: v3.PanelTypeGraph,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:    "A",
						StepInterval: 60,
						DataSource:   v3.DataSourceLogs,
						Filters: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
							{Key: v3.AttributeKey{Key: "key_1", DataType: v3.AttributeKeyDataTypeBool, Type: v3.AttributeKeyTypeTag}, Value: true, Operator: v3.FilterOperatorEqual},
						}},
						AggregateOperator: v3.AggregateOperatorCount,
						Expression:        "A",
						OrderBy: []v3.OrderBy{
							{
								ColumnName: "timestamp",
								Order:      "desc",
							},
						},
						GroupBy: []v3.AttributeKey{
							{Key: "key_1", DataType: v3.AttributeKeyDataTypeBool, Type: v3.AttributeKeyTypeTag},
						},
					},
					"B": {
						QueryName:    "B",
						StepInterval: 60,
						DataSource:   v3.DataSourceLogs,
						Filters: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
							{Key: v3.AttributeKey{Key: "key_2", DataType: v3.AttributeKeyDataTypeBool, Type: v3.AttributeKeyTypeTag}, Value: true, Operator: v3.FilterOperatorEqual},
						}},
						AggregateOperator: v3.AggregateOperatorCount,
						Expression:        "B",
						OrderBy: []v3.OrderBy{
							{
								ColumnName: "timestamp",
								Order:      "desc",
							},
						},
						GroupBy: []v3.AttributeKey{
							{Key: "key_1", DataType: v3.AttributeKeyDataTypeBool, Type: v3.AttributeKeyTypeTag},
						},
					},
					"C": {
						QueryName:  "C",
						Expression: "A + B",
					},
				},
			},
		},
		ExpectedQuery: "SELECT A.`key_1` as `key_1`, A.`ts` as `ts`, A.value + B.value as value FROM " +
			"(SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 60 SECOND) AS ts, attributes_bool_value[indexOf(attributes_bool_key, 'key_1')] as `key_1`, toFloat64(count(*)) as value from " +
			"signoz_logs.distributed_logs where (timestamp >= 1702979275000000000 AND timestamp <= 1702981075000000000) AND attributes_bool_value[indexOf(attributes_bool_key, 'key_1')] = true AND " +
			"has(attributes_bool_key, 'key_1') group by `key_1`,ts order by value DESC) as A  INNER JOIN (SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 60 SECOND) AS ts, " +
			"attributes_bool_value[indexOf(attributes_bool_key, 'key_1')] as `key_1`, toFloat64(count(*)) as value from signoz_logs.distributed_logs where (timestamp >= 1702979275000000000 AND timestamp <= 1702981075000000000) " +
			"AND attributes_bool_value[indexOf(attributes_bool_key, 'key_2')] = true AND has(attributes_bool_key, 'key_1') group by `key_1`,ts order by value DESC) as B  ON A.`key_1` = B.`key_1` AND A.`ts` = B.`ts`",
	},
	{
		Name: "test formula with dot in filter and group by attribute",
		Query: &v3.QueryRangeParamsV3{
			Start: 1702979056000000000,
			End:   1702982656000000000,
			CompositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeBuilder,
				PanelType: v3.PanelTypeTable,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:    "A",
						StepInterval: 60,
						DataSource:   v3.DataSourceLogs,
						Filters: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
							{Key: v3.AttributeKey{Key: "key1.1", DataType: v3.AttributeKeyDataTypeBool, Type: v3.AttributeKeyTypeTag}, Value: true, Operator: v3.FilterOperatorEqual},
						}},
						AggregateOperator: v3.AggregateOperatorCount,
						Expression:        "A",
						OrderBy: []v3.OrderBy{
							{
								ColumnName: "timestamp",
								Order:      "desc",
							},
						},
						GroupBy: []v3.AttributeKey{
							{Key: "key1.1", DataType: v3.AttributeKeyDataTypeBool, Type: v3.AttributeKeyTypeTag},
						},
					},
					"B": {
						QueryName:    "B",
						StepInterval: 60,
						DataSource:   v3.DataSourceLogs,
						Filters: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
							{Key: v3.AttributeKey{Key: "key1.2", DataType: v3.AttributeKeyDataTypeBool, Type: v3.AttributeKeyTypeTag}, Value: true, Operator: v3.FilterOperatorEqual},
						}},
						AggregateOperator: v3.AggregateOperatorCount,
						Expression:        "B",
						OrderBy: []v3.OrderBy{
							{
								ColumnName: "timestamp",
								Order:      "desc",
							},
						},
						GroupBy: []v3.AttributeKey{
							{Key: "key1.1", DataType: v3.AttributeKeyDataTypeBool, Type: v3.AttributeKeyTypeTag},
						},
					},
					"C": {
						QueryName:  "C",
						Expression: "A + B",
					},
				},
			},
		},
		ExpectedQuery: "SELECT A.`key1.1` as `key1.1`, A.value + B.value as value FROM (SELECT now() as ts, attributes_bool_value[indexOf(attributes_bool_key, 'key1.1')] as `key1.1`, " +
			"toFloat64(count(*)) as value from signoz_logs.distributed_logs where (timestamp >= 1702979056000000000 AND timestamp <= 1702982656000000000) AND attributes_bool_value[indexOf(attributes_bool_key, 'key1.1')] = true AND " +
			"has(attributes_bool_key, 'key1.1') group by `key1.1` order by value DESC) as A  INNER JOIN (SELECT now() as ts, attributes_bool_value[indexOf(attributes_bool_key, 'key1.1')] as `key1.1`, " +
			"toFloat64(count(*)) as value from signoz_logs.distributed_logs where (timestamp >= 1702979056000000000 AND timestamp <= 1702982656000000000) AND attributes_bool_value[indexOf(attributes_bool_key, 'key1.2')] = true AND " +
			"has(attributes_bool_key, 'key1.1') group by `key1.1` order by value DESC) as B  ON A.`key1.1` = B.`key1.1`",
	},
	{
		Name: "test formula with dot in filter and group by materialized attribute",
		Query: &v3.QueryRangeParamsV3{
			Start: 1702980884000000000,
			End:   1702984484000000000,
			CompositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeBuilder,
				PanelType: v3.PanelTypeGraph,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:    "A",
						StepInterval: 60,
						DataSource:   v3.DataSourceLogs,
						Filters: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
							{Key: v3.AttributeKey{Key: "key_2", DataType: v3.AttributeKeyDataTypeBool, Type: v3.AttributeKeyTypeTag, IsColumn: true}, Value: true, Operator: v3.FilterOperatorEqual},
						}},
						AggregateOperator: v3.AggregateOperatorCount,
						Expression:        "A",
						OrderBy: []v3.OrderBy{
							{
								ColumnName: "timestamp",
								Order:      "desc",
							},
						},
						GroupBy: []v3.AttributeKey{
							{Key: "key1.1", DataType: v3.AttributeKeyDataTypeBool, Type: v3.AttributeKeyTypeTag, IsColumn: true},
						},
					},
					"B": {
						QueryName:    "B",
						StepInterval: 60,
						DataSource:   v3.DataSourceLogs,
						Filters: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
							{Key: v3.AttributeKey{Key: "key_1", DataType: v3.AttributeKeyDataTypeBool, Type: v3.AttributeKeyTypeTag}, Value: true, Operator: v3.FilterOperatorEqual},
						}},
						AggregateOperator: v3.AggregateOperatorCount,
						Expression:        "B",
						OrderBy: []v3.OrderBy{
							{
								ColumnName: "timestamp",
								Order:      "desc",
							},
						},
						GroupBy: []v3.AttributeKey{
							{Key: "key1.1", DataType: v3.AttributeKeyDataTypeBool, Type: v3.AttributeKeyTypeTag, IsColumn: true},
						},
					},
					"C": {
						QueryName:  "C",
						Expression: "A - B",
					},
				},
			},
		},
		ExpectedQuery: "SELECT A.`key1.1` as `key1.1`, A.`ts` as `ts`, A.value - B.value as value FROM (SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 60 SECOND) AS ts, " +
			"`attribute_bool_key1$$1` as `key1.1`, toFloat64(count(*)) as value from signoz_logs.distributed_logs where (timestamp >= 1702980884000000000 AND timestamp <= 1702984484000000000) AND " +
			"`attribute_bool_key_2` = true AND `attribute_bool_key1$$1_exists`=true group by `key1.1`,ts order by value DESC) as A  INNER JOIN (SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), " +
			"INTERVAL 60 SECOND) AS ts, `attribute_bool_key1$$1` as `key1.1`, toFloat64(count(*)) as value from signoz_logs.distributed_logs where (timestamp >= 1702980884000000000 AND " +
			"timestamp <= 1702984484000000000) AND attributes_bool_value[indexOf(attributes_bool_key, 'key_1')] = true AND `attribute_bool_key1$$1_exists`=true group by `key1.1`,ts order by value DESC) as B  " +
			"ON A.`key1.1` = B.`key1.1` AND A.`ts` = B.`ts`",
	},
}

func TestLogsQueryWithFormula(t *testing.T) {
	t.Parallel()

	qbOptions := QueryBuilderOptions{
		BuildLogQuery: logsV3.PrepareLogsQuery,
	}
	fm := featureManager.StartManager()
	qb := NewQueryBuilder(qbOptions, fm)

	for _, test := range testLogsWithFormula {
		t.Run(test.Name, func(t *testing.T) {
			queries, err := qb.PrepareQueries(test.Query)
			require.NoError(t, err)
			require.Equal(t, test.ExpectedQuery, queries["C"])
		})
	}

}

var testLogsWithFormulaV2 = []struct {
	Name          string
	Query         *v3.QueryRangeParamsV3
	ExpectedQuery string
}{
	{
		Name: "test formula without dot in filter and group by attribute",
		Query: &v3.QueryRangeParamsV3{
			Start: 1702979275000000000,
			End:   1702981075000000000,
			CompositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeBuilder,
				PanelType: v3.PanelTypeGraph,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:    "A",
						StepInterval: 60,
						DataSource:   v3.DataSourceLogs,
						Filters: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
							{Key: v3.AttributeKey{Key: "key_1", DataType: v3.AttributeKeyDataTypeBool, Type: v3.AttributeKeyTypeTag}, Value: true, Operator: v3.FilterOperatorEqual},
						}},
						AggregateOperator: v3.AggregateOperatorCount,
						Expression:        "A",
						OrderBy: []v3.OrderBy{
							{
								ColumnName: "timestamp",
								Order:      "desc",
							},
						},
						GroupBy: []v3.AttributeKey{
							{Key: "key_1", DataType: v3.AttributeKeyDataTypeBool, Type: v3.AttributeKeyTypeTag},
						},
					},
					"B": {
						QueryName:    "B",
						StepInterval: 60,
						DataSource:   v3.DataSourceLogs,
						Filters: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
							{Key: v3.AttributeKey{Key: "key_2", DataType: v3.AttributeKeyDataTypeBool, Type: v3.AttributeKeyTypeTag}, Value: true, Operator: v3.FilterOperatorEqual},
						}},
						AggregateOperator: v3.AggregateOperatorCount,
						Expression:        "B",
						OrderBy: []v3.OrderBy{
							{
								ColumnName: "timestamp",
								Order:      "desc",
							},
						},
						GroupBy: []v3.AttributeKey{
							{Key: "key_1", DataType: v3.AttributeKeyDataTypeBool, Type: v3.AttributeKeyTypeTag},
						},
					},
					"C": {
						QueryName:  "C",
						Expression: "A + B",
					},
				},
			},
		},
		ExpectedQuery: "SELECT A.`key_1` as `key_1`, A.`ts` as `ts`, A.value + B.value as value FROM " +
			"(SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 60 SECOND) AS ts, attributes_bool['key_1'] as `key_1`, toFloat64(count(*)) as value from " +
			"signoz_logs.distributed_logs_v2 where (timestamp >= 1702979275000000000 AND timestamp <= 1702981075000000000) AND (ts_bucket_start >= 1702977475 AND ts_bucket_start <= 1702981075) " +
			"AND attributes_bool['key_1'] = true AND mapContains(attributes_bool, 'key_1') AND mapContains(attributes_bool, 'key_1') group by `key_1`,ts order by value DESC) as A  INNER JOIN (SELECT " +
			"toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 60 SECOND) AS ts, attributes_bool['key_1'] as `key_1`, toFloat64(count(*)) as value " +
			"from signoz_logs.distributed_logs_v2 where (timestamp >= 1702979275000000000 AND timestamp <= 1702981075000000000) AND (ts_bucket_start >= 1702977475 AND ts_bucket_start <= 1702981075) " +
			"AND attributes_bool['key_2'] = true AND mapContains(attributes_bool, 'key_2') AND mapContains(attributes_bool, 'key_1') group by `key_1`,ts order by value DESC) as B  ON A.`key_1` = B.`key_1` AND A.`ts` = B.`ts`",
	},
	{
		Name: "test formula with dot in filter and group by attribute",
		Query: &v3.QueryRangeParamsV3{
			Start: 1702979056000000000,
			End:   1702982656000000000,
			CompositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeBuilder,
				PanelType: v3.PanelTypeTable,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:    "A",
						StepInterval: 60,
						DataSource:   v3.DataSourceLogs,
						Filters: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
							{Key: v3.AttributeKey{Key: "key1.1", DataType: v3.AttributeKeyDataTypeBool, Type: v3.AttributeKeyTypeTag}, Value: true, Operator: v3.FilterOperatorEqual},
						}},
						AggregateOperator: v3.AggregateOperatorCount,
						Expression:        "A",
						OrderBy: []v3.OrderBy{
							{
								ColumnName: "timestamp",
								Order:      "desc",
							},
						},
						GroupBy: []v3.AttributeKey{
							{Key: "key1.1", DataType: v3.AttributeKeyDataTypeBool, Type: v3.AttributeKeyTypeTag},
						},
					},
					"B": {
						QueryName:    "B",
						StepInterval: 60,
						DataSource:   v3.DataSourceLogs,
						Filters: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
							{Key: v3.AttributeKey{Key: "key1.2", DataType: v3.AttributeKeyDataTypeBool, Type: v3.AttributeKeyTypeTag}, Value: true, Operator: v3.FilterOperatorEqual},
						}},
						AggregateOperator: v3.AggregateOperatorCount,
						Expression:        "B",
						OrderBy: []v3.OrderBy{
							{
								ColumnName: "timestamp",
								Order:      "desc",
							},
						},
						GroupBy: []v3.AttributeKey{
							{Key: "key1.1", DataType: v3.AttributeKeyDataTypeBool, Type: v3.AttributeKeyTypeTag},
						},
					},
					"C": {
						QueryName:  "C",
						Expression: "A + B",
					},
				},
			},
		},
		ExpectedQuery: "SELECT A.`key1.1` as `key1.1`, A.value + B.value as value FROM (SELECT attributes_bool['key1.1'] as `key1.1`, " +
			"toFloat64(count(*)) as value from signoz_logs.distributed_logs_v2 where (timestamp >= 1702979056000000000 AND timestamp <= 1702982656000000000) AND (ts_bucket_start >= 1702977256 AND ts_bucket_start <= 1702982656) " +
			"AND attributes_bool['key1.1'] = true AND mapContains(attributes_bool, 'key1.1') AND mapContains(attributes_bool, 'key1.1') group by `key1.1` order by value DESC) as A  INNER JOIN (SELECT " +
			"attributes_bool['key1.1'] as `key1.1`, toFloat64(count(*)) as value from signoz_logs.distributed_logs_v2 where (timestamp >= 1702979056000000000 AND timestamp <= 1702982656000000000) " +
			"AND (ts_bucket_start >= 1702977256 AND ts_bucket_start <= 1702982656) AND attributes_bool['key1.2'] = true AND mapContains(attributes_bool, 'key1.2') AND " +
			"mapContains(attributes_bool, 'key1.1') group by `key1.1` order by value DESC) as B  ON A.`key1.1` = B.`key1.1`",
	},
	{
		Name: "test formula with dot in filter and group by materialized attribute",
		Query: &v3.QueryRangeParamsV3{
			Start: 1702980884000000000,
			End:   1702984484000000000,
			CompositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeBuilder,
				PanelType: v3.PanelTypeGraph,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:    "A",
						StepInterval: 60,
						DataSource:   v3.DataSourceLogs,
						Filters: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
							{Key: v3.AttributeKey{Key: "key_2", DataType: v3.AttributeKeyDataTypeBool, Type: v3.AttributeKeyTypeTag, IsColumn: true}, Value: true, Operator: v3.FilterOperatorEqual},
						}},
						AggregateOperator: v3.AggregateOperatorCount,
						Expression:        "A",
						OrderBy: []v3.OrderBy{
							{
								ColumnName: "timestamp",
								Order:      "desc",
							},
						},
						GroupBy: []v3.AttributeKey{
							{Key: "key1.1", DataType: v3.AttributeKeyDataTypeBool, Type: v3.AttributeKeyTypeTag, IsColumn: true},
						},
					},
					"B": {
						QueryName:    "B",
						StepInterval: 60,
						DataSource:   v3.DataSourceLogs,
						Filters: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
							{Key: v3.AttributeKey{Key: "key_1", DataType: v3.AttributeKeyDataTypeBool, Type: v3.AttributeKeyTypeTag}, Value: true, Operator: v3.FilterOperatorEqual},
						}},
						AggregateOperator: v3.AggregateOperatorCount,
						Expression:        "B",
						OrderBy: []v3.OrderBy{
							{
								ColumnName: "timestamp",
								Order:      "desc",
							},
						},
						GroupBy: []v3.AttributeKey{
							{Key: "key1.1", DataType: v3.AttributeKeyDataTypeBool, Type: v3.AttributeKeyTypeTag, IsColumn: true},
						},
					},
					"C": {
						QueryName:  "C",
						Expression: "A - B",
					},
				},
			},
		},
		ExpectedQuery: "SELECT A.`key1.1` as `key1.1`, A.`ts` as `ts`, A.value - B.value as value FROM (SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 60 SECOND) AS ts, " +
			"`attribute_bool_key1$$1` as `key1.1`, toFloat64(count(*)) as value from signoz_logs.distributed_logs_v2 where (timestamp >= 1702980884000000000 AND timestamp <= 1702984484000000000) AND " +
			"(ts_bucket_start >= 1702979084 AND ts_bucket_start <= 1702984484) AND `attribute_bool_key_2` = true AND `attribute_bool_key1$$1_exists`=true group by `key1.1`,ts order by value DESC) as " +
			"A  INNER JOIN (SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 60 SECOND) AS ts, `attribute_bool_key1$$1` as `key1.1`, toFloat64(count(*)) as value from " +
			"signoz_logs.distributed_logs_v2 where (timestamp >= 1702980884000000000 AND timestamp <= 1702984484000000000) AND (ts_bucket_start >= 1702979084 AND ts_bucket_start <= 1702984484) AND " +
			"attributes_bool['key_1'] = true AND mapContains(attributes_bool, 'key_1') AND `attribute_bool_key1$$1_exists`=true group by `key1.1`,ts order by value DESC) as B  " +
			"ON A.`key1.1` = B.`key1.1` AND A.`ts` = B.`ts`",
	},
}

func TestLogsQueryWithFormulaV2(t *testing.T) {
	t.Parallel()

	qbOptions := QueryBuilderOptions{
		BuildLogQuery: logsV4.PrepareLogsQuery,
	}
	fm := featureManager.StartManager()
	qb := NewQueryBuilder(qbOptions, fm)

	for _, test := range testLogsWithFormulaV2 {
		t.Run(test.Name, func(t *testing.T) {
			queries, err := qb.PrepareQueries(test.Query)
			require.NoError(t, err)
			require.Equal(t, test.ExpectedQuery, queries["C"])
		})
	}

}

func TestGenerateCacheKeysMetricsBuilder(t *testing.T) {
	testCases := []struct {
		name              string
		query             *v3.QueryRangeParamsV3
		expectedCacheKeys map[string]string
	}{
		// v3 - only the graph builder queries can be cached
		{
			name: "version=v3;panelType=graph;dataSource=metrics;queryType=builder",
			query: &v3.QueryRangeParamsV3{
				Version: "v3",
				CompositeQuery: &v3.CompositeQuery{
					PanelType: v3.PanelTypeGraph,
					QueryType: v3.QueryTypeBuilder,
					BuilderQueries: map[string]*v3.BuilderQuery{
						"A": {
							QueryName:          "A",
							StepInterval:       60,
							DataSource:         v3.DataSourceMetrics,
							AggregateOperator:  v3.AggregateOperatorSumRate,
							AggregateAttribute: v3.AttributeKey{Key: "signoz_latency_bucket"},
							Temporality:        v3.Delta,
							Filters: &v3.FilterSet{
								Operator: "AND",
								Items: []v3.FilterItem{
									{Key: v3.AttributeKey{Key: "service_name"}, Value: "A", Operator: v3.FilterOperatorEqual},
								},
							},
							GroupBy: []v3.AttributeKey{
								{Key: "service_name"},
								{Key: "le"},
							},
							Expression: "A",
							OrderBy: []v3.OrderBy{
								{ColumnName: constants.SigNozOrderByValue, Order: "desc"},
							},
							Having: []v3.Having{
								{
									ColumnName: "value",
									Operator:   v3.HavingOperatorGreaterThan,
									Value:      100,
								},
							},
						},
					},
				},
			},
			expectedCacheKeys: map[string]string{
				"A": "source=metrics&step=60&aggregate=sum_rate&timeAggregation=&spaceAggregation=&aggregateAttribute=signoz_latency_bucket---false&filter-0=key:service_name---false,op:=,value:A&groupBy-0=service_name---false&groupBy-1=le---false&having-0=column:value,op:>,value:100",
			},
		},
		{
			name: "version=v3;panelType=graph;dataSource=metrics;queryType=builder with limit", // limit should not be part of the cache key
			query: &v3.QueryRangeParamsV3{
				Version: "v3",
				CompositeQuery: &v3.CompositeQuery{
					PanelType: v3.PanelTypeGraph,
					QueryType: v3.QueryTypeBuilder,
					BuilderQueries: map[string]*v3.BuilderQuery{
						"A": {
							QueryName:          "A",
							StepInterval:       60,
							DataSource:         v3.DataSourceMetrics,
							AggregateOperator:  v3.AggregateOperatorSumRate,
							AggregateAttribute: v3.AttributeKey{Key: "signoz_latency_bucket"},
							Temporality:        v3.Delta,
							Filters: &v3.FilterSet{
								Operator: "AND",
								Items: []v3.FilterItem{
									{Key: v3.AttributeKey{Key: "service_name"}, Value: "A", Operator: v3.FilterOperatorEqual},
								},
							},
							GroupBy: []v3.AttributeKey{
								{Key: "service_name"},
								{Key: "le"},
							},
							Expression: "A",
							OrderBy: []v3.OrderBy{
								{ColumnName: constants.SigNozOrderByValue, Order: "desc"},
							},
							Having: []v3.Having{
								{
									ColumnName: "value",
									Operator:   v3.HavingOperatorGreaterThan,
									Value:      100,
								},
							},
							Limit: 10,
						},
					},
				},
			},
			expectedCacheKeys: map[string]string{
				"A": "source=metrics&step=60&aggregate=sum_rate&timeAggregation=&spaceAggregation=&aggregateAttribute=signoz_latency_bucket---false&filter-0=key:service_name---false,op:=,value:A&groupBy-0=service_name---false&groupBy-1=le---false&having-0=column:value,op:>,value:100",
			},
		},
		{
			name: "version=v3;panelType=graph;dataSource=metrics;queryType=builder with shiftBy", // shiftBy should be part of the cache key
			query: &v3.QueryRangeParamsV3{
				Version: "v3",
				CompositeQuery: &v3.CompositeQuery{
					PanelType: v3.PanelTypeGraph,
					QueryType: v3.QueryTypeBuilder,
					BuilderQueries: map[string]*v3.BuilderQuery{
						"A": {
							QueryName:          "A",
							StepInterval:       60,
							DataSource:         v3.DataSourceMetrics,
							AggregateOperator:  v3.AggregateOperatorSumRate,
							AggregateAttribute: v3.AttributeKey{Key: "signoz_latency_bucket"},
							Temporality:        v3.Delta,
							Filters: &v3.FilterSet{
								Operator: "AND",
								Items: []v3.FilterItem{
									{Key: v3.AttributeKey{Key: "service_name"}, Value: "A", Operator: v3.FilterOperatorEqual},
								},
							},
							GroupBy: []v3.AttributeKey{
								{Key: "service_name"},
								{Key: "le"},
							},
							Expression: "A",
							OrderBy: []v3.OrderBy{
								{ColumnName: constants.SigNozOrderByValue, Order: "desc"},
							},
							Having: []v3.Having{
								{
									ColumnName: "value",
									Operator:   v3.HavingOperatorGreaterThan,
									Value:      100,
								},
							},
							Limit:   10,
							ShiftBy: 86400,
						},
					},
				},
			},
			expectedCacheKeys: map[string]string{
				"A": "source=metrics&step=60&aggregate=sum_rate&timeAggregation=&spaceAggregation=&shiftBy=86400&aggregateAttribute=signoz_latency_bucket---false&filter-0=key:service_name---false,op:=,value:A&groupBy-0=service_name---false&groupBy-1=le---false&having-0=column:value,op:>,value:100",
			},
		},
		{
			name: "version=v3;panelType=value;dataSource=metrics;queryType=builder",
			query: &v3.QueryRangeParamsV3{
				Version: "v3",
				CompositeQuery: &v3.CompositeQuery{
					PanelType: v3.PanelTypeValue,
					QueryType: v3.QueryTypeBuilder,
					BuilderQueries: map[string]*v3.BuilderQuery{
						"A": {
							QueryName:          "A",
							StepInterval:       60,
							DataSource:         v3.DataSourceMetrics,
							AggregateOperator:  v3.AggregateOperatorSumRate,
							Expression:         "A",
							AggregateAttribute: v3.AttributeKey{Key: "signoz_latency_bucket"},
							Temporality:        v3.Delta,
							Filters: &v3.FilterSet{
								Operator: "AND",
								Items: []v3.FilterItem{
									{Key: v3.AttributeKey{Key: "service_name"}, Value: "A", Operator: v3.FilterOperatorEqual},
								},
							},
							GroupBy: []v3.AttributeKey{
								{Key: "service_name"},
								{Key: "le"},
							},
							OrderBy: []v3.OrderBy{
								{ColumnName: constants.SigNozOrderByValue, Order: "desc"},
							},
							Having: []v3.Having{
								{
									ColumnName: "value",
									Operator:   v3.HavingOperatorGreaterThan,
									Value:      100,
								},
							},
							ReduceTo: v3.ReduceToOperatorAvg,
						},
					},
				},
			},
			expectedCacheKeys: map[string]string{},
		},
		{
			name: "version=v3;panelType=table;dataSource=metrics;queryType=builder",
			query: &v3.QueryRangeParamsV3{
				Version: "v3",
				CompositeQuery: &v3.CompositeQuery{
					PanelType: v3.PanelTypeTable,
					QueryType: v3.QueryTypeBuilder,
					BuilderQueries: map[string]*v3.BuilderQuery{
						"A": {
							QueryName:          "A",
							StepInterval:       60,
							DataSource:         v3.DataSourceMetrics,
							AggregateOperator:  v3.AggregateOperatorSumRate,
							Expression:         "A",
							AggregateAttribute: v3.AttributeKey{Key: "signoz_latency_bucket"},
							Temporality:        v3.Delta,
							Filters: &v3.FilterSet{
								Operator: "AND",
								Items: []v3.FilterItem{
									{Key: v3.AttributeKey{Key: "service_name"}, Value: "A", Operator: v3.FilterOperatorEqual},
								},
							},
							GroupBy: []v3.AttributeKey{
								{Key: "service_name"},
								{Key: "le"},
							},
							OrderBy: []v3.OrderBy{
								{ColumnName: constants.SigNozOrderByValue, Order: "desc"},
							},
							Having: []v3.Having{
								{
									ColumnName: "value",
									Operator:   v3.HavingOperatorGreaterThan,
									Value:      100,
								},
							},
						},
					},
				},
			},
			expectedCacheKeys: map[string]string{},
		},

		// v4 - everything can be cached
		{
			name: "version=v4;panelType=graph;dataSource=metrics;queryType=builder",
			query: &v3.QueryRangeParamsV3{
				Version: "v4",
				CompositeQuery: &v3.CompositeQuery{
					PanelType: v3.PanelTypeGraph,
					QueryType: v3.QueryTypeBuilder,
					BuilderQueries: map[string]*v3.BuilderQuery{
						"A": {
							QueryName:          "A",
							StepInterval:       60,
							DataSource:         v3.DataSourceMetrics,
							AggregateOperator:  v3.AggregateOperatorSumRate,
							AggregateAttribute: v3.AttributeKey{Key: "signoz_latency_bucket"},
							Temporality:        v3.Delta,
							Filters: &v3.FilterSet{
								Operator: "AND",
								Items: []v3.FilterItem{
									{Key: v3.AttributeKey{Key: "service_name"}, Value: "A", Operator: v3.FilterOperatorEqual},
								},
							},
							GroupBy: []v3.AttributeKey{
								{Key: "service_name"},
								{Key: "le"},
							},
							Expression: "A",
							OrderBy: []v3.OrderBy{
								{ColumnName: constants.SigNozOrderByValue, Order: "desc"},
							},
							Having: []v3.Having{
								{
									ColumnName: "value",
									Operator:   v3.HavingOperatorGreaterThan,
									Value:      100,
								},
							},
						},
					},
				},
			},
			expectedCacheKeys: map[string]string{
				"A": "source=metrics&step=60&aggregate=sum_rate&timeAggregation=&spaceAggregation=&aggregateAttribute=signoz_latency_bucket---false&filter-0=key:service_name---false,op:=,value:A&groupBy-0=service_name---false&groupBy-1=le---false&having-0=column:value,op:>,value:100",
			},
		},
		{
			name: "version=v4;panelType=graph;dataSource=metrics;queryType=builder with limit", // limit should not be part of the cache key
			query: &v3.QueryRangeParamsV3{
				Version: "v4",
				CompositeQuery: &v3.CompositeQuery{
					PanelType: v3.PanelTypeGraph,
					QueryType: v3.QueryTypeBuilder,
					BuilderQueries: map[string]*v3.BuilderQuery{
						"A": {
							QueryName:          "A",
							StepInterval:       60,
							DataSource:         v3.DataSourceMetrics,
							AggregateOperator:  v3.AggregateOperatorSumRate,
							AggregateAttribute: v3.AttributeKey{Key: "signoz_latency_bucket"},
							Temporality:        v3.Delta,
							Filters: &v3.FilterSet{
								Operator: "AND",
								Items: []v3.FilterItem{
									{Key: v3.AttributeKey{Key: "service_name"}, Value: "A", Operator: v3.FilterOperatorEqual},
								},
							},
							GroupBy: []v3.AttributeKey{
								{Key: "service_name"},
								{Key: "le"},
							},
							Expression: "A",
							OrderBy: []v3.OrderBy{
								{ColumnName: constants.SigNozOrderByValue, Order: "desc"},
							},
							Having: []v3.Having{
								{
									ColumnName: "value",
									Operator:   v3.HavingOperatorGreaterThan,
									Value:      100,
								},
							},
							Limit: 10,
						},
					},
				},
			},
			expectedCacheKeys: map[string]string{
				"A": "source=metrics&step=60&aggregate=sum_rate&timeAggregation=&spaceAggregation=&aggregateAttribute=signoz_latency_bucket---false&filter-0=key:service_name---false,op:=,value:A&groupBy-0=service_name---false&groupBy-1=le---false&having-0=column:value,op:>,value:100",
			},
		},
		{
			name: "version=v4;panelType=graph;dataSource=metrics;queryType=builder with shiftBy", // shiftBy should be part of the cache key
			query: &v3.QueryRangeParamsV3{
				Version: "v4",
				CompositeQuery: &v3.CompositeQuery{
					PanelType: v3.PanelTypeGraph,
					QueryType: v3.QueryTypeBuilder,
					BuilderQueries: map[string]*v3.BuilderQuery{
						"A": {
							QueryName:          "A",
							StepInterval:       60,
							DataSource:         v3.DataSourceMetrics,
							AggregateOperator:  v3.AggregateOperatorSumRate,
							AggregateAttribute: v3.AttributeKey{Key: "signoz_latency_bucket"},
							Temporality:        v3.Delta,
							Filters: &v3.FilterSet{
								Operator: "AND",
								Items: []v3.FilterItem{
									{Key: v3.AttributeKey{Key: "service_name"}, Value: "A", Operator: v3.FilterOperatorEqual},
								},
							},
							GroupBy: []v3.AttributeKey{
								{Key: "service_name"},
								{Key: "le"},
							},
							Expression: "A",
							OrderBy: []v3.OrderBy{
								{ColumnName: constants.SigNozOrderByValue, Order: "desc"},
							},
							Having: []v3.Having{
								{
									ColumnName: "value",
									Operator:   v3.HavingOperatorGreaterThan,
									Value:      100,
								},
							},
							Limit:   10,
							ShiftBy: 86400,
						},
					},
				},
			},
			expectedCacheKeys: map[string]string{
				"A": "source=metrics&step=60&aggregate=sum_rate&timeAggregation=&spaceAggregation=&shiftBy=86400&aggregateAttribute=signoz_latency_bucket---false&filter-0=key:service_name---false,op:=,value:A&groupBy-0=service_name---false&groupBy-1=le---false&having-0=column:value,op:>,value:100",
			},
		},
		{
			name: "version=v4;panelType=value;dataSource=metrics;queryType=builder",
			query: &v3.QueryRangeParamsV3{
				Version: "v4",
				CompositeQuery: &v3.CompositeQuery{
					PanelType: v3.PanelTypeValue,
					QueryType: v3.QueryTypeBuilder,
					BuilderQueries: map[string]*v3.BuilderQuery{
						"A": {
							QueryName:            "A",
							StepInterval:         60,
							DataSource:           v3.DataSourceMetrics,
							AggregateOperator:    v3.AggregateOperatorSumRate,
							SecondaryAggregation: v3.SecondaryAggregationMax,
							Expression:           "A",
							AggregateAttribute:   v3.AttributeKey{Key: "signoz_latency_bucket"},
							Temporality:          v3.Delta,
							Filters: &v3.FilterSet{
								Operator: "AND",
								Items: []v3.FilterItem{
									{Key: v3.AttributeKey{Key: "service_name"}, Value: "A", Operator: v3.FilterOperatorEqual},
								},
							},
							GroupBy: []v3.AttributeKey{
								{Key: "service_name"},
								{Key: "le"},
							},
							OrderBy: []v3.OrderBy{
								{ColumnName: constants.SigNozOrderByValue, Order: "desc"},
							},
							Having: []v3.Having{
								{
									ColumnName: "value",
									Operator:   v3.HavingOperatorGreaterThan,
									Value:      100,
								},
							},
							ReduceTo: v3.ReduceToOperatorAvg,
						},
					},
				},
			},
			expectedCacheKeys: map[string]string{
				"A": "source=metrics&step=60&aggregate=sum_rate&timeAggregation=&spaceAggregation=&aggregateAttribute=signoz_latency_bucket---false&filter-0=key:service_name---false,op:=,value:A&groupBy-0=service_name---false&groupBy-1=le---false&secondaryAggregation=max&having-0=column:value,op:>,value:100",
			},
		},
		{
			name: "version=v3;panelType=value;dataSource=metrics;queryType=builder with expression", //not caching panel type value for v3
			query: &v3.QueryRangeParamsV3{
				Version: "v3",
				CompositeQuery: &v3.CompositeQuery{
					QueryType: v3.QueryTypeBuilder,
					PanelType: v3.PanelTypeValue,
					FillGaps:  false,
					BuilderQueries: map[string]*v3.BuilderQuery{
						"A": {
							QueryName:         "A",
							DataSource:        v3.DataSourceMetrics,
							AggregateOperator: v3.AggregateOperatorNoOp,
							AggregateAttribute: v3.AttributeKey{
								Key:      "system_memory_usage",
								DataType: v3.AttributeKeyDataTypeFloat64,
								Type:     v3.AttributeKeyType("Gauge"),
								IsColumn: true,
							},
							TimeAggregation:  v3.TimeAggregationUnspecified,
							SpaceAggregation: v3.SpaceAggregationSum,
							Filters: &v3.FilterSet{
								Operator: "AND",
								Items: []v3.FilterItem{
									{
										Key: v3.AttributeKey{
											Key:      "state",
											DataType: v3.AttributeKeyDataTypeString,
											Type:     v3.AttributeKeyTypeTag,
											IsColumn: false,
										},
										Operator: v3.FilterOperatorEqual,
										Value:    "cached",
									},
								},
							},
							Expression:   "A",
							Disabled:     true,
							StepInterval: 60,
						},
						"B": {
							QueryName:         "B",
							DataSource:        v3.DataSourceMetrics,
							AggregateOperator: v3.AggregateOperatorNoOp,
							AggregateAttribute: v3.AttributeKey{
								Key:      "system_memory_usage",
								DataType: v3.AttributeKeyDataTypeFloat64,
								Type:     v3.AttributeKeyType("Gauge"),
								IsColumn: true,
							},
							TimeAggregation:  v3.TimeAggregationUnspecified,
							SpaceAggregation: v3.SpaceAggregationSum,
							Filters: &v3.FilterSet{
								Operator: "AND",
								Items: []v3.FilterItem{
									{
										Key: v3.AttributeKey{
											Key:      "state",
											DataType: v3.AttributeKeyDataTypeString,
											Type:     v3.AttributeKeyTypeTag,
											IsColumn: false,
										},
										Operator: v3.FilterOperatorEqual,
										Value:    "cached",
									},
								},
							},
							Expression:   "B",
							Disabled:     true,
							StepInterval: 60,
						},
						"F1": {
							QueryName:  "F1",
							Expression: "A+B",
							Disabled:   false,
						},
					},
				},
			},
			expectedCacheKeys: map[string]string{},
		},
		{
			name: "version=v4;panelType=table;dataSource=metrics;queryType=builder",
			query: &v3.QueryRangeParamsV3{
				Version: "v4",
				CompositeQuery: &v3.CompositeQuery{
					PanelType: v3.PanelTypeTable,
					QueryType: v3.QueryTypeBuilder,
					BuilderQueries: map[string]*v3.BuilderQuery{
						"A": {
							QueryName:          "A",
							StepInterval:       60,
							DataSource:         v3.DataSourceMetrics,
							AggregateOperator:  v3.AggregateOperatorSumRate,
							Expression:         "A",
							AggregateAttribute: v3.AttributeKey{Key: "signoz_latency_bucket"},
							Temporality:        v3.Delta,
							Filters: &v3.FilterSet{
								Operator: "AND",
								Items: []v3.FilterItem{
									{Key: v3.AttributeKey{Key: "service_name"}, Value: "A", Operator: v3.FilterOperatorEqual},
								},
							},
							GroupBy: []v3.AttributeKey{
								{Key: "service_name"},
								{Key: "le"},
							},
							OrderBy: []v3.OrderBy{
								{ColumnName: constants.SigNozOrderByValue, Order: "desc"},
							},
							Having: []v3.Having{
								{
									ColumnName: "value",
									Operator:   v3.HavingOperatorGreaterThan,
									Value:      100,
								},
							},
						},
					},
				},
			},
			expectedCacheKeys: map[string]string{
				"A": "source=metrics&step=60&aggregate=sum_rate&timeAggregation=&spaceAggregation=&aggregateAttribute=signoz_latency_bucket---false&filter-0=key:service_name---false,op:=,value:A&groupBy-0=service_name---false&groupBy-1=le---false&having-0=column:value,op:>,value:100",
			},
		},
	}

	keyGen := NewKeyGenerator()

	for _, test := range testCases {
		t.Run(test.name, func(t *testing.T) {
			cacheKeys := keyGen.GenerateKeys(test.query)
			require.Equal(t, test.expectedCacheKeys, cacheKeys)
		})
	}
}

func TestGenerateCacheKeysLogs(t *testing.T) {
	testCases := []struct {
		name              string
		query             *v3.QueryRangeParamsV3
		expectedCacheKeys map[string]string
	}{
		{
			name: "panelType=graph;dataSource=logs;queryType=builder",
			query: &v3.QueryRangeParamsV3{
				CompositeQuery: &v3.CompositeQuery{
					PanelType: v3.PanelTypeGraph,
					QueryType: v3.QueryTypeBuilder,
					BuilderQueries: map[string]*v3.BuilderQuery{
						"A": {
							QueryName:          "A",
							StepInterval:       60,
							DataSource:         v3.DataSourceLogs,
							AggregateOperator:  v3.AggregateOperatorCount,
							AggregateAttribute: v3.AttributeKey{Key: "log_level"},
							Filters: &v3.FilterSet{
								Operator: "AND",
								Items: []v3.FilterItem{
									{Key: v3.AttributeKey{Key: "service_name"}, Value: "A", Operator: v3.FilterOperatorEqual},
								},
							},
							GroupBy: []v3.AttributeKey{
								{Key: "service_name"},
								{Key: "log_level"},
							},
							Expression: "A",
							Having: []v3.Having{
								{
									ColumnName: "value",
									Operator:   v3.HavingOperatorGreaterThan,
									Value:      100,
								},
							},
							OrderBy: []v3.OrderBy{
								{ColumnName: constants.SigNozOrderByValue, Order: "desc"},
							},
						},
					},
				},
			},
			expectedCacheKeys: map[string]string{
				"A": "source=logs&step=60&aggregate=count&limit=0&aggregateAttribute=log_level---false&filter-0=key:service_name---false,op:=,value:A&groupBy-0=service_name---false&groupBy-1=log_level---false&orderBy-0=#SIGNOZ_VALUE-desc&having-0=column:value,op:>,value:100",
			},
		},
		{
			name: "panelType=table;dataSource=logs;queryType=builder",
			query: &v3.QueryRangeParamsV3{
				CompositeQuery: &v3.CompositeQuery{
					PanelType: v3.PanelTypeTable,
					QueryType: v3.QueryTypeBuilder,
					BuilderQueries: map[string]*v3.BuilderQuery{
						"A": {
							QueryName:          "A",
							StepInterval:       60,
							DataSource:         v3.DataSourceLogs,
							AggregateOperator:  v3.AggregateOperatorCount,
							AggregateAttribute: v3.AttributeKey{Key: "log_level"},
							Filters: &v3.FilterSet{
								Operator: "AND",
								Items: []v3.FilterItem{
									{Key: v3.AttributeKey{Key: "service_name"}, Value: "A", Operator: v3.FilterOperatorEqual},
								},
							},
							GroupBy: []v3.AttributeKey{
								{Key: "service_name"},
								{Key: "log_level"},
							},
							Expression: "A",
							Having: []v3.Having{
								{
									ColumnName: "value",
									Operator:   v3.HavingOperatorGreaterThan,
									Value:      100,
								},
							},
							OrderBy: []v3.OrderBy{
								{ColumnName: constants.SigNozOrderByValue, Order: "desc"},
							},
						},
					},
				},
			},
			expectedCacheKeys: map[string]string{},
		},
		{
			name: "panelType=value;dataSource=logs;queryType=builder",
			query: &v3.QueryRangeParamsV3{
				CompositeQuery: &v3.CompositeQuery{
					PanelType: v3.PanelTypeValue,
					QueryType: v3.QueryTypeBuilder,
					BuilderQueries: map[string]*v3.BuilderQuery{
						"A": {
							QueryName:          "A",
							StepInterval:       60,
							DataSource:         v3.DataSourceLogs,
							AggregateOperator:  v3.AggregateOperatorCount,
							AggregateAttribute: v3.AttributeKey{Key: "log_level"},
							Filters: &v3.FilterSet{
								Operator: "AND",
								Items: []v3.FilterItem{
									{Key: v3.AttributeKey{Key: "service_name"}, Value: "A", Operator: v3.FilterOperatorEqual},
								},
							},
							Expression: "A",
							Limit:      10,
							ReduceTo:   v3.ReduceToOperatorAvg,
						},
					},
				},
			},
			expectedCacheKeys: map[string]string{},
		},
	}

	keyGen := NewKeyGenerator()
	for _, test := range testCases {
		t.Run(test.name, func(t *testing.T) {
			cacheKeys := keyGen.GenerateKeys(test.query)
			require.Equal(t, test.expectedCacheKeys, cacheKeys)
		})
	}
}

func TestGenerateCacheKeysMetricsPromQL(t *testing.T) {
	// there is no version difference between v3 and v4 for promql
	testCases := []struct {
		name              string
		query             *v3.QueryRangeParamsV3
		expectedCacheKeys map[string]string
	}{
		{
			name: "panelType=graph;dataSource=metrics;queryType=promql",
			query: &v3.QueryRangeParamsV3{
				CompositeQuery: &v3.CompositeQuery{
					PanelType: v3.PanelTypeGraph,
					QueryType: v3.QueryTypePromQL,
					PromQueries: map[string]*v3.PromQuery{
						"A": {
							Query: "signoz_latency_bucket",
						},
					},
				},
			},
			expectedCacheKeys: map[string]string{
				"A": "signoz_latency_bucket",
			},
		},
		{
			name: "panelType=graph;dataSource=metrics;queryType=promql",
			query: &v3.QueryRangeParamsV3{
				CompositeQuery: &v3.CompositeQuery{
					PanelType: v3.PanelTypeGraph,
					QueryType: v3.QueryTypePromQL,
					PromQueries: map[string]*v3.PromQuery{
						"A": {
							Query: "histogram_quantile(0.9, sum(rate(signoz_latency_bucket[1m])) by (le))",
						},
					},
				},
			},
			expectedCacheKeys: map[string]string{
				"A": "histogram_quantile(0.9, sum(rate(signoz_latency_bucket[1m])) by (le))",
			},
		},
		{
			name: "panelType=value;dataSource=metrics;queryType=promql",
			query: &v3.QueryRangeParamsV3{
				CompositeQuery: &v3.CompositeQuery{
					PanelType: v3.PanelTypeValue,
					QueryType: v3.QueryTypePromQL,
					PromQueries: map[string]*v3.PromQuery{
						"A": {
							Query: "histogram_quantile(0.9, sum(rate(signoz_latency_bucket[1m])) by (le))",
						},
					},
				},
			},
			expectedCacheKeys: map[string]string{},
		},
	}

	keyGen := NewKeyGenerator()
	for _, test := range testCases {
		t.Run(test.name, func(t *testing.T) {
			cacheKeys := keyGen.GenerateKeys(test.query)
			require.Equal(t, test.expectedCacheKeys, cacheKeys)
		})
	}
}

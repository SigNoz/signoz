package v3

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/require"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

func TestBuildQuery(t *testing.T) {
	t.Run("TestSimpleQueryWithName", func(t *testing.T) {
		q := &v3.QueryRangeParamsV3{
			Start: 1650991982000,
			End:   1651078382000,
			CompositeQuery: &v3.CompositeQuery{
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:          "A",
						StepInterval:       60,
						AggregateAttribute: v3.AttributeKey{Key: "name"},
						AggregateOperator:  v3.AggregateOperatorRateMax,
						Expression:         "A",
					},
				},
				QueryType: v3.QueryTypeBuilder,
				PanelType: v3.PanelTypeGraph,
			},
		}
		query, err := PrepareMetricQuery(q.Start, q.End, q.CompositeQuery.QueryType, q.CompositeQuery.PanelType, q.CompositeQuery.BuilderQueries["A"], Options{PreferRPM: false})
		require.NoError(t, err)
		require.Contains(t, query, "WHERE metric_name IN ['name']")
	})
}

func TestBuildQueryWithFilters(t *testing.T) {
	t.Run("TestBuildQueryWithFilters", func(t *testing.T) {
		q := &v3.QueryRangeParamsV3{
			Start: 1650991982000,
			End:   1651078382000,
			CompositeQuery: &v3.CompositeQuery{
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:          "A",
						StepInterval:       60,
						AggregateAttribute: v3.AttributeKey{Key: "name"},
						Filters: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
							{Key: v3.AttributeKey{Key: "a"}, Value: "b", Operator: v3.FilterOperatorNotEqual},
							{Key: v3.AttributeKey{Key: "code"}, Value: "ERROR_*", Operator: v3.FilterOperatorNotRegex},
						}},
						AggregateOperator: v3.AggregateOperatorRateMax,
						Expression:        "A",
						Temporality:       v3.Cumulative,
					},
				},
			},
		}
		query, err := PrepareMetricQuery(q.Start, q.End, q.CompositeQuery.QueryType, q.CompositeQuery.PanelType, q.CompositeQuery.BuilderQueries["A"], Options{PreferRPM: false})
		require.NoError(t, err)

		require.Contains(t, query, "WHERE metric_name IN ['name'] AND temporality = 'Cumulative' AND unix_milli >= 1650931200000 AND unix_milli < 1651078380000 AND JSONExtractString(labels, 'a') != 'b'")
		require.Contains(t, query, rateWithoutNegative)
		require.Contains(t, query, "not match(JSONExtractString(labels, 'code'), 'ERROR_*')")
	})
}

func TestBuildQueryWithMultipleQueries(t *testing.T) {
	t.Run("TestBuildQueryWithFilters", func(t *testing.T) {
		q := &v3.QueryRangeParamsV3{
			Start: 1650991982000,
			End:   1651078382000,
			CompositeQuery: &v3.CompositeQuery{
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:          "A",
						StepInterval:       60,
						AggregateAttribute: v3.AttributeKey{Key: "name"},
						Filters: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
							{Key: v3.AttributeKey{Key: "in"}, Value: []interface{}{"a", "b", "c"}, Operator: v3.FilterOperatorIn},
						}},
						AggregateOperator: v3.AggregateOperatorRateAvg,
						Temporality:       v3.Cumulative,
						Expression:        "A",
					},
					"B": {
						QueryName:          "B",
						StepInterval:       60,
						AggregateAttribute: v3.AttributeKey{Key: "name2"},
						AggregateOperator:  v3.AggregateOperatorRateMax,
						Temporality:        v3.Cumulative,
						Expression:         "B",
					},
				},
			},
		}

		query, err := PrepareMetricQuery(q.Start, q.End, q.CompositeQuery.QueryType, q.CompositeQuery.PanelType, q.CompositeQuery.BuilderQueries["A"], Options{PreferRPM: false})
		require.NoError(t, err)

		require.Contains(t, query, "WHERE metric_name IN ['name'] AND temporality = 'Cumulative' AND unix_milli >= 1650931200000 AND unix_milli < 1651078380000 AND JSONExtractString(labels, 'in') IN ['a','b','c']")
		require.Contains(t, query, rateWithoutNegative)
	})
}

func TestBuildQueryXRate(t *testing.T) {
	t.Run("TestBuildQueryXRate", func(t *testing.T) {

		tmpl := `SELECT  ts, %s(rate_value) as value FROM (SELECT  ts, If((value - lagInFrame(value, 1, 0) OVER rate_window) < 0, nan, If((ts - lagInFrame(ts, 1, toDate('1970-01-01')) OVER rate_window) >= 86400, nan, (value - lagInFrame(value, 1, 0) OVER rate_window) / (ts - lagInFrame(ts, 1, toDate('1970-01-01')) OVER rate_window)))  as rate_value FROM(SELECT fingerprint,  toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), INTERVAL 60 SECOND) as ts, max(value) as value FROM signoz_metrics.distributed_samples_v4 INNER JOIN (SELECT DISTINCT fingerprint FROM signoz_metrics.time_series_v4_1day WHERE metric_name IN ['name'] AND temporality = '' AND unix_milli >= 1650931200000 AND unix_milli < 1651078380000) as filtered_time_series USING fingerprint WHERE metric_name IN ['name'] AND unix_milli >= 1650991920000 AND unix_milli < 1651078380000 GROUP BY fingerprint, ts ORDER BY fingerprint,  ts) WINDOW rate_window as (PARTITION BY fingerprint ORDER BY fingerprint,  ts) ) WHERE isNaN(rate_value) = 0 GROUP BY ts ORDER BY  ts`

		cases := []struct {
			aggregateOperator v3.AggregateOperator
			expectedQuery     string
		}{
			{
				aggregateOperator: v3.AggregateOperatorAvgRate,
				expectedQuery:     fmt.Sprintf(tmpl, aggregateOperatorToSQLFunc[v3.AggregateOperatorAvgRate]),
			},
			{
				aggregateOperator: v3.AggregateOperatorMaxRate,
				expectedQuery:     fmt.Sprintf(tmpl, aggregateOperatorToSQLFunc[v3.AggregateOperatorMaxRate]),
			},
			{
				aggregateOperator: v3.AggregateOperatorMinRate,
				expectedQuery:     fmt.Sprintf(tmpl, aggregateOperatorToSQLFunc[v3.AggregateOperatorMinRate]),
			},
			{
				aggregateOperator: v3.AggregateOperatorSumRate,
				expectedQuery:     fmt.Sprintf(tmpl, aggregateOperatorToSQLFunc[v3.AggregateOperatorSumRate]),
			},
		}

		for _, c := range cases {

			q := &v3.QueryRangeParamsV3{
				Start: 1650991982000,
				End:   1651078382000,
				CompositeQuery: &v3.CompositeQuery{
					BuilderQueries: map[string]*v3.BuilderQuery{
						"A": {
							QueryName:          "A",
							StepInterval:       60,
							AggregateAttribute: v3.AttributeKey{Key: "name"},
							AggregateOperator:  c.aggregateOperator,
							Expression:         "A",
						},
					},
					QueryType: v3.QueryTypeBuilder,
					PanelType: v3.PanelTypeGraph,
				},
			}
			query, err := PrepareMetricQuery(q.Start, q.End, q.CompositeQuery.QueryType, q.CompositeQuery.PanelType, q.CompositeQuery.BuilderQueries["A"], Options{PreferRPM: false})
			require.NoError(t, err)
			require.Equal(t, query, c.expectedQuery)
		}
	})
}

func TestBuildQueryRPM(t *testing.T) {
	t.Run("TestBuildQueryXRate", func(t *testing.T) {

		tmpl := `SELECT  ts, ceil(value * 60) as value FROM (SELECT  ts, %s(rate_value) as value FROM (SELECT  ts, If((value - lagInFrame(value, 1, 0) OVER rate_window) < 0, nan, If((ts - lagInFrame(ts, 1, toDate('1970-01-01')) OVER rate_window) >= 86400, nan, (value - lagInFrame(value, 1, 0) OVER rate_window) / (ts - lagInFrame(ts, 1, toDate('1970-01-01')) OVER rate_window)))  as rate_value FROM(SELECT fingerprint,  toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), INTERVAL 60 SECOND) as ts, max(value) as value FROM signoz_metrics.distributed_samples_v4 INNER JOIN (SELECT DISTINCT fingerprint FROM signoz_metrics.time_series_v4_1day WHERE metric_name IN ['name'] AND temporality = '' AND unix_milli >= 1650931200000 AND unix_milli < 1651078380000) as filtered_time_series USING fingerprint WHERE metric_name IN ['name'] AND unix_milli >= 1650991920000 AND unix_milli < 1651078380000 GROUP BY fingerprint, ts ORDER BY fingerprint,  ts) WINDOW rate_window as (PARTITION BY fingerprint ORDER BY fingerprint,  ts) ) WHERE isNaN(rate_value) = 0 GROUP BY ts ORDER BY  ts)`

		cases := []struct {
			aggregateOperator v3.AggregateOperator
			expectedQuery     string
		}{
			{
				aggregateOperator: v3.AggregateOperatorAvgRate,
				expectedQuery:     fmt.Sprintf(tmpl, aggregateOperatorToSQLFunc[v3.AggregateOperatorAvgRate]),
			},
			{
				aggregateOperator: v3.AggregateOperatorMaxRate,
				expectedQuery:     fmt.Sprintf(tmpl, aggregateOperatorToSQLFunc[v3.AggregateOperatorMaxRate]),
			},
			{
				aggregateOperator: v3.AggregateOperatorMinRate,
				expectedQuery:     fmt.Sprintf(tmpl, aggregateOperatorToSQLFunc[v3.AggregateOperatorMinRate]),
			},
			{
				aggregateOperator: v3.AggregateOperatorSumRate,
				expectedQuery:     fmt.Sprintf(tmpl, aggregateOperatorToSQLFunc[v3.AggregateOperatorSumRate]),
			},
		}

		for _, c := range cases {

			q := &v3.QueryRangeParamsV3{
				Start: 1650991982000,
				End:   1651078382000,
				CompositeQuery: &v3.CompositeQuery{
					BuilderQueries: map[string]*v3.BuilderQuery{
						"A": {
							QueryName:          "A",
							StepInterval:       60,
							AggregateAttribute: v3.AttributeKey{Key: "name"},
							AggregateOperator:  c.aggregateOperator,
							Expression:         "A",
						},
					},
					QueryType: v3.QueryTypeBuilder,
					PanelType: v3.PanelTypeGraph,
				},
			}
			query, err := PrepareMetricQuery(q.Start, q.End, q.CompositeQuery.QueryType, q.CompositeQuery.PanelType, q.CompositeQuery.BuilderQueries["A"], Options{PreferRPM: true})
			require.NoError(t, err)
			require.Equal(t, query, c.expectedQuery)
		}
	})
}

func TestBuildQueryAdjustedTimes(t *testing.T) {
	cases := []struct {
		name     string
		params   *v3.QueryRangeParamsV3
		expected string
	}{
		{
			name: "TestBuildQueryAdjustedTimes start close to 30 seconds",
			params: &v3.QueryRangeParamsV3{
				// 20:11:29
				Start: 1686082289000,
				// 20:41:00
				End: 1686084060000,
				CompositeQuery: &v3.CompositeQuery{
					BuilderQueries: map[string]*v3.BuilderQuery{
						"A": {
							QueryName:          "A",
							StepInterval:       60,
							AggregateAttribute: v3.AttributeKey{Key: "name"},
							Filters: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
								{Key: v3.AttributeKey{Key: "in"}, Value: []interface{}{"a", "b", "c"}, Operator: v3.FilterOperatorIn},
							}},
							AggregateOperator: v3.AggregateOperatorRateAvg,
							Expression:        "A",
						},
					},
				},
			},
			// 20:10:00 - 20:41:00
			expected: "unix_milli >= 1686082200000 AND unix_milli < 1686084060000",
		},
		{
			name: "TestBuildQueryAdjustedTimes start close to 50 seconds",
			params: &v3.QueryRangeParamsV3{
				// 20:11:52
				Start: 1686082312000,
				// 20:41:00
				End: 1686084060000,
				CompositeQuery: &v3.CompositeQuery{
					BuilderQueries: map[string]*v3.BuilderQuery{
						"A": {
							QueryName:          "A",
							StepInterval:       60,
							AggregateAttribute: v3.AttributeKey{Key: "name"},
							Filters: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
								{Key: v3.AttributeKey{Key: "in"}, Value: []interface{}{"a", "b", "c"}, Operator: v3.FilterOperatorIn},
							}},
							AggregateOperator: v3.AggregateOperatorRateAvg,
							Expression:        "A",
						},
					},
				},
			},
			// 20:10:00 - 20:41:00
			expected: "unix_milli >= 1686082200000 AND unix_milli < 1686084060000",
		},
		{
			name: "TestBuildQueryAdjustedTimes start close to 42 seconds with step 30 seconds",
			params: &v3.QueryRangeParamsV3{
				// 20:11:42
				Start: 1686082302000,
				// 20:41:00
				End: 1686084060000,
				CompositeQuery: &v3.CompositeQuery{
					BuilderQueries: map[string]*v3.BuilderQuery{
						"A": {
							QueryName:          "A",
							StepInterval:       30,
							AggregateAttribute: v3.AttributeKey{Key: "name"},
							Filters: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
								{Key: v3.AttributeKey{Key: "in"}, Value: []interface{}{"a", "b", "c"}, Operator: v3.FilterOperatorIn},
							}},
							AggregateOperator: v3.AggregateOperatorRateAvg,
							Expression:        "A",
						},
					},
				},
			},
			// 20:11:00 - 20:41:00
			expected: "unix_milli >= 1686082260000 AND unix_milli < 1686084060000",
		},
		{
			name: "TestBuildQueryAdjustedTimes start close to 42 seconds with step 30 seconds and end close to 30 seconds",
			params: &v3.QueryRangeParamsV3{
				// 20:11:42
				Start: 1686082302000,
				// 20:41:29
				End: 1686084089000,
				CompositeQuery: &v3.CompositeQuery{
					BuilderQueries: map[string]*v3.BuilderQuery{
						"A": {
							QueryName:          "A",
							StepInterval:       30,
							AggregateAttribute: v3.AttributeKey{Key: "name"},
							Filters: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
								{Key: v3.AttributeKey{Key: "in"}, Value: []interface{}{"a", "b", "c"}, Operator: v3.FilterOperatorIn},
							}},
							AggregateOperator: v3.AggregateOperatorRateAvg,
							Expression:        "A",
						},
					},
				},
			},
			// 20:11:00 - 20:41:00
			expected: "unix_milli >= 1686082260000 AND unix_milli < 1686084060000",
		},
		{
			name: "TestBuildQueryAdjustedTimes start close to 42 seconds with step 300 seconds and end close to 30 seconds",
			params: &v3.QueryRangeParamsV3{
				// 20:11:42
				Start: 1686082302000,
				// 20:41:29
				End: 1686084089000,
				CompositeQuery: &v3.CompositeQuery{
					BuilderQueries: map[string]*v3.BuilderQuery{
						"A": {
							QueryName:          "A",
							StepInterval:       300,
							AggregateAttribute: v3.AttributeKey{Key: "name"},
							Filters: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
								{Key: v3.AttributeKey{Key: "in"}, Value: []interface{}{"a", "b", "c"}, Operator: v3.FilterOperatorIn},
							}},
							AggregateOperator: v3.AggregateOperatorRateAvg,
							Expression:        "A",
						},
					},
				},
			},
			// 20:05:00 - 20:41:00
			// 20:10:00 is the nearest 5 minute interval, but we round down to 20:05:00
			// as this is a rate query and we want to include the previous value for the first interval
			expected: "unix_milli >= 1686081900000 AND unix_milli < 1686084060000",
		},
		{
			name: "TestBuildQueryAdjustedTimes start close to 42 seconds with step 180 seconds and end close to 30 seconds",
			params: &v3.QueryRangeParamsV3{
				// 20:11:42
				Start: 1686082302000,
				// 20:41:29
				End: 1686084089000,
				CompositeQuery: &v3.CompositeQuery{
					BuilderQueries: map[string]*v3.BuilderQuery{
						"A": {
							QueryName:          "A",
							StepInterval:       180,
							AggregateAttribute: v3.AttributeKey{Key: "name"},
							Filters: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
								{Key: v3.AttributeKey{Key: "in"}, Value: []interface{}{"a", "b", "c"}, Operator: v3.FilterOperatorIn},
							}},
							AggregateOperator: v3.AggregateOperatorRateAvg,
							Expression:        "A",
						},
					},
				},
			},
			// 20:06:00 - 20:39:00
			// 20:09:00 is the nearest 3 minute interval, but we round down to 20:06:00
			// as this is a rate query and we want to include the previous value for the first interval
			expected: "unix_milli >= 1686081960000 AND unix_milli < 1686084060000",
		},
	}

	for _, testCase := range cases {
		t.Run(testCase.name, func(t *testing.T) {
			q := testCase.params
			query, err := PrepareMetricQuery(q.Start, q.End, q.CompositeQuery.QueryType, q.CompositeQuery.PanelType, q.CompositeQuery.BuilderQueries["A"], Options{PreferRPM: false})
			require.NoError(t, err)

			require.Contains(t, query, testCase.expected)
		})
	}
}

func TestBuildQueryWithDotInMetricAndAttributes(t *testing.T) {
	cases := []struct {
		name     string
		params   *v3.QueryRangeParamsV3
		expected string
	}{
		{
			name: "TestBuildQueryWithDotInMetricAndAttributes with dot in metric and attributes",
			params: &v3.QueryRangeParamsV3{
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
					PanelType: v3.PanelTypeValue,
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
							Disabled:     false,
							StepInterval: 60,
							OrderBy: []v3.OrderBy{
								{
									ColumnName: "os.type",
									Order:      v3.DirectionAsc,
									DataType:   v3.AttributeKeyDataTypeString,
									Type:       v3.AttributeKeyTypeTag,
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
					},
				},
			},
			expected: "SELECT *, now() AS ts FROM (SELECT avgIf(value, toUnixTimestamp(ts) != 0) as value, anyIf(ts, toUnixTimestamp(ts) != 0) AS timestamp  FROM (SELECT `os.type`,  toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), INTERVAL 60 SECOND) as ts, avg(value) as value FROM signoz_metrics.distributed_samples_v4 INNER JOIN (SELECT DISTINCT JSONExtractString(labels, 'os.type') as `os.type`, fingerprint FROM signoz_metrics.time_series_v4_1day WHERE metric_name IN ['system.memory.usage'] AND temporality = '' AND unix_milli >= 1734998400000 AND unix_milli < 1735637880000 AND JSONExtractString(labels, 'os.type') = 'linux') as filtered_time_series USING fingerprint WHERE metric_name IN ['system.memory.usage'] AND unix_milli >= 1735036080000 AND unix_milli < 1735637880000 GROUP BY `os.type`, ts ORDER BY `os.type` asc, ts) )",
		},
		{
			name: "TestBuildQueryWithDotInMetricAndAttributes with dot in metric and attributes with rate_avg aggregation",
			params: &v3.QueryRangeParamsV3{
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
					PanelType: v3.PanelTypeValue,
					FillGaps:  false,
					BuilderQueries: map[string]*v3.BuilderQuery{
						"A": {
							QueryName:         "A",
							DataSource:        v3.DataSourceMetrics,
							AggregateOperator: v3.AggregateOperatorRateAvg,
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
							Disabled:     false,
							StepInterval: 60,
							OrderBy: []v3.OrderBy{
								{
									ColumnName: "os.type",
									Order:      v3.DirectionAsc,
									DataType:   v3.AttributeKeyDataTypeString,
									Type:       v3.AttributeKeyTypeTag,
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
					},
				},
			},
			expected: "SELECT *, now() AS ts FROM (SELECT avgIf(value, toUnixTimestamp(ts) != 0) as value, anyIf(ts, toUnixTimestamp(ts) != 0) AS timestamp  FROM (SELECT `os.type`,  ts, If((value - lagInFrame(value, 1, 0) OVER rate_window) < 0, nan, If((ts - lagInFrame(ts, 1, toDate('1970-01-01')) OVER rate_window) >= 86400, nan, (value - lagInFrame(value, 1, 0) OVER rate_window) / (ts - lagInFrame(ts, 1, toDate('1970-01-01')) OVER rate_window)))  as value FROM(SELECT `os.type`,  toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), INTERVAL 60 SECOND) as ts, avg(value) as value FROM signoz_metrics.distributed_samples_v4 INNER JOIN (SELECT DISTINCT JSONExtractString(labels, 'os.type') as `os.type`, fingerprint FROM signoz_metrics.time_series_v4_1day WHERE metric_name IN ['system.memory.usage'] AND temporality = '' AND unix_milli >= 1734998400000 AND unix_milli < 1735637880000 AND JSONExtractString(labels, 'os.type') = 'linux') as filtered_time_series USING fingerprint WHERE metric_name IN ['system.memory.usage'] AND unix_milli >= 1735036020000 AND unix_milli < 1735637880000 GROUP BY `os.type`, ts ORDER BY `os.type` asc, ts) WINDOW rate_window as (PARTITION BY `os.type` ORDER BY `os.type`,  ts) ) )",
		},
	}
	for _, testCase := range cases {
		t.Run(testCase.name, func(t *testing.T) {
			q := testCase.params
			query, err := PrepareMetricQuery(q.Start, q.End, q.CompositeQuery.QueryType, q.CompositeQuery.PanelType, q.CompositeQuery.BuilderQueries["A"], Options{PreferRPM: false})
			require.NoError(t, err)

			require.Contains(t, query, testCase.expected)
		})
	}
}

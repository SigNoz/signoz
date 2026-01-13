package querybuildertypesv5

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestQueryBuilderQuery_Copy(t *testing.T) {
	t.Run("copy with all fields populated", func(t *testing.T) {
		original := QueryBuilderQuery[TraceAggregation]{
			Name:         "A",
			StepInterval: Step{Duration: 60 * time.Second},
			Signal:       telemetrytypes.SignalTraces,
			Source:       telemetrytypes.SourceUnspecified,
			Aggregations: []TraceAggregation{
				{
					Expression: "count()",
					Alias:      "trace_count",
				},
			},
			Disabled: false,
			Filter: &Filter{
				Expression: "service.name = 'frontend'",
			},
			GroupBy: []GroupByKey{
				{
					TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
						Name:         "service.name",
						FieldContext: telemetrytypes.FieldContextResource,
					},
				},
			},
			Order: []OrderBy{
				{
					Key: OrderByKey{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name:         "timestamp",
							FieldContext: telemetrytypes.FieldContextSpan,
						},
					},
					Direction: OrderDirectionDesc,
				},
			},
			SelectFields: []telemetrytypes.TelemetryFieldKey{
				{
					Name:         "trace_id",
					FieldContext: telemetrytypes.FieldContextSpan,
				},
			},
			Limit:  100,
			Offset: 0,
			Cursor: "cursor123",
			LimitBy: &LimitBy{
				Value: "10",
				Keys: []string{
					"service.name",
				},
			},
			Having: &Having{
				Expression: "count() > 100",
			},
			SecondaryAggregations: []SecondaryAggregation{
				{
					Limit: 10,
					Order: []OrderBy{
						{
							Key: OrderByKey{
								TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
									Name:         "value",
									FieldContext: telemetrytypes.FieldContextSpan,
								},
							},
							Direction: OrderDirectionAsc,
						},
					},
					GroupBy: []GroupByKey{
						{
							TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
								Name:         "region",
								FieldContext: telemetrytypes.FieldContextResource,
							},
						},
					},
				},
			},
			Functions: []Function{
				{
					Name: FunctionNameTimeShift,
					Args: []FunctionArg{
						{
							Name:  "shift",
							Value: "1h",
						},
					},
				},
			},
			Legend:  "{{service.name}}",
			ShiftBy: 3600000,
		}

		// Create a copy
		copied := original.Copy()

		// Assert that values are equal
		assert.Equal(t, original.Name, copied.Name)
		assert.Equal(t, original.StepInterval, copied.StepInterval)
		assert.Equal(t, original.Signal, copied.Signal)
		assert.Equal(t, original.Source, copied.Source)
		assert.Equal(t, original.Disabled, copied.Disabled)
		assert.Equal(t, original.Limit, copied.Limit)
		assert.Equal(t, original.Offset, copied.Offset)
		assert.Equal(t, original.Cursor, copied.Cursor)
		assert.Equal(t, original.Legend, copied.Legend)
		assert.Equal(t, original.ShiftBy, copied.ShiftBy)

		// Assert deep copies for slices and pointers
		require.NotNil(t, copied.Aggregations)
		assert.Equal(t, len(original.Aggregations), len(copied.Aggregations))
		assert.Equal(t, original.Aggregations[0].Expression, copied.Aggregations[0].Expression)

		require.NotNil(t, copied.Filter)
		assert.Equal(t, original.Filter.Expression, copied.Filter.Expression)

		require.NotNil(t, copied.GroupBy)
		assert.Equal(t, len(original.GroupBy), len(copied.GroupBy))
		assert.Equal(t, original.GroupBy[0].Name, copied.GroupBy[0].Name)

		require.NotNil(t, copied.Order)
		assert.Equal(t, len(original.Order), len(copied.Order))
		assert.Equal(t, original.Order[0].Key.Name, copied.Order[0].Key.Name)

		require.NotNil(t, copied.SelectFields)
		assert.Equal(t, len(original.SelectFields), len(copied.SelectFields))
		assert.Equal(t, original.SelectFields[0].Name, copied.SelectFields[0].Name)

		require.NotNil(t, copied.LimitBy)
		assert.Equal(t, original.LimitBy.Value, copied.LimitBy.Value)
		assert.Equal(t, len(original.LimitBy.Keys), len(copied.LimitBy.Keys))

		require.NotNil(t, copied.Having)
		assert.Equal(t, original.Having.Expression, copied.Having.Expression)

		require.NotNil(t, copied.SecondaryAggregations)
		assert.Equal(t, len(original.SecondaryAggregations), len(copied.SecondaryAggregations))
		assert.Equal(t, original.SecondaryAggregations[0].Limit, copied.SecondaryAggregations[0].Limit)

		require.NotNil(t, copied.Functions)
		assert.Equal(t, len(original.Functions), len(copied.Functions))
		assert.Equal(t, original.Functions[0].Name, copied.Functions[0].Name)

		// Verify independence - modify copied and ensure original is unchanged
		copied.Name = "B"
		assert.Equal(t, "A", original.Name)

		copied.Aggregations[0].Expression = "sum()"
		assert.Equal(t, "count()", original.Aggregations[0].Expression)

		copied.Filter.Expression = "modified"
		assert.Equal(t, "service.name = 'frontend'", original.Filter.Expression)

		copied.GroupBy[0].Name = "modified"
		assert.Equal(t, "service.name", original.GroupBy[0].Name)

		copied.Order[0].Key.Name = "modified"
		assert.Equal(t, "timestamp", original.Order[0].Key.Name)

		copied.SelectFields[0].Name = "modified"
		assert.Equal(t, "trace_id", original.SelectFields[0].Name)

		copied.LimitBy.Value = "999"
		assert.Equal(t, "10", original.LimitBy.Value)

		copied.Having.Expression = "modified"
		assert.Equal(t, "count() > 100", original.Having.Expression)

		copied.SecondaryAggregations[0].Limit = 999
		assert.Equal(t, 10, original.SecondaryAggregations[0].Limit)

		copied.Functions[0].Name = FunctionNameAbsolute
		assert.Equal(t, FunctionNameTimeShift, original.Functions[0].Name)
	})

	t.Run("copy with nil fields", func(t *testing.T) {
		original := QueryBuilderQuery[TraceAggregation]{
			Name:   "A",
			Signal: telemetrytypes.SignalTraces,
		}

		copied := original.Copy()

		assert.Equal(t, original.Name, copied.Name)
		assert.Equal(t, original.Signal, copied.Signal)
		assert.Nil(t, copied.Aggregations)
		assert.Nil(t, copied.Filter)
		assert.Nil(t, copied.GroupBy)
		assert.Nil(t, copied.Order)
		assert.Nil(t, copied.SelectFields)
		assert.Nil(t, copied.LimitBy)
		assert.Nil(t, copied.Having)
		assert.Nil(t, copied.SecondaryAggregations)
		assert.Nil(t, copied.Functions)
	})

	t.Run("copy metric aggregation query", func(t *testing.T) {
		original := QueryBuilderQuery[MetricAggregation]{
			Name:   "M",
			Signal: telemetrytypes.SignalMetrics,
			Aggregations: []MetricAggregation{
				{
					MetricName:       "cpu_usage",
					SpaceAggregation: metrictypes.SpaceAggregationAvg,
					TimeAggregation:  metrictypes.TimeAggregationAvg,
				},
			},
		}

		copied := original.Copy()

		assert.Equal(t, original.Name, copied.Name)
		assert.Equal(t, original.Signal, copied.Signal)
		require.NotNil(t, copied.Aggregations)
		assert.Equal(t, original.Aggregations[0].MetricName, copied.Aggregations[0].MetricName)
		assert.Equal(t, original.Aggregations[0].SpaceAggregation, copied.Aggregations[0].SpaceAggregation)

		// Verify independence
		copied.Aggregations[0].MetricName = "modified"
		assert.Equal(t, "cpu_usage", original.Aggregations[0].MetricName)
	})

	t.Run("copy log aggregation query", func(t *testing.T) {
		original := QueryBuilderQuery[LogAggregation]{
			Name:   "L",
			Signal: telemetrytypes.SignalLogs,
			Aggregations: []LogAggregation{
				{
					Expression: "count()",
					Alias:      "log_count",
				},
			},
		}

		copied := original.Copy()

		assert.Equal(t, original.Name, copied.Name)
		assert.Equal(t, original.Signal, copied.Signal)
		require.NotNil(t, copied.Aggregations)
		assert.Equal(t, original.Aggregations[0].Expression, copied.Aggregations[0].Expression)

		// Verify independence
		copied.Aggregations[0].Expression = "sum()"
		assert.Equal(t, "count()", original.Aggregations[0].Expression)
	})
}

func TestQueryBuilderQuery_Normalize(t *testing.T) {
	t.Run("normalize select fields", func(t *testing.T) {
		query := QueryBuilderQuery[TraceAggregation]{
			SelectFields: []telemetrytypes.TelemetryFieldKey{
				{
					Name:         "Service.Name",
					FieldContext: telemetrytypes.FieldContext{String: valuer.NewString("RESOURCE")},
				},
				{
					Name:         "Span.Name",
					FieldContext: telemetrytypes.FieldContext{String: valuer.NewString("SPAN")},
				},
			},
		}

		query.Normalize()

		// Normalize only changes FieldContext, not the Name
		assert.Equal(t, "Service.Name", query.SelectFields[0].Name)
		assert.Equal(t, telemetrytypes.FieldContextResource, query.SelectFields[0].FieldContext)
		assert.Equal(t, "Span.Name", query.SelectFields[1].Name)
		assert.Equal(t, telemetrytypes.FieldContextSpan, query.SelectFields[1].FieldContext)
	})

	t.Run("normalize group by fields", func(t *testing.T) {
		query := QueryBuilderQuery[TraceAggregation]{
			GroupBy: []GroupByKey{
				{
					TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
						Name:         "Service.Name",
						FieldContext: telemetrytypes.FieldContext{String: valuer.NewString("RESOURCE")},
					},
				},
			},
		}

		query.Normalize()

		assert.Equal(t, "Service.Name", query.GroupBy[0].Name)
		assert.Equal(t, telemetrytypes.FieldContextResource, query.GroupBy[0].FieldContext)
	})

	t.Run("normalize order by fields", func(t *testing.T) {
		query := QueryBuilderQuery[TraceAggregation]{
			Order: []OrderBy{
				{
					Key: OrderByKey{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name:         "Timestamp",
							FieldContext: telemetrytypes.FieldContext{String: valuer.NewString("SPAN")},
						},
					},
					Direction: OrderDirectionDesc,
				},
			},
		}

		query.Normalize()

		assert.Equal(t, "Timestamp", query.Order[0].Key.Name)
		assert.Equal(t, telemetrytypes.FieldContextSpan, query.Order[0].Key.FieldContext)
	})

	t.Run("normalize secondary aggregations", func(t *testing.T) {
		query := QueryBuilderQuery[TraceAggregation]{
			SecondaryAggregations: []SecondaryAggregation{
				{
					Order: []OrderBy{
						{
							Key: OrderByKey{
								TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
									Name:         "Value",
									FieldContext: telemetrytypes.FieldContext{String: valuer.NewString("SPAN")},
								},
							},
							Direction: OrderDirectionAsc,
						},
					},
					GroupBy: []GroupByKey{
						{
							TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
								Name:         "Region",
								FieldContext: telemetrytypes.FieldContext{String: valuer.NewString("RESOURCE")},
							},
						},
					},
				},
			},
		}

		query.Normalize()

		assert.Equal(t, "Value", query.SecondaryAggregations[0].Order[0].Key.Name)
		assert.Equal(t, telemetrytypes.FieldContextSpan, query.SecondaryAggregations[0].Order[0].Key.FieldContext)
		assert.Equal(t, "Region", query.SecondaryAggregations[0].GroupBy[0].Name)
		assert.Equal(t, telemetrytypes.FieldContextResource, query.SecondaryAggregations[0].GroupBy[0].FieldContext)
	})

	t.Run("normalize with nil fields", func(t *testing.T) {
		query := QueryBuilderQuery[TraceAggregation]{
			Name:   "A",
			Signal: telemetrytypes.SignalTraces,
		}

		// Should not panic
		query.Normalize()

		assert.Equal(t, "A", query.Name)
	})

	t.Run("normalize all fields together", func(t *testing.T) {
		query := QueryBuilderQuery[TraceAggregation]{
			SelectFields: []telemetrytypes.TelemetryFieldKey{
				{Name: "Service.Name", FieldContext: telemetrytypes.FieldContext{String: valuer.NewString("RESOURCE")}},
			},
			GroupBy: []GroupByKey{
				{
					TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
						Name:         "Host.Name",
						FieldContext: telemetrytypes.FieldContext{String: valuer.NewString("RESOURCE")},
					},
				},
			},
			Order: []OrderBy{
				{
					Key: OrderByKey{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name:         "Duration",
							FieldContext: telemetrytypes.FieldContext{String: valuer.NewString("SPAN")},
						},
					},
				},
			},
			SecondaryAggregations: []SecondaryAggregation{
				{
					Order: []OrderBy{
						{
							Key: OrderByKey{
								TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
									Name:         "Count",
									FieldContext: telemetrytypes.FieldContext{String: valuer.NewString("SPAN")},
								},
							},
						},
					},
					GroupBy: []GroupByKey{
						{
							TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
								Name:         "Status.Code",
								FieldContext: telemetrytypes.FieldContext{String: valuer.NewString("SPAN")},
							},
						},
					},
				},
			},
		}

		query.Normalize()

		assert.Equal(t, "Service.Name", query.SelectFields[0].Name)
		assert.Equal(t, "Host.Name", query.GroupBy[0].Name)
		assert.Equal(t, "Duration", query.Order[0].Key.Name)
		assert.Equal(t, "Count", query.SecondaryAggregations[0].Order[0].Key.Name)
		assert.Equal(t, "Status.Code", query.SecondaryAggregations[0].GroupBy[0].Name)
	})
}

func TestQueryBuilderQuery_UnmarshalJSON(t *testing.T) {
	t.Run("valid trace query", func(t *testing.T) {
		jsonData := `{
			"name": "A",
			"signal": "traces",
			"stepInterval": 60,
			"aggregations": [{
				"expression": "count()",
				"alias": "trace_count"
			}],
			"filter": {
				"expression": "service.name = 'frontend'"
			},
			"groupBy": [{
				"name": "Service.Name",
				"fieldContext": "RESOURCE"
			}],
			"order": [{
				"key": {
					"name": "Timestamp",
					"fieldContext": "SPAN"
				},
				"direction": "desc"
			}],
			"limit": 100
		}`

		var query QueryBuilderQuery[TraceAggregation]
		err := json.Unmarshal([]byte(jsonData), &query)
		require.NoError(t, err)

		assert.Equal(t, "A", query.Name)
		assert.Equal(t, telemetrytypes.SignalTraces, query.Signal)
		assert.Equal(t, int64(60000), query.StepInterval.Milliseconds())
		assert.Equal(t, 1, len(query.Aggregations))
		assert.Equal(t, "count()", query.Aggregations[0].Expression)
		assert.Equal(t, "trace_count", query.Aggregations[0].Alias)
		require.NotNil(t, query.Filter)
		assert.Equal(t, "service.name = 'frontend'", query.Filter.Expression)
		assert.Equal(t, 1, len(query.GroupBy))
		// Normalized during unmarshaling - only FieldContext is normalized, not Name
		assert.Equal(t, "Service.Name", query.GroupBy[0].Name)
		assert.Equal(t, telemetrytypes.FieldContextResource, query.GroupBy[0].FieldContext)
		assert.Equal(t, 1, len(query.Order))
		// Normalized during unmarshaling - only FieldContext is normalized, not Name
		assert.Equal(t, "Timestamp", query.Order[0].Key.Name)
		assert.Equal(t, telemetrytypes.FieldContextSpan, query.Order[0].Key.FieldContext)
		assert.Equal(t, OrderDirectionDesc, query.Order[0].Direction)
		assert.Equal(t, 100, query.Limit)
	})

	t.Run("valid metric query", func(t *testing.T) {
		jsonData := `{
			"name": "M",
			"signal": "metrics",
			"stepInterval": "1m",
			"aggregations": [{
				"metricName": "cpu_usage",
				"spaceAggregation": "avg",
				"timeAggregation": "avg"
			}]
		}`

		var query QueryBuilderQuery[MetricAggregation]
		err := json.Unmarshal([]byte(jsonData), &query)
		require.NoError(t, err)

		assert.Equal(t, "M", query.Name)
		assert.Equal(t, telemetrytypes.SignalMetrics, query.Signal)
		assert.Equal(t, int64(60000), query.StepInterval.Milliseconds())
		assert.Equal(t, 1, len(query.Aggregations))
		assert.Equal(t, "cpu_usage", query.Aggregations[0].MetricName)
	})

	t.Run("valid log query", func(t *testing.T) {
		jsonData := `{
			"name": "L",
			"signal": "logs",
			"aggregations": [{
				"expression": "count()",
				"alias": "log_count"
			}]
		}`

		var query QueryBuilderQuery[LogAggregation]
		err := json.Unmarshal([]byte(jsonData), &query)
		require.NoError(t, err)

		assert.Equal(t, "L", query.Name)
		assert.Equal(t, telemetrytypes.SignalLogs, query.Signal)
		assert.Equal(t, 1, len(query.Aggregations))
		assert.Equal(t, "count()", query.Aggregations[0].Expression)
	})

	t.Run("unknown field error", func(t *testing.T) {
		jsonData := `{
			"name": "A",
			"signal": "traces",
			"unknownField": "value"
		}`

		var query QueryBuilderQuery[TraceAggregation]
		err := json.Unmarshal([]byte(jsonData), &query)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "unknown field")
	})

	t.Run("query with all optional fields", func(t *testing.T) {
		jsonData := `{
			"name": "A",
			"signal": "traces",
			"stepInterval": "5m",
			"source": "traces",
			"aggregations": [{
				"expression": "count()",
				"alias": "count"
			}],
			"disabled": true,
			"filter": {
				"expression": "service.name = 'api'"
			},
			"groupBy": [{
				"name": "service.name",
				"fieldContext": "resource"
			}],
			"order": [{
				"key": {
					"name": "timestamp",
					"fieldContext": "span"
				},
				"direction": "asc"
			}],
			"selectFields": [{
				"name": "trace_id",
				"fieldContext": "span"
			}],
			"limit": 50,
			"offset": 10,
			"cursor": "cursor123",
			"limitBy": {
				"value": "5",
				"keys": ["service.name"]
			},
			"having": {
				"expression": "count() > 10"
			},
			"secondaryAggregations": [{
				"limit": 20,
				"order": [{
					"key": {
						"name": "value",
						"fieldContext": "span"
					},
					"direction": "desc"
				}],
				"groupBy": [{
					"name": "region",
					"fieldContext": "resource"
				}]
			}],
			"functions": [{
				"name": "timeShift",
				"args": [{
					"name": "shift",
					"value": "1h"
				}]
			}],
			"legend": "{{service.name}}"
		}`

		var query QueryBuilderQuery[TraceAggregation]
		err := json.Unmarshal([]byte(jsonData), &query)
		require.NoError(t, err)

		assert.Equal(t, "A", query.Name)
		assert.Equal(t, telemetrytypes.SignalTraces, query.Signal)
		assert.Equal(t, int64(300000), query.StepInterval.Milliseconds())
		// Source is set in the JSON, so it should be "traces", not SourceUnspecified
		assert.Equal(t, "traces", query.Source.String.StringValue())
		assert.True(t, query.Disabled)
		assert.NotNil(t, query.Filter)
		assert.NotNil(t, query.GroupBy)
		assert.NotNil(t, query.Order)
		assert.NotNil(t, query.SelectFields)
		assert.Equal(t, 50, query.Limit)
		assert.Equal(t, 10, query.Offset)
		assert.Equal(t, "cursor123", query.Cursor)
		assert.NotNil(t, query.LimitBy)
		assert.NotNil(t, query.Having)
		assert.NotNil(t, query.SecondaryAggregations)
		assert.NotNil(t, query.Functions)
		assert.Equal(t, "{{service.name}}", query.Legend)
	})

	t.Run("normalization happens during unmarshaling", func(t *testing.T) {
		jsonData := `{
			"name": "A",
			"signal": "traces",
			"selectFields": [{
				"name": "Service.Name",
				"fieldContext": "RESOURCE"
			}],
			"groupBy": [{
				"name": "Host.Name",
				"fieldContext": "RESOURCE"
			}],
			"order": [{
				"key": {
					"name": "Duration",
					"fieldContext": "SPAN"
				},
				"direction": "desc"
			}]
		}`

		var query QueryBuilderQuery[TraceAggregation]
		err := json.Unmarshal([]byte(jsonData), &query)
		require.NoError(t, err)

		// FieldContext should be normalized, Name should remain as-is
		assert.Equal(t, "Service.Name", query.SelectFields[0].Name)
		assert.Equal(t, telemetrytypes.FieldContextResource, query.SelectFields[0].FieldContext)
		assert.Equal(t, "Host.Name", query.GroupBy[0].Name)
		assert.Equal(t, telemetrytypes.FieldContextResource, query.GroupBy[0].FieldContext)
		assert.Equal(t, "Duration", query.Order[0].Key.Name)
		assert.Equal(t, telemetrytypes.FieldContextSpan, query.Order[0].Key.FieldContext)
	})
}

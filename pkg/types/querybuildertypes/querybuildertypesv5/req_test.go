package querybuildertypesv5

import (
	"encoding/json"
	"reflect"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestQueryRangeRequest_UnmarshalJSON(t *testing.T) {
	tests := []struct {
		name     string
		jsonData string
		expected QueryRangeRequest
		wantErr  bool
	}{
		{
			name: "valid trace builder query",
			jsonData: `{
				"schemaVersion": "v1",
				"start": 1640995200000,
				"end": 1640998800000,
				"requestType": "time_series",
				"compositeQuery": {
					"queries": [{
						"type": "builder_query",
						"spec": {
							"name": "A",
							"signal": "traces",
							"aggregations": [{
								"expression": "count()",
								"alias": "trace_count"
							}],
							"stepInterval": "60s",
							"filter": {
								"expression": "service.name = 'frontend'"
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
								"direction": "desc"
							}],
							"limit": 100
						}
					}]
				},
				"variables": {
					"service": {"value": "frontend"}
				}
			}`,
			expected: QueryRangeRequest{
				SchemaVersion: "v1",
				Start:         1640995200000,
				End:           1640998800000,
				RequestType:   RequestTypeTimeSeries,
				CompositeQuery: CompositeQuery{
					Queries: []QueryEnvelope{{
						Type: QueryTypeBuilder,
						Spec: QueryBuilderQuery[TraceAggregation]{
							Name:   "A",
							Signal: telemetrytypes.SignalTraces,
							Aggregations: []TraceAggregation{{
								Expression: "count()",
								Alias:      "trace_count",
							}},
							StepInterval: Step{Duration: 60 * time.Second},
							Filter: &Filter{
								Expression: "service.name = 'frontend'",
							},
							GroupBy: []GroupByKey{{
								TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
									Name:         "service.name",
									FieldContext: telemetrytypes.FieldContextResource,
								},
							}},
							Order: []OrderBy{{
								Key: OrderByKey{
									TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
										Name:         "timestamp",
										FieldContext: telemetrytypes.FieldContextSpan,
									},
								},
								Direction: OrderDirectionDesc,
							}},
							Limit: 100,
						},
					}},
				},
				Variables: map[string]VariableItem{
					"service": VariableItem{
						Value: "frontend",
					},
				},
			},
			wantErr: false,
		},
		{
			name: "valid trace operator query with simple expression",
			jsonData: `{
				"schemaVersion": "v1",
				"start": 1640995200000,
				"end": 1640998800000,
				"requestType": "time_series",
				"compositeQuery": {
					"queries": [
						{
							"type": "builder_query",
							"spec": {
								"name": "A",
								"signal": "traces",
								"filter": {
									"expression": "service.name = 'checkoutservice'"
								}
							}
						},
						{
							"type": "builder_trace_operator",
							"spec": {
								"name": "trace_flow_analysis",
								"expression": "A => B",
								"filter": {
									"expression": "trace_duration > 200ms AND span_count >= 5"
								},
								"order": [{
									"key": {
										"name": "trace_duration"
									},
									"direction": "desc"
								}],
								"limit": 100,
								"cursor": "eyJsYXN0X3RyYWNlX2lkIjoiYWJjZGVmIn0="
							}
						}
					]
				},
			"variables": {
				"service": {"value":"frontend"}
			}
		}`,
			expected: QueryRangeRequest{
				SchemaVersion: "v1",
				Start:         1640995200000,
				End:           1640998800000,
				RequestType:   RequestTypeTimeSeries,
				CompositeQuery: CompositeQuery{
					Queries: []QueryEnvelope{
						{
							Type: QueryTypeBuilder,
							Spec: QueryBuilderQuery[TraceAggregation]{
								Name:   "A",
								Signal: telemetrytypes.SignalTraces,
								Filter: &Filter{
									Expression: "service.name = 'checkoutservice'",
								},
							},
						},
						{
							Type: QueryTypeTraceOperator,
							Spec: QueryBuilderTraceOperator{
								Name:       "trace_flow_analysis",
								Expression: "A => B",
								Filter: &Filter{
									Expression: "trace_duration > 200ms AND span_count >= 5",
								},
								Order: []OrderBy{{
									Key:       OrderByKey{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "trace_duration"}},
									Direction: OrderDirectionDesc,
								}},
								Limit:  100,
								Cursor: "eyJsYXN0X3RyYWNlX2lkIjoiYWJjZGVmIn0=",
							},
						},
					},
				},
				Variables: map[string]VariableItem{
					"service": VariableItem{
						Value: "frontend",
					},
				},
			},
			wantErr: false,
		},

		{
			name: "valid trace operator with complex expression and span_count ordering",
			jsonData: `{
				"schemaVersion": "v1",
				"start": 1640995200000,
				"end": 1640998800000,
				"requestType": "time_series",
				"compositeQuery": {
					"queries": [
						{
							"type": "builder_query",
							"spec": {
								"name": "A",
								"signal": "traces",
								"filter": { "expression": "service.name = 'frontend'" }
							}
						},
						{
							"type": "builder_query",
							"spec": {
								"name": "B",
								"signal": "traces",
								"filter": { "expression": "hasError = true" }
							}
						},
						{
							"type": "builder_query",
							"spec": {
								"name": "C",
								"signal": "traces",
								"filter": { "expression": "response_status_code = '200'" }
							}
						},
						{
							"type": "builder_trace_operator",
							"spec": {
								"name": "complex_trace_analysis",
								"expression": "A => (B && NOT C)",
								"filter": { "expression": "trace_duration BETWEEN 100ms AND 5s AND span_count IN (5, 10, 15)" },
								"order": [{
									"key": { "name": "span_count" },
									"direction": "asc"
								}],
								"limit": 50,
								"functions": [{ "name": "absolute", "args": [] }]
							}
						}
					]
				}
			}`,
			expected: QueryRangeRequest{
				SchemaVersion: "v1",
				Start:         1640995200000,
				End:           1640998800000,
				RequestType:   RequestTypeTimeSeries,
				CompositeQuery: CompositeQuery{Queries: []QueryEnvelope{
					{
						Type: QueryTypeBuilder,
						Spec: QueryBuilderQuery[TraceAggregation]{
							Name:   "A",
							Signal: telemetrytypes.SignalTraces,
							Filter: &Filter{Expression: "service.name = 'frontend'"},
						},
					},
					{
						Type: QueryTypeBuilder,
						Spec: QueryBuilderQuery[TraceAggregation]{
							Name:   "B",
							Signal: telemetrytypes.SignalTraces,
							Filter: &Filter{Expression: "hasError = true"},
						},
					},
					{
						Type: QueryTypeBuilder,
						Spec: QueryBuilderQuery[TraceAggregation]{
							Name:   "C",
							Signal: telemetrytypes.SignalTraces,
							Filter: &Filter{Expression: "response_status_code = '200'"},
						},
					},
					{
						Type: QueryTypeTraceOperator,
						Spec: QueryBuilderTraceOperator{
							Name:       "complex_trace_analysis",
							Expression: "A => (B && NOT C)",
							Filter:     &Filter{Expression: "trace_duration BETWEEN 100ms AND 5s AND span_count IN (5, 10, 15)"},
							Order: []OrderBy{{
								Key:       OrderByKey{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: OrderBySpanCount.StringValue()}},
								Direction: OrderDirectionAsc,
							}},
							Limit:     50,
							Functions: []Function{{Name: FunctionNameAbsolute, Args: []FunctionArg{}}},
						},
					},
				}},
			},
			wantErr: false,
		},
		{
			name: "valid trace operator with NOT expression",
			jsonData: `{
				"schemaVersion": "v1",
				"start": 1640995200000,
				"end": 1640998800000,
				"requestType": "time_series",
				"compositeQuery": {
					"queries": [
						{
							"type": "builder_query",
							"spec": {
								"name": "A",
								"signal": "traces",
								"filter": {
									"expression": "service.name = 'frontend'"
								}
							}
						},
						{
							"type": "builder_trace_operator",
							"spec": {
								"name": "not_trace_analysis",
								"expression": "NOT A",
								"filter": {
									"expression": "trace_duration < 1s"
								},
								"disabled": false
							}
						}
					]
				}
			}`,
			expected: QueryRangeRequest{
				SchemaVersion: "v1",
				Start:         1640995200000,
				End:           1640998800000,
				RequestType:   RequestTypeTimeSeries,
				CompositeQuery: CompositeQuery{
					Queries: []QueryEnvelope{
						{
							Type: QueryTypeBuilder,
							Spec: QueryBuilderQuery[TraceAggregation]{
								Name:   "A",
								Signal: telemetrytypes.SignalTraces,
								Filter: &Filter{
									Expression: "service.name = 'frontend'",
								},
							},
						},
						{
							Type: QueryTypeTraceOperator,
							Spec: QueryBuilderTraceOperator{
								Name:       "not_trace_analysis",
								Expression: "NOT A",
								Filter: &Filter{
									Expression: "trace_duration < 1s",
								},
								Disabled: false,
							},
						},
					},
				},
			},
			wantErr: false,
		},
		{
			name: "trace operator with binary NOT (exclusion)",
			jsonData: `{
				"schemaVersion": "v1",
				"start": 1640995200000,
				"end": 1640998800000,
				"requestType": "time_series",
				"compositeQuery": {
					"queries": [
						{
							"type": "builder_query",
							"spec": {
								"name": "A",
								"signal": "traces",
								"filter": {
									"expression": "service.name = 'frontend'"
								}
							}
						},
						{
							"type": "builder_query",
							"spec": {
								"name": "B",
								"signal": "traces",
								"filter": {
									"expression": "hasError = true"
								}
							}
						},
						{
							"type": "builder_trace_operator",
							"spec": {
								"name": "exclusion_analysis",
								"expression": "A NOT B",
								"filter": {
									"expression": "span_count > 3"
								},
								"limit": 75
							}
						}
					]
				}
			}`,
			expected: QueryRangeRequest{
				SchemaVersion: "v1",
				Start:         1640995200000,
				End:           1640998800000,
				RequestType:   RequestTypeTimeSeries,
				CompositeQuery: CompositeQuery{
					Queries: []QueryEnvelope{
						{
							Type: QueryTypeBuilder,
							Spec: QueryBuilderQuery[TraceAggregation]{
								Name:   "A",
								Signal: telemetrytypes.SignalTraces,
								Filter: &Filter{
									Expression: "service.name = 'frontend'",
								},
							},
						},
						{
							Type: QueryTypeBuilder,
							Spec: QueryBuilderQuery[TraceAggregation]{
								Name:   "B",
								Signal: telemetrytypes.SignalTraces,
								Filter: &Filter{
									Expression: "hasError = true",
								},
							},
						},
						{
							Type: QueryTypeTraceOperator,
							Spec: QueryBuilderTraceOperator{
								Name:       "exclusion_analysis",
								Expression: "A NOT B",
								Filter: &Filter{
									Expression: "span_count > 3",
								},
								Limit: 75,
							},
						},
					},
				},
			},
			wantErr: false,
		},
		{
			name: "valid log builder query",
			jsonData: `{
				"schemaVersion": "v2",
				"start": 1640995200000,
				"end": 1640998800000,
				"requestType": "raw",
				"compositeQuery": {
					"queries": [{
						"type": "builder_query",
						"spec": {
							"name": "B",
							"signal": "logs",
							"stepInterval": "30s",
							"filter": {
								"expression": "severity_text = 'ERROR'"
							},
							"selectFields": [{
								"name": "body",
								"fieldContext": "log"
							}],
							"limit": 50,
							"offset": 10
						}
					}]
				}
			}`,
			expected: QueryRangeRequest{
				SchemaVersion: "v2",
				Start:         1640995200000,
				End:           1640998800000,
				RequestType:   RequestTypeRaw,
				CompositeQuery: CompositeQuery{
					Queries: []QueryEnvelope{{
						Type: QueryTypeBuilder,
						Spec: QueryBuilderQuery[LogAggregation]{
							Name:         "B",
							Signal:       telemetrytypes.SignalLogs,
							StepInterval: Step{Duration: 30 * time.Second},
							Filter: &Filter{
								Expression: "severity_text = 'ERROR'",
							},
							SelectFields: []telemetrytypes.TelemetryFieldKey{{
								Name:         "body",
								FieldContext: telemetrytypes.FieldContextLog,
							}},
							Limit:  50,
							Offset: 10,
						},
					}},
				},
			},
			wantErr: false,
		},
		{
			name: "valid metric builder query",
			jsonData: `{
				"schemaVersion": "v1",
				"start": 1640995200000,
				"end": 1640998800000,
				"requestType": "time_series",
				"compositeQuery": {
					"queries": [{
						"type": "builder_query",
						"spec": {
							"name": "C",
							"signal": "metrics",
							"aggregations": [{
								"metricName": "http_requests_total",
								"temporality": "cumulative",
								"timeAggregation": "rate",
								"spaceAggregation": "sum"
							}],
							"stepInterval": 120,
							"groupBy": [{
								"name": "method",
								"fieldContext": "attribute"
							}]
						}
					}]
				}
			}`,
			expected: QueryRangeRequest{
				SchemaVersion: "v1",
				Start:         1640995200000,
				End:           1640998800000,
				RequestType:   RequestTypeTimeSeries,
				CompositeQuery: CompositeQuery{
					Queries: []QueryEnvelope{{
						Type: QueryTypeBuilder,
						Spec: QueryBuilderQuery[MetricAggregation]{
							Name:   "C",
							Signal: telemetrytypes.SignalMetrics,
							Aggregations: []MetricAggregation{{
								MetricName:       "http_requests_total",
								Temporality:      metrictypes.Cumulative,
								TimeAggregation:  metrictypes.TimeAggregationRate,
								SpaceAggregation: metrictypes.SpaceAggregationSum,
							}},
							StepInterval: Step{Duration: 120 * time.Second},
							GroupBy: []GroupByKey{{
								TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
									Name:         "method",
									FieldContext: telemetrytypes.FieldContextAttribute,
								},
							}},
						},
					}},
				},
			},
			wantErr: false,
		},
		{
			name: "valid formula query",
			jsonData: `{
				"schemaVersion": "v1",
				"start": 1640995200000,
				"end": 1640998800000,
				"requestType": "time_series",
				"compositeQuery": {
					"queries": [{
						"type": "builder_formula",
						"spec": {
							"name": "error_rate",
							"expression": "A / B * 100",
							"functions": [{
								"name": "absolute",
								"args": []
							}]
						}
					}]
				}
			}`,
			expected: QueryRangeRequest{
				SchemaVersion: "v1",
				Start:         1640995200000,
				End:           1640998800000,
				RequestType:   RequestTypeTimeSeries,
				CompositeQuery: CompositeQuery{
					Queries: []QueryEnvelope{{
						Type: QueryTypeFormula,
						Spec: QueryBuilderFormula{
							Name:       "error_rate",
							Expression: "A / B * 100",
							Functions: []Function{{
								Name: FunctionNameAbsolute,
								Args: []FunctionArg{},
							}},
						},
					}},
				},
			},
			wantErr: false,
		},
		{
			name: "function cut off min",
			jsonData: `{
				"schemaVersion": "v1",
				"start": 1640995200000,
				"end": 1640998800000,
				"requestType": "time_series",
				"compositeQuery": {
					"queries": [{
						"type": "builder_formula",
						"spec": {
							"name": "error_rate",
							"expression": "A / B * 100",
							"functions": [{
								"name": "cutOffMin",
								"args": [{
									"value": "0.3"
								}]
							}]
						}
					}]
				}
			}`,
			expected: QueryRangeRequest{
				SchemaVersion: "v1",
				Start:         1640995200000,
				End:           1640998800000,
				RequestType:   RequestTypeTimeSeries,
				CompositeQuery: CompositeQuery{
					Queries: []QueryEnvelope{{
						Type: QueryTypeFormula,
						Spec: QueryBuilderFormula{
							Name:       "error_rate",
							Expression: "A / B * 100",
							Functions: []Function{{
								Name: FunctionNameCutOffMin,
								Args: []FunctionArg{{
									Value: "0.3",
								}},
							}},
						},
					}},
				},
			},
		},
		{
			name: "valid join query",
			jsonData: `{
				"schemaVersion": "v1",
				"start": 1640995200000,
				"end": 1640998800000,
				"requestType": "scalar",
				"compositeQuery": {
					"queries": [{
						"type": "builder_join",
						"spec": {
							"name": "join_traces_logs",
							"left": {"name": "A"},
							"right": {"name": "B"},
							"type": "inner",
							"on": "trace_id = trace_id",
							"aggregations": [],
							"limit": 1000
						}
					}]
				}
			}`,
			expected: QueryRangeRequest{
				SchemaVersion: "v1",
				Start:         1640995200000,
				End:           1640998800000,
				RequestType:   RequestTypeScalar,
				CompositeQuery: CompositeQuery{
					Queries: []QueryEnvelope{{
						Type: QueryTypeJoin,
						Spec: QueryBuilderJoin{
							Name:         "join_traces_logs",
							Left:         QueryRef{Name: "A"},
							Right:        QueryRef{Name: "B"},
							Type:         JoinTypeInner,
							On:           "trace_id = trace_id",
							Aggregations: []any{},
							Limit:        1000,
						},
					}},
				},
			},
			wantErr: false,
		},
		{
			name: "valid PromQL query",
			jsonData: `{
				"schemaVersion": "v1",
				"start": 1640995200000,
				"end": 1640998800000,
				"requestType": "time_series",
				"compositeQuery": {
					"queries": [{
						"type": "promql",
						"spec": {
							"name": "cpu_usage",
							"query": "rate(cpu_usage_total[5m])",
							"disabled": false
						}
					}]
				}
			}`,
			expected: QueryRangeRequest{
				SchemaVersion: "v1",
				Start:         1640995200000,
				End:           1640998800000,
				RequestType:   RequestTypeTimeSeries,
				CompositeQuery: CompositeQuery{
					Queries: []QueryEnvelope{{
						Type: QueryTypePromQL,
						Spec: PromQuery{
							Name:     "cpu_usage",
							Query:    "rate(cpu_usage_total[5m])",
							Disabled: false,
						},
					}},
				},
			},
			wantErr: false,
		},
		{
			name: "valid ClickHouse SQL query",
			jsonData: `{
				"schemaVersion": "v1",
				"start": 1640995200000,
				"end": 1640998800000,
				"requestType": "raw",
				"compositeQuery": {
					"queries": [{
						"type": "clickhouse_sql",
						"spec": {
							"name": "custom_query",
							"query": "SELECT count(*) FROM logs WHERE timestamp >= ? AND timestamp <= ?",
							"disabled": false
						}
					}]
				}
			}`,
			expected: QueryRangeRequest{
				SchemaVersion: "v1",
				Start:         1640995200000,
				End:           1640998800000,
				RequestType:   RequestTypeRaw,
				CompositeQuery: CompositeQuery{
					Queries: []QueryEnvelope{{
						Type: QueryTypeClickHouseSQL,
						Spec: ClickHouseQuery{
							Name:     "custom_query",
							Query:    "SELECT count(*) FROM logs WHERE timestamp >= ? AND timestamp <= ?",
							Disabled: false,
						},
					}},
				},
			},
			wantErr: false,
		},
		{
			name: "multiple queries",
			jsonData: `{
				"schemaVersion": "v1",
				"start": 1640995200000,
				"end": 1640998800000,
				"requestType": "time_series",
				"compositeQuery": {
					"queries": [
						{
							"type": "builder_query",
							"spec": {
								"name": "A",
								"signal": "traces",
								"aggregations": [{"expression": "count()"}],
								"disabled": false
							}
						},
						{
							"type": "builder_formula",
							"spec": {
								"name": "B",
								"expression": "A * 100"
							}
						}
					]
				}
			}`,
			expected: QueryRangeRequest{
				SchemaVersion: "v1",
				Start:         1640995200000,
				End:           1640998800000,
				RequestType:   RequestTypeTimeSeries,
				CompositeQuery: CompositeQuery{
					Queries: []QueryEnvelope{
						{
							Type: QueryTypeBuilder,
							Spec: QueryBuilderQuery[TraceAggregation]{
								Name:         "A",
								Signal:       telemetrytypes.SignalTraces,
								Aggregations: []TraceAggregation{{Expression: "count()"}},
								Disabled:     false,
							},
						},
						{
							Type: QueryTypeFormula,
							Spec: QueryBuilderFormula{
								Name:       "B",
								Expression: "A * 100",
							},
						},
					},
				},
			},
			wantErr: false,
		},
		{
			name: "step interval as string",
			jsonData: `{
				"schemaVersion": "v1",
				"start": 1640995200000,
				"end": 1640998800000,
				"requestType": "time_series",
				"compositeQuery": {
					"queries": [{
						"type": "builder_query",
						"spec": {
							"name": "A",
							"signal": "metrics",
							"aggregations": [{"metricName": "test"}],
							"stepInterval": "5m"
						}
					}]
				}
			}`,
			expected: QueryRangeRequest{
				SchemaVersion: "v1",
				Start:         1640995200000,
				End:           1640998800000,
				RequestType:   RequestTypeTimeSeries,
				CompositeQuery: CompositeQuery{
					Queries: []QueryEnvelope{{
						Type: QueryTypeBuilder,
						Spec: QueryBuilderQuery[MetricAggregation]{
							Name:         "A",
							Signal:       telemetrytypes.SignalMetrics,
							Aggregations: []MetricAggregation{{MetricName: "test"}},
							StepInterval: Step{Duration: 5 * time.Minute},
						},
					}},
				},
			},
			wantErr: false,
		},
		{
			name:     "invalid JSON",
			jsonData: `{"invalid": json}`,
			wantErr:  true,
		},
		{
			name: "unknown query type",
			jsonData: `{
				"schemaVersion": "v1",
				"start": 1640995200000,
				"end": 1640998800000,
				"requestType": "time_series",
				"compositeQuery": {
					"queries": [{
						"type": "unknown_type",
						"spec": {}
					}]
				}
			}`,
			wantErr: true,
		},
		{
			name: "unknown signal type",
			jsonData: `{
				"schemaVersion": "v1",
				"start": 1640995200000,
				"end": 1640998800000,
				"requestType": "time_series",
				"compositeQuery": {
					"queries": [{
						"type": "builder_query",
						"spec": {
							"name": "A",
							"signal": "unknown_signal",
							"aggregations": []
						}
					}]
				}
			}`,
			wantErr: true,
		},
		{
			name: "invalid step interval",
			jsonData: `{
				"schemaVersion": "v1",
				"start": 1640995200000,
				"end": 1640998800000,
				"requestType": "time_series",
				"compositeQuery": {
					"queries": [{
						"type": "builder_query",
						"spec": {
							"name": "A",
							"signal": "traces",
							"aggregations": [],
							"stepInterval": "invalid_duration"
						}
					}]
				}
			}`,
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var req QueryRangeRequest
			err := json.Unmarshal([]byte(tt.jsonData), &req)

			if tt.wantErr {
				assert.Error(t, err)
				return
			}

			require.NoError(t, err)
			assert.Equal(t, tt.expected.SchemaVersion, req.SchemaVersion)
			assert.Equal(t, tt.expected.Start, req.Start)
			assert.Equal(t, tt.expected.End, req.End)
			assert.Equal(t, tt.expected.RequestType, req.RequestType)
			assert.Equal(t, len(tt.expected.CompositeQuery.Queries), len(req.CompositeQuery.Queries))

			for i, expectedQuery := range tt.expected.CompositeQuery.Queries {
				actualQuery := req.CompositeQuery.Queries[i]
				assert.Equal(t, expectedQuery.Type, actualQuery.Type)

				switch expectedQuery.Type {
				case QueryTypeBuilder:
					switch expectedSpec := expectedQuery.Spec.(type) {
					case QueryBuilderQuery[TraceAggregation]:
						actualSpec, ok := actualQuery.Spec.(QueryBuilderQuery[TraceAggregation])
						require.True(t, ok, "Expected TraceBuilderQuery but got %T", actualQuery.Spec)
						assert.Equal(t, expectedSpec.Name, actualSpec.Name)
						assert.Equal(t, expectedSpec.Signal, actualSpec.Signal)
						assert.Equal(t, expectedSpec.StepInterval, actualSpec.StepInterval)
						assert.Equal(t, expectedSpec.Disabled, actualSpec.Disabled)
						assert.Equal(t, len(expectedSpec.Aggregations), len(actualSpec.Aggregations))
					case QueryBuilderQuery[LogAggregation]:
						actualSpec, ok := actualQuery.Spec.(QueryBuilderQuery[LogAggregation])
						require.True(t, ok, "Expected LogBuilderQuery but got %T", actualQuery.Spec)
						assert.Equal(t, expectedSpec.Name, actualSpec.Name)
						assert.Equal(t, expectedSpec.Signal, actualSpec.Signal)
						assert.Equal(t, expectedSpec.StepInterval, actualSpec.StepInterval)
						assert.Equal(t, expectedSpec.Disabled, actualSpec.Disabled)
						assert.Equal(t, len(expectedSpec.Aggregations), len(actualSpec.Aggregations))
					case QueryBuilderQuery[MetricAggregation]:
						actualSpec, ok := actualQuery.Spec.(QueryBuilderQuery[MetricAggregation])
						require.True(t, ok, "Expected MetricBuilderQuery but got %T", actualQuery.Spec)
						assert.Equal(t, expectedSpec.Name, actualSpec.Name)
						assert.Equal(t, expectedSpec.Signal, actualSpec.Signal)
						assert.Equal(t, expectedSpec.StepInterval, actualSpec.StepInterval)
						assert.Equal(t, expectedSpec.Disabled, actualSpec.Disabled)
						assert.Equal(t, len(expectedSpec.Aggregations), len(actualSpec.Aggregations))

						for j, expectedAgg := range expectedSpec.Aggregations {
							actualAgg := actualSpec.Aggregations[j]
							assert.Equal(t, expectedAgg.MetricName, actualAgg.MetricName)
							assert.Equal(t, expectedAgg.Temporality, actualAgg.Temporality)
							assert.Equal(t, expectedAgg.TimeAggregation, actualAgg.TimeAggregation)
							assert.Equal(t, expectedAgg.SpaceAggregation, actualAgg.SpaceAggregation)
						}
					}
				case QueryTypeFormula:
					expectedSpec := expectedQuery.Spec.(QueryBuilderFormula)
					actualSpec, ok := actualQuery.Spec.(QueryBuilderFormula)
					require.True(t, ok, "Expected QueryBuilderFormula but got %T", actualQuery.Spec)
					assert.Equal(t, expectedSpec.Name, actualSpec.Name)
					assert.Equal(t, expectedSpec.Expression, actualSpec.Expression)
					assert.Equal(t, expectedSpec.Name, actualSpec.Name)
				case QueryTypeJoin:
					expectedSpec := expectedQuery.Spec.(QueryBuilderJoin)
					actualSpec, ok := actualQuery.Spec.(QueryBuilderJoin)
					require.True(t, ok, "Expected QueryBuilderJoin but got %T", actualQuery.Spec)
					assert.Equal(t, expectedSpec.Name, actualSpec.Name)
					assert.Equal(t, expectedSpec.Left.Name, actualSpec.Left.Name)
					assert.Equal(t, expectedSpec.Right.Name, actualSpec.Right.Name)
					assert.Equal(t, expectedSpec.Type, actualSpec.Type)
					assert.Equal(t, expectedSpec.On, actualSpec.On)
				case QueryTypeTraceOperator:
					expectedSpec := expectedQuery.Spec.(QueryBuilderTraceOperator)
					actualSpec, ok := actualQuery.Spec.(QueryBuilderTraceOperator)
					require.True(t, ok, "Expected QueryBuilderTraceOperator but got %T", actualQuery.Spec)
					assert.Equal(t, expectedSpec.Name, actualSpec.Name)
					assert.Equal(t, expectedSpec.Expression, actualSpec.Expression)
					assert.Equal(t, expectedSpec.Limit, actualSpec.Limit)
					assert.Equal(t, expectedSpec.Cursor, actualSpec.Cursor)
					assert.Equal(t, len(expectedSpec.Order), len(actualSpec.Order))
					for i, expectedOrder := range expectedSpec.Order {
						if i < len(actualSpec.Order) {
							assert.Equal(t, expectedOrder.Key.Name, actualSpec.Order[i].Key.Name)
							assert.Equal(t, expectedOrder.Direction, actualSpec.Order[i].Direction)
						}
					}
				case QueryTypePromQL:
					expectedSpec := expectedQuery.Spec.(PromQuery)
					actualSpec, ok := actualQuery.Spec.(PromQuery)
					require.True(t, ok, "Expected PromQuery but got %T", actualQuery.Spec)
					assert.Equal(t, expectedSpec.Name, actualSpec.Name)
					assert.Equal(t, expectedSpec.Query, actualSpec.Query)
					assert.Equal(t, expectedSpec.Disabled, actualSpec.Disabled)
				case QueryTypeClickHouseSQL:
					expectedSpec := expectedQuery.Spec.(ClickHouseQuery)
					actualSpec, ok := actualQuery.Spec.(ClickHouseQuery)
					require.True(t, ok, "Expected ClickHouseQuery but got %T", actualQuery.Spec)
					assert.Equal(t, expectedSpec.Name, actualSpec.Name)
					assert.Equal(t, expectedSpec.Query, actualSpec.Query)
					assert.Equal(t, expectedSpec.Disabled, actualSpec.Disabled)
				}
			}

			if tt.expected.Variables != nil {
				assert.Equal(t, tt.expected.Variables, req.Variables)
			}
		})
	}
}

func TestParseTraceExpression(t *testing.T) {
	tests := []struct {
		name            string
		expression      string
		expectError     bool
		expectedOpCount int
		checkResult     func(t *testing.T, result *TraceOperand)
	}{
		{
			name:            "simple query reference",
			expression:      "A",
			expectError:     false,
			expectedOpCount: 0,
			checkResult: func(t *testing.T, result *TraceOperand) {
				assert.NotNil(t, result.QueryRef)
				assert.Equal(t, "A", result.QueryRef.Name)
				assert.Nil(t, result.Operator)
			},
		},
		{
			name:            "simple implication",
			expression:      "A => B",
			expectError:     false,
			expectedOpCount: 1,
			checkResult: func(t *testing.T, result *TraceOperand) {
				assert.NotNil(t, result.Operator)
				assert.Equal(t, TraceOperatorDirectDescendant, *result.Operator)
				assert.NotNil(t, result.Left)
				assert.NotNil(t, result.Right)
				assert.Equal(t, "A", result.Left.QueryRef.Name)
				assert.Equal(t, "B", result.Right.QueryRef.Name)
			},
		},
		{
			name:            "and operation",
			expression:      "A && B",
			expectError:     false,
			expectedOpCount: 1,
			checkResult: func(t *testing.T, result *TraceOperand) {
				assert.NotNil(t, result.Operator)
				assert.Equal(t, TraceOperatorAnd, *result.Operator)
				assert.Equal(t, "A", result.Left.QueryRef.Name)
				assert.Equal(t, "B", result.Right.QueryRef.Name)
			},
		},
		{
			name:            "or operation",
			expression:      "A || B",
			expectError:     false,
			expectedOpCount: 1,
			checkResult: func(t *testing.T, result *TraceOperand) {
				assert.NotNil(t, result.Operator)
				assert.Equal(t, TraceOperatorOr, *result.Operator)
				assert.Equal(t, "A", result.Left.QueryRef.Name)
				assert.Equal(t, "B", result.Right.QueryRef.Name)
			},
		},
		{
			name:            "unary NOT operation",
			expression:      "NOT A",
			expectError:     false,
			expectedOpCount: 1,
			checkResult: func(t *testing.T, result *TraceOperand) {
				assert.NotNil(t, result.Operator)
				assert.Equal(t, TraceOperatorNot, *result.Operator)
				assert.NotNil(t, result.Left)
				assert.Nil(t, result.Right)
				assert.Equal(t, "A", result.Left.QueryRef.Name)
			},
		},
		{
			name:            "binary NOT operation",
			expression:      "A NOT B",
			expectError:     false,
			expectedOpCount: 1,
			checkResult: func(t *testing.T, result *TraceOperand) {
				assert.NotNil(t, result.Operator)
				assert.Equal(t, TraceOperatorExclude, *result.Operator)
				assert.NotNil(t, result.Left)
				assert.NotNil(t, result.Right)
				assert.Equal(t, "A", result.Left.QueryRef.Name)
				assert.Equal(t, "B", result.Right.QueryRef.Name)
			},
		},
		{
			name:            "complex expression with precedence",
			expression:      "A => B && C || D",
			expectError:     false,
			expectedOpCount: 3, // Three operators: =>, &&, ||
			checkResult: func(t *testing.T, result *TraceOperand) {
				// Should parse as: A => (B && (C || D)) due to precedence: NOT > || > && > =>
				// The parsing finds operators from lowest precedence first
				assert.NotNil(t, result.Operator)
				assert.Equal(t, TraceOperatorDirectDescendant, *result.Operator)
				assert.Equal(t, "A", result.Left.QueryRef.Name)

				// Right side should be an AND operation (next lowest precedence after =>)
				assert.NotNil(t, result.Right.Operator)
				assert.Equal(t, TraceOperatorAnd, *result.Right.Operator)
			},
		},
		{
			name:            "simple parentheses",
			expression:      "(A)",
			expectError:     false,
			expectedOpCount: 0,
			checkResult: func(t *testing.T, result *TraceOperand) {
				assert.NotNil(t, result.QueryRef)
				assert.Equal(t, "A", result.QueryRef.Name)
				assert.Nil(t, result.Operator)
			},
		},
		{
			name:            "parentheses expression",
			expression:      "A => (B || C)",
			expectError:     false,
			expectedOpCount: 2, // Two operators: =>, ||
			checkResult: func(t *testing.T, result *TraceOperand) {
				assert.NotNil(t, result.Operator)
				assert.Equal(t, TraceOperatorDirectDescendant, *result.Operator)
				assert.Equal(t, "A", result.Left.QueryRef.Name)

				// Right side should be an OR operation
				assert.NotNil(t, result.Right.Operator)
				assert.Equal(t, TraceOperatorOr, *result.Right.Operator)
				assert.Equal(t, "B", result.Right.Left.QueryRef.Name)
				assert.Equal(t, "C", result.Right.Right.QueryRef.Name)
			},
		},
		{
			name:            "nested NOT with parentheses",
			expression:      "NOT (A && B)",
			expectError:     false,
			expectedOpCount: 2, // Two operators: NOT, &&
			checkResult: func(t *testing.T, result *TraceOperand) {
				assert.NotNil(t, result.Operator)
				assert.Equal(t, TraceOperatorNot, *result.Operator)
				assert.Nil(t, result.Right) // Unary operator

				// Left side should be an AND operation
				assert.NotNil(t, result.Left.Operator)
				assert.Equal(t, TraceOperatorAnd, *result.Left.Operator)
			},
		},
		{
			name:            "complex expression exceeding operator limit",
			expression:      "A => B => C => D => E => F => G => H => I => J => K => L",
			expectError:     false, // parseTraceExpression doesn't validate count, ParseExpression does
			expectedOpCount: 11,    // 11 => operators
			checkResult:     nil,
		},
		{
			name:        "invalid query reference with numbers",
			expression:  "123",
			expectError: true,
		},
		{
			name:        "invalid query reference with special chars",
			expression:  "A-B",
			expectError: true,
		},
		{
			name:        "empty expression",
			expression:  "",
			expectError: true,
		},
		{
			name:            "expression with extra whitespace",
			expression:      "  A   =>   B  ",
			expectError:     false,
			expectedOpCount: 1,
			checkResult: func(t *testing.T, result *TraceOperand) {
				assert.NotNil(t, result.Operator)
				assert.Equal(t, TraceOperatorDirectDescendant, *result.Operator)
				assert.Equal(t, "A", result.Left.QueryRef.Name)
				assert.Equal(t, "B", result.Right.QueryRef.Name)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, opCount, err := parseTraceExpression(tt.expression)

			if tt.expectError {
				assert.Error(t, err)
				assert.Nil(t, result)
				return
			}

			require.NoError(t, err)
			require.NotNil(t, result)
			assert.Equal(t, tt.expectedOpCount, opCount, "operator count mismatch")

			if tt.checkResult != nil {
				tt.checkResult(t, result)
			}
		})
	}
}

func TestQueryBuilderTraceOperator_ParseExpression_OperatorLimit(t *testing.T) {
	tests := []struct {
		name          string
		expression    string
		expectError   bool
		errorContains string
	}{
		{
			name:        "within operator limit",
			expression:  "A => B => C",
			expectError: false,
		},
		{
			name:          "exceeding operator limit",
			expression:    "A => B => C => D => E => F => G => H => I => J => K => L",
			expectError:   true,
			errorContains: "expression contains 11 operators, which exceeds the maximum allowed 10 operators",
		},
		{
			name:        "exactly at limit",
			expression:  "A => B => C => D => E => F => G => H => I => J => K",
			expectError: false, // 10 operators, exactly at limit
		},
		{
			name:        "complex expression at limit",
			expression:  "(A && B) => (C || D) => (E && F) => (G || H) => (I && J) => K",
			expectError: false, // 10 operators: 3 &&, 2 ||, 5 => = 10 total
		},
		{
			name:          "complex expression exceeding limit",
			expression:    "(A && B) => (C || D) => (E && F) => (G || H) => (I && J) => (K || L)",
			expectError:   true,
			errorContains: "expression contains 11 operators, which exceeds the maximum allowed 10 operators",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			op := &QueryBuilderTraceOperator{
				Expression: tt.expression,
			}

			err := op.ParseExpression()

			if tt.expectError {
				assert.Error(t, err)
				if tt.errorContains != "" {
					assert.Contains(t, err.Error(), tt.errorContains)
				}
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, op.ParsedExpression)
			}
		})
	}
}

func TestQueryBuilderTraceOperator_ValidateTraceOperator(t *testing.T) {
	tests := []struct {
		name          string
		traceOperator QueryBuilderTraceOperator
		queries       []QueryEnvelope
		expectError   bool
		errorContains string
	}{
		{
			name: "valid trace operator with trace queries",
			traceOperator: QueryBuilderTraceOperator{
				Name:       "test_operator",
				Expression: "A => B",
				Filter: &Filter{
					Expression: "trace_duration > 200ms",
				},
				Order: []OrderBy{{
					Key: OrderByKey{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name:         OrderByTraceDuration.StringValue(),
							FieldContext: telemetrytypes.FieldContextSpan,
						},
					},
					Direction: OrderDirectionDesc,
				}},
				Limit: 100,
			},
			queries: []QueryEnvelope{
				{
					Type: QueryTypeBuilder,
					Spec: QueryBuilderQuery[TraceAggregation]{
						Name:   "A",
						Signal: telemetrytypes.SignalTraces,
					},
				},
				{
					Type: QueryTypeBuilder,
					Spec: QueryBuilderQuery[TraceAggregation]{
						Name:   "B",
						Signal: telemetrytypes.SignalTraces,
					},
				},
			},
			expectError: false,
		},
		{
			name: "empty expression",
			traceOperator: QueryBuilderTraceOperator{
				Name:       "test_operator",
				Expression: "",
			},
			queries:       []QueryEnvelope{},
			expectError:   true,
			errorContains: "expression cannot be empty",
		},
		{
			name: "referenced query does not exist",
			traceOperator: QueryBuilderTraceOperator{
				Name:       "test_operator",
				Expression: "A => B",
			},
			queries: []QueryEnvelope{
				{
					Type: QueryTypeBuilder,
					Spec: QueryBuilderQuery[TraceAggregation]{
						Name:   "A",
						Signal: telemetrytypes.SignalTraces,
					},
				},
			},
			expectError:   true,
			errorContains: "query 'B' referenced in trace operator expression does not exist or is not a trace query",
		},
		{
			name: "referenced query is not trace signal",
			traceOperator: QueryBuilderTraceOperator{
				Name:       "test_operator",
				Expression: "A => B",
			},
			queries: []QueryEnvelope{
				{
					Type: QueryTypeBuilder,
					Spec: QueryBuilderQuery[TraceAggregation]{
						Name:   "A",
						Signal: telemetrytypes.SignalTraces,
					},
				},
				{
					Type: QueryTypeBuilder,
					Spec: QueryBuilderQuery[LogAggregation]{
						Name:   "B",
						Signal: telemetrytypes.SignalLogs,
					},
				},
			},
			expectError:   true,
			errorContains: "query 'B' referenced in trace operator expression does not exist or is not a trace query",
		},
		{
			name: "invalid orderBy field",
			traceOperator: QueryBuilderTraceOperator{
				Name:       "test_operator",
				Expression: "A",
				Order: []OrderBy{{
					Key:       OrderByKey{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "invalid_string"}},
					Direction: OrderDirectionDesc,
				}},
			},
			queries: []QueryEnvelope{{
				Type: QueryTypeBuilder,
				Spec: QueryBuilderQuery[TraceAggregation]{Name: "A", Signal: telemetrytypes.SignalTraces},
			}},
			expectError:   true,
			errorContains: "orderBy[0] field must be either 'span_count' or 'trace_duration'",
		},
		{
			name: "invalid pagination limit",
			traceOperator: QueryBuilderTraceOperator{
				Name:       "test_operator",
				Expression: "A",
				Limit:      -1,
			},
			queries: []QueryEnvelope{
				{
					Type: QueryTypeBuilder,
					Spec: QueryBuilderQuery[TraceAggregation]{
						Name:   "A",
						Signal: telemetrytypes.SignalTraces,
					},
				},
			},
			expectError:   true,
			errorContains: "limit must be non-negative",
		},
		{
			name: "limit exceeds maximum",
			traceOperator: QueryBuilderTraceOperator{
				Name:       "test_operator",
				Expression: "A",
				Limit:      15000,
			},
			queries: []QueryEnvelope{
				{
					Type: QueryTypeBuilder,
					Spec: QueryBuilderQuery[TraceAggregation]{
						Name:   "A",
						Signal: telemetrytypes.SignalTraces,
					},
				},
			},
			expectError:   true,
			errorContains: "limit cannot exceed 10000",
		},
		{
			name: "valid returnSpansFrom",
			traceOperator: QueryBuilderTraceOperator{
				Name:            "test_operator",
				Expression:      "A => B",
				ReturnSpansFrom: "A",
			},
			queries: []QueryEnvelope{
				{
					Type: QueryTypeBuilder,
					Spec: QueryBuilderQuery[TraceAggregation]{
						Name:   "A",
						Signal: telemetrytypes.SignalTraces,
					},
				},
				{
					Type: QueryTypeBuilder,
					Spec: QueryBuilderQuery[TraceAggregation]{
						Name:   "B",
						Signal: telemetrytypes.SignalTraces,
					},
				},
			},
			expectError: false,
		},
		{
			name: "returnSpansFrom references non-existent query",
			traceOperator: QueryBuilderTraceOperator{
				Name:            "test_operator",
				Expression:      "A => B",
				ReturnSpansFrom: "C",
			},
			queries: []QueryEnvelope{
				{
					Type: QueryTypeBuilder,
					Spec: QueryBuilderQuery[TraceAggregation]{
						Name:   "A",
						Signal: telemetrytypes.SignalTraces,
					},
				},
				{
					Type: QueryTypeBuilder,
					Spec: QueryBuilderQuery[TraceAggregation]{
						Name:   "B",
						Signal: telemetrytypes.SignalTraces,
					},
				},
			},
			expectError:   true,
			errorContains: "returnSpansFrom references query 'C' which does not exist or is not a trace query",
		},
		{
			name: "returnSpansFrom references query not in expression",
			traceOperator: QueryBuilderTraceOperator{
				Name:            "test_operator",
				Expression:      "A => B",
				ReturnSpansFrom: "C",
			},
			queries: []QueryEnvelope{
				{
					Type: QueryTypeBuilder,
					Spec: QueryBuilderQuery[TraceAggregation]{
						Name:   "A",
						Signal: telemetrytypes.SignalTraces,
					},
				},
				{
					Type: QueryTypeBuilder,
					Spec: QueryBuilderQuery[TraceAggregation]{
						Name:   "B",
						Signal: telemetrytypes.SignalTraces,
					},
				},
				{
					Type: QueryTypeBuilder,
					Spec: QueryBuilderQuery[TraceAggregation]{
						Name:   "C",
						Signal: telemetrytypes.SignalTraces,
					},
				},
			},
			expectError:   true,
			errorContains: "returnSpansFrom references query 'C' which is not used in the expression",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.traceOperator.ValidateTraceOperator(tt.queries)

			if tt.expectError {
				assert.Error(t, err)
				if tt.errorContains != "" {
					assert.Contains(t, err.Error(), tt.errorContains)
				}
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestValidateUniqueTraceOperator(t *testing.T) {
	tests := []struct {
		name          string
		queries       []QueryEnvelope
		expectError   bool
		errorContains string
	}{
		{
			name: "no trace operators",
			queries: []QueryEnvelope{
				{Type: QueryTypeBuilder},
				{Type: QueryTypeFormula},
			},
			expectError: false,
		},
		{
			name: "single trace operator",
			queries: []QueryEnvelope{
				{Type: QueryTypeBuilder},
				{
					Type: QueryTypeTraceOperator,
					Spec: QueryBuilderTraceOperator{
						Name: "T1",
					},
				},
				{Type: QueryTypeFormula},
			},
			expectError: false,
		},
		{
			name: "multiple trace operators",
			queries: []QueryEnvelope{
				{Type: QueryTypeBuilder},
				{
					Type: QueryTypeTraceOperator,
					Spec: QueryBuilderTraceOperator{
						Name: "T1",
					},
				},
				{
					Type: QueryTypeTraceOperator,
					Spec: QueryBuilderTraceOperator{
						Name: "T2",
					},
				},
				{Type: QueryTypeFormula},
			},
			expectError:   true,
			errorContains: "only one trace operator is allowed per request, found 2 trace operators: [T1 T2]",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateUniqueTraceOperator(tt.queries)

			if tt.expectError {
				assert.Error(t, err)
				if tt.errorContains != "" {
					assert.Contains(t, err.Error(), tt.errorContains)
				}
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestQueryRangeRequest_GetQueriesSupportingZeroDefault(t *testing.T) {
	tests := []struct {
		name           string
		CompositeQuery CompositeQuery
		want           map[string]bool
	}{
		{
			name: "test count on traces - support zeroDefault",
			CompositeQuery: CompositeQuery{
				Queries: []QueryEnvelope{
					{
						Type: QueryTypeBuilder,
						Spec: QueryBuilderQuery[TraceAggregation]{
							Name:   "A",
							Signal: telemetrytypes.SignalTraces,
							Filter: &Filter{
								Expression: "service.name = demo",
							},
							Aggregations: []TraceAggregation{
								{
									Expression: "count()",
								},
							},
						},
					},
					{
						Type: QueryTypeBuilder,
						Spec: QueryBuilderQuery[TraceAggregation]{
							Name:   "B",
							Signal: telemetrytypes.SignalTraces,
							Aggregations: []TraceAggregation{
								{
									Expression: "count()",
								},
							},
						},
					},
					{
						Type: QueryTypeFormula,
						Spec: QueryBuilderFormula{
							Expression: "A / B * 100",
						},
					},
				},
			},
			want: map[string]bool{
				"A": true,
				"B": true,
			},
		},
		{
			name: "test rate on logs - support zeroDefault",
			CompositeQuery: CompositeQuery{
				Queries: []QueryEnvelope{
					{
						Type: QueryTypeBuilder,
						Spec: QueryBuilderQuery[LogAggregation]{
							Name:   "A",
							Signal: telemetrytypes.SignalTraces,
							Filter: &Filter{
								Expression: "service.name = demo",
							},
							Aggregations: []LogAggregation{
								{
									Expression: "rate()",
								},
							},
						},
					},
				},
			},
			want: map[string]bool{
				"A": true,
			},
		},
		{
			name: "test metrics",
			CompositeQuery: CompositeQuery{
				Queries: []QueryEnvelope{
					{
						Type: QueryTypeBuilder,
						Spec: QueryBuilderQuery[MetricAggregation]{
							Name:   "A",
							Signal: telemetrytypes.SignalTraces,
							Filter: &Filter{
								Expression: "service.name = demo",
							},
							Aggregations: []MetricAggregation{
								{
									MetricName:       "calls",
									TimeAggregation:  metrictypes.TimeAggregationRate,
									SpaceAggregation: metrictypes.SpaceAggregationSum,
								},
							},
						},
					},
					{
						Type: QueryTypeBuilder,
						Spec: QueryBuilderQuery[MetricAggregation]{
							Name:   "B",
							Signal: telemetrytypes.SignalTraces,
							Filter: &Filter{
								Expression: "service.name = demo",
							},
							Aggregations: []MetricAggregation{
								{
									MetricName:       "memory.usage",
									TimeAggregation:  metrictypes.TimeAggregationAvg,
									SpaceAggregation: metrictypes.SpaceAggregationSum,
								},
							},
						},
					},
					{
						Type: QueryTypeBuilder,
						Spec: QueryBuilderQuery[MetricAggregation]{
							Name:   "C",
							Signal: telemetrytypes.SignalTraces,
							Filter: &Filter{
								Expression: "service.name = demo",
							},
							Aggregations: []MetricAggregation{
								{
									MetricName:       "calls",
									TimeAggregation:  metrictypes.TimeAggregationIncrease,
									SpaceAggregation: metrictypes.SpaceAggregationSum,
								},
							},
						},
					},
					{
						Type: QueryTypeBuilder,
						Spec: QueryBuilderQuery[MetricAggregation]{
							Name:   "D",
							Signal: telemetrytypes.SignalTraces,
							Filter: &Filter{
								Expression: "service.name = demo",
							},
							Aggregations: []MetricAggregation{
								{
									MetricName:       "calls",
									TimeAggregation:  metrictypes.TimeAggregationCount,
									SpaceAggregation: metrictypes.SpaceAggregationSum,
								},
							},
						},
					},
				},
			},
			want: map[string]bool{
				"A": true,
				"C": true,
				"D": true,
			},
		},
		{
			name: "test min on logs - doesn't support zeroDefault",
			CompositeQuery: CompositeQuery{
				Queries: []QueryEnvelope{
					{
						Type: QueryTypeBuilder,
						Spec: QueryBuilderQuery[LogAggregation]{
							Name:   "A",
							Signal: telemetrytypes.SignalTraces,
							Filter: &Filter{
								Expression: "service.name = demo",
							},
							Aggregations: []LogAggregation{
								{
									Expression: "min(duration)",
								},
							},
						},
					},
				},
			},
			want: map[string]bool{},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := &QueryRangeRequest{
				CompositeQuery: tt.CompositeQuery,
			}
			if got := r.GetQueriesSupportingZeroDefault(); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("QueryRangeRequest.GetQueriesSupportingZeroDefault() = %v, want %v", got, tt.want)
			}
		})
	}
}

package querybuildertypesv5

import (
	"encoding/json"
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
					"service": "frontend"
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
				Variables: map[string]any{
					"service": "frontend",
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
								"key": "body",
								"type": "log"
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
								"key": "method",
								"type": "tag"
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
								"name": "cut_off_min",
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
							"name": "B",
							"type": "builder_formula",
							"spec": {
								"name": "rate",
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
								Name:       "rate",
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
						"name": "A",
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
						"name": "A",
						"type": "builder_query",
						"spec": {
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
						"name": "A",
						"type": "builder_query",
						"spec": {
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

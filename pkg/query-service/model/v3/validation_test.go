package v3

import (
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/require"
)

func TestValidateCompositeQuery(t *testing.T) {

	tests := []struct {
		name           string
		compositeQuery *CompositeQuery
		wantErr        bool
		errContains    string
	}{
		{
			name:           "nil composite query should return error",
			compositeQuery: nil,
			wantErr:        true,
			errContains:    "composite query is required",
		},
		{
			name: "empty queries array should return error",
			compositeQuery: &CompositeQuery{
				Queries: []qbtypes.QueryEnvelope{},
			},
			wantErr:     true,
			errContains: "at least one query is required",
		},
		{
			name: "invalid input error",
			compositeQuery: &CompositeQuery{
				Unit: "some_invalid_unit",
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypePromQL,
						Spec: qbtypes.PromQuery{
							Name:  "prom_query",
							Query: "rate(http_requests_total[5m])",
						},
					},
				},
			},
			wantErr:     true,
			errContains: "invalid unit",
		},
		{
			name: "valid metric builder query should pass",
			compositeQuery: &CompositeQuery{
				Unit: "bytes", // valid unit
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
							Name:   "metric_query",
							Signal: telemetrytypes.SignalMetrics,
							Aggregations: []qbtypes.MetricAggregation{
								{
									MetricName: "cpu_usage",
								},
							},
						},
					},
				},
			},
			wantErr: false,
		},
		{
			name: "valid log builder query should pass",
			compositeQuery: &CompositeQuery{
				Unit: "µs", // valid unit
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
							Name:   "log_query",
							Signal: telemetrytypes.SignalLogs,
							Aggregations: []qbtypes.LogAggregation{
								{
									Expression: "count()",
								},
							},
						},
					},
				},
			},
			wantErr: false,
		},
		{
			name: "valid trace builder query should pass",
			compositeQuery: &CompositeQuery{
				Unit: "MBs", // valid unit
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
							Name:   "trace_query",
							Signal: telemetrytypes.SignalTraces,
							Aggregations: []qbtypes.TraceAggregation{
								{
									Expression: "count()",
								},
							},
						},
					},
				},
			},
			wantErr: false,
		},
		{
			name: "valid PromQL query should pass",
			compositeQuery: &CompositeQuery{
				Unit: "{req}/s", // valid unit
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypePromQL,
						Spec: qbtypes.PromQuery{
							Name:  "prom_query",
							Query: "rate(http_requests_total[5m])",
						},
					},
				},
			},
			wantErr: false,
		},
		{
			name: "valid ClickHouse query should pass",
			compositeQuery: &CompositeQuery{
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypeClickHouseSQL,
						Spec: qbtypes.ClickHouseQuery{
							Name:  "ch_query",
							Query: "SELECT count(*) FROM metrics WHERE metric_name = 'cpu_usage'",
						},
					},
				},
			},
			wantErr: false,
		},
		{
			name: "valid formula query should pass",
			compositeQuery: &CompositeQuery{
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypeFormula,
						Spec: qbtypes.QueryBuilderFormula{
							Name:       "formula_query",
							Expression: "A + B",
						},
					},
				},
			},
			wantErr: false,
		},
		{
			name: "valid join query should pass",
			compositeQuery: &CompositeQuery{
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypeJoin,
						Spec: qbtypes.QueryBuilderJoin{
							Name:  "join_query",
							Left:  qbtypes.QueryRef{Name: "A"},
							Right: qbtypes.QueryRef{Name: "B"},
							Type:  qbtypes.JoinTypeInner,
							On:    "service_name",
						},
					},
				},
			},
			wantErr: false,
		},
		{
			name: "valid trace operator query should pass",
			compositeQuery: &CompositeQuery{
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
							Name:   "A",
							Signal: telemetrytypes.SignalTraces,
							Aggregations: []qbtypes.TraceAggregation{
								{
									Expression: "count()",
								},
							},
						},
					},
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
							Name:   "B",
							Signal: telemetrytypes.SignalTraces,
							Aggregations: []qbtypes.TraceAggregation{
								{
									Expression: "count()",
								},
							},
						},
					},
					{
						Type: qbtypes.QueryTypeTraceOperator,
						Spec: qbtypes.QueryBuilderTraceOperator{
							Name:       "trace_operator",
							Expression: "A && B",
						},
					},
				},
			},
			wantErr: false,
		},
		{
			name: "invalid metric builder query - missing aggregation should return error",
			compositeQuery: &CompositeQuery{
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
							Name:         "metric_query",
							Signal:       telemetrytypes.SignalMetrics,
							Aggregations: []qbtypes.MetricAggregation{},
						},
					},
				},
			},
			wantErr:     true,
			errContains: "invalid",
		},
		{
			name: "invalid PromQL query - empty query should return error",
			compositeQuery: &CompositeQuery{
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypePromQL,
						Spec: qbtypes.PromQuery{
							Name:  "prom_query",
							Query: "",
						},
					},
				},
			},
			wantErr:     true,
			errContains: "query expression is required",
		},
		{
			name: "invalid PromQL query - syntax error should return error",
			compositeQuery: &CompositeQuery{
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypePromQL,
						Spec: qbtypes.PromQuery{
							Name:  "prom_query",
							Query: "rate(http_requests_total[5m",
						},
					},
				},
			},
			wantErr:     true,
			errContains: "unclosed left parenthesis",
		},
		{
			name: "invalid ClickHouse query - empty query should return error",
			compositeQuery: &CompositeQuery{
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypeClickHouseSQL,
						Spec: qbtypes.ClickHouseQuery{
							Name:  "ch_query",
							Query: "",
						},
					},
				},
			},
			wantErr:     true,
			errContains: "query expression is required",
		},
		{
			name: "invalid ClickHouse query - syntax error should return error",
			compositeQuery: &CompositeQuery{
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypeClickHouseSQL,
						Spec: qbtypes.ClickHouseQuery{
							Name:  "ch_query",
							Query: "SELECT * FROM metrics WHERE",
						},
					},
				},
			},
			wantErr:     true,
			errContains: "query parse error",
		},
		{
			name: "invalid formula query - empty expression should return error",
			compositeQuery: &CompositeQuery{
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypeFormula,
						Spec: qbtypes.QueryBuilderFormula{
							Name:       "formula_query",
							Expression: "",
						},
					},
				},
			},
			wantErr:     true,
			errContains: "formula expression cannot be blank",
		},
		{
			name: "invalid trace operator query - empty expression should return error",
			compositeQuery: &CompositeQuery{
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypeTraceOperator,
						Spec: qbtypes.QueryBuilderTraceOperator{
							Name:       "trace_operator",
							Expression: "",
						},
					},
				},
			},
			wantErr:     true,
			errContains: "expression cannot be empty",
		},
		{
			name: "all queries disabled should return error",
			compositeQuery: &CompositeQuery{
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
							Name:     "metric_query",
							Disabled: true,
							Signal:   telemetrytypes.SignalMetrics,
							Aggregations: []qbtypes.MetricAggregation{
								{
									MetricName: "cpu_usage",
								},
							},
						},
					},
					{
						Type: qbtypes.QueryTypePromQL,
						Spec: qbtypes.PromQuery{
							Name:     "prom_query",
							Query:    "rate(http_requests_total[5m])",
							Disabled: true,
						},
					},
				},
			},
			wantErr:     true,
			errContains: "all queries are disabled",
		},
		{
			name: "mixed disabled and enabled queries should pass",
			compositeQuery: &CompositeQuery{
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
							Name:     "metric_query",
							Disabled: true,
							Signal:   telemetrytypes.SignalMetrics,
							Aggregations: []qbtypes.MetricAggregation{
								{
									MetricName: "cpu_usage",
								},
							},
						},
					},
					{
						Type: qbtypes.QueryTypePromQL,
						Spec: qbtypes.PromQuery{
							Name:     "prom_query",
							Query:    "rate(http_requests_total[5m])",
							Disabled: false,
						},
					},
				},
			},
			wantErr: false,
		},
		{
			name: "multiple valid queries should pass",
			compositeQuery: &CompositeQuery{
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
							Name:   "metric_query",
							Signal: telemetrytypes.SignalMetrics,
							Aggregations: []qbtypes.MetricAggregation{
								{
									MetricName: "cpu_usage",
								},
							},
						},
					},
					{
						Type: qbtypes.QueryTypePromQL,
						Spec: qbtypes.PromQuery{
							Name:  "prom_query",
							Query: "rate(http_requests_total[5m])",
						},
					},
					{
						Type: qbtypes.QueryTypeClickHouseSQL,
						Spec: qbtypes.ClickHouseQuery{
							Name:  "ch_query",
							Query: "SELECT count(*) FROM metrics WHERE metric_name = 'cpu_usage'",
						},
					},
				},
			},
			wantErr: false,
		},
		{
			name: "invalid query in multiple queries should return error",
			compositeQuery: &CompositeQuery{
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
							Name:   "metric_query",
							Signal: telemetrytypes.SignalMetrics,
							Aggregations: []qbtypes.MetricAggregation{
								{
									MetricName: "cpu_usage",
								},
							},
						},
					},
					{
						Type: qbtypes.QueryTypePromQL,
						Spec: qbtypes.PromQuery{
							Name:  "prom_query",
							Query: "invalid promql syntax [",
						},
					},
				},
			},
			wantErr:     true,
			errContains: "query parse error",
		},
		{
			name: "unknown query type should return error",
			compositeQuery: &CompositeQuery{
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryType{String: valuer.NewString("invalid_query_type")},
						Spec: qbtypes.PromQuery{
							Name:  "prom_query",
							Query: "rate(http_requests_total[5m])",
						},
					},
				},
			},
			wantErr:     true,
			errContains: "unknown query type",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.compositeQuery.Validate()
			if tt.wantErr {
				require.Error(t, err)
				if tt.errContains != "" {
					require.Contains(t, err.Error(), tt.errContains)
				}
			} else {
				require.NoError(t, err)
			}
		})
	}
}

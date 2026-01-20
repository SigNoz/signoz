package querybuildertypesv5

import (
	"strings"
	"testing"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

func contains(s, substr string) bool {
	return strings.Contains(s, substr)
}

func TestQueryRangeRequest_ValidateAllQueriesNotDisabled(t *testing.T) {
	tests := []struct {
		name    string
		request QueryRangeRequest
		wantErr bool
		errMsg  string
	}{
		{
			name: "all queries disabled should return error",
			request: QueryRangeRequest{
				Start:       1640995200000,
				End:         1640998800000,
				RequestType: RequestTypeTimeSeries,
				CompositeQuery: CompositeQuery{
					Queries: []QueryEnvelope{
						{
							Type: QueryTypeBuilder,
							Spec: QueryBuilderQuery[MetricAggregation]{
								Name:     "A",
								Disabled: true,
								Signal:   telemetrytypes.SignalMetrics,
							},
						},
						{
							Type: QueryTypeBuilder,
							Spec: QueryBuilderQuery[LogAggregation]{
								Name:     "B",
								Disabled: true,
								Signal:   telemetrytypes.SignalLogs,
							},
						},
					},
				},
			},
			wantErr: true,
			errMsg:  "all queries are disabled - at least one query must be enabled",
		},
		{
			name: "mixed disabled and enabled queries should pass",
			request: QueryRangeRequest{
				Start:       1640995200000,
				End:         1640998800000,
				RequestType: RequestTypeTimeSeries,
				CompositeQuery: CompositeQuery{
					Queries: []QueryEnvelope{
						{
							Type: QueryTypeBuilder,
							Spec: QueryBuilderQuery[MetricAggregation]{
								Name:     "A",
								Disabled: true,
								Signal:   telemetrytypes.SignalMetrics,
							},
						},
						{
							Type: QueryTypeBuilder,
							Spec: QueryBuilderQuery[LogAggregation]{
								Name:     "B",
								Disabled: false,
								Signal:   telemetrytypes.SignalLogs,
								Aggregations: []LogAggregation{
									{
										Expression: "count()",
									},
								},
							},
						},
					},
				},
			},
			wantErr: false,
		},
		{
			name: "all queries enabled should pass",
			request: QueryRangeRequest{
				Start:       1640995200000,
				End:         1640998800000,
				RequestType: RequestTypeTimeSeries,
				CompositeQuery: CompositeQuery{
					Queries: []QueryEnvelope{
						{
							Type: QueryTypeBuilder,
							Spec: QueryBuilderQuery[LogAggregation]{
								Name:     "A",
								Disabled: false,
								Signal:   telemetrytypes.SignalLogs,
								Aggregations: []LogAggregation{
									{
										Expression: "count()",
									},
								},
							},
						},
						{
							Type: QueryTypeBuilder,
							Spec: QueryBuilderQuery[LogAggregation]{
								Name:     "B",
								Disabled: false,
								Signal:   telemetrytypes.SignalLogs,
								Aggregations: []LogAggregation{
									{
										Expression: "sum(duration)",
									},
								},
							},
						},
					},
				},
			},
			wantErr: false,
		},
		{
			name: "all formula queries disabled should return error",
			request: QueryRangeRequest{
				Start:       1640995200000,
				End:         1640998800000,
				RequestType: RequestTypeTimeSeries,
				CompositeQuery: CompositeQuery{
					Queries: []QueryEnvelope{
						{
							Type: QueryTypeFormula,
							Spec: QueryBuilderFormula{
								Name:       "F1",
								Expression: "A + B",
								Disabled:   true,
							},
						},
						{
							Type: QueryTypeFormula,
							Spec: QueryBuilderFormula{
								Name:       "F2",
								Expression: "A * 2",
								Disabled:   true,
							},
						},
					},
				},
			},
			wantErr: true,
			errMsg:  "all queries are disabled - at least one query must be enabled",
		},
		{
			name: "all PromQL queries disabled should return error",
			request: QueryRangeRequest{
				Start:       1640995200000,
				End:         1640998800000,
				RequestType: RequestTypeTimeSeries,
				CompositeQuery: CompositeQuery{
					Queries: []QueryEnvelope{
						{
							Type: QueryTypePromQL,
							Spec: PromQuery{
								Name:     "P1",
								Query:    "up",
								Disabled: true,
							},
						},
						{
							Type: QueryTypePromQL,
							Spec: PromQuery{
								Name:     "P2",
								Query:    "rate(http_requests_total[5m])",
								Disabled: true,
							},
						},
					},
				},
			},
			wantErr: true,
			errMsg:  "all queries are disabled - at least one query must be enabled",
		},
		{
			name: "mixed query types with all disabled should return error",
			request: QueryRangeRequest{
				Start:       1640995200000,
				End:         1640998800000,
				RequestType: RequestTypeTimeSeries,
				CompositeQuery: CompositeQuery{
					Queries: []QueryEnvelope{
						{
							Type: QueryTypeBuilder,
							Spec: QueryBuilderQuery[MetricAggregation]{
								Name:     "A",
								Disabled: true,
								Signal:   telemetrytypes.SignalMetrics,
							},
						},
						{
							Type: QueryTypeFormula,
							Spec: QueryBuilderFormula{
								Name:       "F1",
								Expression: "A + 1",
								Disabled:   true,
							},
						},
						{
							Type: QueryTypePromQL,
							Spec: PromQuery{
								Name:     "P1",
								Query:    "up",
								Disabled: true,
							},
						},
					},
				},
			},
			wantErr: true,
			errMsg:  "all queries are disabled - at least one query must be enabled",
		},
		{
			name: "single disabled query should return error",
			request: QueryRangeRequest{
				Start:       1640995200000,
				End:         1640998800000,
				RequestType: RequestTypeTimeSeries,
				CompositeQuery: CompositeQuery{
					Queries: []QueryEnvelope{
						{
							Type: QueryTypeBuilder,
							Spec: QueryBuilderQuery[LogAggregation]{
								Name:     "A",
								Disabled: true,
								Signal:   telemetrytypes.SignalLogs,
							},
						},
					},
				},
			},
			wantErr: true,
			errMsg:  "all queries are disabled - at least one query must be enabled",
		},
		{
			name: "single enabled query should pass",
			request: QueryRangeRequest{
				Start:       1640995200000,
				End:         1640998800000,
				RequestType: RequestTypeTimeSeries,
				CompositeQuery: CompositeQuery{
					Queries: []QueryEnvelope{
						{
							Type: QueryTypeBuilder,
							Spec: QueryBuilderQuery[LogAggregation]{
								Name:     "A",
								Disabled: false,
								Signal:   telemetrytypes.SignalLogs,
								Aggregations: []LogAggregation{
									{
										Expression: "count()",
									},
								},
							},
						},
					},
				},
			},
			wantErr: false,
		},
		{
			name: "all ClickHouse queries disabled should return error",
			request: QueryRangeRequest{
				Start:       1640995200000,
				End:         1640998800000,
				RequestType: RequestTypeTimeSeries,
				CompositeQuery: CompositeQuery{
					Queries: []QueryEnvelope{
						{
							Type: QueryTypeClickHouseSQL,
							Spec: ClickHouseQuery{
								Name:     "CH1",
								Query:    "SELECT count() FROM logs",
								Disabled: true,
							},
						},
					},
				},
			},
			wantErr: true,
			errMsg:  "all queries are disabled - at least one query must be enabled",
		},
		{
			name: "all trace operator queries disabled should return error",
			request: QueryRangeRequest{
				Start:       1640995200000,
				End:         1640998800000,
				RequestType: RequestTypeTimeSeries,
				CompositeQuery: CompositeQuery{
					Queries: []QueryEnvelope{
						{
							Type: QueryTypeTraceOperator,
							Spec: QueryBuilderTraceOperator{
								Name:       "TO1",
								Expression: "count()",
								Disabled:   true,
							},
						},
					},
				},
			},
			wantErr: true,
			errMsg:  "all queries are disabled - at least one query must be enabled",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.request.Validate()
			if tt.wantErr {
				if err == nil {
					t.Errorf("QueryRangeRequest.Validate() expected error but got none")
					return
				}
				if tt.errMsg != "" && !contains(err.Error(), tt.errMsg) {
					t.Errorf("QueryRangeRequest.Validate() error = %v, want to contain %v", err.Error(), tt.errMsg)
				}
			} else {
				if err != nil {
					t.Errorf("QueryRangeRequest.Validate() unexpected error = %v", err)
				}
			}
		})
	}
}

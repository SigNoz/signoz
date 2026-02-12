package querybuildertypesv5

import (
	"strings"
	"testing"

	"github.com/SigNoz/signoz/pkg/types/metrictypes"
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

func TestQueryRangeRequest_ValidateOrderByForAggregation(t *testing.T) {
	tests := []struct {
		name    string
		query   QueryBuilderQuery[TraceAggregation]
		wantErr bool
		errMsg  string
	}{
		{
			name: "order by with context-prefixed alias should pass",
			query: QueryBuilderQuery[TraceAggregation]{
				Name:   "A",
				Signal: telemetrytypes.SignalTraces,
				Aggregations: []TraceAggregation{
					{
						Expression: "count()",
						Alias:      "span.count_",
					},
				},
				Order: []OrderBy{
					{
						Direction: OrderDirectionDesc,
						Key: OrderByKey{
							TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
								Name:         "count_",
								FieldContext: telemetrytypes.FieldContextSpan,
							},
						},
					},
				},
			},
			wantErr: false,
		},
		{
			name: "order by with alias directly should pass",
			query: QueryBuilderQuery[TraceAggregation]{
				Name:   "A",
				Signal: telemetrytypes.SignalTraces,
				Aggregations: []TraceAggregation{
					{
						Expression: "count()",
						Alias:      "my_count",
					},
				},
				Order: []OrderBy{
					{
						Direction: OrderDirectionDesc,
						Key: OrderByKey{
							TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
								Name: "my_count",
							},
						},
					},
				},
			},
			wantErr: false,
		},
		{
			name: "order by with expression should pass",
			query: QueryBuilderQuery[TraceAggregation]{
				Name:   "A",
				Signal: telemetrytypes.SignalTraces,
				Aggregations: []TraceAggregation{
					{
						Expression: "count()",
					},
				},
				Order: []OrderBy{
					{
						Direction: OrderDirectionDesc,
						Key: OrderByKey{
							TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
								Name: "count()",
							},
						},
					},
				},
			},
			wantErr: false,
		},
		{
			name: "order by with invalid key should fail",
			query: QueryBuilderQuery[TraceAggregation]{
				Name:   "A",
				Signal: telemetrytypes.SignalTraces,
				Aggregations: []TraceAggregation{
					{
						Expression: "count()",
						Alias:      "my_count",
					},
				},
				Order: []OrderBy{
					{
						Direction: OrderDirectionDesc,
						Key: OrderByKey{
							TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
								Name: "invalid_key",
							},
						},
					},
				},
			},
			wantErr: true,
			errMsg:  "invalid order by key",
		},
		{
			name: "order by with group by key should pass",
			query: QueryBuilderQuery[TraceAggregation]{
				Name:   "A",
				Signal: telemetrytypes.SignalTraces,
				Aggregations: []TraceAggregation{
					{
						Expression: "count()",
					},
				},
				GroupBy: []GroupByKey{
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: "service.name",
						},
					},
				},
				Order: []OrderBy{
					{
						Direction: OrderDirectionAsc,
						Key: OrderByKey{
							TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
								Name: "service.name",
							},
						},
					},
				},
			},
			wantErr: false,
		},
		{
			name: "order by with resource context-prefixed alias should pass",
			query: QueryBuilderQuery[TraceAggregation]{
				Name:   "A",
				Signal: telemetrytypes.SignalTraces,
				Aggregations: []TraceAggregation{
					{
						Expression: "count()",
						Alias:      "resource.count_",
					},
				},
				Order: []OrderBy{
					{
						Direction: OrderDirectionDesc,
						Key: OrderByKey{
							TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
								Name:         "count_",
								FieldContext: telemetrytypes.FieldContextResource,
							},
						},
					},
				},
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.query.Validate(RequestTypeTimeSeries)
			if tt.wantErr {
				if err == nil {
					t.Errorf("validateOrderByForAggregation() expected error but got none")
					return
				}
				if tt.errMsg != "" && !contains(err.Error(), tt.errMsg) {
					t.Errorf("validateOrderByForAggregation() error = %v, want to contain %v", err.Error(), tt.errMsg)
				}
			} else {
				if err != nil {
					t.Errorf("validateOrderByForAggregation() unexpected error = %v", err)
				}
			}
		})
	}
}

func TestQueryRangeRequest_ValidateHaving(t *testing.T) {
	tests := []struct {
		name    string
		query   any // either QueryBuilderQuery[TraceAggregation] or QueryBuilderQuery[LogAggregation]
		wantErr bool
		errMsg  string
	}{
		// nil having
		{
			name: "trace nil having should pass",
			query: QueryBuilderQuery[TraceAggregation]{
				Name:   "A",
				Signal: telemetrytypes.SignalTraces,
				Aggregations: []TraceAggregation{
					{Expression: "count()"},
				},
			},
			wantErr: false,
		},
		{
			name: "log nil having should pass",
			query: QueryBuilderQuery[LogAggregation]{
				Name:   "A",
				Signal: telemetrytypes.SignalLogs,
				Aggregations: []LogAggregation{
					{Expression: "count()"},
				},
			},
			wantErr: false,
		},
		// empty having expression
		{
			name: "trace empty having expression should pass",
			query: QueryBuilderQuery[TraceAggregation]{
				Name:   "A",
				Signal: telemetrytypes.SignalTraces,
				Aggregations: []TraceAggregation{
					{Expression: "count()"},
				},
				Having: &Having{Expression: ""},
			},
			wantErr: false,
		},
		{
			name: "log empty having expression should pass",
			query: QueryBuilderQuery[LogAggregation]{
				Name:   "A",
				Signal: telemetrytypes.SignalLogs,
				Aggregations: []LogAggregation{
					{Expression: "count()"},
				},
				Having: &Having{Expression: ""},
			},
			wantErr: false,
		},
		// having without aggregations
		{
			name: "trace having without aggregations should fail",
			query: QueryBuilderQuery[TraceAggregation]{
				Name:   "A",
				Signal: telemetrytypes.SignalTraces,
				Having: &Having{Expression: "count() > 10"},
			},
			wantErr: true,
			errMsg:  "at least one aggregation is required",
		},
		{
			name: "log having without aggregations should fail",
			query: QueryBuilderQuery[LogAggregation]{
				Name:   "A",
				Signal: telemetrytypes.SignalLogs,
				Having: &Having{Expression: "count() > 10"},
			},
			wantErr: true,
			errMsg:  "at least one aggregation is required",
		},
		// having with matching expression
		{
			name: "trace having with matching expression should pass",
			query: QueryBuilderQuery[TraceAggregation]{
				Name:   "A",
				Signal: telemetrytypes.SignalTraces,
				Aggregations: []TraceAggregation{
					{Expression: "count()"},
				},
				Having: &Having{Expression: "count() > 100"},
			},
			wantErr: false,
		},
		{
			name: "log having with matching expression should pass",
			query: QueryBuilderQuery[LogAggregation]{
				Name:   "A",
				Signal: telemetrytypes.SignalLogs,
				Aggregations: []LogAggregation{
					{Expression: "count()"},
				},
				Having: &Having{Expression: "count() > 50"},
			},
			wantErr: false,
		},
		// having with matching alias
		{
			name: "trace having with matching alias should pass",
			query: QueryBuilderQuery[TraceAggregation]{
				Name:   "A",
				Signal: telemetrytypes.SignalTraces,
				Aggregations: []TraceAggregation{
					{Expression: "count()", Alias: "total"},
				},
				Having: &Having{Expression: "total > 100"},
			},
			wantErr: false,
		},
		{
			name: "log having with matching alias should pass",
			query: QueryBuilderQuery[LogAggregation]{
				Name:   "A",
				Signal: telemetrytypes.SignalLogs,
				Aggregations: []LogAggregation{
					{Expression: "count()", Alias: "log_count"},
				},
				Having: &Having{Expression: "log_count > 50"},
			},
			wantErr: false,
		},
		// having with invalid identifier
		{
			name: "trace having with invalid identifier should fail",
			query: QueryBuilderQuery[TraceAggregation]{
				Name:   "A",
				Signal: telemetrytypes.SignalTraces,
				Aggregations: []TraceAggregation{
					{Expression: "count()", Alias: "total"},
				},
				Having: &Having{Expression: "unknown_col > 100"},
			},
			wantErr: true,
			errMsg:  "Having expression is not using valid identifiers",
		},
		{
			name: "log having with invalid identifier should fail",
			query: QueryBuilderQuery[LogAggregation]{
				Name:   "A",
				Signal: telemetrytypes.SignalLogs,
				Aggregations: []LogAggregation{
					{Expression: "count()", Alias: "log_count"},
				},
				Having: &Having{Expression: "bad_identifier > 50"},
			},
			wantErr: true,
			errMsg:  "Having expression is not using valid identifiers",
		},
		// having matching second aggregation expression
		{
			name: "trace having matching second aggregation should pass",
			query: QueryBuilderQuery[TraceAggregation]{
				Name:   "A",
				Signal: telemetrytypes.SignalTraces,
				Aggregations: []TraceAggregation{
					{Expression: "count()", Alias: "total"},
					{Expression: "sum(duration)", Alias: "total_duration"},
				},
				Having: &Having{Expression: "sum(duration) > 1000"},
			},
			wantErr: false,
		},
		// having matching second aggregation alias
		{
			name: "trace having matching second aggregation alias should pass",
			query: QueryBuilderQuery[TraceAggregation]{
				Name:   "A",
				Signal: telemetrytypes.SignalTraces,
				Aggregations: []TraceAggregation{
					{Expression: "count()", Alias: "total"},
					{Expression: "sum(duration)", Alias: "total_duration"},
				},
				Having: &Having{Expression: "total_duration > 1000"},
			},
			wantErr: false,
		},
		// metric having (validation not yet implemented)
		{
			name: "metric having should pass (validation not yet implemented)",
			query: QueryBuilderQuery[MetricAggregation]{
				Name:   "A",
				Signal: telemetrytypes.SignalMetrics,
				Aggregations: []MetricAggregation{
					{
						MetricName:       "http_requests_total",
						TimeAggregation:  metrictypes.TimeAggregationRate,
						SpaceAggregation: metrictypes.SpaceAggregationSum,
					},
				},
				Having: &Having{Expression: "anything_goes > 100"},
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var err error
			switch q := tt.query.(type) {
			case QueryBuilderQuery[TraceAggregation]:
				err = q.Validate(RequestTypeTimeSeries)
			case QueryBuilderQuery[LogAggregation]:
				err = q.Validate(RequestTypeTimeSeries)
			case QueryBuilderQuery[MetricAggregation]:
				err = q.Validate(RequestTypeTimeSeries)
			}
			if tt.wantErr {
				if err == nil {
					t.Errorf("validateHaving() expected error but got none")
					return
				}
				if tt.errMsg != "" && !contains(err.Error(), tt.errMsg) {
					t.Errorf("validateHaving() error = %v, want to contain %v", err.Error(), tt.errMsg)
				}
			} else {
				if err != nil {
					t.Errorf("validateHaving() unexpected error = %v", err)
				}
			}
		})
	}
}

func TestQueryRangeRequest_ValidateAggregations(t *testing.T) {
	tests := []struct {
		name    string
		wantErr bool
		errMsg  string
		query   any // either QueryBuilderQuery[TraceAggregation] or QueryBuilderQuery[LogAggregation]
	}{
		// AS in expression (lowercase)
		{
			name: "trace aggregation with AS in expression should fail",
			query: QueryBuilderQuery[TraceAggregation]{
				Name:   "A",
				Signal: telemetrytypes.SignalTraces,
				Aggregations: []TraceAggregation{
					{Expression: "count() as total"},
				},
			},
			wantErr: true,
			errMsg:  "aliasing is not allowed in expression",
		},
		{
			name: "log aggregation with AS in expression should fail",
			query: QueryBuilderQuery[LogAggregation]{
				Name:   "A",
				Signal: telemetrytypes.SignalLogs,
				Aggregations: []LogAggregation{
					{Expression: "sum(bytes) as total_bytes"},
				},
			},
			wantErr: true,
			errMsg:  "aliasing is not allowed in expression",
		},
		// AS in expression (uppercase)
		{
			name: "trace aggregation with AS (uppercase) in expression should fail",
			query: QueryBuilderQuery[TraceAggregation]{
				Name:   "A",
				Signal: telemetrytypes.SignalTraces,
				Aggregations: []TraceAggregation{
					{Expression: "count() AS total"},
				},
			},
			wantErr: true,
			errMsg:  "aliasing is not allowed in expression",
		},
		{
			name: "log aggregation with AS (uppercase) in expression should fail",
			query: QueryBuilderQuery[LogAggregation]{
				Name:   "A",
				Signal: telemetrytypes.SignalLogs,
				Aggregations: []LogAggregation{
					{Expression: "sum(bytes) AS total_bytes"},
				},
			},
			wantErr: true,
			errMsg:  "aliasing is not allowed in expression",
		},
		// AS in expression (mixed case)
		{
			name: "trace aggregation with AS (mixed case) in expression should fail",
			query: QueryBuilderQuery[TraceAggregation]{
				Name:   "A",
				Signal: telemetrytypes.SignalTraces,
				Aggregations: []TraceAggregation{
					{Expression: "count() As total"},
				},
			},
			wantErr: true,
			errMsg:  "aliasing is not allowed in expression",
		},
		{
			name: "log aggregation with AS (mixed case) in expression should fail",
			query: QueryBuilderQuery[LogAggregation]{
				Name:   "A",
				Signal: telemetrytypes.SignalLogs,
				Aggregations: []LogAggregation{
					{Expression: "sum(bytes) As total_bytes"},
				},
			},
			wantErr: true,
			errMsg:  "aliasing is not allowed in expression",
		},
		// without AS
		{
			name: "trace aggregation without AS should pass",
			query: QueryBuilderQuery[TraceAggregation]{
				Name:   "A",
				Signal: telemetrytypes.SignalTraces,
				Aggregations: []TraceAggregation{
					{Expression: "count()"},
				},
			},
			wantErr: false,
		},
		{
			name: "log aggregation without AS should pass",
			query: QueryBuilderQuery[LogAggregation]{
				Name:   "A",
				Signal: telemetrytypes.SignalLogs,
				Aggregations: []LogAggregation{
					{Expression: "sum(bytes)"},
				},
			},
			wantErr: false,
		},
		// alias in alias field
		{
			name: "trace aggregation with alias in alias field should pass",
			query: QueryBuilderQuery[TraceAggregation]{
				Name:   "A",
				Signal: telemetrytypes.SignalTraces,
				Aggregations: []TraceAggregation{
					{Expression: "count()", Alias: "total"},
				},
			},
			wantErr: false,
		},
		{
			name: "log aggregation with alias in alias field should pass",
			query: QueryBuilderQuery[LogAggregation]{
				Name:   "A",
				Signal: telemetrytypes.SignalLogs,
				Aggregations: []LogAggregation{
					{Expression: "count()", Alias: "total"},
				},
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var err error
			switch q := tt.query.(type) {
			case QueryBuilderQuery[TraceAggregation]:
				err = q.Validate(RequestTypeTimeSeries)
			case QueryBuilderQuery[LogAggregation]:
				err = q.Validate(RequestTypeTimeSeries)
			}
			if tt.wantErr {
				if err == nil {
					t.Errorf("validateAggregations() expected error but got none")
					return
				}
				if tt.errMsg != "" && !contains(err.Error(), tt.errMsg) {
					t.Errorf("validateAggregations() error = %v, want to contain %v", err.Error(), tt.errMsg)
				}
			} else {
				if err != nil {
					t.Errorf("validateAggregations() unexpected error = %v", err)
				}
			}
		})
	}
}

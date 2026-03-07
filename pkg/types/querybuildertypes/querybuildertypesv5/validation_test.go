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

func TestQueryRangeRequest_ValidateCompositeQuery(t *testing.T) {
	tests := []struct {
		name    string
		request QueryRangeRequest
		wantErr bool
		errMsg  string
	}{
		{
			name: "empty composite query should return error",
			request: QueryRangeRequest{
				Start:       1640995200000,
				End:         1640998800000,
				RequestType: RequestTypeTimeSeries,
				CompositeQuery: CompositeQuery{
					Queries: []QueryEnvelope{},
				},
			},
			wantErr: true,
			errMsg:  "at least one query is required",
		},
		{
			name: "duplicate builder query names should return error",
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
						{
							Type: QueryTypeBuilder,
							Spec: QueryBuilderQuery[TraceAggregation]{
								Name:     "A",
								Disabled: true,
								Signal:   telemetrytypes.SignalTraces,
							},
						},
					},
				},
			},
			wantErr: true,
			errMsg:  "duplicate query name 'A'",
		},
		{
			name: "duplicate names across log and metric builder queries should return error",
			request: QueryRangeRequest{
				Start:       1640995200000,
				End:         1640998800000,
				RequestType: RequestTypeTimeSeries,
				CompositeQuery: CompositeQuery{
					Queries: []QueryEnvelope{
						{
							Type: QueryTypeBuilder,
							Spec: QueryBuilderQuery[LogAggregation]{
								Name:     "X",
								Disabled: true,
								Signal:   telemetrytypes.SignalLogs,
							},
						},
						{
							Type: QueryTypeBuilder,
							Spec: QueryBuilderQuery[MetricAggregation]{
								Name:     "X",
								Disabled: true,
								Signal:   telemetrytypes.SignalMetrics,
							},
						},
					},
				},
			},
			wantErr: true,
			errMsg:  "duplicate query name 'X'",
		},
		{
			name: "same name on formula and builder should not conflict",
			request: QueryRangeRequest{
				Start:       1640995200000,
				End:         1640998800000,
				RequestType: RequestTypeTimeSeries,
				CompositeQuery: CompositeQuery{
					Queries: []QueryEnvelope{
						{
							Type: QueryTypeBuilder,
							Spec: QueryBuilderQuery[LogAggregation]{
								Name:   "A",
								Signal: telemetrytypes.SignalLogs,
								Aggregations: []LogAggregation{
									{Expression: "count()"},
								},
							},
						},
						{
							Type: QueryTypeFormula,
							Spec: QueryBuilderFormula{
								Name:       "A",
								Expression: "A + 1",
							},
						},
					},
				},
			},
			wantErr: false,
		},
		{
			name: "formula with empty expression should return error",
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
								Expression: "",
							},
						},
					},
				},
			},
			wantErr: true,
			errMsg:  "expression is required",
		},
		{
			name: "promql with empty query should return error",
			request: QueryRangeRequest{
				Start:       1640995200000,
				End:         1640998800000,
				RequestType: RequestTypeTimeSeries,
				CompositeQuery: CompositeQuery{
					Queries: []QueryEnvelope{
						{
							Type: QueryTypePromQL,
							Spec: PromQuery{
								Name:  "P1",
								Query: "",
							},
						},
					},
				},
			},
			wantErr: true,
			errMsg:  "PromQL query is required",
		},
		{
			name: "clickhouse with empty query should return error",
			request: QueryRangeRequest{
				Start:       1640995200000,
				End:         1640998800000,
				RequestType: RequestTypeTimeSeries,
				CompositeQuery: CompositeQuery{
					Queries: []QueryEnvelope{
						{
							Type: QueryTypeClickHouseSQL,
							Spec: ClickHouseQuery{
								Name:  "CH1",
								Query: "",
							},
						},
					},
				},
			},
			wantErr: true,
			errMsg:  "ClickHouse SQL query is required",
		},
		{
			name: "trace operator with empty expression should return error",
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
								Expression: "",
							},
						},
					},
				},
			},
			wantErr: true,
			errMsg:  "expression is required",
		},
		{
			name: "valid promql query should pass",
			request: QueryRangeRequest{
				Start:       1640995200000,
				End:         1640998800000,
				RequestType: RequestTypeTimeSeries,
				CompositeQuery: CompositeQuery{
					Queries: []QueryEnvelope{
						{
							Type: QueryTypePromQL,
							Spec: PromQuery{
								Name:  "P1",
								Query: "up",
							},
						},
					},
				},
			},
			wantErr: false,
		},
		{
			name: "valid clickhouse query should pass",
			request: QueryRangeRequest{
				Start:       1640995200000,
				End:         1640998800000,
				RequestType: RequestTypeTimeSeries,
				CompositeQuery: CompositeQuery{
					Queries: []QueryEnvelope{
						{
							Type: QueryTypeClickHouseSQL,
							Spec: ClickHouseQuery{
								Name:  "CH1",
								Query: "SELECT count() FROM logs",
							},
						},
					},
				},
			},
			wantErr: false,
		},
		{
			name: "valid mixed queries with unique builder names should pass",
			request: QueryRangeRequest{
				Start:       1640995200000,
				End:         1640998800000,
				RequestType: RequestTypeTimeSeries,
				CompositeQuery: CompositeQuery{
					Queries: []QueryEnvelope{
						{
							Type: QueryTypeBuilder,
							Spec: QueryBuilderQuery[LogAggregation]{
								Name:   "A",
								Signal: telemetrytypes.SignalLogs,
								Aggregations: []LogAggregation{
									{Expression: "count()"},
								},
							},
						},
						{
							Type: QueryTypeBuilder,
							Spec: QueryBuilderQuery[TraceAggregation]{
								Name:   "B",
								Signal: telemetrytypes.SignalTraces,
								Aggregations: []TraceAggregation{
									{Expression: "count()"},
								},
							},
						},
						{
							Type: QueryTypePromQL,
							Spec: PromQuery{
								Name:  "C",
								Query: "up",
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
			err := tt.request.Validate()
			if tt.wantErr {
				if err == nil {
					t.Errorf("Validate() expected error but got none")
					return
				}
				if tt.errMsg != "" && !contains(err.Error(), tt.errMsg) {
					t.Errorf("Validate() error = %v, want to contain %v", err.Error(), tt.errMsg)
				}
			} else {
				if err != nil {
					t.Errorf("Validate() unexpected error = %v", err)
				}
			}
		})
	}
}

func TestValidateQueryEnvelope(t *testing.T) {
	tests := []struct {
		name        string
		envelope    QueryEnvelope
		requestType RequestType
		wantErr     bool
		errMsg      string
	}{
		{
			name: "valid builder query with trace aggregation",
			envelope: QueryEnvelope{
				Type: QueryTypeBuilder,
				Spec: QueryBuilderQuery[TraceAggregation]{
					Name:   "A",
					Signal: telemetrytypes.SignalTraces,
					Aggregations: []TraceAggregation{
						{Expression: "count()"},
					},
				},
			},
			requestType: RequestTypeTimeSeries,
			wantErr:     false,
		},
		{
			name: "valid formula with expression",
			envelope: QueryEnvelope{
				Type: QueryTypeFormula,
				Spec: QueryBuilderFormula{
					Name:       "F1",
					Expression: "A + B",
				},
			},
			requestType: RequestTypeTimeSeries,
			wantErr:     false,
		},
		{
			name: "formula with empty expression should fail",
			envelope: QueryEnvelope{
				Type: QueryTypeFormula,
				Spec: QueryBuilderFormula{
					Name:       "F1",
					Expression: "",
				},
			},
			requestType: RequestTypeTimeSeries,
			wantErr:     true,
			errMsg:      "expression is required",
		},
		{
			name: "valid join spec",
			envelope: QueryEnvelope{
				Type: QueryTypeJoin,
				Spec: QueryBuilderJoin{
					Name: "J1",
				},
			},
			requestType: RequestTypeTimeSeries,
			wantErr:     false,
		},
		{
			name: "valid trace operator",
			envelope: QueryEnvelope{
				Type: QueryTypeTraceOperator,
				Spec: QueryBuilderTraceOperator{
					Name:       "TO1",
					Expression: "count()",
				},
			},
			requestType: RequestTypeTimeSeries,
			wantErr:     false,
		},
		{
			name: "trace operator with empty expression should fail",
			envelope: QueryEnvelope{
				Type: QueryTypeTraceOperator,
				Spec: QueryBuilderTraceOperator{
					Name:       "TO1",
					Expression: "",
				},
			},
			requestType: RequestTypeTimeSeries,
			wantErr:     true,
			errMsg:      "expression is required",
		},
		{
			name: "promql with empty query should fail",
			envelope: QueryEnvelope{
				Type: QueryTypePromQL,
				Spec: PromQuery{
					Name:  "P1",
					Query: "",
				},
			},
			requestType: RequestTypeTimeSeries,
			wantErr:     true,
			errMsg:      "PromQL query is required",
		},
		{
			name: "clickhouse with empty query should fail",
			envelope: QueryEnvelope{
				Type: QueryTypeClickHouseSQL,
				Spec: ClickHouseQuery{
					Name:  "CH1",
					Query: "",
				},
			},
			requestType: RequestTypeTimeSeries,
			wantErr:     true,
			errMsg:      "ClickHouse SQL query is required",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateQueryEnvelope(tt.envelope, tt.requestType)
			if tt.wantErr {
				if err == nil {
					t.Errorf("validateQueryEnvelope() expected error but got none")
					return
				}
				if tt.errMsg != "" && !contains(err.Error(), tt.errMsg) {
					t.Errorf("validateQueryEnvelope() error = %v, want to contain %v", err.Error(), tt.errMsg)
				}
			} else {
				if err != nil {
					t.Errorf("validateQueryEnvelope() unexpected error = %v", err)
				}
			}
		})
	}
}

func TestQueryEnvelope_Helpers(t *testing.T) {
	t.Run("queryName", func(t *testing.T) {
		tests := []struct {
			name     string
			envelope QueryEnvelope
			want     string
		}{
			{
				name:     "trace builder query",
				envelope: QueryEnvelope{Type: QueryTypeBuilder, Spec: QueryBuilderQuery[TraceAggregation]{Name: "A"}},
				want:     "A",
			},
			{
				name:     "log builder query",
				envelope: QueryEnvelope{Type: QueryTypeBuilder, Spec: QueryBuilderQuery[LogAggregation]{Name: "B"}},
				want:     "B",
			},
			{
				name:     "metric builder query",
				envelope: QueryEnvelope{Type: QueryTypeBuilder, Spec: QueryBuilderQuery[MetricAggregation]{Name: "C"}},
				want:     "C",
			},
			{
				name:     "formula",
				envelope: QueryEnvelope{Type: QueryTypeFormula, Spec: QueryBuilderFormula{Name: "F1"}},
				want:     "F1",
			},
			{
				name:     "promql",
				envelope: QueryEnvelope{Type: QueryTypePromQL, Spec: PromQuery{Name: "P1"}},
				want:     "P1",
			},
			{
				name:     "clickhouse",
				envelope: QueryEnvelope{Type: QueryTypeClickHouseSQL, Spec: ClickHouseQuery{Name: "CH1"}},
				want:     "CH1",
			},
			{
				name:     "trace operator",
				envelope: QueryEnvelope{Type: QueryTypeTraceOperator, Spec: QueryBuilderTraceOperator{Name: "TO1"}},
				want:     "TO1",
			},
			{
				name:     "join",
				envelope: QueryEnvelope{Type: QueryTypeJoin, Spec: QueryBuilderJoin{Name: "J1"}},
				want:     "J1",
			},
			{
				name:     "empty name",
				envelope: QueryEnvelope{Type: QueryTypeBuilder, Spec: QueryBuilderQuery[LogAggregation]{}},
				want:     "",
			},
		}
		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				got := tt.envelope.queryName()
				if got != tt.want {
					t.Errorf("queryName() = %q, want %q", got, tt.want)
				}
			})
		}
	})

	t.Run("isDisabled", func(t *testing.T) {
		tests := []struct {
			name     string
			envelope QueryEnvelope
			want     bool
		}{
			{
				name:     "enabled builder query",
				envelope: QueryEnvelope{Type: QueryTypeBuilder, Spec: QueryBuilderQuery[LogAggregation]{Disabled: false}},
				want:     false,
			},
			{
				name:     "disabled builder query",
				envelope: QueryEnvelope{Type: QueryTypeBuilder, Spec: QueryBuilderQuery[LogAggregation]{Disabled: true}},
				want:     true,
			},
			{
				name:     "disabled formula",
				envelope: QueryEnvelope{Type: QueryTypeFormula, Spec: QueryBuilderFormula{Disabled: true}},
				want:     true,
			},
			{
				name:     "enabled promql",
				envelope: QueryEnvelope{Type: QueryTypePromQL, Spec: PromQuery{Disabled: false}},
				want:     false,
			},
			{
				name:     "disabled clickhouse",
				envelope: QueryEnvelope{Type: QueryTypeClickHouseSQL, Spec: ClickHouseQuery{Disabled: true}},
				want:     true,
			},
			{
				name:     "disabled trace operator",
				envelope: QueryEnvelope{Type: QueryTypeTraceOperator, Spec: QueryBuilderTraceOperator{Disabled: true}},
				want:     true,
			},
			{
				name:     "disabled join",
				envelope: QueryEnvelope{Type: QueryTypeJoin, Spec: QueryBuilderJoin{Disabled: true}},
				want:     true,
			},
		}
		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				got := tt.envelope.isDisabled()
				if got != tt.want {
					t.Errorf("isDisabled() = %v, want %v", got, tt.want)
				}
			})
		}
	})
}

func TestGetQueryIdentifier(t *testing.T) {
	tests := []struct {
		name     string
		envelope QueryEnvelope
		index    int
		want     string
	}{
		{
			name:     "builder query with name",
			envelope: QueryEnvelope{Type: QueryTypeBuilder, Spec: QueryBuilderQuery[LogAggregation]{Name: "A"}},
			index:    0,
			want:     "query 'A'",
		},
		{
			name:     "builder query without name",
			envelope: QueryEnvelope{Type: QueryTypeBuilder, Spec: QueryBuilderQuery[LogAggregation]{}},
			index:    2,
			want:     "query at position 3",
		},
		{
			name:     "formula with name",
			envelope: QueryEnvelope{Type: QueryTypeFormula, Spec: QueryBuilderFormula{Name: "F1"}},
			index:    0,
			want:     "formula 'F1'",
		},
		{
			name:     "formula without name",
			envelope: QueryEnvelope{Type: QueryTypeFormula, Spec: QueryBuilderFormula{}},
			index:    1,
			want:     "formula at position 2",
		},
		{
			name:     "promql with name",
			envelope: QueryEnvelope{Type: QueryTypePromQL, Spec: PromQuery{Name: "P1"}},
			index:    0,
			want:     "PromQL query 'P1'",
		},
		{
			name:     "clickhouse with name",
			envelope: QueryEnvelope{Type: QueryTypeClickHouseSQL, Spec: ClickHouseQuery{Name: "CH1"}},
			index:    0,
			want:     "ClickHouse query 'CH1'",
		},
		{
			name:     "trace operator with name",
			envelope: QueryEnvelope{Type: QueryTypeTraceOperator, Spec: QueryBuilderTraceOperator{Name: "TO1"}},
			index:    0,
			want:     "trace operator 'TO1'",
		},
		{
			name:     "join without name",
			envelope: QueryEnvelope{Type: QueryTypeJoin, Spec: QueryBuilderJoin{}},
			index:    0,
			want:     "join at position 1",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := getQueryIdentifier(tt.envelope, tt.index)
			if got != tt.want {
				t.Errorf("getQueryIdentifier() = %q, want %q", got, tt.want)
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

func TestRequestType_IsAggregation(t *testing.T) {
	tests := []struct {
		name        string
		requestType RequestType
		want        bool
	}{
		{"time_series is aggregation", RequestTypeTimeSeries, true},
		{"scalar is aggregation", RequestTypeScalar, true},
		{"distribution is aggregation", RequestTypeDistribution, true},
		{"raw is not aggregation", RequestTypeRaw, false},
		{"raw_stream is not aggregation", RequestTypeRawStream, false},
		{"trace is not aggregation", RequestTypeTrace, false},
		{"unknown is not aggregation", RequestTypeUnknown, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := tt.requestType.IsAggregation()
			if got != tt.want {
				t.Errorf("IsAggregation() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestNonAggregationFieldsSkipped(t *testing.T) {
	// Fields that only apply to aggregation queries (groupBy, having, aggregations)
	// should be silently skipped for non-aggregation request types.
	t.Run("groupBy ignored for raw request type", func(t *testing.T) {
		query := QueryBuilderQuery[LogAggregation]{
			Name:   "A",
			Signal: telemetrytypes.SignalLogs,
			GroupBy: []GroupByKey{
				{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "service.name"}},
			},
		}
		err := query.Validate(RequestTypeRaw)
		if err != nil {
			t.Errorf("expected no error for groupBy with raw request type, got: %v", err)
		}
	})

	t.Run("groupBy validated for timeseries request type", func(t *testing.T) {
		query := QueryBuilderQuery[LogAggregation]{
			Name:   "A",
			Signal: telemetrytypes.SignalLogs,
			Aggregations: []LogAggregation{
				{Expression: "count()"},
			},
			GroupBy: []GroupByKey{
				{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: ""}},
			},
		}
		err := query.Validate(RequestTypeTimeSeries)
		if err == nil {
			t.Errorf("expected error for empty groupBy key with timeseries request type")
		}
	})

	t.Run("having ignored for raw request type", func(t *testing.T) {
		query := QueryBuilderQuery[LogAggregation]{
			Name:   "A",
			Signal: telemetrytypes.SignalLogs,
			Having: &Having{Expression: "count() > 10"},
		}
		err := query.Validate(RequestTypeRaw)
		if err != nil {
			t.Errorf("expected no error for having with raw request type, got: %v", err)
		}
	})

	t.Run("having ignored for trace request type", func(t *testing.T) {
		query := QueryBuilderQuery[TraceAggregation]{
			Name:   "A",
			Signal: telemetrytypes.SignalTraces,
			Having: &Having{Expression: "count() > 10"},
		}
		err := query.Validate(RequestTypeTrace)
		if err != nil {
			t.Errorf("expected no error for having with trace request type, got: %v", err)
		}
	})

	t.Run("aggregations ignored for raw request type", func(t *testing.T) {
		query := QueryBuilderQuery[LogAggregation]{
			Name:   "A",
			Signal: telemetrytypes.SignalLogs,
			Aggregations: []LogAggregation{
				{Expression: "count()"},
			},
		}
		err := query.Validate(RequestTypeRaw)
		if err != nil {
			t.Errorf("expected no error for aggregations with raw request type, got: %v", err)
		}
	})

	t.Run("aggregations ignored for raw_stream request type", func(t *testing.T) {
		query := QueryBuilderQuery[LogAggregation]{
			Name:   "A",
			Signal: telemetrytypes.SignalLogs,
			Aggregations: []LogAggregation{
				{Expression: "count()"},
			},
		}
		err := query.Validate(RequestTypeRawStream)
		if err != nil {
			t.Errorf("expected no error for aggregations with raw_stream request type, got: %v", err)
		}
	})

	t.Run("selectFields validated for raw but not timeseries", func(t *testing.T) {
		query := QueryBuilderQuery[TraceAggregation]{
			Name:   "A",
			Signal: telemetrytypes.SignalTraces,
			Aggregations: []TraceAggregation{
				{Expression: "count()"},
			},
			SelectFields: []telemetrytypes.TelemetryFieldKey{
				{Name: "isRoot"},
			},
		}
		// Should error for raw (selectFields are validated)
		err := query.Validate(RequestTypeRaw)
		if err == nil {
			t.Errorf("expected error for isRoot in selectFields with raw request type")
		}
		// Should pass for timeseries (selectFields skipped)
		err = query.Validate(RequestTypeTimeSeries)
		if err != nil {
			t.Errorf("expected no error for isRoot in selectFields with timeseries request type, got: %v", err)
		}
	})
}

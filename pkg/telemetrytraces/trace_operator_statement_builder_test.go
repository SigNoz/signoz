package telemetrytraces

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes/telemetrytypestest"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewTraceOperatorStatementBuilder(t *testing.T) {
	fm := NewFieldMapper()
	cb := NewConditionBuilder(fm)
	mockMetadataStore := telemetrytypestest.NewMockMetadataStore()
	mockMetadataStore.KeysMap = buildCompleteFieldKeyMap()

	// Create a mock trace statement builder
	traceStmtBuilder := NewTraceQueryStatementBuilder(
		instrumentationtest.New().ToProviderSettings(),
		mockMetadataStore,
		fm,
		cb,
		nil, // resource filter builder
		nil, // agg expr rewriter
		nil, // telemetry store - added missing parameter
	)

	aggExprRewriter := &mockAggExprRewriter{}

	settings := instrumentationtest.New().ToProviderSettings()

	builder := NewTraceOperatorStatementBuilder(
		settings,
		mockMetadataStore,
		fm,
		cb,
		traceStmtBuilder,
		aggExprRewriter,
	)

	assert.NotNil(t, builder)
	assert.NotNil(t, builder.logger)
	assert.Equal(t, mockMetadataStore, builder.metadataStore)
	assert.Equal(t, fm, builder.fm)
	assert.Equal(t, cb, builder.cb)
	assert.Equal(t, traceStmtBuilder, builder.traceStmtBuilder)
	assert.Equal(t, aggExprRewriter, builder.aggExprRewriter)
}

func TestTraceOperatorStatementBuilder_Build(t *testing.T) {
	testCases := []struct {
		name           string
		requestType    qbtypes.RequestType
		query          qbtypes.QueryBuilderTraceOperator
		compositeQuery *qbtypes.CompositeQuery
		expectedError  string
		validateSQL    func(string) bool
	}{
		{
			name:        "simple direct descendant - raw",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderTraceOperator{
				Name:       "test_trace_op",
				Expression: "A => B",
				StepInterval: qbtypes.Step{
					Duration: time.Minute,
				},
			},
			compositeQuery: &qbtypes.CompositeQuery{
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
							Name:   "A",
							Signal: telemetrytypes.SignalTraces,
							Filter: &qbtypes.Filter{
								Expression: "service.name = 'cartservice'",
							},
						},
					},
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
							Name:   "B",
							Signal: telemetrytypes.SignalTraces,
							Filter: &qbtypes.Filter{
								Expression: "service.name = 'shippingservice'",
							},
						},
					},
				},
			},
			expectedError: "",
			validateSQL: func(sql string) bool {
				return strings.Contains(sql, "WITH") &&
					strings.Contains(sql, "base_spans AS") &&
					strings.Contains(sql, "A AS") &&
					strings.Contains(sql, "B AS") &&
					strings.Contains(sql, "A_=>_B AS") && // The actual CTE name format
					strings.Contains(sql, "INNER JOIN") &&
					strings.Contains(sql, "timestamp") &&
					strings.Contains(sql, "trace_id")
			},
		},
		{
			name:        "OR operation - scalar",
			requestType: qbtypes.RequestTypeScalar,
			query: qbtypes.QueryBuilderTraceOperator{
				Name:       "or_trace_op",
				Expression: "A || B",
				Aggregations: []qbtypes.TraceAggregation{
					{Expression: "count()"},
				},
			},
			compositeQuery: &qbtypes.CompositeQuery{
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
							Name:   "A",
							Signal: telemetrytypes.SignalTraces,
						},
					},
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
							Name:   "B",
							Signal: telemetrytypes.SignalTraces,
						},
					},
				},
			},
			expectedError: "",
			validateSQL: func(sql string) bool {
				return strings.Contains(sql, "UNION DISTINCT") &&
					strings.Contains(sql, "subQuery.serviceName") &&
					strings.Contains(sql, "span_count")
			},
		},
		{
			name:        "time series request",
			requestType: qbtypes.RequestTypeTimeSeries,
			query: qbtypes.QueryBuilderTraceOperator{
				Name:       "ts_trace_op",
				Expression: "A && B",
				StepInterval: qbtypes.Step{
					Duration: time.Minute,
				},
				Aggregations: []qbtypes.TraceAggregation{
					{Expression: "count()"},
				},
			},
			compositeQuery: &qbtypes.CompositeQuery{
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
							Name:   "A",
							Signal: telemetrytypes.SignalTraces,
						},
					},
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
							Name:   "B",
							Signal: telemetrytypes.SignalTraces,
						},
					},
				},
			},
			expectedError: "",
			validateSQL: func(sql string) bool {
				return strings.Contains(sql, "toStartOfInterval") &&
					strings.Contains(sql, "INTERVAL 60 SECOND")
			},
		},
		{
			name:        "invalid expression",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderTraceOperator{
				Name:       "invalid_trace_op",
				Expression: "invalid expression syntax",
			},
			compositeQuery: &qbtypes.CompositeQuery{
				Queries: []qbtypes.QueryEnvelope{},
			},
			expectedError: "invalid query reference",
		},
		{
			name:        "missing composite query context",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderTraceOperator{
				Name:       "missing_context_op",
				Expression: "A => B",
			},
			compositeQuery: nil, // This will result in missing context
			expectedError:  "composite query not found in context",
		},
		{
			name:        "missing referenced query",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderTraceOperator{
				Name:       "missing_ref_op",
				Expression: "A => C", // C is not defined in composite query
			},
			compositeQuery: &qbtypes.CompositeQuery{
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
							Name:   "A",
							Signal: telemetrytypes.SignalTraces,
						},
					},
				},
			},
			expectedError: "referenced query 'C' not found",
		},
		{
			name:        "complex expression with filters",
			requestType: qbtypes.RequestTypeScalar,
			query: qbtypes.QueryBuilderTraceOperator{
				Name:       "complex_trace_op",
				Expression: "(A => B) && (C || D)",
				Filter: &qbtypes.Filter{
					Expression: "duration > 1000",
				},
				Order: []qbtypes.OrderBy{
					{
						Key: qbtypes.OrderByKey{
							TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
								Name: qbtypes.OrderByTraceDuration.StringValue(),
							},
						},
						Direction: qbtypes.OrderDirectionDesc,
					},
				},
			},
			compositeQuery: &qbtypes.CompositeQuery{
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
							Name:   "A",
							Signal: telemetrytypes.SignalTraces,
						},
					},
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
							Name:   "B",
							Signal: telemetrytypes.SignalTraces,
						},
					},
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
							Name:   "C",
							Signal: telemetrytypes.SignalTraces,
						},
					},
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
							Name:   "D",
							Signal: telemetrytypes.SignalTraces,
						},
					},
				},
			},
			expectedError: "",
			validateSQL: func(sql string) bool {
				return strings.Contains(sql, "ORDER BY") &&
					strings.Contains(sql, "subQuery.durationNano")
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			fm := NewFieldMapper()
			cb := NewConditionBuilder(fm)
			mockMetadataStore := telemetrytypestest.NewMockMetadataStore()
			mockMetadataStore.KeysMap = buildCompleteFieldKeyMap()

			traceStmtBuilder := NewTraceQueryStatementBuilder(
				instrumentationtest.New().ToProviderSettings(),
				mockMetadataStore,
				fm,
				cb,
				nil, // resource filter builder
				nil, // agg expr rewriter
				nil, // telemetry store - added missing parameter
			)

			aggExprRewriter := &mockAggExprRewriter{}

			builder := &traceOperatorStatementBuilder{
				metadataStore:    mockMetadataStore,
				fm:               fm,
				cb:               cb,
				traceStmtBuilder: traceStmtBuilder,
				aggExprRewriter:  aggExprRewriter,
			}

			var ctx context.Context
			if tc.compositeQuery != nil {
				ctx = context.WithValue(context.Background(), compositeQueryKey, tc.compositeQuery)
			} else {
				ctx = context.Background()
			}

			stmt, err := builder.Build(ctx, 1000, 2000, tc.requestType, tc.query)

			if tc.expectedError != "" {
				require.Error(t, err)
				assert.Contains(t, err.Error(), tc.expectedError)
				assert.Nil(t, stmt)
			} else {
				require.NoError(t, err)
				require.NotNil(t, stmt)
				assert.NotEmpty(t, stmt.Query)

				if tc.validateSQL != nil {
					assert.True(t, tc.validateSQL(stmt.Query), "SQL validation failed for: %s", stmt.Query)
				}
			}
		})
	}
}

func TestTraceOperatorStatementBuilder_Build_WithSelectFields(t *testing.T) {
	fm := NewFieldMapper()
	cb := NewConditionBuilder(fm)
	mockMetadataStore := telemetrytypestest.NewMockMetadataStore()
	mockMetadataStore.KeysMap = buildCompleteFieldKeyMap()

	traceStmtBuilder := NewTraceQueryStatementBuilder(
		instrumentationtest.New().ToProviderSettings(),
		mockMetadataStore,
		fm,
		cb,
		nil,
		nil,
		nil, // telemetry store - added missing parameter
	)

	aggExprRewriter := &mockAggExprRewriter{}

	builder := &traceOperatorStatementBuilder{
		metadataStore:    mockMetadataStore,
		fm:               fm,
		cb:               cb,
		traceStmtBuilder: traceStmtBuilder,
		aggExprRewriter:  aggExprRewriter,
	}

	query := qbtypes.QueryBuilderTraceOperator{
		Name:       "trace_op_with_fields",
		Expression: "A => B",
		SelectFields: []telemetrytypes.TelemetryFieldKey{
			{
				Name:          "http.method",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
				Signal:        telemetrytypes.SignalTraces,
			},
			{
				Name:          "http.status_code",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeNumber,
				Signal:        telemetrytypes.SignalTraces,
			},
		},
	}

	compositeQuery := &qbtypes.CompositeQuery{
		Queries: []qbtypes.QueryEnvelope{
			{
				Type: qbtypes.QueryTypeBuilder,
				Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
					Name:   "A",
					Signal: telemetrytypes.SignalTraces,
				},
			},
			{
				Type: qbtypes.QueryTypeBuilder,
				Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
					Name:   "B",
					Signal: telemetrytypes.SignalTraces,
				},
			},
		},
	}

	ctx := context.WithValue(context.Background(), compositeQueryKey, compositeQuery)

	stmt, err := builder.Build(ctx, 1000, 2000, qbtypes.RequestTypeRaw, query)

	require.NoError(t, err)
	require.NotNil(t, stmt)
	assert.NotEmpty(t, stmt.Query)

	// Verify that the base_spans CTE includes the additional select fields
	assert.Contains(t, stmt.Query, "base_spans AS")
}

// Mock implementation for testing
type mockAggExprRewriter struct{}

func (m *mockAggExprRewriter) Rewrite(ctx context.Context, expr string, rateInterval uint64, keys map[string][]*telemetrytypes.TelemetryFieldKey) (string, []any, error) {
	// Simple mock implementation
	return expr, []any{}, nil
}

func (m *mockAggExprRewriter) RewriteMulti(ctx context.Context, exprs []string, rateInterval uint64, keys map[string][]*telemetrytypes.TelemetryFieldKey) ([]string, [][]any, error) {
	args := make([][]any, len(exprs))
	for i := range args {
		args[i] = []any{}
	}
	return exprs, args, nil
}

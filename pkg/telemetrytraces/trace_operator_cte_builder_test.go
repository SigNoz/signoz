package telemetrytraces

import (
	"context"
	"testing"
	"time"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes/telemetrytypestest"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestTraceOperatorCTEBuilder_CollectQueries(t *testing.T) {
	testCases := []struct {
		name            string
		operator        *qbtypes.QueryBuilderTraceOperator
		compositeQuery  *qbtypes.CompositeQuery
		expectedError   string
		expectedQueries []string
	}{
		{
			name: "simple direct descendant",
			operator: &qbtypes.QueryBuilderTraceOperator{
				Expression: "A => B",
				ParsedExpression: &qbtypes.TraceOperand{
					Operator: &qbtypes.TraceOperatorDirectDescendant,
					Left: &qbtypes.TraceOperand{
						QueryRef: &qbtypes.TraceOperatorQueryRef{Name: "A"},
					},
					Right: &qbtypes.TraceOperand{
						QueryRef: &qbtypes.TraceOperatorQueryRef{Name: "B"},
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
				},
			},
			expectedError:   "",
			expectedQueries: []string{"A", "B"},
		},
		{
			name: "missing referenced query",
			operator: &qbtypes.QueryBuilderTraceOperator{
				Expression: "A => C",
				ParsedExpression: &qbtypes.TraceOperand{
					Operator: &qbtypes.TraceOperatorDirectDescendant,
					Left: &qbtypes.TraceOperand{
						QueryRef: &qbtypes.TraceOperatorQueryRef{Name: "A"},
					},
					Right: &qbtypes.TraceOperand{
						QueryRef: &qbtypes.TraceOperatorQueryRef{Name: "C"},
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
				},
			},
			expectedError:   "referenced query 'C' not found",
			expectedQueries: nil,
		},
		{
			name: "complex OR expression",
			operator: &qbtypes.QueryBuilderTraceOperator{
				Expression: "A || B || C",
				ParsedExpression: &qbtypes.TraceOperand{
					Operator: &qbtypes.TraceOperatorOr,
					Left: &qbtypes.TraceOperand{
						Operator: &qbtypes.TraceOperatorOr,
						Left: &qbtypes.TraceOperand{
							QueryRef: &qbtypes.TraceOperatorQueryRef{Name: "A"},
						},
						Right: &qbtypes.TraceOperand{
							QueryRef: &qbtypes.TraceOperatorQueryRef{Name: "B"},
						},
					},
					Right: &qbtypes.TraceOperand{
						QueryRef: &qbtypes.TraceOperatorQueryRef{Name: "C"},
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
				},
			},
			expectedError:   "",
			expectedQueries: []string{"A", "B", "C"},
		},
		{
			name: "non-trace query in composite",
			operator: &qbtypes.QueryBuilderTraceOperator{
				Expression: "A => B",
				ParsedExpression: &qbtypes.TraceOperand{
					Operator: &qbtypes.TraceOperatorDirectDescendant,
					Left: &qbtypes.TraceOperand{
						QueryRef: &qbtypes.TraceOperatorQueryRef{Name: "A"},
					},
					Right: &qbtypes.TraceOperand{
						QueryRef: &qbtypes.TraceOperatorQueryRef{Name: "B"},
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
						Spec: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
							Name:   "B", // This is a log query, not trace
							Signal: telemetrytypes.SignalLogs,
						},
					},
				},
			},
			expectedError:   "referenced query 'B' not found",
			expectedQueries: nil,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			mockMetadataStore := telemetrytypestest.NewMockMetadataStore()
			mockMetadataStore.KeysMap = buildCompleteFieldKeyMapTraceOperator()

			builder := &traceOperatorCTEBuilder{
				ctx:            context.Background(),
				start:          1000000000000, // 1 second in nanoseconds
				end:            2000000000000, // 2 seconds in nanoseconds
				operator:       tc.operator,
				stmtBuilder:    &traceOperatorStatementBuilder{metadataStore: mockMetadataStore, cb: NewConditionBuilder(NewFieldMapper())},
				queries:        make(map[string]*qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]),
				ctes:           []cteNode{},
				cteNameToIndex: make(map[string]int),
				queryToCTEName: make(map[string]string),
				compositeQuery: tc.compositeQuery,
			}

			err := builder.collectQueries()

			if tc.expectedError != "" {
				require.Error(t, err)
				assert.Contains(t, err.Error(), tc.expectedError)
			} else {
				require.NoError(t, err)
				assert.Len(t, builder.queries, len(tc.expectedQueries))

				for _, expectedQuery := range tc.expectedQueries {
					assert.Contains(t, builder.queries, expectedQuery)
				}
			}
		})
	}
}

func TestTraceOperatorCTEBuilder_BuildBaseSpansCTE(t *testing.T) {
	mockMetadataStore := telemetrytypestest.NewMockMetadataStore()
	mockMetadataStore.KeysMap = buildCompleteFieldKeyMapTraceOperator()

	fm := NewFieldMapper()

	operator := &qbtypes.QueryBuilderTraceOperator{
		SelectFields: []telemetrytypes.TelemetryFieldKey{
			{
				Name:          "http.method",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
				Signal:        telemetrytypes.SignalTraces,
			},
		},
	}

	builder := &traceOperatorCTEBuilder{
		ctx:            context.Background(),
		start:          1640995200000000000, // 2022-01-01T00:00:00Z in nanoseconds
		end:            1640995260000000000, // 2022-01-01T00:01:00Z in nanoseconds
		operator:       operator,
		stmtBuilder:    &traceOperatorStatementBuilder{fm: fm, metadataStore: mockMetadataStore},
		queries:        make(map[string]*qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]),
		ctes:           []cteNode{},
		cteNameToIndex: make(map[string]int),
		queryToCTEName: make(map[string]string),
	}

	builder.buildBaseSpansCTE()

	require.Len(t, builder.ctes, 1)

	cte := builder.ctes[0]
	assert.Equal(t, "base_spans", cte.name)
	assert.Contains(t, cte.sql, "SELECT")
	assert.Contains(t, cte.sql, "trace_id")
	assert.Contains(t, cte.sql, "span_id")
	assert.Contains(t, cte.sql, "timestamp")
	assert.Contains(t, cte.sql, "duration_nano AS durationNano")
	assert.Contains(t, cte.sql, "serviceName")
	assert.Contains(t, cte.sql, "FROM signoz_traces.distributed_signoz_index_v3")
	assert.Contains(t, cte.sql, "WHERE timestamp >=")
	assert.Contains(t, cte.sql, "AND timestamp <")
}

func TestTraceOperatorCTEBuilder_BuildOperatorCTEs(t *testing.T) {
	testCases := []struct {
		name            string
		operator        qbtypes.TraceOperatorType
		expectedCTEName string
		expectedSQL     []string
	}{
		{
			name:            "direct descendant",
			operator:        qbtypes.TraceOperatorDirectDescendant,
			expectedCTEName: "A_=>_B", // Actual CTE name format
			expectedSQL:     []string{"INNER JOIN", "p.span_id = c.parent_span_id"},
		},
		{
			name:            "AND operation",
			operator:        qbtypes.TraceOperatorAnd,
			expectedCTEName: "A_&&_B",
			expectedSQL:     []string{"INNER JOIN", "l.span_id = r.span_id"},
		},
		{
			name:            "OR operation",
			operator:        qbtypes.TraceOperatorOr,
			expectedCTEName: "A_||_B",
			expectedSQL:     []string{"UNION DISTINCT"},
		},
		{
			name:            "NOT operation",
			operator:        qbtypes.TraceOperatorNot,
			expectedCTEName: "A_not_B", // Actual CTE name format (lowercase)
			expectedSQL:     []string{"NOT EXISTS"},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			mockMetadataStore := telemetrytypestest.NewMockMetadataStore()
			mockMetadataStore.KeysMap = buildCompleteFieldKeyMapTraceOperator()

			builder := &traceOperatorCTEBuilder{
				ctx:            context.Background(),
				start:          1000000000000,
				end:            2000000000000,
				operator:       &qbtypes.QueryBuilderTraceOperator{},
				stmtBuilder:    &traceOperatorStatementBuilder{metadataStore: mockMetadataStore, cb: NewConditionBuilder(NewFieldMapper())},
				queries:        make(map[string]*qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]),
				ctes:           []cteNode{},
				cteNameToIndex: make(map[string]int),
				queryToCTEName: make(map[string]string),
			}

			// Add mock CTEs for A and B
			builder.addCTE("A", "SELECT * FROM base_spans WHERE service = 'A'", nil, []string{"base_spans"})
			builder.addCTE("B", "SELECT * FROM base_spans WHERE service = 'B'", nil, []string{"base_spans"})

			cteName, err := builder.buildOperatorCTE(tc.operator, "A", "B")

			require.NoError(t, err)
			assert.Equal(t, tc.expectedCTEName, cteName)

			// Find the CTE in the builder
			var foundCTE *cteNode
			for _, cte := range builder.ctes {
				if cte.name == cteName {
					foundCTE = &cte
					break
				}
			}

			require.NotNil(t, foundCTE)
			for _, expectedSQL := range tc.expectedSQL {
				assert.Contains(t, foundCTE.sql, expectedSQL)
			}
		})
	}
}

func TestTraceOperatorCTEBuilder_BuildFinalQuery(t *testing.T) {
	testCases := []struct {
		name          string
		requestType   qbtypes.RequestType
		selectFromCTE string
		operator      *qbtypes.QueryBuilderTraceOperator
		expectedSQL   []string
	}{
		{
			name:          "raw request",
			requestType:   qbtypes.RequestTypeRaw,
			selectFromCTE: "final_result",
			operator: &qbtypes.QueryBuilderTraceOperator{
				Name: "test_op",
				Order: []qbtypes.OrderBy{
					{
						Key: qbtypes.OrderByKey{
							TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
								Name: "timestamp",
							},
						},
						Direction: qbtypes.OrderDirectionDesc,
					},
				},
				Limit: 100,
			},
			expectedSQL: []string{"timestamp", "trace_id", "span_id", "name", "ORDER BY timestamp DESC", "LIMIT ?"},
		},
		{
			name:          "time series request",
			requestType:   qbtypes.RequestTypeTimeSeries,
			selectFromCTE: "final_result",
			operator: &qbtypes.QueryBuilderTraceOperator{
				Name: "test_op",
				StepInterval: qbtypes.Step{
					Duration: time.Minute,
				},
				Aggregations: []qbtypes.TraceAggregation{
					{Expression: "count()"},
				},
			},
			expectedSQL: []string{"toStartOfInterval", "INTERVAL 60 SECOND", "count(*) AS __result_0", "GROUP BY ALL"},
		},
		{
			name:          "scalar request",
			requestType:   qbtypes.RequestTypeScalar,
			selectFromCTE: "final_result",
			operator: &qbtypes.QueryBuilderTraceOperator{
				Name: "test_op",
				Aggregations: []qbtypes.TraceAggregation{
					{Expression: "count()"},
				},
			},
			expectedSQL: []string{"subQuery.serviceName", "subQuery.name", "span_count", "subQuery.durationNano", "subQuery.traceID"},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			mockMetadataStore := telemetrytypestest.NewMockMetadataStore()
			mockMetadataStore.KeysMap = buildCompleteFieldKeyMapTraceOperator()

			builder := &traceOperatorCTEBuilder{
				ctx:            context.Background(),
				start:          1000000000000,
				end:            2000000000000,
				operator:       tc.operator,
				stmtBuilder:    &traceOperatorStatementBuilder{metadataStore: mockMetadataStore, cb: NewConditionBuilder(NewFieldMapper())},
				queries:        make(map[string]*qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]),
				ctes:           []cteNode{},
				cteNameToIndex: make(map[string]int),
				queryToCTEName: make(map[string]string),
			}

			// Add base_spans CTE first
			builder.addCTE("base_spans", "SELECT trace_id, span_id FROM spans", nil, nil)

			stmt, err := builder.buildFinalQuery(tc.selectFromCTE, tc.requestType)

			require.NoError(t, err)
			require.NotNil(t, stmt)

			for _, expectedSQL := range tc.expectedSQL {
				assert.Contains(t, stmt.Query, expectedSQL)
			}
		})
	}
}

func TestTraceOperatorCTEBuilder_BuildCompleteQuery(t *testing.T) {
	testCases := []struct {
		name        string
		operator    *qbtypes.QueryBuilderTraceOperator
		composite   *qbtypes.CompositeQuery
		requestType qbtypes.RequestType
		expectedSQL []string
	}{
		{
			name: "OR operation with scalar result",
			operator: &qbtypes.QueryBuilderTraceOperator{
				Name:       "or_op",
				Expression: "A || B",
				ParsedExpression: &qbtypes.TraceOperand{
					Operator: &qbtypes.TraceOperatorOr,
					Left: &qbtypes.TraceOperand{
						QueryRef: &qbtypes.TraceOperatorQueryRef{Name: "A"},
					},
					Right: &qbtypes.TraceOperand{
						QueryRef: &qbtypes.TraceOperatorQueryRef{Name: "B"},
					},
				},
				Aggregations: []qbtypes.TraceAggregation{
					{Expression: "count()"},
				},
			},
			composite: &qbtypes.CompositeQuery{
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
			requestType: qbtypes.RequestTypeScalar,
			expectedSQL: []string{
				"WITH",
				"A_||_B AS",
				"UNION DISTINCT",
				"SELECT DISTINCT trace_id FROM A_||_B",
				"subQuery.serviceName",
				"span_count",
				"JOIN base_spans root ON",
				"root.parent_span_id = ''",
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			mockMetadataStore := telemetrytypestest.NewMockMetadataStore()
			mockMetadataStore.KeysMap = buildCompleteFieldKeyMapTraceOperator()

			fm := NewFieldMapper()

			builder := &traceOperatorCTEBuilder{
				ctx:            context.Background(),
				start:          1640995200000000000,
				end:            1640995260000000000,
				operator:       tc.operator,
				stmtBuilder:    &traceOperatorStatementBuilder{fm: fm, metadataStore: mockMetadataStore},
				queries:        make(map[string]*qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]),
				ctes:           []cteNode{},
				cteNameToIndex: make(map[string]int),
				queryToCTEName: make(map[string]string),
				compositeQuery: tc.composite,
			}

			// Collect queries
			err := builder.collectQueries()
			require.NoError(t, err)

			// Build the complete query
			stmt, err := builder.build(tc.requestType)
			require.NoError(t, err)
			require.NotNil(t, stmt)

			// Verify expected SQL patterns
			for _, expectedSQL := range tc.expectedSQL {
				assert.Contains(t, stmt.Query, expectedSQL, "Missing expected SQL pattern: %s", expectedSQL)
			}
		})
	}
}

func TestTraceOperatorCTEBuilder_AddCTE(t *testing.T) {
	builder := &traceOperatorCTEBuilder{
		ctes:           []cteNode{},
		cteNameToIndex: make(map[string]int),
	}

	// Test adding first CTE
	builder.addCTE("test_cte", "SELECT * FROM test", []any{"arg1"}, []string{"dependency"})

	assert.Len(t, builder.ctes, 1)
	assert.Equal(t, "test_cte", builder.ctes[0].name)
	assert.Equal(t, "SELECT * FROM test", builder.ctes[0].sql)
	assert.Equal(t, []any{"arg1"}, builder.ctes[0].args)
	assert.Equal(t, []string{"dependency"}, builder.ctes[0].dependsOn)
	assert.Equal(t, 0, builder.cteNameToIndex["test_cte"])

	// Test adding second CTE
	builder.addCTE("test_cte2", "SELECT * FROM test2", nil, nil)

	assert.Len(t, builder.ctes, 2)
	assert.Equal(t, 1, builder.cteNameToIndex["test_cte2"])
}

func TestTraceOperatorCTEBuilder_BuildTimeConstantsCTE(t *testing.T) {
	builder := &traceOperatorCTEBuilder{
		start: 1640995200000000000, // 2022-01-01T00:00:00Z in nanoseconds
		end:   1640995260000000000, // 2022-01-01T00:01:00Z in nanoseconds
	}

	constants := builder.buildTimeConstantsCTE()

	assert.Contains(t, constants, "toDateTime64(1640995200000000000, 9) AS t_from")
	assert.Contains(t, constants, "toDateTime64(1640995260000000000, 9) AS t_to")
	assert.Contains(t, constants, "AS bucket_from")
	assert.Contains(t, constants, "AS bucket_to")
}

// Helper function to build complete field key map for testing
func buildCompleteFieldKeyMapTraceOperator() map[string][]*telemetrytypes.TelemetryFieldKey {
	return map[string][]*telemetrytypes.TelemetryFieldKey{
		"service.name": {
			{
				Name:         "service.name",
				FieldContext: telemetrytypes.FieldContextResource,
				Signal:       telemetrytypes.SignalTraces,
			},
		},
		"http.method": {
			{
				Name:          "http.method",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
				Signal:        telemetrytypes.SignalTraces,
			},
		},
		"http.status_code": {
			{
				Name:          "http.status_code",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeNumber,
				Signal:        telemetrytypes.SignalTraces,
			},
		},
		"timestamp": {
			{
				Name:         "timestamp",
				FieldContext: telemetrytypes.FieldContextSpan,
				Signal:       telemetrytypes.SignalTraces,
			},
		},
		"duration": {
			{
				Name:         "duration",
				FieldContext: telemetrytypes.FieldContextSpan,
				Signal:       telemetrytypes.SignalTraces,
			},
		},
	}
}

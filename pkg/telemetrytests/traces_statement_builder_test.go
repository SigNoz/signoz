package telemetrytests

import (
	"context"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/telemetrytraces"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes/telemetrytypestest"
	"github.com/stretchr/testify/require"
)

func TestStatementBuilder(t *testing.T) {
	cases := []struct {
		name        string
		requestType qbtypes.RequestType
		query       qbtypes.QueryBuilderQuery[qbtypes.Aggregation]
		expected    qbtypes.Statement
		expectedErr error
	}{
		{
			name:        "test",
			requestType: qbtypes.RequestTypeScalar,
			query: qbtypes.QueryBuilderQuery[qbtypes.Aggregation]{
				StepInterval: qbtypes.Step{Duration: 30 * time.Second},
				Aggregations: []qbtypes.Aggregation{
					{
						Expression: "count()",
					},
				},
				Filter: &qbtypes.Filter{
					Expression: "service.name = 'test'",
				},
			},
			expected: qbtypes.Statement{
				Query:    "SELECT count() FROM traces WHERE service.name = 'test'",
				Args:     []any{"test"},
				Warnings: []string{},
			},
			expectedErr: nil,
		},
		{
			name:        "test",
			requestType: qbtypes.RequestTypeTimeSeries,
			query: qbtypes.QueryBuilderQuery[qbtypes.Aggregation]{
				StepInterval: qbtypes.Step{Duration: 30 * time.Second},
				Aggregations: []qbtypes.Aggregation{
					{
						Expression: "count()",
					},
				},
				Filter: &qbtypes.Filter{
					Expression: "service.name = 'test'",
				},
			},
			expected: qbtypes.Statement{
				Query:    "SELECT count() FROM traces WHERE service.name = 'test'",
				Args:     []any{"test"},
				Warnings: []string{},
			},
			expectedErr: nil,
		},
		{
			name:        "test",
			requestType: qbtypes.RequestTypeTimeSeries,
			query: qbtypes.QueryBuilderQuery[qbtypes.Aggregation]{
				StepInterval: qbtypes.Step{Duration: 30 * time.Second},
				Aggregations: []qbtypes.Aggregation{
					{
						Expression: "count()",
					},
				},
				Filter: &qbtypes.Filter{
					Expression: "service.name = 'test'",
				},
				Limit: 10,
				GroupBy: []qbtypes.GroupByKey{
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: "service.name",
						},
					},
				},
			},
			expected: qbtypes.Statement{
				Query:    "SELECT count() FROM traces WHERE service.name = 'test'",
				Args:     []any{"test"},
				Warnings: []string{},
			},
			expectedErr: nil,
		},
	}

	fm := telemetrytraces.NewFieldMapper()
	cb := telemetrytraces.NewConditionBuilder(fm)
	mockMetadataStore := telemetrytypestest.NewMockMetadataStore()
	mockMetadataStore.KeysMap = buildCompleteFieldKeyMap()
	compiler := telemetrytraces.NewFilterCompiler(telemetrytraces.FilterCompilerOpts{
		FieldMapper:      fm,
		ConditionBuilder: cb,
		MetadataStore:    mockMetadataStore,
	})
	aggExprRewriter := querybuilder.NewAggExprRewriter(querybuilder.AggExprRewriterOptions{
		FieldMapper:      fm,
		ConditionBuilder: cb,
		MetadataStore:    mockMetadataStore,
	})

	statementBuilder := telemetrytraces.NewTraceQueryStatementBuilder(telemetrytraces.TraceQueryStatementBuilderOpts{
		FieldMapper:      fm,
		ConditionBuilder: cb,
		Compiler:         compiler,
		MetadataStore:    mockMetadataStore,
		AggExprRewriter:  aggExprRewriter,
	})

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {

			q, err := statementBuilder.Build(context.Background(), 1, 100, c.requestType, c.query)

			if c.expectedErr != nil {
				require.Error(t, err)
				require.Contains(t, err.Error(), c.expectedErr.Error())
			} else {
				require.NoError(t, err)
				require.Equal(t, c.expected.Query, q.Query)
				require.Equal(t, c.expected.Args, q.Args)
				require.Equal(t, c.expected.Warnings, q.Warnings)
			}
		})
	}
}

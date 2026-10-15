package logsstatementbuilder

import (
	"context"
	"testing"

	"github.com/SigNoz/signoz/pkg/flagger/flaggertest"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/statementbuilder"
	"github.com/SigNoz/signoz/pkg/telemetryschema/logstelemetryschema"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes/telemetrytypestest"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/require"
)

// A key present in both resource and body contexts must filter on resource only.
// The resource condition builds the fingerprint CTE, so a surviving body condition
// would AND against it and match almost nothing (engineering-pod#6086).
func TestStatementBuilderResourceBodyConflict(t *testing.T) {
	store := telemetrytypestest.NewMockMetadataStore()
	store.SetStaticFields(logstelemetryschema.IntrinsicFields)
	store.SetKey(&telemetrytypes.TelemetryFieldKey{
		Name:          "service.name",
		Signal:        telemetrytypes.SignalLogs,
		FieldContext:  telemetrytypes.FieldContextResource,
		FieldDataType: telemetrytypes.FieldDataTypeString,
	})
	bodyKey := &telemetrytypes.TelemetryFieldKey{
		Name:          "service.name",
		Signal:        telemetrytypes.SignalLogs,
		FieldContext:  telemetrytypes.FieldContextBody,
		FieldDataType: telemetrytypes.FieldDataTypeString,
	}
	require.NoError(t, bodyKey.SetJSONAccessPlan(telemetrytypes.JSONColumnMetadata{
		BaseColumn:     logstelemetryschema.LogsV2BodyV2Column,
		PromotedColumn: logstelemetryschema.LogsV2BodyPromotedColumn,
	}, map[string][]telemetrytypes.FieldDataType{"service.name": {telemetrytypes.FieldDataTypeString}}))
	store.SetKey(bodyKey)

	fl := flaggertest.WithUseJSONBody(t, true)
	storage := logstelemetryschema.NewStorage()
	aggExprRewriter := querybuilder.NewAggExprRewriter(instrumentationtest.New().ToProviderSettings(), nil, storage, fl, telemetrytypes.SignalLogs)
	statementBuilder := NewLogQueryStatementBuilder(
		instrumentationtest.New().ToProviderSettings(),
		store,
		storage,
		aggExprRewriter,
		logstelemetryschema.DefaultFullTextColumn,
		fl,
		nil,
		statementbuilder.Config{SkipResourceFingerprint: statementbuilder.SkipResourceFingerprint{Enabled: false, Threshold: 100000}},
	)

	testCases := []struct {
		name        string
		requestType qbtypes.RequestType
		query       qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]
		expected    qbtypes.Statement
	}{
		{
			name:        "AmbiguousKeyFiltersResourceOnly",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "service.name = 'webapp'"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE (simpleJSONExtractString(labels, 'service.name') = ? AND labels LIKE ? AND labels LIKE ?) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ? GROUP BY fingerprint) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body_v2 as body, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{"webapp", "%service.name%", "%service.name\":\"webapp%", uint64(1747945619), uint64(1747983448), "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
				Warnings: []string{
					"Key `service.name` is ambiguous, found 2 different combinations of field context / data type: [name=service.name,context=resource,datatype=string name=service.name,context=body,datatype=string]. Using `resource` context by default. To query another context explicitly, use the fully qualified name (e.g., 'attribute.service.name' or 'body.service.name')",
				},
			},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			q, err := statementBuilder.Build(context.Background(), valuer.UUID{}, 1747947419000, 1747983448000, testCase.requestType, testCase.query, nil)
			require.NoError(t, err)
			require.Equal(t, testCase.expected.Query, q.Query)
			require.Equal(t, testCase.expected.Args, q.Args)
			require.Equal(t, testCase.expected.Warnings, q.Warnings)
		})
	}
}

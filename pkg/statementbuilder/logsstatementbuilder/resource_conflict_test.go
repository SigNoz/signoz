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
func TestStatementBuilderResourceBodyConflictFiltersResourceOnly(t *testing.T) {
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
	sb := NewLogQueryStatementBuilder(
		instrumentationtest.New().ToProviderSettings(),
		store,
		storage,
		aggExprRewriter,
		logstelemetryschema.DefaultFullTextColumn,
		fl,
		nil,
		statementbuilder.Config{SkipResourceFingerprint: statementbuilder.SkipResourceFingerprint{Enabled: false, Threshold: 100000}},
	)

	q, err := sb.Build(context.Background(), valuer.UUID{}, 1747947419000, 1747983448000, qbtypes.RequestTypeRaw,
		qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
			Signal: telemetrytypes.SignalLogs,
			Filter: &qbtypes.Filter{Expression: "service.name = 'webapp'"},
			Limit:  10,
		}, nil)
	require.NoError(t, err)

	require.Contains(t, q.Query, "resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter)")
	require.NotContains(t, q.Query, "body_v2.`service.name`")
	require.Len(t, q.Warnings, 1)
	require.Contains(t, q.Warnings[0], "Using `resource` context by default")
}

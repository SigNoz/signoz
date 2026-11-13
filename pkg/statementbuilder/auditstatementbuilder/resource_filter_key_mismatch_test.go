package auditstatementbuilder

import (
	"context"
	"fmt"
	"slices"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/flagger/flaggertest"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/telemetryschema/audittelemetryschema"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes/telemetrytypestest"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/require"
)

func TestStatementBuilderKeepsResourceConditionsWhenKeysVanishMidBuild(t *testing.T) {
	cases := map[string][]string{
		"all resource keys vanish":  {"service.name", "signoz.audit.resource.kind"},
		"one resource key vanishes": {"signoz.audit.resource.kind"},
	}
	requestTypes := []qbtypes.RequestType{qbtypes.RequestTypeRaw, qbtypes.RequestTypeTimeSeries, qbtypes.RequestTypeScalar}
	for name, vanished := range cases {
		for _, requestType := range requestTypes {
			t.Run(fmt.Sprintf("%s/%s", name, requestType.StringValue()), func(t *testing.T) {
				fl := flaggertest.New(t)
				mock := telemetrytypestest.NewMockMetadataStore()
				mock.KeysMap = auditFieldKeyMap()
				store := &telemetrytypestest.KeysVanishAfterFirstLookup{MockMetadataStore: mock, Vanished: vanished}
				storage := audittelemetryschema.NewStorage()
				aggExprRewriter := querybuilder.NewAggExprRewriter(instrumentationtest.New().ToProviderSettings(), nil, storage, fl, telemetrytypes.SignalLogs)
				statementBuilder := NewAuditQueryStatementBuilder(
					instrumentationtest.New().ToProviderSettings(),
					store, storage, aggExprRewriter,
					audittelemetryschema.DefaultFullTextColumn, fl,
				)

				query := qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
					Signal:       telemetrytypes.SignalLogs,
					Limit:        10,
					StepInterval: qbtypes.Step{Duration: 60 * time.Second},
					Filter:       &qbtypes.Filter{Expression: "service.name = 'signoz' AND signoz.audit.resource.kind = 'dashboard' AND signoz.audit.action = 'create'"},
				}
				if requestType != qbtypes.RequestTypeRaw {
					query.Aggregations = []qbtypes.LogAggregation{{Expression: "count()"}}
				}
				q, err := statementBuilder.Build(context.Background(), valuer.UUID{}, 1747947419000, 1747983448000, requestType, query, nil)
				require.NoError(t, err)
				require.True(t, slices.Contains(q.Args, any("signoz")), q.Query)
				require.True(t, slices.Contains(q.Args, any("dashboard")), q.Query)
			})
		}
	}
}

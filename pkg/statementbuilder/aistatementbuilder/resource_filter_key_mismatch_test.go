package aistatementbuilder

import (
	"context"
	"slices"
	"testing"

	"github.com/SigNoz/signoz/pkg/flagger/flaggertest"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/statementbuilder"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes/telemetrytypestest"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/require"
)

func TestBuild_KeepsResourceConditionsWhenKeysVanishMidBuild(t *testing.T) {
	cases := map[string][]string{
		"all resource keys vanish":  {"service.name", "deployment.environment"},
		"one resource key vanishes": {"deployment.environment"},
	}
	queries := map[string]struct {
		requestType qbtypes.RequestType
		query       qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]
	}{
		"trace list": {qbtypes.RequestTypeTrace, qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{Limit: 10}},
		"trace aggregation": {qbtypes.RequestTypeScalar, qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Aggregations: []qbtypes.TraceAggregation{{Expression: "avg(trace.output_tokens)"}},
		}},
	}
	for name, vanished := range cases {
		for queryName, tc := range queries {
			t.Run(name+"/"+queryName, func(t *testing.T) {
				mock := telemetrytypestest.NewMockMetadataStore()
				mock.KeysMap = otelKeysMap()
				for _, key := range []string{"service.name", "deployment.environment"} {
					mock.KeysMap[key] = []*telemetrytypes.TelemetryFieldKey{{
						Name:          key,
						Signal:        telemetrytypes.SignalTraces,
						FieldContext:  telemetrytypes.FieldContextResource,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					}}
				}
				store := &telemetrytypestest.KeysVanishAfterFirstLookup{MockMetadataStore: mock, Vanished: vanished}
				b, err := NewFactory(nil, store, nil, flaggertest.New(t)).
					New(context.Background(), instrumentationtest.New().ToProviderSettings(), statementbuilder.Config{SkipResourceFingerprint: statementbuilder.SkipResourceFingerprint{Threshold: 100000}})
				require.NoError(t, err)

				query := tc.query
				query.Signal = telemetrytypes.SignalTraces
				query.Filter = &qbtypes.Filter{Expression: "service.name = 'redis' AND deployment.environment = 'prod' AND gen_ai.request.model = 'gpt-4o-mini'"}
				stmt, err := b.Build(context.Background(), valuer.UUID{}, testStartMs, testEndMs, tc.requestType, query, nil)
				require.NoError(t, err)
				require.True(t, slices.Contains(stmt.Args, any("redis")), stmt.Query)
				require.True(t, slices.Contains(stmt.Args, any("prod")), stmt.Query)
			})
		}
	}
}

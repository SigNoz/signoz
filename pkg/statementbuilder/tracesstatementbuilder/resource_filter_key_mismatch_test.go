package tracesstatementbuilder

import (
	"context"
	"fmt"
	"slices"
	"testing"
	"time"

	cmock "github.com/SigNoz/clickhouse-go-mock"
	"github.com/SigNoz/signoz/pkg/flagger/flaggertest"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/telemetryschema/tracestelemetryschema"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrystore/telemetrystoretest"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes/telemetrytypestest"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/require"
)

// keysVanishAfterFirstLookup drops some keys from every lookup after the first,
// as when the key tables are emptied while a statement is being built.
type keysVanishAfterFirstLookup struct {
	*telemetrytypestest.MockMetadataStore
	vanished []string
	calls    int
}

func (s *keysVanishAfterFirstLookup) GetKeysMulti(ctx context.Context, orgID valuer.UUID, selectors []*telemetrytypes.FieldKeySelector) (map[string][]*telemetrytypes.TelemetryFieldKey, bool, error) {
	keys, complete, err := s.MockMetadataStore.GetKeysMulti(ctx, orgID, selectors)
	s.calls++
	if s.calls > 1 {
		for _, name := range s.vanished {
			delete(keys, name)
		}
	}
	return keys, complete, err
}

func TestStatementBuilderKeepsResourceConditionsWhenKeysVanishMidBuild(t *testing.T) {
	cases := map[string][]string{
		"all resource keys vanish":  {"service.name", "deployment.environment"},
		"one resource key vanishes": {"deployment.environment"},
	}
	for name, vanished := range cases {
		for _, skipResourceFingerprint := range []bool{false, true} {
			t.Run(fmt.Sprintf("%s/skipResourceFingerprint=%t", name, skipResourceFingerprint), func(t *testing.T) {
				releaseTime := time.Date(2024, 1, 15, 10, 0, 0, 0, time.UTC)

				var telemetryStore telemetrystore.TelemetryStore
				var mockStore *telemetrystoretest.Provider
				if skipResourceFingerprint {
					mockStore = telemetrystoretest.New(telemetrystore.Config{}, &regexQueryMatcher{})
					mockStore.Mock().ExpectQueryRow(`SELECT count\(\) FROM \(SELECT fingerprint FROM signoz_traces\.distributed_traces_v3_resource`).
						WillReturnRow(cmock.NewRow([]cmock.ColumnType{{Name: "count", Type: "UInt64"}}, []any{uint64(2)}))
					telemetryStore = mockStore
				}

				fl := flaggertest.New(t)
				storage := tracestelemetryschema.NewStorage(nil)
				mock := telemetrytypestest.NewMockMetadataStore()
				mock.KeysMap = tracestelemetryschema.BuildCompleteFieldKeyMap(releaseTime)
				store := &keysVanishAfterFirstLookup{MockMetadataStore: mock, vanished: vanished}
				aggExprRewriter := querybuilder.NewAggExprRewriter(instrumentationtest.New().ToProviderSettings(), nil, storage, fl, telemetrytypes.SignalTraces)
				statementBuilder := NewTraceQueryStatementBuilder(
					instrumentationtest.New().ToProviderSettings(),
					store, storage, aggExprRewriter,
					telemetryStore, fl, skipResourceFingerprint, 100000,
				)

				query := qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
					Signal:       telemetrytypes.SignalTraces,
					StepInterval: qbtypes.Step{Duration: 60 * time.Second},
					Aggregations: []qbtypes.TraceAggregation{{Expression: "count()"}},
					Filter:       &qbtypes.Filter{Expression: "service.name = 'redis' AND deployment.environment = 'prod' AND has_error = true"},
				}
				q, err := statementBuilder.Build(context.Background(), valuer.UUID{}, 1747947419000, 1747983448000, qbtypes.RequestTypeTimeSeries, query, nil)
				require.NoError(t, err)
				require.True(t, slices.Contains(q.Args, any("redis")), q.Query)
				require.True(t, slices.Contains(q.Args, any("prod")), q.Query)
				if mockStore != nil {
					require.NoError(t, mockStore.Mock().ExpectationsWereMet())
				}
			})
		}
	}
}

package logsstatementbuilder

import (
	"context"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/flagger"
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

// A filter on either spelling of an enabled family compiles to one merged
// condition over the log resource maps. The flag default keeps it literal.
func TestStatementBuilderResolvesLogFamilies(t *testing.T) {
	releaseTime := time.Date(2024, 1, 15, 10, 0, 0, 0, time.UTC)
	releaseTimeNano := uint64(releaseTime.UnixNano())

	testCases := []struct {
		name     string
		familyOn bool
		expected string
	}{
		{
			name:     "FamiliesOn",
			familyOn: true,
			expected: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE (COALESCE(NULLIF(simpleJSONExtractString(labels, 'deployment.environment.name'), ''), NULLIF(simpleJSONExtractString(labels, 'deployment.environment'), ''), '') = ? AND (labels LIKE ? OR labels LIKE ?) AND (labels LIKE ? OR labels LIKE ?)) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ? GROUP BY fingerprint) SELECT count() AS __result_0 FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? ORDER BY __result_0 DESC",
		},
		{
			name:     "FamiliesOff",
			familyOn: false,
			expected: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE (simpleJSONExtractString(labels, 'deployment.environment') = ? AND labels LIKE ? AND labels LIKE ?) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ? GROUP BY fingerprint) SELECT count() AS __result_0 FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? ORDER BY __result_0 DESC",
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			fl := flaggertest.WithBooleanFlags(t, map[string]bool{
				flagger.FeatureResolveSemconvFamilies.String(): testCase.familyOn,
			})
			mockMetadataStore := telemetrytypestest.NewMockMetadataStore()
			keys := logstelemetryschema.BuildCompleteFieldKeyMap(releaseTime)
			for _, name := range []string{"deployment.environment.name", "deployment.environment"} {
				keys[name] = []*telemetrytypes.TelemetryFieldKey{{
					Name:          name,
					Signal:        telemetrytypes.SignalLogs,
					FieldContext:  telemetrytypes.FieldContextResource,
					FieldDataType: telemetrytypes.FieldDataTypeString,
				}}
			}
			mockMetadataStore.KeysMap = keys
			storage := logstelemetryschema.NewStorage()
			aggExprRewriter := querybuilder.NewAggExprRewriter(instrumentationtest.New().ToProviderSettings(), nil, storage, fl, telemetrytypes.SignalLogs)
			statementBuilder := NewLogQueryStatementBuilder(
				instrumentationtest.New().ToProviderSettings(),
				mockMetadataStore, storage, aggExprRewriter,
				logstelemetryschema.DefaultFullTextColumn, fl, nil,
				statementbuilder.Config{SkipResourceFingerprint: statementbuilder.SkipResourceFingerprint{Enabled: false, Threshold: 100000}},
			)

			query := qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal:       telemetrytypes.SignalLogs,
				StepInterval: qbtypes.Step{Duration: 30 * time.Second},
				Aggregations: []qbtypes.LogAggregation{{Expression: "count()"}},
				Filter:       &qbtypes.Filter{Expression: "resource.deployment.environment = 'production'"},
			}
			q, err := statementBuilder.Build(context.Background(), valuer.UUID{},
				releaseTimeNano+uint64(24*time.Hour.Nanoseconds()),
				releaseTimeNano+uint64(48*time.Hour.Nanoseconds()),
				qbtypes.RequestTypeScalar, query, nil)
			require.NoError(t, err)
			require.Equal(t, testCase.expected, q.Query)
		})
	}
}

// The predicate of a filtered aggregation resolves the family exactly like
// the main WHERE clause.
func TestStatementBuilderResolvesLogFamilyFilteredAggregation(t *testing.T) {
	releaseTime := time.Date(2024, 1, 15, 10, 0, 0, 0, time.UTC)
	releaseTimeNano := uint64(releaseTime.UnixNano())

	testCases := []struct {
		name     string
		familyOn bool
		expected string
	}{
		{name: "FamiliesOn", familyOn: true, expected: "SELECT countIf((COALESCE(NULLIF(multiIf(resource.`deployment.environment.name` IS NOT NULL, resource.`deployment.environment.name`::String, mapContains(resources_string, 'deployment.environment.name'), resources_string['deployment.environment.name'], NULL), ''), NULLIF(multiIf(resource.`deployment.environment` IS NOT NULL, resource.`deployment.environment`::String, mapContains(resources_string, 'deployment.environment'), resources_string['deployment.environment'], NULL), ''), '') = ? AND (multiIf(resource.`deployment.environment.name` IS NOT NULL, resource.`deployment.environment.name`::String, mapContains(resources_string, 'deployment.environment.name'), resources_string['deployment.environment.name'], NULL) IS NOT NULL OR multiIf(resource.`deployment.environment` IS NOT NULL, resource.`deployment.environment`::String, mapContains(resources_string, 'deployment.environment'), resources_string['deployment.environment'], NULL) IS NOT NULL))) AS __result_0 FROM signoz_logs.distributed_logs_v2 WHERE timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? ORDER BY __result_0 DESC"},
		{name: "FamiliesOff", familyOn: false, expected: "SELECT countIf(multiIf(resource.`deployment.environment.name` IS NOT NULL, resource.`deployment.environment.name`::String, mapContains(resources_string, 'deployment.environment.name'), resources_string['deployment.environment.name'], NULL) = ?) AS __result_0 FROM signoz_logs.distributed_logs_v2 WHERE timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? ORDER BY __result_0 DESC"},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			fl := flaggertest.WithBooleanFlags(t, map[string]bool{
				flagger.FeatureResolveSemconvFamilies.String(): testCase.familyOn,
			})
			mockMetadataStore := telemetrytypestest.NewMockMetadataStore()
			keys := logstelemetryschema.BuildCompleteFieldKeyMap(releaseTime)
			for _, name := range []string{"deployment.environment.name", "deployment.environment"} {
				keys[name] = []*telemetrytypes.TelemetryFieldKey{{
					Name:          name,
					Signal:        telemetrytypes.SignalLogs,
					FieldContext:  telemetrytypes.FieldContextResource,
					FieldDataType: telemetrytypes.FieldDataTypeString,
				}}
			}
			mockMetadataStore.KeysMap = keys
			storage := logstelemetryschema.NewStorage()
			aggExprRewriter := querybuilder.NewAggExprRewriter(instrumentationtest.New().ToProviderSettings(), nil, storage, fl, telemetrytypes.SignalLogs)
			statementBuilder := NewLogQueryStatementBuilder(
				instrumentationtest.New().ToProviderSettings(),
				mockMetadataStore, storage, aggExprRewriter,
				logstelemetryschema.DefaultFullTextColumn, fl, nil,
				statementbuilder.Config{SkipResourceFingerprint: statementbuilder.SkipResourceFingerprint{Enabled: false, Threshold: 100000}},
			)

			query := qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal:       telemetrytypes.SignalLogs,
				StepInterval: qbtypes.Step{Duration: 30 * time.Second},
				Aggregations: []qbtypes.LogAggregation{{Expression: "countIf(deployment.environment.name = 'production')"}},
			}
			q, err := statementBuilder.Build(context.Background(), valuer.UUID{},
				releaseTimeNano+uint64(24*time.Hour.Nanoseconds()),
				releaseTimeNano+uint64(48*time.Hour.Nanoseconds()),
				qbtypes.RequestTypeScalar, query, nil)
			require.NoError(t, err)
			require.Equal(t, testCase.expected, q.Query)
		})
	}
}

// The mid-migration state: metadata holds one spelling of the family, and
// the query names the other. The filter and the group by both read the one
// stored spelling.
func TestStatementBuilderResolvesSingleSpellingAcrossNames(t *testing.T) {
	releaseTime := time.Date(2024, 1, 15, 10, 0, 0, 0, time.UTC)
	releaseTimeNano := uint64(releaseTime.UnixNano())

	testCases := []struct {
		name     string
		stored   string
		queried  string
		expected string
	}{
		{name: "OldDataQueriedByCurrentName", stored: "deployment.environment", queried: "deployment.environment.name", expected: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE (simpleJSONExtractString(labels, 'deployment.environment') = ? AND labels LIKE ? AND labels LIKE ?) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ? GROUP BY fingerprint) SELECT toString(multiIf(resource.`deployment.environment` IS NOT NULL, resource.`deployment.environment`::String, mapContains(resources_string, 'deployment.environment'), resources_string['deployment.environment'], NULL)) AS `__GROUP_BY_KEY_0_deployment.environment.name`, count() AS __result_0 FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? GROUP BY `__GROUP_BY_KEY_0_deployment.environment.name` ORDER BY __result_0 DESC"},
		{name: "CurrentDataQueriedByOldName", stored: "deployment.environment.name", queried: "deployment.environment", expected: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE (simpleJSONExtractString(labels, 'deployment.environment.name') = ? AND labels LIKE ? AND labels LIKE ?) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ? GROUP BY fingerprint) SELECT toString(multiIf(resource.`deployment.environment.name` IS NOT NULL, resource.`deployment.environment.name`::String, mapContains(resources_string, 'deployment.environment.name'), resources_string['deployment.environment.name'], NULL)) AS `__GROUP_BY_KEY_0_deployment.environment`, count() AS __result_0 FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? GROUP BY `__GROUP_BY_KEY_0_deployment.environment` ORDER BY __result_0 DESC"},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			fl := flaggertest.WithBooleanFlags(t, map[string]bool{
				flagger.FeatureResolveSemconvFamilies.String(): true,
			})
			mockMetadataStore := telemetrytypestest.NewMockMetadataStore()
			keys := logstelemetryschema.BuildCompleteFieldKeyMap(releaseTime)
			keys[testCase.stored] = []*telemetrytypes.TelemetryFieldKey{{
				Name:          testCase.stored,
				Signal:        telemetrytypes.SignalLogs,
				FieldContext:  telemetrytypes.FieldContextResource,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			}}
			mockMetadataStore.KeysMap = keys
			storage := logstelemetryschema.NewStorage()
			aggExprRewriter := querybuilder.NewAggExprRewriter(instrumentationtest.New().ToProviderSettings(), nil, storage, fl, telemetrytypes.SignalLogs)
			statementBuilder := NewLogQueryStatementBuilder(
				instrumentationtest.New().ToProviderSettings(),
				mockMetadataStore, storage, aggExprRewriter,
				logstelemetryschema.DefaultFullTextColumn, fl, nil,
				statementbuilder.Config{SkipResourceFingerprint: statementbuilder.SkipResourceFingerprint{Enabled: false, Threshold: 100000}},
			)

			query := qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal:       telemetrytypes.SignalLogs,
				StepInterval: qbtypes.Step{Duration: 30 * time.Second},
				Aggregations: []qbtypes.LogAggregation{{Expression: "count()"}},
				Filter:       &qbtypes.Filter{Expression: testCase.queried + " = 'production'"},
				GroupBy: []qbtypes.GroupByKey{
					{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: testCase.queried}},
				},
			}
			q, err := statementBuilder.Build(context.Background(), valuer.UUID{},
				releaseTimeNano+uint64(24*time.Hour.Nanoseconds()),
				releaseTimeNano+uint64(48*time.Hour.Nanoseconds()),
				qbtypes.RequestTypeScalar, query, nil)
			require.NoError(t, err)
			require.Equal(t, testCase.expected, q.Query)
		})
	}
}

// Group by resolves the family exactly like the filter. The merged column
// reads the spellings current-first with empty falling through, and a row
// with no member keeps the NULL group of a single key.
func TestStatementBuilderResolvesLogFamilyGroupBy(t *testing.T) {
	releaseTime := time.Date(2024, 1, 15, 10, 0, 0, 0, time.UTC)
	releaseTimeNano := uint64(releaseTime.UnixNano())

	testCases := []struct {
		name     string
		familyOn bool
		expected string
	}{
		{name: "FamiliesOn", familyOn: true, expected: "SELECT toString(multiIf((multiIf(resource.`deployment.environment.name` IS NOT NULL, resource.`deployment.environment.name`::String, mapContains(resources_string, 'deployment.environment.name'), resources_string['deployment.environment.name'], NULL) IS NOT NULL OR multiIf(resource.`deployment.environment` IS NOT NULL, resource.`deployment.environment`::String, mapContains(resources_string, 'deployment.environment'), resources_string['deployment.environment'], NULL) IS NOT NULL), COALESCE(NULLIF(multiIf(resource.`deployment.environment.name` IS NOT NULL, resource.`deployment.environment.name`::String, mapContains(resources_string, 'deployment.environment.name'), resources_string['deployment.environment.name'], NULL), ''), NULLIF(multiIf(resource.`deployment.environment` IS NOT NULL, resource.`deployment.environment`::String, mapContains(resources_string, 'deployment.environment'), resources_string['deployment.environment'], NULL), ''), ''), NULL)) AS `__GROUP_BY_KEY_0_deployment.environment.name`, count() AS __result_0 FROM signoz_logs.distributed_logs_v2 WHERE timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? GROUP BY `__GROUP_BY_KEY_0_deployment.environment.name` ORDER BY __result_0 DESC"},
		{name: "FamiliesOff", familyOn: false, expected: "SELECT toString(multiIf(resource.`deployment.environment.name` IS NOT NULL, resource.`deployment.environment.name`::String, mapContains(resources_string, 'deployment.environment.name'), resources_string['deployment.environment.name'], NULL)) AS `__GROUP_BY_KEY_0_deployment.environment.name`, count() AS __result_0 FROM signoz_logs.distributed_logs_v2 WHERE timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? GROUP BY `__GROUP_BY_KEY_0_deployment.environment.name` ORDER BY __result_0 DESC"},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			fl := flaggertest.WithBooleanFlags(t, map[string]bool{
				flagger.FeatureResolveSemconvFamilies.String(): testCase.familyOn,
			})
			mockMetadataStore := telemetrytypestest.NewMockMetadataStore()
			keys := logstelemetryschema.BuildCompleteFieldKeyMap(releaseTime)
			for _, name := range []string{"deployment.environment.name", "deployment.environment"} {
				keys[name] = []*telemetrytypes.TelemetryFieldKey{{
					Name:          name,
					Signal:        telemetrytypes.SignalLogs,
					FieldContext:  telemetrytypes.FieldContextResource,
					FieldDataType: telemetrytypes.FieldDataTypeString,
				}}
			}
			mockMetadataStore.KeysMap = keys
			storage := logstelemetryschema.NewStorage()
			aggExprRewriter := querybuilder.NewAggExprRewriter(instrumentationtest.New().ToProviderSettings(), nil, storage, fl, telemetrytypes.SignalLogs)
			statementBuilder := NewLogQueryStatementBuilder(
				instrumentationtest.New().ToProviderSettings(),
				mockMetadataStore, storage, aggExprRewriter,
				logstelemetryschema.DefaultFullTextColumn, fl, nil,
				statementbuilder.Config{SkipResourceFingerprint: statementbuilder.SkipResourceFingerprint{Enabled: false, Threshold: 100000}},
			)

			query := qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal:       telemetrytypes.SignalLogs,
				StepInterval: qbtypes.Step{Duration: 30 * time.Second},
				Aggregations: []qbtypes.LogAggregation{{Expression: "count()"}},
				GroupBy: []qbtypes.GroupByKey{
					{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "deployment.environment.name"}},
				},
			}
			q, err := statementBuilder.Build(context.Background(), valuer.UUID{},
				releaseTimeNano+uint64(24*time.Hour.Nanoseconds()),
				releaseTimeNano+uint64(48*time.Hour.Nanoseconds()),
				qbtypes.RequestTypeScalar, query, nil)
			require.NoError(t, err)
			require.Equal(t, testCase.expected, q.Query)
		})
	}
}

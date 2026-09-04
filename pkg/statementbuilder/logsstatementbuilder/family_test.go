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
// condition over the log attribute maps; the flag default keeps it literal.
func TestStatementBuilderResolvesLogFamilies(t *testing.T) {
	releaseTime := time.Date(2024, 1, 15, 10, 0, 0, 0, time.UTC)
	releaseTimeNano := uint64(releaseTime.UnixNano())

	logsKey := func(name string) *telemetrytypes.TelemetryFieldKey {
		return &telemetrytypes.TelemetryFieldKey{
			Name:          name,
			Signal:        telemetrytypes.SignalLogs,
			FieldContext:  telemetrytypes.FieldContextAttribute,
			FieldDataType: telemetrytypes.FieldDataTypeString,
		}
	}

	cases := []struct {
		name     string
		familyOn bool
		expected string
	}{
		{
			name:     "families on",
			familyOn: true,
			expected: "SELECT count() AS __result_0 FROM signoz_logs.distributed_logs_v2 WHERE (COALESCE(NULLIF(attributes_string['deployment.environment.name'], ''), NULLIF(attributes_string['deployment.environment'], ''), '') = ? AND (mapContains(attributes_string, 'deployment.environment.name') OR mapContains(attributes_string, 'deployment.environment'))) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? ORDER BY __result_0 DESC",
		},
		{
			name:     "families off",
			familyOn: false,
			expected: "SELECT count() AS __result_0 FROM signoz_logs.distributed_logs_v2 WHERE (attributes_string['deployment.environment'] = ? AND mapContains(attributes_string, 'deployment.environment')) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? ORDER BY __result_0 DESC",
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			fl := flaggertest.WithBooleanFlags(t, map[string]bool{
				flagger.FeatureResolveSemconvFamilies.String(): c.familyOn,
			})
			mockMetadataStore := telemetrytypestest.NewMockMetadataStore()
			keys := logstelemetryschema.BuildCompleteFieldKeyMap(releaseTime)
			keys["deployment.environment.name"] = []*telemetrytypes.TelemetryFieldKey{logsKey("deployment.environment.name")}
			keys["deployment.environment"] = []*telemetrytypes.TelemetryFieldKey{logsKey("deployment.environment")}
			mockMetadataStore.KeysMap = keys
			fm := logstelemetryschema.NewFieldMapper(fl)
			cb := logstelemetryschema.NewConditionBuilder(fm, fl)
			aggExprRewriter := querybuilder.NewAggExprRewriter(instrumentationtest.New().ToProviderSettings(), nil, fm, cb, fl, telemetrytypes.SignalLogs)
			statementBuilder := NewLogQueryStatementBuilder(
				instrumentationtest.New().ToProviderSettings(),
				mockMetadataStore, fm, cb, aggExprRewriter,
				logstelemetryschema.DefaultFullTextColumn, fl, nil,
				statementbuilder.Config{SkipResourceFingerprint: statementbuilder.SkipResourceFingerprint{Enabled: false, Threshold: 100000}},
			)

			query := qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal:       telemetrytypes.SignalLogs,
				StepInterval: qbtypes.Step{Duration: 30 * time.Second},
				Aggregations: []qbtypes.LogAggregation{{Expression: "count()"}},
				Filter: &qbtypes.Filter{
					Expression: "attribute.deployment.environment = 'production'",
				},
			}
			q, err := statementBuilder.Build(context.Background(), valuer.UUID{},
				releaseTimeNano+uint64(24*time.Hour.Nanoseconds()),
				releaseTimeNano+uint64(48*time.Hour.Nanoseconds()),
				qbtypes.RequestTypeScalar, query, nil)
			require.NoError(t, err)
			require.Equal(t, c.expected, q.Query)
		})
	}
}

// The predicate of a filtered aggregation resolves the family exactly like
// the main WHERE clause: the aggregation rewriter hands its flagger and
// signal to the nested visitor.
func TestStatementBuilderResolvesLogFamilyFilteredAggregation(t *testing.T) {
	releaseTime := time.Date(2024, 1, 15, 10, 0, 0, 0, time.UTC)
	releaseTimeNano := uint64(releaseTime.UnixNano())

	logsKey := func(name string) *telemetrytypes.TelemetryFieldKey {
		return &telemetrytypes.TelemetryFieldKey{
			Name:          name,
			Signal:        telemetrytypes.SignalLogs,
			FieldContext:  telemetrytypes.FieldContextAttribute,
			FieldDataType: telemetrytypes.FieldDataTypeString,
		}
	}

	cases := []struct {
		name     string
		familyOn bool
		expected string
	}{
		{name: "families on", familyOn: true, expected: "SELECT countIf((COALESCE(NULLIF(attributes_string['deployment.environment.name'], ''), NULLIF(attributes_string['deployment.environment'], ''), '') = ? AND (mapContains(attributes_string, 'deployment.environment.name') OR mapContains(attributes_string, 'deployment.environment')))) AS __result_0 FROM signoz_logs.distributed_logs_v2 WHERE timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? ORDER BY __result_0 DESC"},
		{name: "families off", familyOn: false, expected: "SELECT countIf((attributes_string['deployment.environment.name'] = ? AND mapContains(attributes_string, 'deployment.environment.name'))) AS __result_0 FROM signoz_logs.distributed_logs_v2 WHERE timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? ORDER BY __result_0 DESC"},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			fl := flaggertest.WithBooleanFlags(t, map[string]bool{
				flagger.FeatureResolveSemconvFamilies.String(): c.familyOn,
			})
			mockMetadataStore := telemetrytypestest.NewMockMetadataStore()
			keys := logstelemetryschema.BuildCompleteFieldKeyMap(releaseTime)
			keys["deployment.environment.name"] = []*telemetrytypes.TelemetryFieldKey{logsKey("deployment.environment.name")}
			keys["deployment.environment"] = []*telemetrytypes.TelemetryFieldKey{logsKey("deployment.environment")}
			mockMetadataStore.KeysMap = keys
			fm := logstelemetryschema.NewFieldMapper(fl)
			cb := logstelemetryschema.NewConditionBuilder(fm, fl)
			aggExprRewriter := querybuilder.NewAggExprRewriter(instrumentationtest.New().ToProviderSettings(), nil, fm, cb, fl, telemetrytypes.SignalLogs)
			statementBuilder := NewLogQueryStatementBuilder(
				instrumentationtest.New().ToProviderSettings(),
				mockMetadataStore, fm, cb, aggExprRewriter,
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
			require.Equal(t, c.expected, q.Query)
		})
	}
}

// The mid-migration state: metadata holds one spelling of the family, and
// the query names the other. The filter and the group-by both read the one
// stored spelling; before this pin the group-by synthesized the requested
// name and every matched row landed in the NULL group.
func TestStatementBuilderResolvesSingleSpellingAcrossNames(t *testing.T) {
	releaseTime := time.Date(2024, 1, 15, 10, 0, 0, 0, time.UTC)
	releaseTimeNano := uint64(releaseTime.UnixNano())

	logsKey := func(name string) *telemetrytypes.TelemetryFieldKey {
		return &telemetrytypes.TelemetryFieldKey{
			Name:          name,
			Signal:        telemetrytypes.SignalLogs,
			FieldContext:  telemetrytypes.FieldContextAttribute,
			FieldDataType: telemetrytypes.FieldDataTypeString,
		}
	}

	cases := []struct {
		name     string
		stored   string
		queried  string
		expected string
	}{
		{name: "old data queried by the current name", stored: "deployment.environment", queried: "deployment.environment.name", expected: "SELECT toString(multiIf(mapContains(attributes_string, 'deployment.environment'), attributes_string['deployment.environment'], NULL)) AS `__GROUP_BY_KEY_0_deployment.environment.name`, count() AS __result_0 FROM signoz_logs.distributed_logs_v2 WHERE (attributes_string['deployment.environment'] = ? AND mapContains(attributes_string, 'deployment.environment')) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? GROUP BY `__GROUP_BY_KEY_0_deployment.environment.name` ORDER BY __result_0 DESC"},
		{name: "current data queried by the old name", stored: "deployment.environment.name", queried: "deployment.environment", expected: "SELECT toString(multiIf(mapContains(attributes_string, 'deployment.environment.name'), attributes_string['deployment.environment.name'], NULL)) AS `__GROUP_BY_KEY_0_deployment.environment`, count() AS __result_0 FROM signoz_logs.distributed_logs_v2 WHERE (attributes_string['deployment.environment.name'] = ? AND mapContains(attributes_string, 'deployment.environment.name')) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? GROUP BY `__GROUP_BY_KEY_0_deployment.environment` ORDER BY __result_0 DESC"},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			fl := flaggertest.WithBooleanFlags(t, map[string]bool{
				flagger.FeatureResolveSemconvFamilies.String(): true,
			})
			mockMetadataStore := telemetrytypestest.NewMockMetadataStore()
			keys := logstelemetryschema.BuildCompleteFieldKeyMap(releaseTime)
			keys[c.stored] = []*telemetrytypes.TelemetryFieldKey{logsKey(c.stored)}
			mockMetadataStore.KeysMap = keys
			fm := logstelemetryschema.NewFieldMapper(fl)
			cb := logstelemetryschema.NewConditionBuilder(fm, fl)
			aggExprRewriter := querybuilder.NewAggExprRewriter(instrumentationtest.New().ToProviderSettings(), nil, fm, cb, fl, telemetrytypes.SignalLogs)
			statementBuilder := NewLogQueryStatementBuilder(
				instrumentationtest.New().ToProviderSettings(),
				mockMetadataStore, fm, cb, aggExprRewriter,
				logstelemetryschema.DefaultFullTextColumn, fl, nil,
				statementbuilder.Config{SkipResourceFingerprint: statementbuilder.SkipResourceFingerprint{Enabled: false, Threshold: 100000}},
			)

			query := qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal:       telemetrytypes.SignalLogs,
				StepInterval: qbtypes.Step{Duration: 30 * time.Second},
				Aggregations: []qbtypes.LogAggregation{{Expression: "count()"}},
				Filter: &qbtypes.Filter{
					Expression: c.queried + " = 'production'",
				},
				GroupBy: []qbtypes.GroupByKey{
					{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: c.queried}},
				},
			}
			q, err := statementBuilder.Build(context.Background(), valuer.UUID{},
				releaseTimeNano+uint64(24*time.Hour.Nanoseconds()),
				releaseTimeNano+uint64(48*time.Hour.Nanoseconds()),
				qbtypes.RequestTypeScalar, query, nil)
			require.NoError(t, err)
			require.Equal(t, c.expected, q.Query)
		})
	}
}

// Group-by resolves the family exactly like the filter: the merged column
// reads the spellings current-first with empty falling through, and rows with
// no member keep the NULL group of a single key.
func TestStatementBuilderResolvesLogFamilyGroupBy(t *testing.T) {
	releaseTime := time.Date(2024, 1, 15, 10, 0, 0, 0, time.UTC)
	releaseTimeNano := uint64(releaseTime.UnixNano())

	logsKey := func(name string) *telemetrytypes.TelemetryFieldKey {
		return &telemetrytypes.TelemetryFieldKey{
			Name:          name,
			Signal:        telemetrytypes.SignalLogs,
			FieldContext:  telemetrytypes.FieldContextAttribute,
			FieldDataType: telemetrytypes.FieldDataTypeString,
		}
	}

	cases := []struct {
		name     string
		familyOn bool
		expected string
	}{
		{name: "families on", familyOn: true, expected: "SELECT toString(multiIf((mapContains(attributes_string, 'deployment.environment.name') OR mapContains(attributes_string, 'deployment.environment')), COALESCE(NULLIF(attributes_string['deployment.environment.name'], ''), NULLIF(attributes_string['deployment.environment'], ''), ''), NULL)) AS `__GROUP_BY_KEY_0_deployment.environment.name`, count() AS __result_0 FROM signoz_logs.distributed_logs_v2 WHERE timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? GROUP BY `__GROUP_BY_KEY_0_deployment.environment.name` ORDER BY __result_0 DESC"},
		{name: "families off", familyOn: false, expected: "SELECT toString(multiIf(mapContains(attributes_string, 'deployment.environment.name'), attributes_string['deployment.environment.name'], NULL)) AS `__GROUP_BY_KEY_0_deployment.environment.name`, count() AS __result_0 FROM signoz_logs.distributed_logs_v2 WHERE timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? GROUP BY `__GROUP_BY_KEY_0_deployment.environment.name` ORDER BY __result_0 DESC"},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			fl := flaggertest.WithBooleanFlags(t, map[string]bool{
				flagger.FeatureResolveSemconvFamilies.String(): c.familyOn,
			})
			mockMetadataStore := telemetrytypestest.NewMockMetadataStore()
			keys := logstelemetryschema.BuildCompleteFieldKeyMap(releaseTime)
			keys["deployment.environment.name"] = []*telemetrytypes.TelemetryFieldKey{logsKey("deployment.environment.name")}
			keys["deployment.environment"] = []*telemetrytypes.TelemetryFieldKey{logsKey("deployment.environment")}
			mockMetadataStore.KeysMap = keys
			fm := logstelemetryschema.NewFieldMapper(fl)
			cb := logstelemetryschema.NewConditionBuilder(fm, fl)
			aggExprRewriter := querybuilder.NewAggExprRewriter(instrumentationtest.New().ToProviderSettings(), nil, fm, cb, fl, telemetrytypes.SignalLogs)
			statementBuilder := NewLogQueryStatementBuilder(
				instrumentationtest.New().ToProviderSettings(),
				mockMetadataStore, fm, cb, aggExprRewriter,
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
			require.Equal(t, c.expected, q.Query)
		})
	}
}

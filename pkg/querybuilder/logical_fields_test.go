package querybuilder

import (
	"context"
	"testing"

	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/flagger/flaggertest"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// familiesOn returns a flagger with resolve_semconv_families on.
func familiesOn(t *testing.T) flagger.Flagger {
	return flaggertest.WithBooleanFlags(t, map[string]bool{
		flagger.FeatureResolveSemconvFamilies.String(): true,
	})
}

func memberNames(logical *telemetrytypes.LogicalField) []string {
	names := make([]string, 0, len(logical.Members))
	for _, member := range logical.Members {
		names = append(names, member.Name)
	}
	return names
}

// The deployment.environment(.name) family (enabled in pkg/semconv) drives the
// grouping tests below.

// With the resolve_semconv_families flag off, matches stay single-member and
// selectors stay literal, even when the metadata map has both spellings.
func TestFamiliesOffByDefault(t *testing.T) {
	fieldKeys := map[string][]*telemetrytypes.TelemetryFieldKey{
		"deployment.environment.name": {{
			Name:          "deployment.environment.name",
			Signal:        telemetrytypes.SignalTraces,
			FieldContext:  telemetrytypes.FieldContextResource,
			FieldDataType: telemetrytypes.FieldDataTypeString,
		}},
		"deployment.environment": {{
			Name:          "deployment.environment",
			Signal:        telemetrytypes.SignalTraces,
			FieldContext:  telemetrytypes.FieldContextResource,
			FieldDataType: telemetrytypes.FieldDataTypeString,
		}},
	}

	fields := MatchingLogicalFields(context.Background(), valuer.UUID{}, flaggertest.New(t), telemetrytypes.SignalUnspecified, nil, &telemetrytypes.TelemetryFieldKey{Name: "deployment.environment.name"}, fieldKeys)
	require.Len(t, fields, 1)
	assert.False(t, fields[0].IsFamily())
	assert.Equal(t, []string{"deployment.environment.name"}, memberNames(fields[0]))

	selectors := []*telemetrytypes.FieldKeySelector{
		{Name: "deployment.environment.name", Signal: telemetrytypes.SignalTraces, SelectorMatchType: telemetrytypes.FieldSelectorMatchTypeExact},
	}
	assert.Len(t, ExpandKeySelectorsForFamilies(context.Background(), valuer.UUID{}, flaggertest.New(t), selectors), 1)
}

func TestMatchingLogicalFieldsGroupsFamilyMembers(t *testing.T) {
	fieldKeys := map[string][]*telemetrytypes.TelemetryFieldKey{
		"deployment.environment.name": {{
			Name:          "deployment.environment.name",
			Signal:        telemetrytypes.SignalTraces,
			FieldContext:  telemetrytypes.FieldContextResource,
			FieldDataType: telemetrytypes.FieldDataTypeString,
		}},
		"deployment.environment": {{
			Name:          "deployment.environment",
			Signal:        telemetrytypes.SignalTraces,
			FieldContext:  telemetrytypes.FieldContextResource,
			FieldDataType: telemetrytypes.FieldDataTypeString,
		}},
	}

	for _, requested := range []string{"deployment.environment.name", "deployment.environment"} {
		fields := MatchingLogicalFields(context.Background(), valuer.UUID{}, familiesOn(t), telemetrytypes.SignalUnspecified, nil, &telemetrytypes.TelemetryFieldKey{Name: requested}, fieldKeys)
		require.Len(t, fields, 1, "a family is one logical field, requested via %s", requested)
		logical := fields[0]
		assert.Equal(t, requested, logical.Name, "response identity is the requested spelling")
		assert.Equal(t, telemetrytypes.FieldContextResource, logical.FieldContext)
		assert.True(t, logical.IsFamily())
		assert.Equal(t, []string{"deployment.environment.name", "deployment.environment"}, memberNames(logical),
			"members are current-first regardless of the requested spelling")
	}
}

// Member precedence is the family's current-first order, not lookup arrival
// order: a current-name key found only under its context-prefixed spelling
// arrives in the second lookup pass yet must still sort first.
func TestMatchingLogicalFieldsOrdersMembersByFamilyRank(t *testing.T) {
	fieldKeys := map[string][]*telemetrytypes.TelemetryFieldKey{
		"deployment.environment": {{
			Name:          "deployment.environment",
			Signal:        telemetrytypes.SignalTraces,
			FieldContext:  telemetrytypes.FieldContextResource,
			FieldDataType: telemetrytypes.FieldDataTypeString,
		}},
		"resource.deployment.environment.name": {{
			Name:          "resource.deployment.environment.name",
			Signal:        telemetrytypes.SignalTraces,
			FieldContext:  telemetrytypes.FieldContextResource,
			FieldDataType: telemetrytypes.FieldDataTypeString,
		}},
	}

	fields := MatchingLogicalFields(context.Background(), valuer.UUID{}, familiesOn(t), telemetrytypes.SignalUnspecified, nil, &telemetrytypes.TelemetryFieldKey{
		Name:         "deployment.environment.name",
		FieldContext: telemetrytypes.FieldContextResource,
	}, fieldKeys)

	require.Len(t, fields, 1)
	assert.Equal(t, []string{"resource.deployment.environment.name", "deployment.environment"}, memberNames(fields[0]))
}

// Log entries group into families exactly like trace entries.
func TestMatchingLogicalFieldsGroupsLogEntries(t *testing.T) {
	logsKey := func(name string) *telemetrytypes.TelemetryFieldKey {
		return &telemetrytypes.TelemetryFieldKey{
			Name:          name,
			Signal:        telemetrytypes.SignalLogs,
			FieldContext:  telemetrytypes.FieldContextResource,
			FieldDataType: telemetrytypes.FieldDataTypeString,
		}
	}
	fieldKeys := map[string][]*telemetrytypes.TelemetryFieldKey{
		"deployment.environment.name": {logsKey("deployment.environment.name")},
		"deployment.environment":      {logsKey("deployment.environment")},
	}

	fields := MatchingLogicalFields(context.Background(), valuer.UUID{}, familiesOn(t), telemetrytypes.SignalLogs, nil, &telemetrytypes.TelemetryFieldKey{Name: "deployment.environment.name"}, fieldKeys)
	require.Len(t, fields, 1)
	assert.True(t, fields[0].IsFamily())
	assert.Equal(t, []string{"deployment.environment.name", "deployment.environment"}, memberNames(fields[0]))
}

// Metric entries group across the stored label spellings of the family, in
// member-major order: every spelling of the current name precedes the first
// spelling of the old one.
func TestMatchingLogicalFieldsGroupsMetricSpellings(t *testing.T) {
	metricsKey := func(name string) *telemetrytypes.TelemetryFieldKey {
		return &telemetrytypes.TelemetryFieldKey{
			Name:          name,
			Signal:        telemetrytypes.SignalMetrics,
			FieldContext:  telemetrytypes.FieldContextAttribute,
			FieldDataType: telemetrytypes.FieldDataTypeString,
		}
	}
	fieldKeys := map[string][]*telemetrytypes.TelemetryFieldKey{
		"deployment.environment.name": {metricsKey("deployment.environment.name")},
		"deployment_environment_name": {metricsKey("deployment_environment_name")},
		"deployment.environment":      {metricsKey("deployment.environment")},
		"deployment_environment":      {metricsKey("deployment_environment")},
	}

	fields := MatchingLogicalFields(context.Background(), valuer.UUID{}, familiesOn(t), telemetrytypes.SignalMetrics, nil, &telemetrytypes.TelemetryFieldKey{Name: "deployment.environment"}, fieldKeys)
	require.Len(t, fields, 1)
	assert.True(t, fields[0].IsFamily())
	assert.Equal(t, []string{
		"deployment.environment.name", "deployment_environment_name",
		"deployment.environment", "deployment_environment",
	}, memberNames(fields[0]))
}

// A non-string entry never joins a family: the merged expression has no
// common ClickHouse type across storages yet.
func TestMatchingLogicalFieldsKeepsNumberEntriesSingle(t *testing.T) {
	numberKey := func(name string) *telemetrytypes.TelemetryFieldKey {
		return &telemetrytypes.TelemetryFieldKey{
			Name:          name,
			Signal:        telemetrytypes.SignalMetrics,
			FieldContext:  telemetrytypes.FieldContextAttribute,
			FieldDataType: telemetrytypes.FieldDataTypeNumber,
		}
	}
	fieldKeys := map[string][]*telemetrytypes.TelemetryFieldKey{
		"deployment.environment.name": {numberKey("deployment.environment.name")},
		"deployment.environment":      {numberKey("deployment.environment")},
	}

	fields := MatchingLogicalFields(context.Background(), valuer.UUID{}, familiesOn(t), telemetrytypes.SignalMetrics, nil, &telemetrytypes.TelemetryFieldKey{Name: "deployment.environment"}, fieldKeys)
	require.Len(t, fields, 2)
	for _, logical := range fields {
		assert.False(t, logical.IsFamily())
	}
}

// A family and a genuine same-name collision stack cleanly: the family stays
// one logical field, the collision adds another, and resource preference keeps
// the family as a unit.
func TestResolveLogicalFieldsKeepsFamilyThroughAmbiguity(t *testing.T) {
	fieldKeys := map[string][]*telemetrytypes.TelemetryFieldKey{
		"deployment.environment.name": {
			{
				Name:          "deployment.environment.name",
				Signal:        telemetrytypes.SignalTraces,
				FieldContext:  telemetrytypes.FieldContextResource,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			{
				Name:          "deployment.environment.name",
				Signal:        telemetrytypes.SignalTraces,
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"deployment.environment": {{
			Name:          "deployment.environment",
			Signal:        telemetrytypes.SignalTraces,
			FieldContext:  telemetrytypes.FieldContextResource,
			FieldDataType: telemetrytypes.FieldDataTypeString,
		}},
	}

	requested := &telemetrytypes.TelemetryFieldKey{Name: "deployment.environment.name"}
	fields := MatchingLogicalFields(context.Background(), valuer.UUID{}, familiesOn(t), telemetrytypes.SignalUnspecified, nil, requested, fieldKeys)
	require.Len(t, fields, 2, "resource family + attribute collision")

	resolved, warning := ResolveLogicalFields(requested, fields)
	assert.NotEmpty(t, warning)
	require.Len(t, resolved, 1)
	assert.Equal(t, telemetrytypes.FieldContextResource, resolved[0].FieldContext)
	assert.Equal(t, []string{"deployment.environment.name", "deployment.environment"}, memberNames(resolved[0]))
}

// Members of a family with different data types never merge: the identity
// (signal, context, data type) separates them into distinct logical fields.
func TestMatchingLogicalFieldsNeverMergesAcrossDataTypes(t *testing.T) {
	fieldKeys := map[string][]*telemetrytypes.TelemetryFieldKey{
		"deployment.environment.name": {{
			Name:          "deployment.environment.name",
			Signal:        telemetrytypes.SignalTraces,
			FieldContext:  telemetrytypes.FieldContextResource,
			FieldDataType: telemetrytypes.FieldDataTypeString,
		}},
		"deployment.environment": {{
			Name:          "deployment.environment",
			Signal:        telemetrytypes.SignalTraces,
			FieldContext:  telemetrytypes.FieldContextResource,
			FieldDataType: telemetrytypes.FieldDataTypeNumber,
		}},
	}

	fields := MatchingLogicalFields(context.Background(), valuer.UUID{}, familiesOn(t), telemetrytypes.SignalUnspecified, nil, &telemetrytypes.TelemetryFieldKey{Name: "deployment.environment.name"}, fieldKeys)
	require.Len(t, fields, 2)
	for _, logical := range fields {
		assert.False(t, logical.IsFamily())
	}
}

func TestExpandKeySelectorsForFamilies(t *testing.T) {
	selectors := []*telemetrytypes.FieldKeySelector{
		{Name: "deployment.environment.name", Signal: telemetrytypes.SignalTraces, SelectorMatchType: telemetrytypes.FieldSelectorMatchTypeExact},
		{Name: "service.name", Signal: telemetrytypes.SignalTraces, SelectorMatchType: telemetrytypes.FieldSelectorMatchTypeExact},
		{Name: "deployment.environment.name", Signal: telemetrytypes.SignalLogs, SelectorMatchType: telemetrytypes.FieldSelectorMatchTypeExact},
	}

	expanded := ExpandKeySelectorsForFamilies(context.Background(), valuer.UUID{}, familiesOn(t), selectors)

	names := make([]string, 0, len(expanded))
	for _, selector := range expanded {
		names = append(names, selector.Name)
	}
	assert.Equal(t, []string{
		"deployment.environment.name",
		"service.name",
		"deployment.environment.name",
		"deployment.environment",
		"deployment.environment",
	}, names, "each selector identity gets its own sibling; non-family names stay untouched")

	tracesSibling := expanded[len(expanded)-2]
	assert.Equal(t, telemetrytypes.SignalTraces, tracesSibling.Signal)
	assert.Equal(t, telemetrytypes.FieldSelectorMatchTypeExact, tracesSibling.SelectorMatchType)
	logsSibling := expanded[len(expanded)-1]
	assert.Equal(t, telemetrytypes.SignalLogs, logsSibling.Signal,
		"a same-named selector under another signal must not steal the sibling")
}

func TestExpandKeySelectorsForFamiliesDeduplicatesAndSkipsFuzzy(t *testing.T) {
	both := []*telemetrytypes.FieldKeySelector{
		{Name: "deployment.environment.name", Signal: telemetrytypes.SignalTraces, SelectorMatchType: telemetrytypes.FieldSelectorMatchTypeExact},
		{Name: "deployment.environment", Signal: telemetrytypes.SignalTraces, SelectorMatchType: telemetrytypes.FieldSelectorMatchTypeExact},
	}
	assert.Len(t, ExpandKeySelectorsForFamilies(context.Background(), valuer.UUID{}, familiesOn(t), both), 2, "both spellings already referenced")

	fuzzy := []*telemetrytypes.FieldKeySelector{
		{Name: "deployment.environment.name", Signal: telemetrytypes.SignalTraces, SelectorMatchType: telemetrytypes.FieldSelectorMatchTypeFuzzy},
	}
	assert.Len(t, ExpandKeySelectorsForFamilies(context.Background(), valuer.UUID{}, familiesOn(t), fuzzy), 1, "fuzzy (search-style) selectors never expand")
}

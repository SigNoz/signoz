package telemetrymetadata

import (
	"context"
	"testing"

	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/flagger/flaggertest"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/huandu/go-sqlbuilder"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// The flagger provider registration is process-global and keyed by provider
// name, so each flagger must be used before the next one is created.
func TestFamilyValueNames(t *testing.T) {
	selector := &telemetrytypes.FieldValueSelector{
		FieldKeySelector: &telemetrytypes.FieldKeySelector{Name: "deployment.environment"},
	}

	off := &telemetryMetaStore{fl: flaggertest.WithBooleanFlags(t, map[string]bool{})}
	assert.Equal(t,
		[]string{"deployment.environment"},
		off.familyValueNames(context.Background(), valuer.UUID{}, telemetrytypes.SignalLogs, selector),
		"the flag default keeps values literal")

	on := &telemetryMetaStore{fl: flaggertest.WithBooleanFlags(t, map[string]bool{
		flagger.FeatureResolveSemconvFamilies.String(): true,
	})}
	assert.Equal(t,
		[]string{"deployment.environment.name", "deployment.environment"},
		on.familyValueNames(context.Background(), valuer.UUID{}, telemetrytypes.SignalLogs, selector),
		"values for one spelling must cover the whole family")
	assert.Equal(t,
		[]string{"deployment.environment.name", "deployment.environment"},
		on.familyValueNames(context.Background(), valuer.UUID{}, telemetrytypes.SignalMetrics, selector),
		"metric values cover the family members")
	spanMetric := &telemetrytypes.FieldValueSelector{
		FieldKeySelector: &telemetrytypes.FieldKeySelector{
			Name:          "deployment.environment",
			MetricContext: &telemetrytypes.MetricContext{MetricName: "signoz_calls_total"},
		},
	}
	assert.Equal(t,
		[]string{
			"deployment.environment.name", "resource_deployment.environment.name",
			"deployment.environment", "resource_deployment.environment",
		},
		on.familyValueNames(context.Background(), valuer.UUID{}, telemetrytypes.SignalMetrics, spanMetric),
		"span-metrics values cover the resource_ spellings too")
}

// A family condition on the related values table follows the shared guard
// rule: the operator applies to the current-first merge, a positive operator
// takes the presence guard, and a negative operator keeps the keyless rows.
func TestConditionForFamilyMergedSemantics(t *testing.T) {
	fl := flaggertest.WithBooleanFlags(t, map[string]bool{
		flagger.FeatureResolveSemconvFamilies.String(): true,
	})
	storage := NewStorage()
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

	testCases := []struct {
		name     string
		operator qbtypes.FilterOperator
		expected string
	}{
		{
			name:     "Equal_TakesPresenceGuard",
			operator: qbtypes.FilterOperatorEqual,
			expected: "SELECT 1 WHERE (COALESCE(NULLIF(resource_attributes['deployment.environment.name'], ''), NULLIF(resource_attributes['deployment.environment'], ''), '') = ? AND (mapContains(resource_attributes, 'deployment.environment.name') OR mapContains(resource_attributes, 'deployment.environment')))",
		},
		{
			name:     "NotEqual_KeepsKeylessRows",
			operator: qbtypes.FilterOperatorNotEqual,
			expected: "SELECT 1 WHERE COALESCE(NULLIF(resource_attributes['deployment.environment.name'], ''), NULLIF(resource_attributes['deployment.environment'], ''), '') <> ?",
		},
	}
	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			sb := sqlbuilder.NewSelectBuilder()
			q := querybuilder.NewQueryInfo(context.Background(), valuer.UUID{}, fl, telemetrytypes.SignalTraces, nil, 0, 0)
			conds, _, err := querybuilder.Conditions(context.Background(), q, storage,
				&telemetrytypes.TelemetryFieldKey{Name: "deployment.environment"}, testCase.operator, "production", fieldKeys, false, sb)
			require.NoError(t, err)
			sb.Select("1").Where(conds...)
			sql, _ := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
			assert.Equal(t, testCase.expected, sql)
		})
	}
}

// The related values search applies to the current-first merge that the
// suggestion shows, also when the request carries no data type.
func TestContainsConditionsSearchesFamilyAsOneField(t *testing.T) {
	fl := flaggertest.WithBooleanFlags(t, map[string]bool{
		flagger.FeatureResolveSemconvFamilies.String(): true,
	})
	q := querybuilder.NewQueryInfo(context.Background(), valuer.UUID{}, fl, telemetrytypes.SignalTraces, nil, 0, 0)
	store := &telemetryMetaStore{storage: NewStorage()}
	key := &telemetrytypes.TelemetryFieldKey{
		Name:         "deployment.environment",
		Signal:       telemetrytypes.SignalTraces,
		FieldContext: telemetrytypes.FieldContextResource,
	}

	testCases := []struct {
		name     string
		names    []string
		expected string
	}{
		{
			name:     "FamilySpellings_MergeIntoOneCondition",
			names:    []string{"deployment.environment.name", "deployment.environment"},
			expected: "SELECT 1 WHERE (LOWER(COALESCE(NULLIF(resource_attributes['deployment.environment.name'], ''), NULLIF(resource_attributes['deployment.environment'], ''), '')) LIKE LOWER(?) AND (mapContains(resource_attributes, 'deployment.environment.name') OR mapContains(resource_attributes, 'deployment.environment')))",
		},
		{
			name:     "SingleSpelling_StaysLiteral",
			names:    []string{"deployment.environment"},
			expected: "SELECT 1 WHERE if(mapContains(resource_attributes, ?), LOWER(resource_attributes['deployment.environment']) LIKE LOWER(?), false)",
		},
	}
	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			sb := sqlbuilder.NewSelectBuilder()
			conds, err := store.containsConditions(context.Background(), q, key, testCase.names, "prod", sb)
			require.NoError(t, err)
			sb.Select("1").Where(conds...)
			sql, _ := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
			assert.Equal(t, testCase.expected, sql)
		})
	}
}

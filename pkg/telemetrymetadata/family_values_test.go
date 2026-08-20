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
		[]string{
			"resource_deployment.environment.name", "resource_deployment_environment_name",
			"deployment.environment.name", "deployment_environment_name",
			"resource_deployment.environment", "resource_deployment_environment",
			"deployment.environment", "deployment_environment",
		},
		on.familyValueNames(context.Background(), valuer.UUID{}, telemetrytypes.SignalMetrics, selector),
		"metric values must cover the stored label spellings")
}

// The family condition keeps the merged-value contract of the main query
// path: the operator applies once to the current-first merge, and the
// presence guard carries the single-key polarity fallback.
func TestConditionForFamilyMergedSemantics(t *testing.T) {
	fl := flaggertest.WithBooleanFlags(t, map[string]bool{
		flagger.FeatureResolveSemconvFamilies.String(): true,
	})
	conditionBuilder := NewConditionBuilder(NewFieldMapper())
	resourceKey := func(name string) *telemetrytypes.TelemetryFieldKey {
		return &telemetrytypes.TelemetryFieldKey{
			Name:          name,
			Signal:        telemetrytypes.SignalTraces,
			FieldContext:  telemetrytypes.FieldContextResource,
			FieldDataType: telemetrytypes.FieldDataTypeString,
		}
	}
	fieldKeys := map[string][]*telemetrytypes.TelemetryFieldKey{
		"deployment.environment.name": {resourceKey("deployment.environment.name")},
		"deployment.environment":      {resourceKey("deployment.environment")},
	}

	for operator, expected := range map[qbtypes.FilterOperator]string{
		qbtypes.FilterOperatorEqual:    "SELECT 1 WHERE if((mapContains(resource_attributes, ?) OR mapContains(resource_attributes, ?)), COALESCE(NULLIF(resource_attributes['deployment.environment.name'], ''), NULLIF(resource_attributes['deployment.environment'], ''), '') = ?, false)",
		qbtypes.FilterOperatorNotEqual: "SELECT 1 WHERE if((mapContains(resource_attributes, ?) OR mapContains(resource_attributes, ?)), COALESCE(NULLIF(resource_attributes['deployment.environment.name'], ''), NULLIF(resource_attributes['deployment.environment'], ''), '') <> ?, true)",
	} {
		sb := sqlbuilder.NewSelectBuilder()
		requested := &telemetrytypes.TelemetryFieldKey{Name: "deployment.environment"}
		conds, _, err := conditionBuilder.ConditionFor(context.Background(), valuer.UUID{}, 0, 0,
			requested, querybuilder.MatchingLogicalFields(context.Background(), valuer.UUID{}, fl, telemetrytypes.SignalUnspecified, nil, requested, fieldKeys), fieldKeys,
			qbtypes.ConditionBuilderOptions{}, operator, "production", sb)
		assert.NoError(t, err)
		sb.Select("1").Where(conds...)
		sql, _ := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
		assert.Equal(t, expected, sql, operator)
	}
}

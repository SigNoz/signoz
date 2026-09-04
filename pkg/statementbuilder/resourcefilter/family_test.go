package resourcefilter

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
	"github.com/stretchr/testify/require"
)

// The tests below run against the deployment.environment(.name) family with
// the resolve_semconv_families flag on, and with both spellings present in
// the metadata map as trace resource attributes.

func TestFamilyEqualWidensIndexHintsToAnyMember(t *testing.T) {
	fl := flaggertest.WithBooleanFlags(t, map[string]bool{flagger.FeatureResolveSemconvFamilies.String(): true})
	cb := NewConditionBuilder(NewFieldMapper())
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

	sb := sqlbuilder.NewSelectBuilder()
	conds, _, err := cb.ConditionFor(context.Background(), valuer.UUID{}, 0, 0,
		&telemetrytypes.TelemetryFieldKey{Name: "deployment.environment.name"},
		querybuilder.MatchingLogicalFields(context.Background(), valuer.UUID{}, fl, telemetrytypes.SignalTraces, nil, &telemetrytypes.TelemetryFieldKey{Name: "deployment.environment.name"}, fieldKeys),
		fieldKeys, qbtypes.ConditionBuilderOptions{}, qbtypes.FilterOperatorEqual, "production", sb)
	require.NoError(t, err)
	require.Len(t, conds, 1)
	sb.Where(conds...)
	sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	require.Equal(t, "WHERE (COALESCE(NULLIF(simpleJSONExtractString(labels, 'deployment.environment.name'), ''), NULLIF(simpleJSONExtractString(labels, 'deployment.environment'), ''), '') = ? AND (labels LIKE ? OR labels LIKE ?) AND (labels LIKE ? OR labels LIKE ?))", sql)
	require.Equal(t, []any{"production", "%deployment.environment.name%", "%deployment.environment%", "%deployment.environment.name\":\"production%", "%deployment.environment\":\"production%"}, args)
}

func TestFamilyNotEqualDropsNegatedValueHint(t *testing.T) {
	fl := flaggertest.WithBooleanFlags(t, map[string]bool{flagger.FeatureResolveSemconvFamilies.String(): true})
	cb := NewConditionBuilder(NewFieldMapper())
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

	sb := sqlbuilder.NewSelectBuilder()
	conds, _, err := cb.ConditionFor(context.Background(), valuer.UUID{}, 0, 0,
		&telemetrytypes.TelemetryFieldKey{Name: "deployment.environment.name"},
		querybuilder.MatchingLogicalFields(context.Background(), valuer.UUID{}, fl, telemetrytypes.SignalTraces, nil, &telemetrytypes.TelemetryFieldKey{Name: "deployment.environment.name"}, fieldKeys),
		fieldKeys, qbtypes.ConditionBuilderOptions{}, qbtypes.FilterOperatorNotEqual, "production", sb)
	require.NoError(t, err)
	require.Len(t, conds, 1)
	sb.Where(conds...)
	sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	require.Equal(t, "WHERE COALESCE(NULLIF(simpleJSONExtractString(labels, 'deployment.environment.name'), ''), NULLIF(simpleJSONExtractString(labels, 'deployment.environment'), ''), '') <> ?", sql)
	require.Equal(t, []any{"production"}, args)
}

func TestFamilyExistsIsAnyMemberPresence(t *testing.T) {
	fl := flaggertest.WithBooleanFlags(t, map[string]bool{flagger.FeatureResolveSemconvFamilies.String(): true})
	cb := NewConditionBuilder(NewFieldMapper())
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

	sb := sqlbuilder.NewSelectBuilder()
	conds, _, err := cb.ConditionFor(context.Background(), valuer.UUID{}, 0, 0,
		&telemetrytypes.TelemetryFieldKey{Name: "deployment.environment.name"},
		querybuilder.MatchingLogicalFields(context.Background(), valuer.UUID{}, fl, telemetrytypes.SignalTraces, nil, &telemetrytypes.TelemetryFieldKey{Name: "deployment.environment.name"}, fieldKeys),
		fieldKeys, qbtypes.ConditionBuilderOptions{}, qbtypes.FilterOperatorExists, nil, sb)
	require.NoError(t, err)
	require.Len(t, conds, 1)
	sb.Where(conds...)
	sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	require.Equal(t, "WHERE ((simpleJSONHas(labels, 'deployment.environment.name') = ? OR simpleJSONHas(labels, 'deployment.environment') = ?) AND (labels LIKE ? OR labels LIKE ?))", sql)
	require.Equal(t, []any{true, true, "%deployment.environment.name%", "%deployment.environment%"}, args)

	sb = sqlbuilder.NewSelectBuilder()
	conds, _, err = cb.ConditionFor(context.Background(), valuer.UUID{}, 0, 0,
		&telemetrytypes.TelemetryFieldKey{Name: "deployment.environment.name"},
		querybuilder.MatchingLogicalFields(context.Background(), valuer.UUID{}, fl, telemetrytypes.SignalTraces, nil, &telemetrytypes.TelemetryFieldKey{Name: "deployment.environment.name"}, fieldKeys),
		fieldKeys, qbtypes.ConditionBuilderOptions{}, qbtypes.FilterOperatorNotExists, nil, sb)
	require.NoError(t, err)
	require.Len(t, conds, 1)
	sb.Where(conds...)
	sql, args = sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	require.Equal(t, "WHERE (simpleJSONHas(labels, 'deployment.environment.name') <> ? AND simpleJSONHas(labels, 'deployment.environment') <> ?)", sql)
	require.Equal(t, []any{true, true}, args)
}

// With only one member in metadata the SQL keeps the exact pre-family shape,
// including the negated value hint on !=.
func TestSingleMemberShapesUnchanged(t *testing.T) {
	fl := flaggertest.WithBooleanFlags(t, map[string]bool{flagger.FeatureResolveSemconvFamilies.String(): true})
	cb := NewConditionBuilder(NewFieldMapper())
	fieldKeys := map[string][]*telemetrytypes.TelemetryFieldKey{
		"deployment.environment.name": {{
			Name:          "deployment.environment.name",
			Signal:        telemetrytypes.SignalTraces,
			FieldContext:  telemetrytypes.FieldContextResource,
			FieldDataType: telemetrytypes.FieldDataTypeString,
		}},
	}

	sb := sqlbuilder.NewSelectBuilder()
	conds, _, err := cb.ConditionFor(context.Background(), valuer.UUID{}, 0, 0,
		&telemetrytypes.TelemetryFieldKey{Name: "deployment.environment.name"},
		querybuilder.MatchingLogicalFields(context.Background(), valuer.UUID{}, fl, telemetrytypes.SignalTraces, nil, &telemetrytypes.TelemetryFieldKey{Name: "deployment.environment.name"}, fieldKeys),
		fieldKeys, qbtypes.ConditionBuilderOptions{}, qbtypes.FilterOperatorNotEqual, "production", sb)
	require.NoError(t, err)
	require.Len(t, conds, 1)
	sb.Where(conds...)
	sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	require.Equal(t, "WHERE (simpleJSONExtractString(labels, 'deployment.environment.name') <> ? AND labels NOT LIKE ?)", sql)
	require.Equal(t, []any{"production", "%deployment.environment.name\":\"production%"}, args)
}

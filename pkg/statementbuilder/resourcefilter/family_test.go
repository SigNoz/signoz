package resourcefilter

import (
	"context"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"testing"

	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/flagger/flaggertest"
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
	storage := newStorage()
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
	conds, _, err := querybuilder.Conditions(context.Background(), querybuilder.NewQueryInfo(context.Background(), valuer.UUID{}, fl, telemetrytypes.SignalTraces, nil, 0, 0), storage, &telemetrytypes.TelemetryFieldKey{Name: "deployment.environment.name"}, qbtypes.FilterOperatorEqual, "production", fieldKeys, false, sb)
	require.NoError(t, err)
	require.Len(t, conds, 1)
	sb.Where(conds...)
	sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	require.Equal(t, "WHERE (COALESCE(NULLIF(simpleJSONExtractString(labels, 'deployment.environment.name'), ''), NULLIF(simpleJSONExtractString(labels, 'deployment.environment'), ''), '') = ? AND (labels LIKE ? OR labels LIKE ?) AND (labels LIKE ? OR labels LIKE ?))", sql)
	require.Equal(t, []any{"production", "%deployment.environment.name%", "%deployment.environment%", "%deployment.environment.name\":\"production%", "%deployment.environment\":\"production%"}, args)
}

func TestFamilyNotEqualDropsNegatedValueHint(t *testing.T) {
	fl := flaggertest.WithBooleanFlags(t, map[string]bool{flagger.FeatureResolveSemconvFamilies.String(): true})
	storage := newStorage()
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
	conds, _, err := querybuilder.Conditions(context.Background(), querybuilder.NewQueryInfo(context.Background(), valuer.UUID{}, fl, telemetrytypes.SignalTraces, nil, 0, 0), storage, &telemetrytypes.TelemetryFieldKey{Name: "deployment.environment.name"}, qbtypes.FilterOperatorNotEqual, "production", fieldKeys, false, sb)
	require.NoError(t, err)
	require.Len(t, conds, 1)
	sb.Where(conds...)
	sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	require.Equal(t, "WHERE COALESCE(NULLIF(simpleJSONExtractString(labels, 'deployment.environment.name'), ''), NULLIF(simpleJSONExtractString(labels, 'deployment.environment'), ''), '') <> ?", sql)
	require.Equal(t, []any{"production"}, args)
}

func TestFamilyExistsIsAnyMemberPresence(t *testing.T) {
	fl := flaggertest.WithBooleanFlags(t, map[string]bool{flagger.FeatureResolveSemconvFamilies.String(): true})
	storage := newStorage()
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
	conds, _, err := querybuilder.Conditions(context.Background(), querybuilder.NewQueryInfo(context.Background(), valuer.UUID{}, fl, telemetrytypes.SignalTraces, nil, 0, 0), storage, &telemetrytypes.TelemetryFieldKey{Name: "deployment.environment.name"}, qbtypes.FilterOperatorExists, nil, fieldKeys, false, sb)
	require.NoError(t, err)
	require.Len(t, conds, 1)
	sb.Where(conds...)
	sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	require.Equal(t, "WHERE ((simpleJSONHas(labels, 'deployment.environment.name') = ? OR simpleJSONHas(labels, 'deployment.environment') = ?) AND (labels LIKE ? OR labels LIKE ?))", sql)
	require.Equal(t, []any{true, true, "%deployment.environment.name%", "%deployment.environment%"}, args)

	sb = sqlbuilder.NewSelectBuilder()
	conds, _, err = querybuilder.Conditions(context.Background(), querybuilder.NewQueryInfo(context.Background(), valuer.UUID{}, fl, telemetrytypes.SignalTraces, nil, 0, 0), storage, &telemetrytypes.TelemetryFieldKey{Name: "deployment.environment.name"}, qbtypes.FilterOperatorNotExists, nil, fieldKeys, false, sb)
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
	storage := newStorage()
	fieldKeys := map[string][]*telemetrytypes.TelemetryFieldKey{
		"deployment.environment.name": {{
			Name:          "deployment.environment.name",
			Signal:        telemetrytypes.SignalTraces,
			FieldContext:  telemetrytypes.FieldContextResource,
			FieldDataType: telemetrytypes.FieldDataTypeString,
		}},
	}

	sb := sqlbuilder.NewSelectBuilder()
	conds, _, err := querybuilder.Conditions(context.Background(), querybuilder.NewQueryInfo(context.Background(), valuer.UUID{}, fl, telemetrytypes.SignalTraces, nil, 0, 0), storage, &telemetrytypes.TelemetryFieldKey{Name: "deployment.environment.name"}, qbtypes.FilterOperatorNotEqual, "production", fieldKeys, false, sb)
	require.NoError(t, err)
	require.Len(t, conds, 1)
	sb.Where(conds...)
	sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	require.Equal(t, "WHERE (simpleJSONExtractString(labels, 'deployment.environment.name') <> ? AND labels NOT LIKE ?)", sql)
	require.Equal(t, []any{"production", "%deployment.environment.name\":\"production%"}, args)
}

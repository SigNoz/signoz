package tracestelemetryschema

import (
	"context"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/flagger/flaggertest"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/huandu/go-sqlbuilder"
	"github.com/stretchr/testify/require"
)

// familyFlagOn returns a flagger with resolve_semconv_families on.
func familyFlagOn(t *testing.T) flagger.Flagger {
	return flaggertest.WithBooleanFlags(t, map[string]bool{
		flagger.FeatureResolveSemconvFamilies.String(): true,
	})
}

// The tests below run against the deployment.environment(.name) family as
// trace resource attributes with the canonical evolution timeline, inside the
// JSON-column window. The single-member value expression at this range is
//
//	multiIf(resource.`<name>` IS NOT NULL, resource.`<name>`::String,
//	        mapContains(resources_string, '<name>'), resources_string['<name>'], NULL)
//
// and the family expressions below compose it per member.

func TestConditionForFamilyMergesMembersCurrentFirst(t *testing.T) {
	releaseTime := time.Date(2025, 5, 22, 22, 0, 0, 0, time.UTC)
	startNs, endNs := uint64(1747947419000000000), uint64(1747983448000000000)
	fieldKeys := map[string][]*telemetrytypes.TelemetryFieldKey{
		"deployment.environment.name": {{
			Name:          "deployment.environment.name",
			Signal:        telemetrytypes.SignalTraces,
			FieldContext:  telemetrytypes.FieldContextResource,
			FieldDataType: telemetrytypes.FieldDataTypeString,
			Evolutions:    MockEvolutionData(releaseTime),
		}},
		"deployment.environment": {{
			Name:          "deployment.environment",
			Signal:        telemetrytypes.SignalTraces,
			FieldContext:  telemetrytypes.FieldContextResource,
			FieldDataType: telemetrytypes.FieldDataTypeString,
			Evolutions:    MockEvolutionData(releaseTime),
		}},
	}
	fl := familyFlagOn(t)
	storage := NewStorage()

	// The requested spelling is the old name; precedence must still be
	// current-first.
	sb := sqlbuilder.NewSelectBuilder()
	conds, warnings, err := querybuilder.Conditions(context.Background(), querybuilder.NewQueryInfo(context.Background(), valuer.UUID{}, fl, telemetrytypes.SignalTraces, nil, startNs, endNs), storage, &telemetrytypes.TelemetryFieldKey{Name: "deployment.environment"}, qbtypes.FilterOperatorEqual, "production", fieldKeys, false, sb)
	require.NoError(t, err)
	require.Empty(t, warnings, "a family is one logical field, never ambiguous with itself")
	require.Len(t, conds, 1)

	sb.Where(conds...)
	sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	require.Equal(t, "WHERE (COALESCE(NULLIF(multiIf(resource.`deployment.environment.name` IS NOT NULL, resource.`deployment.environment.name`::String, mapContains(resources_string, 'deployment.environment.name'), resources_string['deployment.environment.name'], NULL), ''), NULLIF(multiIf(resource.`deployment.environment` IS NOT NULL, resource.`deployment.environment`::String, mapContains(resources_string, 'deployment.environment'), resources_string['deployment.environment'], NULL), ''), '') = ? AND (multiIf(resource.`deployment.environment.name` IS NOT NULL, resource.`deployment.environment.name`::String, mapContains(resources_string, 'deployment.environment.name'), resources_string['deployment.environment.name'], NULL) IS NOT NULL OR multiIf(resource.`deployment.environment` IS NOT NULL, resource.`deployment.environment`::String, mapContains(resources_string, 'deployment.environment'), resources_string['deployment.environment'], NULL) IS NOT NULL))", sql)
	require.Equal(t, []any{"production"}, args)
}

func TestConditionForFamilyNegativeKeepsKeylessRows(t *testing.T) {
	releaseTime := time.Date(2025, 5, 22, 22, 0, 0, 0, time.UTC)
	startNs, endNs := uint64(1747947419000000000), uint64(1747983448000000000)
	fieldKeys := map[string][]*telemetrytypes.TelemetryFieldKey{
		"deployment.environment.name": {{
			Name:          "deployment.environment.name",
			Signal:        telemetrytypes.SignalTraces,
			FieldContext:  telemetrytypes.FieldContextResource,
			FieldDataType: telemetrytypes.FieldDataTypeString,
			Evolutions:    MockEvolutionData(releaseTime),
		}},
		"deployment.environment": {{
			Name:          "deployment.environment",
			Signal:        telemetrytypes.SignalTraces,
			FieldContext:  telemetrytypes.FieldContextResource,
			FieldDataType: telemetrytypes.FieldDataTypeString,
			Evolutions:    MockEvolutionData(releaseTime),
		}},
	}
	fl := familyFlagOn(t)
	storage := NewStorage()

	sb := sqlbuilder.NewSelectBuilder()
	conds, _, err := querybuilder.Conditions(context.Background(), querybuilder.NewQueryInfo(context.Background(), valuer.UUID{}, fl, telemetrytypes.SignalTraces, nil, startNs, endNs), storage, &telemetrytypes.TelemetryFieldKey{Name: "deployment.environment.name"}, qbtypes.FilterOperatorNotEqual, "production", fieldKeys, false, sb)
	require.NoError(t, err)
	require.Len(t, conds, 1)

	// The trailing '' makes rows without any member read '' (single-key map
	// semantics), so `!=` keeps including them; no exists filter is added.
	sb.Where(conds...)
	sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	require.Equal(t, "WHERE COALESCE(NULLIF(multiIf(resource.`deployment.environment.name` IS NOT NULL, resource.`deployment.environment.name`::String, mapContains(resources_string, 'deployment.environment.name'), resources_string['deployment.environment.name'], NULL), ''), NULLIF(multiIf(resource.`deployment.environment` IS NOT NULL, resource.`deployment.environment`::String, mapContains(resources_string, 'deployment.environment'), resources_string['deployment.environment'], NULL), ''), '') <> ?", sql)
	require.Equal(t, []any{"production"}, args)
}

func TestConditionForFamilyExists(t *testing.T) {
	releaseTime := time.Date(2025, 5, 22, 22, 0, 0, 0, time.UTC)
	startNs, endNs := uint64(1747947419000000000), uint64(1747983448000000000)
	fieldKeys := map[string][]*telemetrytypes.TelemetryFieldKey{
		"deployment.environment.name": {{
			Name:          "deployment.environment.name",
			Signal:        telemetrytypes.SignalTraces,
			FieldContext:  telemetrytypes.FieldContextResource,
			FieldDataType: telemetrytypes.FieldDataTypeString,
			Evolutions:    MockEvolutionData(releaseTime),
		}},
		"deployment.environment": {{
			Name:          "deployment.environment",
			Signal:        telemetrytypes.SignalTraces,
			FieldContext:  telemetrytypes.FieldContextResource,
			FieldDataType: telemetrytypes.FieldDataTypeString,
			Evolutions:    MockEvolutionData(releaseTime),
		}},
	}
	fl := familyFlagOn(t)
	storage := NewStorage()

	sb := sqlbuilder.NewSelectBuilder()
	conds, _, err := querybuilder.Conditions(context.Background(), querybuilder.NewQueryInfo(context.Background(), valuer.UUID{}, fl, telemetrytypes.SignalTraces, nil, startNs, endNs), storage, &telemetrytypes.TelemetryFieldKey{Name: "deployment.environment.name"}, qbtypes.FilterOperatorNotExists, nil, fieldKeys, false, sb)
	require.NoError(t, err)
	require.Len(t, conds, 1)

	sb.Where(conds...)
	sql, _ := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	require.Equal(t, "WHERE NOT (multiIf(resource.`deployment.environment.name` IS NOT NULL, resource.`deployment.environment.name`::String, mapContains(resources_string, 'deployment.environment.name'), resources_string['deployment.environment.name'], NULL) IS NOT NULL OR multiIf(resource.`deployment.environment` IS NOT NULL, resource.`deployment.environment`::String, mapContains(resources_string, 'deployment.environment'), resources_string['deployment.environment'], NULL) IS NOT NULL)", sql)
}

// With the flag off, both spellings can be in the metadata map and the
// condition still uses only the requested key. Users see no change until the
// flag is on.
func TestConditionForFamilyOffByDefault(t *testing.T) {
	releaseTime := time.Date(2025, 5, 22, 22, 0, 0, 0, time.UTC)
	startNs, endNs := uint64(1747947419000000000), uint64(1747983448000000000)
	fieldKeys := map[string][]*telemetrytypes.TelemetryFieldKey{
		"deployment.environment.name": {{
			Name:          "deployment.environment.name",
			Signal:        telemetrytypes.SignalTraces,
			FieldContext:  telemetrytypes.FieldContextResource,
			FieldDataType: telemetrytypes.FieldDataTypeString,
			Evolutions:    MockEvolutionData(releaseTime),
		}},
		"deployment.environment": {{
			Name:          "deployment.environment",
			Signal:        telemetrytypes.SignalTraces,
			FieldContext:  telemetrytypes.FieldContextResource,
			FieldDataType: telemetrytypes.FieldDataTypeString,
			Evolutions:    MockEvolutionData(releaseTime),
		}},
	}
	fl := flaggertest.New(t)
	storage := NewStorage()

	sb := sqlbuilder.NewSelectBuilder()
	conds, _, err := querybuilder.Conditions(context.Background(), querybuilder.NewQueryInfo(context.Background(), valuer.UUID{}, fl, telemetrytypes.SignalTraces, nil, startNs, endNs), storage, &telemetrytypes.TelemetryFieldKey{Name: "deployment.environment.name"}, qbtypes.FilterOperatorEqual, "production", fieldKeys, false, sb)
	require.NoError(t, err)
	require.Len(t, conds, 1)

	sb.Where(conds...)
	sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	require.Equal(t, "WHERE multiIf(resource.`deployment.environment.name` IS NOT NULL, resource.`deployment.environment.name`::String, mapContains(resources_string, 'deployment.environment.name'), resources_string['deployment.environment.name'], NULL) = ?", sql)
	require.Equal(t, []any{"production"}, args)
}

// With only one member in metadata the condition is the exact single-key
// shape: composition only appears when metadata proves a second member.
func TestConditionForSingleMemberIsUnchanged(t *testing.T) {
	releaseTime := time.Date(2025, 5, 22, 22, 0, 0, 0, time.UTC)
	startNs, endNs := uint64(1747947419000000000), uint64(1747983448000000000)
	fieldKeys := map[string][]*telemetrytypes.TelemetryFieldKey{
		"deployment.environment.name": {{
			Name:          "deployment.environment.name",
			Signal:        telemetrytypes.SignalTraces,
			FieldContext:  telemetrytypes.FieldContextResource,
			FieldDataType: telemetrytypes.FieldDataTypeString,
			Evolutions:    MockEvolutionData(releaseTime),
		}},
		"deployment.environment": {{
			Name:          "deployment.environment",
			Signal:        telemetrytypes.SignalTraces,
			FieldContext:  telemetrytypes.FieldContextResource,
			FieldDataType: telemetrytypes.FieldDataTypeString,
			Evolutions:    MockEvolutionData(releaseTime),
		}},
	}
	delete(fieldKeys, "deployment.environment")
	fl := familyFlagOn(t)
	storage := NewStorage()

	sb := sqlbuilder.NewSelectBuilder()
	conds, _, err := querybuilder.Conditions(context.Background(), querybuilder.NewQueryInfo(context.Background(), valuer.UUID{}, fl, telemetrytypes.SignalTraces, nil, startNs, endNs), storage, &telemetrytypes.TelemetryFieldKey{Name: "deployment.environment.name"}, qbtypes.FilterOperatorEqual, "production", fieldKeys, false, sb)
	require.NoError(t, err)
	require.Len(t, conds, 1)

	sb.Where(conds...)
	sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	require.Equal(t, "WHERE multiIf(resource.`deployment.environment.name` IS NOT NULL, resource.`deployment.environment.name`::String, mapContains(resources_string, 'deployment.environment.name'), resources_string['deployment.environment.name'], NULL) = ?", sql)
	require.Equal(t, []any{"production"}, args)
}

func TestColumnExpressionForFamilyGroupBy(t *testing.T) {
	releaseTime := time.Date(2025, 5, 22, 22, 0, 0, 0, time.UTC)
	startNs, endNs := uint64(1747947419000000000), uint64(1747983448000000000)
	fieldKeys := map[string][]*telemetrytypes.TelemetryFieldKey{
		"deployment.environment.name": {{
			Name:          "deployment.environment.name",
			Signal:        telemetrytypes.SignalTraces,
			FieldContext:  telemetrytypes.FieldContextResource,
			FieldDataType: telemetrytypes.FieldDataTypeString,
			Evolutions:    MockEvolutionData(releaseTime),
		}},
		"deployment.environment": {{
			Name:          "deployment.environment",
			Signal:        telemetrytypes.SignalTraces,
			FieldContext:  telemetrytypes.FieldContextResource,
			FieldDataType: telemetrytypes.FieldDataTypeString,
			Evolutions:    MockEvolutionData(releaseTime),
		}},
	}
	fl := familyFlagOn(t)
	storage := NewStorage()

	expr, err := querybuilder.ResolveColumn(context.Background(), querybuilder.NewQueryInfo(context.Background(), valuer.UUID{}, fl, telemetrytypes.SignalTraces, nil, startNs, endNs), storage, &telemetrytypes.TelemetryFieldKey{Name: "deployment.environment.name"}, telemetrytypes.FieldDataTypeString, fieldKeys)
	require.NoError(t, err)
	require.Equal(t, "multiIf((multiIf(resource.`deployment.environment.name` IS NOT NULL, resource.`deployment.environment.name`::String, mapContains(resources_string, 'deployment.environment.name'), resources_string['deployment.environment.name'], NULL) IS NOT NULL OR multiIf(resource.`deployment.environment` IS NOT NULL, resource.`deployment.environment`::String, mapContains(resources_string, 'deployment.environment'), resources_string['deployment.environment'], NULL) IS NOT NULL), COALESCE(NULLIF(multiIf(resource.`deployment.environment.name` IS NOT NULL, resource.`deployment.environment.name`::String, mapContains(resources_string, 'deployment.environment.name'), resources_string['deployment.environment.name'], NULL), ''), NULLIF(multiIf(resource.`deployment.environment` IS NOT NULL, resource.`deployment.environment`::String, mapContains(resources_string, 'deployment.environment'), resources_string['deployment.environment'], NULL), ''), ''), NULL)", expr)
}

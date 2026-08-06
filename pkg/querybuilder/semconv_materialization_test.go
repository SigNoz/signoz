package querybuilder_test

import (
	"context"
	"testing"

	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/telemetryschema/tracestelemetryschema"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestTraceFamilyUsesMaterializedHistoricalMember(t *testing.T) {
	current := &telemetrytypes.TelemetryFieldKey{
		Name:          "deployment.environment.name",
		Signal:        telemetrytypes.SignalTraces,
		FieldContext:  telemetrytypes.FieldContextAttribute,
		FieldDataType: telemetrytypes.FieldDataTypeString,
	}
	historical := &telemetrytypes.TelemetryFieldKey{
		Name:          "deployment.environment",
		Signal:        telemetrytypes.SignalTraces,
		FieldContext:  telemetrytypes.FieldContextAttribute,
		FieldDataType: telemetrytypes.FieldDataTypeString,
		Materialized:  true,
	}
	requested := telemetrytypes.NewTelemetryFieldKey(
		current.Name,
		telemetrytypes.FieldContextAttribute,
		telemetrytypes.FieldDataTypeString,
	)

	matches := querybuilder.MatchingFieldKeys(requested, map[string][]*telemetrytypes.TelemetryFieldKey{
		current.Name:    {current},
		historical.Name: {historical},
	})
	require.Len(t, matches, 1, "family metadata should resolve to one logical field")
	expression, err := tracestelemetryschema.NewFieldMapper().FieldFor(context.Background(), valuer.UUID{}, 0, 0, matches[0])
	require.NoError(t, err, "resolved trace family should map to a value expression")

	assert.Equal(
		t,
		"COALESCE(NULLIF(attributes_string['deployment.environment.name'], ''), NULLIF(`attribute_string_deployment$$environment`, ''), '')",
		expression,
		"family expression should retain the promoted historical member",
	)
}

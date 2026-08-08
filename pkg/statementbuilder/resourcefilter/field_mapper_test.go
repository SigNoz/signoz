package resourcefilter

import (
	"context"
	"testing"

	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestFieldForQuotesRequestKeyName(t *testing.T) {
	key := &telemetrytypes.TelemetryFieldKey{
		Name:         "name'\\); SELECT 1 --",
		FieldContext: telemetrytypes.FieldContextResource,
	}

	expression, err := NewFieldMapper().FieldFor(context.Background(), valuer.UUID{}, 0, 0, key)
	require.NoError(t, err)

	assert.Equal(t, "simpleJSONExtractString(labels, "+querybuilder.ClickHouseStringLiteral(key.Name)+")", expression)
}

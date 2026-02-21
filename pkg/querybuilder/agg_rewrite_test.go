package querybuilder

import (
	"context"
	"testing"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	"github.com/SigNoz/signoz/pkg/factory/factorytest"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type mockFieldMapper struct{}

func (m *mockFieldMapper) FieldFor(ctx context.Context, key *telemetrytypes.TelemetryFieldKey) (string, error) {
	return key.Name, nil
}

func (m *mockFieldMapper) ColumnFor(ctx context.Context, key *telemetrytypes.TelemetryFieldKey) (*schema.Column, error) {
	return nil, nil
}

func (m *mockFieldMapper) ColumnExpressionFor(ctx context.Context, key *telemetrytypes.TelemetryFieldKey, keys map[string][]*telemetrytypes.TelemetryFieldKey) (string, error) {
	return key.Name, nil
}

type mockConditionBuilder struct{}

func (m *mockConditionBuilder) ConditionFor(ctx context.Context, key *telemetrytypes.TelemetryFieldKey, operator qbtypes.FilterOperator, value any, sb *sqlbuilder.SelectBuilder, startNs uint64, endNs uint64) (string, error) {
	return "true", nil
}

func TestRewriteHeatmap(t *testing.T) {
	rewriter := NewAggExprRewriter(
		factorytest.NewSettings(),
		nil,
		&mockFieldMapper{},
		&mockConditionBuilder{},
		func(ctx context.Context, key *telemetrytypes.TelemetryFieldKey, op qbtypes.FilterOperator, val any) (string, any) {
			return key.Name, val
		},
	)

	tests := []struct {
		name        string
		expr        string
		expected    string
		expectError bool
	}{
		{
			name:     "heatmap default buckets",
			expr:     "heatmap(duration_nano)",
			expected: "histogram(20)(multiIf(true, duration_nano, NULL))",
		},
		{
			name:     "heatmap explicit buckets",
			expr:     "heatmap(duration_nano, 50)",
			expected: "histogram(50)(multiIf(true, duration_nano, NULL))",
		},
		{
			name:        "heatmap buckets too large",
			expr:        "heatmap(duration_nano, 300)",
			expectError: true,
		},
		{
			name:        "heatmap buckets zero",
			expr:        "heatmap(duration_nano, 0)",
			expectError: true,
		},
		{
			name:        "heatmap buckets negative",
			expr:        "heatmap(duration_nano, -5)",
			expectError: true,
		},
		{
			name:        "heatmap invalid bucket type",
			expr:        "heatmap(duration_nano, 'foo')",
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, _, err := rewriter.Rewrite(context.Background(), tt.expr, 60, nil)
			if tt.expectError {
				require.Error(t, err)
			} else {
				require.NoError(t, err)
				assert.Equal(t, tt.expected, result)
			}
		})
	}
}

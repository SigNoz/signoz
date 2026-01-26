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
			expected: "heatmap(20)(multiIf(true, duration_nano, NULL))",
		},
		{
			name:     "heatmap explicit buckets",
			expr:     "heatmap(duration_nano, 50)",
			expected: "heatmap(50)(multiIf(true, duration_nano, NULL))",
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

func TestParseHeatmapBucketCount(t *testing.T) {
	tests := []struct {
		name          string
		expr          string
		expectedCount int
	}{
		{
			name:          "simple heatmap with default buckets",
			expr:          "heatmap(20)(duration_nano)",
			expectedCount: 20,
		},
		{
			name:          "heatmap with custom buckets",
			expr:          "heatmap(50)(duration_nano)",
			expectedCount: 50,
		},
		{
			name:          "heatmap with max buckets",
			expr:          "heatmap(250)(duration_nano)",
			expectedCount: 250,
		},
		{
			name:          "heatmap with single digit",
			expr:          "heatmap(5)(duration_nano)",
			expectedCount: 5,
		},
		{
			name:          "no heatmap function - returns default",
			expr:          "count(duration_nano)",
			expectedCount: DefaultHeatmapBucketCount,
		},
		{
			name:          "malformed heatmap - no closing paren - returns default",
			expr:          "heatmap(20(duration_nano)",
			expectedCount: DefaultHeatmapBucketCount,
		},
		{
			name:          "malformed heatmap - non-numeric bucket - returns default",
			expr:          "heatmap(abc)(duration_nano)",
			expectedCount: DefaultHeatmapBucketCount,
		},
		{
			name:          "empty expression - returns default",
			expr:          "",
			expectedCount: DefaultHeatmapBucketCount,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			count := ParseHeatmapBucketCount(tt.expr)
			assert.Equal(t, tt.expectedCount, count, "bucket count mismatch")
		})
	}
}

func TestExtractHeatmapField(t *testing.T) {
	tests := []struct {
		name          string
		expr          string
		expectedField string
	}{
		{
			name:          "simple field",
			expr:          "heatmap(20)(duration_nano)",
			expectedField: "duration_nano",
		},
		{
			name:          "field with multiIf",
			expr:          "heatmap(20)(multiIf(true, duration_nano, NULL))",
			expectedField: "duration_nano",
		},
		{
			name:          "field with complex multiIf",
			expr:          "heatmap(50)(multiIf(severity_text = 'ERROR', duration_nano, NULL))",
			expectedField: "duration_nano",
		},
		{
			name:          "nested function call",
			expr:          "heatmap(20)(toFloat64(duration_nano))",
			expectedField: "toFloat64(duration_nano)",
		},
		{
			name:          "multiIf with nested function",
			expr:          "heatmap(20)(multiIf(true, toFloat64(duration_nano), NULL))",
			expectedField: "toFloat64(duration_nano)",
		},
		{
			name:          "no heatmap function",
			expr:          "count(duration_nano)",
			expectedField: "count(duration_nano)",
		},
		{
			name:          "complex nested parentheses",
			expr:          "heatmap(20)(multiIf(status IN ('error', 'warn'), duration_nano, NULL))",
			expectedField: "duration_nano",
		},
		{
			name:          "field with spaces",
			expr:          "heatmap(20)(  duration_nano  )",
			expectedField: "duration_nano",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			field := ExtractHeatmapField(tt.expr)
			assert.Equal(t, tt.expectedField, field)
		})
	}
}

func TestSplitRespectingParens(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		delim    rune
		expected []string
	}{
		{
			name:     "simple split",
			input:    "a, b, c",
			delim:    ',',
			expected: []string{"a", " b", " c"},
		},
		{
			name:     "split with nested parens",
			input:    "func(a, b), c, d",
			delim:    ',',
			expected: []string{"func(a, b)", " c", " d"},
		},
		{
			name:     "multiIf expression",
			input:    "true, duration_nano, NULL",
			delim:    ',',
			expected: []string{"true", " duration_nano", " NULL"},
		},
		{
			name:     "complex nested expression",
			input:    "status IN ('error', 'warn'), duration_nano, NULL",
			delim:    ',',
			expected: []string{"status IN ('error', 'warn')", " duration_nano", " NULL"},
		},
		{
			name:     "deeply nested parens",
			input:    "func1(func2(a, b), func3(c, d)), e",
			delim:    ',',
			expected: []string{"func1(func2(a, b), func3(c, d))", " e"},
		},
		{
			name:     "no delimiter",
			input:    "single_value",
			delim:    ',',
			expected: []string{"single_value"},
		},
		{
			name:     "empty string",
			input:    "",
			delim:    ',',
			expected: nil,
		},
		{
			name:     "trailing delimiter",
			input:    "a,b,",
			delim:    ',',
			expected: []string{"a", "b"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := splitRespectingParens(tt.input, tt.delim)
			assert.Equal(t, tt.expected, result)
		})
	}
}

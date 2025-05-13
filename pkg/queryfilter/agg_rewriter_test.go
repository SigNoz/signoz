package queryfilter

import (
	"context"
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAggExprRewriter_Rewrite(t *testing.T) {
	// Setup test cases
	tests := []struct {
		name           string
		expr           string
		setupMocks     func(*MockMetadataStore, *MockFieldMapper, *MockConditionBuilder)
		expectModified bool
		expectedExpr   string
		expectedArgs   []any
		expectError    bool
	}{
		{
			name: "Simple aggregation function",
			expr: "count(user_id)",
			setupMocks: func(ms *MockMetadataStore, fm *MockFieldMapper, cb *MockConditionBuilder) {
				// Add a field key for user_id
				ms.AddKey("user_id", telemetrytypes.TelemetryFieldKey{
					Name:          "user_id",
					FieldContext:  telemetrytypes.FieldContextAttribute,
					FieldDataType: telemetrytypes.FieldDataTypeString,
				})
			},
			expectModified: true,
			expectedExpr:   "count(user_id)",
			expectedArgs:   nil,
			expectError:    false,
		},
		{
			name: "CountIf with condition",
			expr: "countIf(user_status = 'active')",
			setupMocks: func(ms *MockMetadataStore, fm *MockFieldMapper, cb *MockConditionBuilder) {
				// Add a field key for user_status
				ms.AddKey("user_status", telemetrytypes.TelemetryFieldKey{
					Name:          "user_status",
					FieldContext:  telemetrytypes.FieldContextAttribute,
					FieldDataType: telemetrytypes.FieldDataTypeString,
				})
			},
			expectModified: true,
			expectedExpr:   "countIf((user_status = ?))",
			expectedArgs:   []any{"active"},
			expectError:    false,
		},
		{
			name: "AvgIf with condition and value",
			expr: "avgIf(response_time, status_code = 200)",
			setupMocks: func(ms *MockMetadataStore, fm *MockFieldMapper, cb *MockConditionBuilder) {
				// Add keys
				ms.AddKey("response_time", telemetrytypes.TelemetryFieldKey{
					Name:          "response_time",
					FieldContext:  telemetrytypes.FieldContextAttribute,
					FieldDataType: telemetrytypes.FieldDataTypeFloat64,
				})

				ms.AddKey("status_code", telemetrytypes.TelemetryFieldKey{
					Name:          "status_code",
					FieldContext:  telemetrytypes.FieldContextAttribute,
					FieldDataType: telemetrytypes.FieldDataTypeInt64,
				})
			},
			expectModified: true,
			expectedExpr:   "avgIf(response_time, (status_code = ?))",
			expectedArgs:   []any{float64(200)},
			expectError:    false,
		},
		{
			name: "Invalid expression",
			expr: "count(user_id", // Missing closing parenthesis
			setupMocks: func(ms *MockMetadataStore, fm *MockFieldMapper, cb *MockConditionBuilder) {
				// No setup needed for invalid expression
			},
			expectModified: false,
			expectedExpr:   "",
			expectedArgs:   nil,
			expectError:    true,
		},
		{
			name: "Unmapped field",
			expr: "sum(unknown_field)",
			setupMocks: func(ms *MockMetadataStore, fm *MockFieldMapper, cb *MockConditionBuilder) {
				fm.WithFieldFor(func(ctx context.Context, key telemetrytypes.TelemetryFieldKey) (string, error) {
					return "", qbtypes.ErrColumnNotFound
				})
				fm.WithColumnExpressionFor(func(ctx context.Context, key telemetrytypes.TelemetryFieldKey, keys map[string][]telemetrytypes.TelemetryFieldKey) (string, error) {
					return "", qbtypes.ErrColumnNotFound
				})
			},
			expectModified: false,
			expectedExpr:   "",
			expectedArgs:   nil,
			expectError:    true,
		},
		{
			name: "Complex expression with multiple conditions",
			expr: "sumIf(bytes_sent, method = 'GET' AND status_code >= 200 AND status_code < 300)",
			setupMocks: func(ms *MockMetadataStore, fm *MockFieldMapper, cb *MockConditionBuilder) {
				// Add keys
				ms.AddKey("bytes_sent", telemetrytypes.TelemetryFieldKey{
					Name:          "bytes_sent",
					FieldContext:  telemetrytypes.FieldContextAttribute,
					FieldDataType: telemetrytypes.FieldDataTypeInt64,
				})

				ms.AddKey("method", telemetrytypes.TelemetryFieldKey{
					Name:          "method",
					FieldContext:  telemetrytypes.FieldContextAttribute,
					FieldDataType: telemetrytypes.FieldDataTypeString,
				})

				ms.AddKey("status_code", telemetrytypes.TelemetryFieldKey{
					Name:          "status_code",
					FieldContext:  telemetrytypes.FieldContextAttribute,
					FieldDataType: telemetrytypes.FieldDataTypeInt64,
				})
			},
			expectModified: true,
			expectedExpr:   "sumIf(bytes_sent, ((method = ?) AND (status_code >= ?) AND (status_code < ?)))",
			expectedArgs:   []any{"GET", float64(200), float64(300)},
			expectError:    false,
		},
	}

	// Run tests
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create mocks
			mockMetadataStore := NewMockMetadataStore()
			mockFieldMapper := NewMockFieldMapper()
			mockConditionBuilder := NewMockConditionBuilder()

			// Setup mocks
			tt.setupMocks(mockMetadataStore, mockFieldMapper, mockConditionBuilder)

			// Create the rewriter
			rewriter := NewAggExprRewriter(AggExprRewriterOptions{
				MetadataStore:    mockMetadataStore,
				FieldMapper:      mockFieldMapper,
				ConditionBuilder: mockConditionBuilder,
				FullTextColumn:   nil,
				JsonBodyPrefix:   "json.",
				JsonKeyToKey:     nil,
			})

			// Call the rewrite function
			actualExpr, actualArgs, err := rewriter.Rewrite(tt.expr)

			// Check if error was expected
			if tt.expectError {
				assert.Error(t, err)
				return
			}

			// If no error expected, check the result
			require.NoError(t, err)

			if tt.expectModified {
				assert.Equal(t, tt.expectedExpr, actualExpr, "Expressions should match")
				assert.Equal(t, tt.expectedArgs, actualArgs, "Arguments should match")
			} else {
				// If no modification expected, original expression should be returned
				assert.Equal(t, tt.expr, actualExpr, "Original expression should be returned")
				assert.Nil(t, actualArgs, "No arguments should be returned")
			}
		})
	}
}

package queryfilter

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"testing"

	"github.com/huandu/go-sqlbuilder"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
)

func TestPrepareWhereClauseWithErrors(t *testing.T) {
	cases := []struct {
		name                   string
		fieldKeys              map[string][]telemetrytypes.TelemetryFieldKey
		query                  string
		expectedSearchString   string
		expectedSearchArgs     []any
		expectedErrorSubString string
		expectedWarnings       []error
		setupFieldMapper       func(*MockFieldMapper)
		setupConditionBuilder  func(*MockConditionBuilder)
	}{
		{
			name:                   "field-key-not-found",
			fieldKeys:              map[string][]telemetrytypes.TelemetryFieldKey{},
			query:                  "key.that.does.not.exist = 'redis'",
			expectedErrorSubString: "key `key.that.does.not.exist` not found",
			expectedWarnings:       []error{},
			setupFieldMapper: func(m *MockFieldMapper) {
				m.WithFieldFor(func(ctx context.Context, key telemetrytypes.TelemetryFieldKey) (string, error) {
					return "", errors.New("key `key.that.does.not.exist` not found")
				})
			},
			setupConditionBuilder: func(m *MockConditionBuilder) {},
		},
		{
			name:                   "unknown-function",
			fieldKeys:              map[string][]telemetrytypes.TelemetryFieldKey{},
			query:                  "unknown.function()",
			expectedErrorSubString: "expecting {'(', NOT, HAS, HASANY, HASALL, QUOTED_TEXT, KEY, FREETEXT}",
			expectedWarnings:       []error{},
			setupFieldMapper:       func(m *MockFieldMapper) {},
			setupConditionBuilder:  func(m *MockConditionBuilder) {},
		},
		{
			name:                   "has-function-not-enough-params",
			fieldKeys:              map[string][]telemetrytypes.TelemetryFieldKey{},
			query:                  "has(key.that.does.not.exist)",
			expectedErrorSubString: "function `has` expects key and value parameters",
			expectedWarnings:       []error{},
			setupFieldMapper: func(m *MockFieldMapper) {
				// This won't be reached because parser will fail with "function `has` expects key and value parameters"
			},
			setupConditionBuilder: func(m *MockConditionBuilder) {},
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			// Create mocks with custom behavior
			mockFieldMapper := NewMockFieldMapper()
			mockConditionBuilder := NewMockConditionBuilder()

			// Set up the mocks with custom behavior
			c.setupFieldMapper(mockFieldMapper)
			c.setupConditionBuilder(mockConditionBuilder)

			// Create a dummy default key for when the parser needs one
			dummyKey := &telemetrytypes.TelemetryFieldKey{
				Name:          "dummy",
				Signal:        telemetrytypes.SignalTraces,
				FieldContext:  telemetrytypes.FieldContextSpan,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			}

			// Call the function we're testing
			clause, warnings, err := prepareWhereClause(
				c.query,
				c.fieldKeys,
				mockFieldMapper,
				mockConditionBuilder,
				dummyKey,
				"",
				nil,
			)

			// Check if we got the expected error
			if c.expectedErrorSubString != "" {
				require.Error(t, err)
				assert.Contains(t, err.Error(), c.expectedErrorSubString)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, clause)
			}

			// Check if we got the expected warnings
			assert.Equal(t, len(c.expectedWarnings), len(warnings))
			for i, warning := range warnings {
				if i < len(c.expectedWarnings) {
					assert.Equal(t, c.expectedWarnings[i].Error(), warning.Error())
				}
			}
		})
	}
}

// TestPrepareWhereClauseSuccess tests successful creation of WHERE clauses
func TestPrepareWhereClauseSuccess(t *testing.T) {
	cases := []struct {
		name                  string
		fieldKeys             map[string][]telemetrytypes.TelemetryFieldKey
		query                 string
		expectedWhereClause   string
		setupFieldMapper      func(*MockFieldMapper)
		setupConditionBuilder func(*MockConditionBuilder)
	}{
		{
			name: "simple-equals",
			fieldKeys: map[string][]telemetrytypes.TelemetryFieldKey{
				"service.name": {
					{
						Name:          "service.name",
						Signal:        telemetrytypes.SignalTraces,
						FieldContext:  telemetrytypes.FieldContextSpan,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
				},
			},
			query:               "service.name = 'frontend'",
			expectedWhereClause: "(service_name = ?)",
			setupFieldMapper: func(m *MockFieldMapper) {
				m.WithFieldFor(func(ctx context.Context, key telemetrytypes.TelemetryFieldKey) (string, error) {
					if key.Name == "service.name" {
						return "service_name", nil
					}
					return key.Name, nil
				})

				m.WithColumnFor(func(ctx context.Context, key telemetrytypes.TelemetryFieldKey) (*schema.Column, error) {
					if key.Name == "service.name" {
						return &schema.Column{
							Name: "service_name",
							Type: schema.ColumnTypeString,
						}, nil
					}
					return nil, errors.New("column not found")
				})
			},
			setupConditionBuilder: func(m *MockConditionBuilder) {
				m.WithConditionFor(func(ctx context.Context, key telemetrytypes.TelemetryFieldKey, operator qbtypes.FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (string, error) {
					if key.Name == "service.name" && operator == qbtypes.FilterOperatorEqual {
						return "service_name = ?", nil
					}
					return "", errors.New("unexpected parameters")
				})
			},
		},
		{
			name: "complex-and-or",
			fieldKeys: map[string][]telemetrytypes.TelemetryFieldKey{
				"service.name": {
					{
						Name:          "service.name",
						Signal:        telemetrytypes.SignalTraces,
						FieldContext:  telemetrytypes.FieldContextSpan,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
				},
				"status_code": {
					{
						Name:          "status_code",
						Signal:        telemetrytypes.SignalTraces,
						FieldContext:  telemetrytypes.FieldContextSpan,
						FieldDataType: telemetrytypes.FieldDataTypeInt64,
					},
				},
				"duration": {
					{
						Name:          "duration",
						Signal:        telemetrytypes.SignalTraces,
						FieldContext:  telemetrytypes.FieldContextSpan,
						FieldDataType: telemetrytypes.FieldDataTypeFloat64,
					},
				},
			},
			query:               "service.name = 'api' AND (status_code >= 500 OR duration > 1000)",
			expectedWhereClause: "((service_name = ?) AND (((status_code >= ?) OR (duration > ?))))",
			setupFieldMapper: func(m *MockFieldMapper) {
				m.WithFieldFor(func(ctx context.Context, key telemetrytypes.TelemetryFieldKey) (string, error) {
					switch key.Name {
					case "service.name":
						return "service_name", nil
					case "status_code":
						return "status_code", nil
					case "duration":
						return "duration", nil
					default:
						return "", fmt.Errorf("unknown field: %s", key.Name)
					}
				})

				m.WithColumnFor(func(ctx context.Context, key telemetrytypes.TelemetryFieldKey) (*schema.Column, error) {

					switch key.Name {
					case "service.name":
						return &schema.Column{Name: "service_name", Type: schema.ColumnTypeString}, nil
					case "status_code":
						return &schema.Column{Name: "status_code", Type: schema.ColumnTypeInt64}, nil
					case "duration":
						return &schema.Column{Name: "duration", Type: schema.ColumnTypeFloat64}, nil
					default:
						return nil, fmt.Errorf("unknown column: %s", key.Name)
					}
				})
			},
			setupConditionBuilder: func(m *MockConditionBuilder) {
				m.WithConditionFor(func(ctx context.Context, key telemetrytypes.TelemetryFieldKey, operator qbtypes.FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (string, error) {
					switch key.Name {
					case "service.name":
						if operator == qbtypes.FilterOperatorEqual {
							return "service_name = ?", nil
						}
					case "status_code":
						if operator == qbtypes.FilterOperatorGreaterThanOrEq {
							return "status_code >= ?", nil
						}
					case "duration":
						if operator == qbtypes.FilterOperatorGreaterThan {
							return "duration > ?", nil
						}
					}

					return "", fmt.Errorf("unexpected parameters: field=%s, operator=%v", key.Name, operator)
				})
			},
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			// Create mocks with custom behavior
			mockFieldMapper := NewMockFieldMapper()
			mockConditionBuilder := NewMockConditionBuilder()

			// Set up the mocks with custom behavior
			c.setupFieldMapper(mockFieldMapper)
			c.setupConditionBuilder(mockConditionBuilder)

			// Create a dummy default key for when the parser needs one
			dummyKey := &telemetrytypes.TelemetryFieldKey{
				Name:          "dummy",
				Signal:        telemetrytypes.SignalTraces,
				FieldContext:  telemetrytypes.FieldContextSpan,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			}

			// Call the function we're testing
			clause, warnings, err := prepareWhereClause(
				c.query,
				c.fieldKeys,
				mockFieldMapper,
				mockConditionBuilder,
				dummyKey,
				"",
				nil,
			)

			// Verify results
			require.NoError(t, err)
			assert.Empty(t, warnings)
			require.NotNil(t, clause)

			// Check the SQL after applying the clause to a builder (most accurate way to verify the clause)
			sb := sqlbuilder.NewSelectBuilder()
			sb.AddWhereClause(clause)
			sqlStr, _ := sb.Build()

			// Extract the WHERE clause from the generated SQL
			parts := strings.Split(sqlStr, "WHERE ")
			require.Len(t, parts, 2, "SQL should contain a WHERE clause")

			// The WHERE part comes after the keyword, so check parts[1]
			assert.Equal(t, c.expectedWhereClause, strings.TrimSpace(parts[1]))
		})
	}
}

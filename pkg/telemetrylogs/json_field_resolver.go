package telemetrylogs

import (
	"context"
	"fmt"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// JSONFieldResolver handles JSON field resolution using path_types table
type JSONFieldResolver struct {
	telemetryStore telemetrystore.TelemetryStore
	cache          map[string][]string // path -> types cache (multiple types per path)
}

// TypePlan represents the types available for a JSON path
type TypePlan struct {
	Path  string
	Types []string
}

// HasScalarType checks if the path has any scalar (non-array) types
func (tp *TypePlan) HasScalarType() bool {
	for _, t := range tp.Types {
		if !strings.HasPrefix(t, "Array(") {
			return true
		}
	}
	return false
}

// HasArrayType checks if the path has any array types
func (tp *TypePlan) HasArrayType() bool {
	for _, t := range tp.Types {
		if strings.HasPrefix(t, "Array(") {
			return true
		}
	}
	return false
}

// GetScalarTypes returns only scalar types
func (tp *TypePlan) GetScalarTypes() []string {
	var scalars []string
	for _, t := range tp.Types {
		if !strings.HasPrefix(t, "Array(") {
			scalars = append(scalars, t)
		}
	}
	return scalars
}

// GetArrayTypes returns only array types
func (tp *TypePlan) GetArrayTypes() []string {
	var arrays []string
	for _, t := range tp.Types {
		if strings.HasPrefix(t, "Array(") {
			arrays = append(arrays, t)
		}
	}
	return arrays
}

// NewJSONFieldResolver creates a new JSON field resolver
func NewJSONFieldResolver(telemetryStore telemetrystore.TelemetryStore) *JSONFieldResolver {
	return &JSONFieldResolver{
		telemetryStore: telemetryStore,
		cache:          make(map[string][]string),
	}
}

// ResolveJSONFieldTypes resolves all ClickHouse types for a JSON path
func (r *JSONFieldResolver) ResolveJSONFieldTypes(ctx context.Context, path string) (*TypePlan, error) {
	// Check cache first
	if cachedTypes, exists := r.cache[path]; exists {
		return &TypePlan{Path: path, Types: cachedTypes}, nil
	}

	// Query the path_types table for all types
	query := fmt.Sprintf(`
		SELECT DISTINCT type 
		FROM %s.%s 
		WHERE path = ? 
		ORDER BY type
	`, DBName, PathTypesTableName)

	rows, err := r.telemetryStore.ClickhouseDB().Query(ctx, query, path)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeNotFound, errors.CodeNotFound,
			"JSON path types not found for path: %s", path)
	}
	defer rows.Close()

	var types []string
	for rows.Next() {
		var pathType string
		if err := rows.Scan(&pathType); err != nil {
			return nil, errors.Wrapf(err, errors.TypeNotFound, errors.CodeNotFound,
				"Failed to scan JSON path type for path: %s", path)
		}

		// Map the type to ClickHouse JSON type
		chType := r.mapToClickHouseType(pathType)
		types = append(types, chType)
	}

	if len(types) == 0 {
		return nil, errors.Newf(errors.TypeNotFound, errors.CodeNotFound,
			"JSON path types not found for path: %s", path)
	}

	// Cache the result
	r.cache[path] = types

	return &TypePlan{Path: path, Types: types}, nil
}

// mapToClickHouseType maps path type to ClickHouse JSON type
func (r *JSONFieldResolver) mapToClickHouseType(pathType string) string {
	switch strings.ToLower(pathType) {
	case "string":
		return "String"
	case "int", "int64", "integer":
		return "Int64"
	case "float", "float64", "number":
		return "Float64"
	case "bool", "boolean":
		return "Bool"
	case "array":
		return "Array(Dynamic)"
	case "object", "json":
		return "JSON"
	default:
		// Default to String for unknown types
		return "String"
	}
}

// BuildJSONFieldExpression builds a dynamicElement expression for a JSON field
func (r *JSONFieldResolver) BuildJSONFieldExpression(ctx context.Context, key *telemetrytypes.TelemetryFieldKey) (string, error) {
	path := strings.TrimPrefix(key.Name, BodyJSONStringSearchPrefix)

	// Get all types for this path
	typePlan, err := r.ResolveJSONFieldTypes(ctx, path)
	if err != nil {
		return "", err
	}

	// For SELECT expressions, prefer scalar types if available
	fieldPath := "body_v2." + path
	if typePlan.HasScalarType() {
		// Use the first scalar type for SELECT
		scalarTypes := typePlan.GetScalarTypes()
		expression := fmt.Sprintf("dynamicElement(%s, '%s')", fieldPath, scalarTypes[0])
		return expression, nil
	} else if typePlan.HasArrayType() {
		// Use the first array type for SELECT
		arrayTypes := typePlan.GetArrayTypes()
		expression := fmt.Sprintf("dynamicElement(%s, '%s')", fieldPath, arrayTypes[0])
		return expression, nil
	}

	return "", errors.Newf(errors.TypeNotFound, errors.CodeNotFound,
		"No valid types found for JSON path: %s", path)
}

// BuildJSONFieldExpressionForFilter builds a context-aware expression based on filter operator
func (r *JSONFieldResolver) BuildJSONFieldExpressionForFilter(ctx context.Context, key *telemetrytypes.TelemetryFieldKey, operator qbtypes.FilterOperator) (string, error) {
	path := strings.TrimPrefix(key.Name, BodyJSONStringSearchPrefix)

	// Get all types for this path
	typePlan, err := r.ResolveJSONFieldTypes(ctx, path)
	if err != nil {
		return "", err
	}

	fieldPath := "body_v2." + path

	// Context-aware expression building based on operator
	switch operator {
	case qbtypes.FilterOperatorEqual, qbtypes.FilterOperatorNotEqual,
		qbtypes.FilterOperatorGreaterThan, qbtypes.FilterOperatorGreaterThanOrEq,
		qbtypes.FilterOperatorLessThan, qbtypes.FilterOperatorLessThanOrEq:
		// For equality/comparison operators, prefer scalar types
		if typePlan.HasScalarType() {
			scalarTypes := typePlan.GetScalarTypes()
			expression := fmt.Sprintf("dynamicElement(%s, '%s')", fieldPath, scalarTypes[0])
			return expression, nil
		} else {
			// Fall back to array types if no scalars
			arrayTypes := typePlan.GetArrayTypes()
			expression := fmt.Sprintf("dynamicElement(%s, '%s')", fieldPath, arrayTypes[0])
			return expression, nil
		}

	case qbtypes.FilterOperatorContains, qbtypes.FilterOperatorNotContains,
		qbtypes.FilterOperatorLike, qbtypes.FilterOperatorNotLike,
		qbtypes.FilterOperatorILike, qbtypes.FilterOperatorNotILike:
		// For contains/like operators, use both scalar and array types
		return r.buildMultiTypeExpression(fieldPath, typePlan), nil

	case qbtypes.FilterOperatorExists, qbtypes.FilterOperatorNotExists:
		// For exists, check both scalar and array presence
		return r.buildExistsExpression(fieldPath, typePlan), nil

	default:
		// Default to scalar preference
		if typePlan.HasScalarType() {
			scalarTypes := typePlan.GetScalarTypes()
			expression := fmt.Sprintf("dynamicElement(%s, '%s')", fieldPath, scalarTypes[0])
			return expression, nil
		} else {
			arrayTypes := typePlan.GetArrayTypes()
			expression := fmt.Sprintf("dynamicElement(%s, '%s')", fieldPath, arrayTypes[0])
			return expression, nil
		}
	}
}

// buildMultiTypeExpression builds an expression that handles both scalar and array types
func (r *JSONFieldResolver) buildMultiTypeExpression(fieldPath string, typePlan *TypePlan) string {
	var expressions []string

	// Add scalar type expressions
	for _, scalarType := range typePlan.GetScalarTypes() {
		expr := fmt.Sprintf("dynamicElement(%s, '%s')", fieldPath, scalarType)
		expressions = append(expressions, expr)
	}

	// Add array type expressions with arrayContains
	for _, arrayType := range typePlan.GetArrayTypes() {
		expr := fmt.Sprintf("arrayExists(x -> x, dynamicElement(%s, '%s'))", fieldPath, arrayType)
		expressions = append(expressions, expr)
	}

	if len(expressions) == 1 {
		return expressions[0]
	}

	// Combine with OR
	return "(" + strings.Join(expressions, " OR ") + ")"
}

// buildExistsExpression builds an expression that checks existence of both scalar and array types
func (r *JSONFieldResolver) buildExistsExpression(fieldPath string, typePlan *TypePlan) string {
	var expressions []string

	// Check scalar existence
	for _, scalarType := range typePlan.GetScalarTypes() {
		expr := fmt.Sprintf("isNotNull(dynamicElement(%s, '%s'))", fieldPath, scalarType)
		expressions = append(expressions, expr)
	}

	// Check array existence (non-empty)
	for _, arrayType := range typePlan.GetArrayTypes() {
		expr := fmt.Sprintf("length(dynamicElement(%s, '%s')) > 0", fieldPath, arrayType)
		expressions = append(expressions, expr)
	}

	if len(expressions) == 1 {
		return expressions[0]
	}

	// Combine with OR
	return "(" + strings.Join(expressions, " OR ") + ")"
}

// BuildJSONFieldExpressionForExists builds an exists expression for a JSON field (legacy method)
func (r *JSONFieldResolver) BuildJSONFieldExpressionForExists(ctx context.Context, key *telemetrytypes.TelemetryFieldKey) (string, error) {
	path := strings.TrimPrefix(key.Name, BodyJSONStringSearchPrefix)

	// Get all types for this path
	typePlan, err := r.ResolveJSONFieldTypes(ctx, path)
	if err != nil {
		return "", err
	}

	fieldPath := "body_v2." + path
	return r.buildExistsExpression(fieldPath, typePlan), nil
}

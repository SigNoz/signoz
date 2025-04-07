package telemetrymetadata

import (
	"strings"

	"github.com/AfterShip/clickhouse-sql-parser/parser"
	"github.com/SigNoz/signoz/pkg/types"
)

// TelemetryFieldVisitor is an AST visitor for extracting telemetry fields
type TelemetryFieldVisitor struct {
	parser.DefaultASTVisitor
	Fields []types.TelemetryFieldKey
}

func NewTelemetryFieldVisitor() *TelemetryFieldVisitor {
	return &TelemetryFieldVisitor{
		Fields: make([]types.TelemetryFieldKey, 0),
	}
}

// VisitColumnDef is called when visiting a column definition
func (v *TelemetryFieldVisitor) VisitColumnDef(expr *parser.ColumnDef) error {
	// Check if this is a materialized column with DEFAULT expression
	if expr.DefaultExpr == nil {
		return nil
	}

	// Parse column name to extract context and data type
	columnName := expr.Name.String()

	// Remove backticks if present
	columnName = strings.TrimPrefix(columnName, "`")
	columnName = strings.TrimSuffix(columnName, "`")

	// Parse the column name to extract components
	parts := strings.Split(columnName, "_")
	if len(parts) < 2 {
		return nil
	}

	context := parts[0]
	dataType := parts[1]

	// Check if this is a valid telemetry column
	var fieldContext types.FieldContext
	switch context {
	case "resource":
		fieldContext = types.FieldContextResource
	case "scope":
		fieldContext = types.FieldContextScope
	case "attribute":
		fieldContext = types.FieldContextAttribute
	default:
		return nil // Not a telemetry column
	}

	// Check and convert data type
	var fieldDataType types.FieldDataType
	switch dataType {
	case "string":
		fieldDataType = types.FieldDataTypeString
	case "bool":
		fieldDataType = types.FieldDataTypeBool
	case "int", "int64":
		fieldDataType = types.FieldDataTypeFloat64
	case "float", "float64":
		fieldDataType = types.FieldDataTypeFloat64
	case "number":
		fieldDataType = types.FieldDataTypeFloat64
	default:
		return nil // Unknown data type
	}

	// Extract field name from the DEFAULT expression
	// The DEFAULT expression should be something like: resources_string['k8s.cluster.name']
	// We need to extract the key inside the square brackets
	defaultExprStr := expr.DefaultExpr.String()

	// Look for the pattern: map['key']
	startIdx := strings.Index(defaultExprStr, "['")
	endIdx := strings.Index(defaultExprStr, "']")

	if startIdx == -1 || endIdx == -1 || startIdx+2 >= endIdx {
		return nil // Invalid DEFAULT expression format
	}

	fieldName := defaultExprStr[startIdx+2 : endIdx]

	// Create and store the TelemetryFieldKey
	field := types.TelemetryFieldKey{
		Name:          fieldName,
		FieldContext:  fieldContext,
		FieldDataType: fieldDataType,
		Materialized:  true,
	}

	v.Fields = append(v.Fields, field)
	return nil
}

func ExtractFieldKeysFromTblStatement(statement string) ([]types.TelemetryFieldKey, error) {
	// Parse the CREATE TABLE statement using the ClickHouse parser
	p := parser.NewParser(statement)
	stmts, err := p.ParseStmts()
	if err != nil {
		return nil, err
	}

	// Create a visitor to collect telemetry fields
	visitor := NewTelemetryFieldVisitor()

	// Visit each statement
	for _, stmt := range stmts {
		// We're looking for CreateTable statements
		createTable, ok := stmt.(*parser.CreateTable)
		if !ok {
			continue
		}

		// Visit the table schema to extract column definitions
		if createTable.TableSchema != nil {
			for _, column := range createTable.TableSchema.Columns {
				if err := column.Accept(visitor); err != nil {
					return nil, err
				}
			}
		}
	}

	return visitor.Fields, nil
}

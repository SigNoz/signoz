package querybuilder

import (
	"fmt"
	"strings"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	"github.com/SigNoz/signoz/pkg/errors"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

func physicalSemconvMembers(key *telemetrytypes.TelemetryFieldKey) []string {
	if len(key.SemconvMembers) > 0 {
		return key.SemconvMembers
	}
	return []string{key.Name}
}

func mapMemberExistenceExpression(column string, key *telemetrytypes.TelemetryFieldKey, member string) string {
	if materializedColumn, ok := key.SemconvMaterializedColumns[member]; ok {
		return ClickHouseIdentifier(materializedColumn + "_exists")
	}
	if key.Materialized && key.Name == member {
		physicalKey := key.Copy()
		physicalKey.Name = member
		return telemetrytypes.FieldKeyToMaterializedColumnNameForExists(physicalKey)
	}
	return fmt.Sprintf("mapContains(%s, %s)", column, ClickHouseStringLiteral(member))
}

// ExistsExpression renders the existence predicate for a key resolved to the given
// columns (negated when exists is false). Comparisons are against constants rendered
// as literals, so the expression carries no bind args and can guard column expressions
// directly. Signal-specific presence checks (body JSON paths, label maps) are handled
// by the field mappers before falling through to this.
func ExistsExpression(columns []*schema.Column, key *telemetrytypes.TelemetryFieldKey, tsStart, tsEnd uint64, fieldExpression string, exists bool) (string, error) {
	newColumns, evolutionsEntries, err := qbtypes.SelectEvolutionsForColumns(columns, key.Evolutions, tsStart, tsEnd)
	if err != nil {
		return "", err
	}
	if len(newColumns) == 0 {
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "no valid evolution found for field %s in the given time range", key.Name)
	}

	comparison := func(operator string, value string) string {
		return fmt.Sprintf("%s %s %s", fieldExpression, operator, value)
	}

	if len(newColumns) > 1 {
		if exists {
			return fieldExpression + " IS NOT NULL", nil
		}
		return fieldExpression + " IS NULL", nil
	}

	column := newColumns[0]
	switch column.Type.GetType() {
	case schema.ColumnTypeEnumJSON:
		// the ::String cast in the value expression folds NULL to '', so the
		// presence check must address the raw JSON path
		columnName := column.Name
		if len(evolutionsEntries) > 0 && evolutionsEntries[0] != nil {
			columnName = evolutionsEntries[0].ColumnName
		}
		members := physicalSemconvMembers(key)
		paths := make([]string, 0, len(members))
		for _, member := range members {
			paths = append(paths, fmt.Sprintf("%s.%s", columnName, ClickHouseIdentifier(member)))
		}
		if len(paths) == 1 {
			if exists {
				return paths[0] + " IS NOT NULL", nil
			}
			return paths[0] + " IS NULL", nil
		}
		guards := make([]string, 0, len(paths))
		for _, path := range paths {
			guards = append(guards, path+" IS NOT NULL")
		}
		rawPath := "(" + strings.Join(guards, " OR ") + ")"
		if exists {
			return rawPath, nil
		}
		return "NOT " + rawPath, nil
	case schema.ColumnTypeEnumString,
		schema.ColumnTypeEnumFixedString:
		if exists {
			return comparison("<>", "''"), nil
		}
		return comparison("=", "''"), nil
	case schema.ColumnTypeEnumDateTime64:
		zero := fmt.Sprintf("toDateTime64(0, %d)", column.Type.(schema.DateTime64ColumnType).Precision)
		if exists {
			return comparison("<>", zero), nil
		}
		return comparison("=", zero), nil
	case schema.ColumnTypeEnumLowCardinality:
		switch elementType := column.Type.(schema.LowCardinalityColumnType).ElementType; elementType.GetType() {
		case schema.ColumnTypeEnumString:
			if exists {
				return comparison("<>", "''"), nil
			}
			return comparison("=", "''"), nil
		default:
			return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "exists operator is not supported for low cardinality column type %s", elementType)
		}
	case schema.ColumnTypeEnumUInt64,
		schema.ColumnTypeEnumUInt32,
		schema.ColumnTypeEnumUInt8,
		schema.ColumnTypeEnumInt8,
		schema.ColumnTypeEnumInt16,
		schema.ColumnTypeEnumBool:
		if exists {
			return comparison("<>", "0"), nil
		}
		return comparison("=", "0"), nil
	case schema.ColumnTypeEnumMap:
		keyType := column.Type.(schema.MapColumnType).KeyType
		if _, ok := keyType.(schema.LowCardinalityColumnType); !ok {
			return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "key type %s is not supported for map column type %s", keyType, column.Type)
		}

		switch valueType := column.Type.(schema.MapColumnType).ValueType; valueType.GetType() {
		case schema.ColumnTypeEnumString, schema.ColumnTypeEnumBool, schema.ColumnTypeEnumFloat64:
			members := physicalSemconvMembers(key)
			operands := make([]string, 0, len(members))
			for _, member := range members {
				operands = append(operands, mapMemberExistenceExpression(column.Name, key, member))
			}
			leftOperand := strings.Join(operands, " OR ")
			if len(operands) > 1 {
				leftOperand = "(" + leftOperand + ")"
			}
			if exists {
				return leftOperand, nil
			}
			return "NOT " + leftOperand, nil
		default:
			return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "exists operator is not supported for map column type %s", valueType)
		}
	default:
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "exists operator is not supported for column type %s", column.Type)
	}
}

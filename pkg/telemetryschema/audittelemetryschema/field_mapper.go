package audittelemetryschema

import (
	"context"
	"fmt"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
)

type storage struct{}

var _ qbtypes.Storage = (*storage)(nil)

func NewStorage() *storage {
	return &storage{}
}

func (m *storage) getColumn(_ context.Context, key *telemetrytypes.TelemetryFieldKey) ([]*schema.Column, error) {
	switch key.FieldContext {
	case telemetrytypes.FieldContextResource:
		return []*schema.Column{auditLogColumns["resource"]}, nil
	case telemetrytypes.FieldContextScope:
		switch key.Name {
		case "name", "scope.name", "scope_name":
			return []*schema.Column{auditLogColumns["scope_name"]}, nil
		case "version", "scope.version", "scope_version":
			return []*schema.Column{auditLogColumns["scope_version"]}, nil
		}
		return []*schema.Column{auditLogColumns["scope_string"]}, nil
	case telemetrytypes.FieldContextAttribute:
		switch key.FieldDataType {
		case telemetrytypes.FieldDataTypeString:
			return []*schema.Column{auditLogColumns["attributes_string"]}, nil
		case telemetrytypes.FieldDataTypeInt64, telemetrytypes.FieldDataTypeFloat64, telemetrytypes.FieldDataTypeNumber:
			return []*schema.Column{auditLogColumns["attributes_number"]}, nil
		case telemetrytypes.FieldDataTypeBool:
			return []*schema.Column{auditLogColumns["attributes_bool"]}, nil
		}
	case telemetrytypes.FieldContextLog, telemetrytypes.FieldContextUnspecified:
		col, ok := auditLogColumns[key.Name]
		if !ok {
			return nil, qbtypes.ErrColumnNotFound
		}
		return []*schema.Column{col}, nil
	}

	return nil, qbtypes.ErrColumnNotFound
}

func (m *storage) Read(ctx context.Context, _ qbtypes.QueryInfo, key *telemetrytypes.TelemetryFieldKey) (string, error) {
	columns, err := m.getColumn(ctx, key)
	if err != nil {
		return "", err
	}
	if len(columns) != 1 {
		return "", errors.NewInternalf(errors.CodeInternal, "expected exactly 1 column, got %d", len(columns))
	}
	column := columns[0]

	switch column.Type.GetType() {
	case schema.ColumnTypeEnumJSON:
		if key.FieldContext != telemetrytypes.FieldContextResource {
			return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "only resource context fields are supported for json columns in audit, got %s", key.FieldContext.String)
		}
		return fmt.Sprintf("%s.`%s`::String", column.Name, key.Name), nil
	case schema.ColumnTypeEnumLowCardinality:
		return column.Name, nil
	case schema.ColumnTypeEnumString, schema.ColumnTypeEnumUInt64, schema.ColumnTypeEnumUInt32, schema.ColumnTypeEnumUInt8:
		return column.Name, nil
	case schema.ColumnTypeEnumMap:
		keyType := column.Type.(schema.MapColumnType).KeyType
		if _, ok := keyType.(schema.LowCardinalityColumnType); !ok {
			return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "key type %s is not supported for map column type %s", keyType, column.Type)
		}

		switch valueType := column.Type.(schema.MapColumnType).ValueType; valueType.GetType() {
		case schema.ColumnTypeEnumString, schema.ColumnTypeEnumBool, schema.ColumnTypeEnumFloat64:
			if key.Materialized {
				return telemetrytypes.FieldKeyToMaterializedColumnName(key), nil
			}
			return fmt.Sprintf("%s['%s']", column.Name, key.Name), nil
		default:
			return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported map value type %s", valueType)
		}
	}

	return column.Name, nil
}

func (m *storage) Exists(ctx context.Context, q qbtypes.QueryInfo, key *telemetrytypes.TelemetryFieldKey, exists bool) (qbtypes.Existence, error) {
	fieldExpression, err := m.Read(ctx, q, key)
	if err != nil {
		return qbtypes.Existence{}, err
	}
	columns, err := m.getColumn(ctx, key)
	if err != nil {
		return qbtypes.Existence{}, err
	}
	predicate, err := querybuilder.ExistsExpression(columns, key, q.StartNs, q.EndNs, fieldExpression, exists)
	if err != nil {
		return qbtypes.Existence{}, err
	}
	return qbtypes.Existence{Predicate: predicate, WhenAbsent: absentReads(columns[0])}, nil
}

// absentReads tells what a row without the key reads from the column: the
// empty value of a map or of a JSON path (its ::String cast folds NULL to
// the empty string), and a real value from every other column.
func absentReads(column *schema.Column) qbtypes.Absent {
	switch column.Type.GetType() {
	case schema.ColumnTypeEnumMap, schema.ColumnTypeEnumJSON:
		return qbtypes.AbsentIsSentinel
	}
	return qbtypes.AlwaysPresent
}

// Fallback answers a column name with the column; audit has no attribute
// synthesis, so any other unknown key stays unresolved and the caller errors.
func (m *storage) Fallback(_ context.Context, _ qbtypes.QueryInfo, key *telemetrytypes.TelemetryFieldKey, _ qbtypes.FilterOperator, _ any) ([]*telemetrytypes.LogicalField, error) {
	if _, ok := auditLogColumns[key.Name]; !ok {
		return nil, nil
	}
	column := telemetrytypes.NewTelemetryFieldKey(key.Name, telemetrytypes.FieldContextLog, key.FieldDataType)
	return querybuilder.WrapAsLogicalFields(key.Name, []*telemetrytypes.TelemetryFieldKey{column}), nil
}

func (m *storage) Traits() qbtypes.Traits {
	return qbtypes.Traits{Split: qbtypes.MainOfSplit}
}

func (m *storage) Compile(ctx context.Context, q qbtypes.QueryInfo, logical *telemetrytypes.LogicalField, operator qbtypes.FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (qbtypes.Compiled, error) {
	return querybuilder.SharedCondition(ctx, q, m, logical, operator, value, sb)
}

func (m *storage) ColumnRead(ctx context.Context, q qbtypes.QueryInfo, logical *telemetrytypes.LogicalField, _ any) (qbtypes.ColumnExpr, error) {
	return querybuilder.DefaultRead(ctx, q, m, logical)
}

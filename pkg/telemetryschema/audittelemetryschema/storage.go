package audittelemetryschema

import (
	"context"
	"fmt"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	"github.com/SigNoz/signoz/pkg/clickhousesql"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
)

type storage struct{}

var _ qbtypes.Storage = (*storage)(nil)

func NewStorage() qbtypes.Storage {
	return &storage{}
}

func (m *storage) getColumn(_ context.Context, key *telemetrytypes.TelemetryFieldKey) ([]*schema.Column, error) {
	switch key.FieldContext {
	case telemetrytypes.FieldContextResource:
		return []*schema.Column{auditLogColumns[ResourceColumn]}, nil
	case telemetrytypes.FieldContextScope:
		return []*schema.Column{auditLogColumns[ScopeColumn]}, nil
	case telemetrytypes.FieldContextAttribute:
		return []*schema.Column{auditLogColumns[AttributesColumn]}, nil
	case telemetrytypes.FieldContextLog, telemetrytypes.FieldContextUnspecified:
		col, ok := auditLogColumns[key.Name]
		if !ok {
			return nil, qbtypes.ErrColumnNotFound
		}
		return []*schema.Column{col}, nil
	}

	return nil, qbtypes.ErrColumnNotFound
}

// Read composes the bare read of one key with its membership test and what
// an absent row reads.
func (m *storage) Read(ctx context.Context, q qbtypes.QueryInfo, key *telemetrytypes.TelemetryFieldKey) (qbtypes.Read, error) {
	columns, err := m.getColumn(ctx, key)
	if err != nil {
		return qbtypes.Read{}, err
	}
	if len(columns) != 1 {
		return qbtypes.Read{}, errors.NewInternalf(errors.CodeInternal, "expected exactly 1 column, got %d", len(columns))
	}
	column := columns[0]

	if column.Type.GetType() == schema.ColumnTypeEnumJSON {
		return jsonRead(column, key)
	}

	presence, err := querybuilder.ExistsExpression(columns, key, q.StartNs, q.EndNs, column.Name, true)
	if err != nil {
		return qbtypes.Read{}, err
	}
	absence, err := querybuilder.ExistsExpression(columns, key, q.StartNs, q.EndNs, column.Name, false)
	if err != nil {
		return qbtypes.Read{}, err
	}
	return qbtypes.Read{SQL: column.Name, Presence: presence, Absence: absence, WhenAbsent: qbtypes.AlwaysPresent}, nil
}

// Fallback answers a column name with the column, and synthesizes any other
// key from the operand, since audit has no keys tables to report it.
func (m *storage) Fallback(_ context.Context, _ qbtypes.QueryInfo, key *telemetrytypes.TelemetryFieldKey, _ qbtypes.FilterOperator, value any) ([]*telemetrytypes.LogicalField, error) {
	var keys []*telemetrytypes.TelemetryFieldKey
	switch key.FieldContext {
	case telemetrytypes.FieldContextUnspecified, telemetrytypes.FieldContextLog:
		if column, ok := auditLogColumns[key.Name]; ok {
			keys = []*telemetrytypes.TelemetryFieldKey{telemetrytypes.NewTelemetryFieldKey(key.Name, telemetrytypes.FieldContextLog, columnDataType(key, column))}
			break
		}
		if key.FieldContext == telemetrytypes.FieldContextUnspecified {
			keys = synthesizeKeys(key, value)
		}
	case telemetrytypes.FieldContextAttribute, telemetrytypes.FieldContextResource, telemetrytypes.FieldContextScope:
		keys = synthesizeKeys(key, value)
	}
	return querybuilder.WrapAsLogicalFields(key.Name, keys), nil
}

func (m *storage) Traits() qbtypes.Traits {
	return qbtypes.Traits{Split: qbtypes.MainOfSplit}
}

func (m *storage) Compile(ctx context.Context, q qbtypes.QueryInfo, logical *telemetrytypes.LogicalField, operator qbtypes.FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (qbtypes.Compiled, error) {
	return querybuilder.SharedCondition(ctx, q, m, logical, operator, value, sb)
}

// jsonRead reads a key from one of the JSON columns. The body text and the
// scope name and version are typed paths, so they read without a cast.
// Resource and scope attributes sit under an `attributes` path.
func jsonRead(column *schema.Column, key *telemetrytypes.TelemetryFieldKey) (qbtypes.Read, error) {
	switch column.Name {
	case BodyColumn:
		if key.FieldContext != telemetrytypes.FieldContextLog && key.FieldContext != telemetrytypes.FieldContextUnspecified {
			break
		}
		path := BodyColumn + ".message"
		return qbtypes.Read{SQL: path, Presence: path + " <> ''", Absence: path + " = ''", WhenAbsent: qbtypes.AlwaysPresent}, nil
	case ScopeColumn:
		switch key.Name {
		case "name", "scope.name", "scope_name":
			return declaredStringRead(ScopeColumn + ".name"), nil
		case "version", "scope.version", "scope_version":
			return declaredStringRead(ScopeColumn + ".version"), nil
		}
		return stringPathRead(fmt.Sprintf("%s.attributes.%s", ScopeColumn, clickhousesql.Identifier(key.Name))), nil
	case ResourceColumn:
		if key.FieldContext != telemetrytypes.FieldContextResource {
			break
		}
		return stringPathRead(fmt.Sprintf("%s.attributes.%s", ResourceColumn, clickhousesql.Identifier(key.Name))), nil
	case AttributesColumn:
		if key.FieldContext != telemetrytypes.FieldContextAttribute {
			break
		}
		path := fmt.Sprintf("%s.%s", AttributesColumn, clickhousesql.Identifier(key.Name))
		switch key.FieldDataType {
		case telemetrytypes.FieldDataTypeInt64, telemetrytypes.FieldDataTypeFloat64, telemetrytypes.FieldDataTypeNumber:
			return typedPathRead(fmt.Sprintf("toFloat64OrNull(%s::String)", path)), nil
		case telemetrytypes.FieldDataTypeBool:
			return typedPathRead(fmt.Sprintf("if(dynamicType(%s) = 'Bool', accurateCastOrNull(%s, 'Bool'), NULL)", path, path)), nil
		}
		return stringPathRead(path), nil
	}

	return qbtypes.Read{}, errors.NewInvalidInputf(errors.CodeInvalidInput, "field %s in context %s cannot be read from the json column %s", key.Name, key.FieldContext.StringValue(), column.Name)
}

// declaredStringRead reads a typed String path, which reads an empty string when absent.
func declaredStringRead(path string) qbtypes.Read {
	return qbtypes.Read{SQL: path, Presence: path + " <> ''", Absence: path + " = ''", WhenAbsent: qbtypes.AbsentIsSentinel}
}

// stringPathRead reads a dynamic path as String. The cast folds NULL to an
// empty string, so presence tests the raw path.
func stringPathRead(path string) qbtypes.Read {
	return qbtypes.Read{SQL: path + "::String", Presence: path + " IS NOT NULL", Absence: path + " IS NULL", WhenAbsent: qbtypes.AbsentIsSentinel}
}

// typedPathRead reads a number or bool path through a cast that is NULL when
// the key is absent or stored as another type.
// TODO: share with tracestelemetryschema.AttributeJSONValueExpr from a common package.
func typedPathRead(expr string) qbtypes.Read {
	return qbtypes.Read{SQL: expr, Presence: expr + " IS NOT NULL", Absence: expr + " IS NULL", WhenAbsent: qbtypes.AbsentIsNull}
}

// synthesizeKeys reads an untyped key with no operand as String only. A JSON
// path casts every stored type to String, so the other types add nothing.
func synthesizeKeys(key *telemetrytypes.TelemetryFieldKey, value any) []*telemetrytypes.TelemetryFieldKey {
	if value == nil && key.FieldDataType == telemetrytypes.FieldDataTypeUnspecified {
		key = telemetrytypes.NewTelemetryFieldKey(key.Name, key.FieldContext, telemetrytypes.FieldDataTypeString)
	}
	return querybuilder.SynthesizeKeys(key, value)
}

func columnDataType(key *telemetrytypes.TelemetryFieldKey, column *schema.Column) telemetrytypes.FieldDataType {
	if key.FieldDataType != telemetrytypes.FieldDataTypeUnspecified {
		return key.FieldDataType
	}
	if field, ok := IntrinsicFields[key.Name]; ok {
		return field.FieldDataType
	}
	return querybuilder.ColumnDataType(column)
}

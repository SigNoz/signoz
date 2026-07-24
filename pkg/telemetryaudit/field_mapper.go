package telemetryaudit

import (
	"context"
	"fmt"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/huandu/go-sqlbuilder"

	"golang.org/x/exp/maps"
)

type fieldMapper struct{}

func NewFieldMapper() qbtypes.FieldMapper {
	return &fieldMapper{}
}

func (m *fieldMapper) getColumn(_ context.Context, key *telemetrytypes.TelemetryFieldKey) ([]*schema.Column, error) {
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

func (m *fieldMapper) FieldFor(ctx context.Context, _ valuer.UUID, _, _ uint64, key *telemetrytypes.TelemetryFieldKey) (string, error) {
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

func (m *fieldMapper) ColumnFor(ctx context.Context, _ valuer.UUID, _, _ uint64, key *telemetrytypes.TelemetryFieldKey) ([]*schema.Column, error) {
	return m.getColumn(ctx, key)
}

func (m *fieldMapper) ColumnExpressionFor(
	ctx context.Context,
	orgID valuer.UUID,
	tsStart, tsEnd uint64,
	field *telemetrytypes.TelemetryFieldKey,
	requiredDataType telemetrytypes.FieldDataType,
	keys map[string][]*telemetrytypes.TelemetryFieldKey,
) (string, error) {
	resolved := field
	fieldExpression, err := m.FieldFor(ctx, orgID, tsStart, tsEnd, field)
	if errors.Is(err, qbtypes.ErrColumnNotFound) {
		keysForField := keys[field.Name]
		if len(keysForField) == 0 {
			if _, ok := auditLogColumns[field.Name]; ok {
				field.FieldContext = telemetrytypes.FieldContextLog
				fieldExpression, _ = m.FieldFor(ctx, orgID, tsStart, tsEnd, field)
			} else {
				wrappedErr := errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "field `%s` not found", field.Name).WithSuggestions(errors.NewSuggestionsOnLevenshteinDistance(field.Name, errors.NounKeys, maps.Keys(keys))...)
				return "", wrappedErr
			}
		} else {
			resolved = keysForField[0]
			fieldExpression, _ = m.FieldFor(ctx, orgID, tsStart, tsEnd, keysForField[0])
		}
	}

	// Group-by/order (String) and aggregation (String/Float64): exists-guarded and coerced
	// to requiredDataType, returned bare (the caller adds any alias). Raw select
	// (Unspecified) returns the aliased column expression.
	if requiredDataType != telemetrytypes.FieldDataTypeUnspecified {
		var dummyValue any = ""
		if requiredDataType == telemetrytypes.FieldDataTypeFloat64 {
			dummyValue = 0.0
		}
		columns, err := m.getColumn(ctx, resolved)
		if err != nil {
			return "", err
		}
		guard, err := querybuilder.ExistsExpression(columns, resolved, tsStart, tsEnd, fieldExpression, true)
		if err != nil {
			return "", err
		}
		coerced, _ := querybuilder.DataTypeCollisionHandledFieldName(resolved, dummyValue, fieldExpression, qbtypes.FilterOperatorUnknown)
		return fmt.Sprintf("multiIf(%s, %s, NULL)", guard, coerced), nil
	}

	return fmt.Sprintf("%s AS `%s`", sqlbuilder.Escape(fieldExpression), field.Name), nil
}

// CandidateKeys returns nil: audit has no synthesize-on-unknown-key fallback, so an
// unknown key stays unresolved and the caller errors.
func (m *fieldMapper) CandidateKeys(_ context.Context, _ valuer.UUID, _ *telemetrytypes.TelemetryFieldKey, _ any, _ map[string][]*telemetrytypes.TelemetryFieldKey) []*telemetrytypes.TelemetryFieldKey {
	return nil
}

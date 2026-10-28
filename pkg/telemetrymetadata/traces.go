package telemetrymetadata

import (
	"context"
	"fmt"
	"strings"

	"github.com/huandu/go-sqlbuilder"
	"golang.org/x/exp/maps"

	"github.com/SigNoz/signoz/pkg/clickhousesql"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/telemetrymetadata/parser"
	"github.com/SigNoz/signoz/pkg/telemetrymetadata/resolvercore"
	"github.com/SigNoz/signoz/pkg/telemetryschema/tracestelemetryschema"
	"github.com/SigNoz/signoz/pkg/types/ctxtypes"
	"github.com/SigNoz/signoz/pkg/types/instrumentationtypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// tracesTblStatementToFieldKeys returns materialised attribute/resource/scope keys from the traces table.
func (t *telemetryMetaStore) tracesTblStatementToFieldKeys(ctx context.Context) ([]*telemetrytypes.TelemetryFieldKey, error) {
	ctx = ctxtypes.NewContextWithCommentVals(ctx, map[string]string{
		instrumentationtypes.TelemetrySignal:  telemetrytypes.SignalTraces.StringValue(),
		instrumentationtypes.CodeNamespace:    "metadata",
		instrumentationtypes.CodeFunctionName: "tracesTblStatementToFieldKeys",
	})
	query := fmt.Sprintf("SHOW CREATE TABLE %s.%s", t.tracesDBName, t.indexV3TblName)
	statements := []telemetrytypes.ShowCreateTableStatement{}
	err := t.telemetrystore.ClickhouseDB().Select(ctx, &statements, query)
	if err != nil {
		return nil, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, resolvercore.ErrFailedToGetTblStatement.Error())
	}

	materialisedKeys, err := parser.ExtractFieldKeysFromTblStatement(statements[0].Statement)
	if err != nil {
		return nil, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetTracesKeys.Error())
	}

	for idx := range materialisedKeys {
		materialisedKeys[idx].Signal = telemetrytypes.SignalTraces
	}

	return materialisedKeys, nil
}

// getTracesKeys returns the keys from the spans that match the field selection criteria.
func (t *telemetryMetaStore) getTracesKeys(ctx context.Context, fieldKeySelectors []*telemetrytypes.FieldKeySelector) ([]*telemetrytypes.TelemetryFieldKey, bool, error) {
	ctx = ctxtypes.NewContextWithCommentVals(ctx, map[string]string{
		instrumentationtypes.TelemetrySignal:  telemetrytypes.SignalTraces.StringValue(),
		instrumentationtypes.CodeNamespace:    "metadata",
		instrumentationtypes.CodeFunctionName: "getTracesKeys",
	})

	if len(fieldKeySelectors) == 0 {
		return nil, true, nil
	}

	// pre-fetch the materialised keys from the traces table
	matKeys, err := t.tracesTblStatementToFieldKeys(ctx)
	if err != nil {
		return nil, false, err
	}
	mapOfKeys := make(map[string]*telemetrytypes.TelemetryFieldKey)
	for _, key := range matKeys {
		mapOfKeys[key.Name+";"+key.FieldContext.StringValue()+";"+key.FieldDataType.StringValue()] = key
	}

	sb := sqlbuilder.Select(
		"tagKey AS tag_key",
		"tagType AS tag_type",
		"dataType AS tag_data_type",
		`CASE
			// WHEN tagType = 'spanfield' THEN 1
			WHEN tagType = 'resource' THEN 2
			WHEN tagType = 'scope' THEN 3
			WHEN tagType = 'tag' THEN 4
			ELSE 5
		END as priority`,
	).From(t.tracesDBName + "." + t.spanAttributesKeysTblName)
	var limit int

	conds := []string{}
	for _, fieldKeySelector := range fieldKeySelectors {

		// TODO(srikanthccv): support time filtering for span attribute keys
		// if fieldKeySelector.StartUnixMilli != 0 {
		// 	conds = append(conds, sb.GE("unix_milli", fieldKeySelector.StartUnixMilli))
		// }
		// if fieldKeySelector.EndUnixMilli != 0 {
		// 	conds = append(conds, sb.LE("unix_milli", fieldKeySelector.EndUnixMilli))
		// }

		// key part of the selector
		fieldKeyConds := []string{}
		if fieldKeySelector.SelectorMatchType == telemetrytypes.FieldSelectorMatchTypeExact {
			fieldKeyConds = append(fieldKeyConds, sb.E("tagKey", fieldKeySelector.Name))
		} else {
			fieldKeyConds = append(fieldKeyConds, sb.ILike("tagKey", "%"+clickhousesql.LikePattern(fieldKeySelector.Name)+"%"))
		}

		// now look at the field context
		// we don't write most of intrinsic fields to keys table
		// for this reason we don't want to apply tagType if the field context
		// is not attribute, resource attribute or scope
		switch fieldKeySelector.FieldContext {
		case telemetrytypes.FieldContextAttribute, telemetrytypes.FieldContextResource, telemetrytypes.FieldContextScope:
			fieldKeyConds = append(fieldKeyConds, sb.E("tagType", fieldKeySelector.FieldContext.TagType()))
		}

		// now look at the field data type
		if fieldKeySelector.FieldDataType != telemetrytypes.FieldDataTypeUnspecified {
			fieldKeyConds = append(fieldKeyConds, sb.E("dataType", fieldKeySelector.FieldDataType.TagDataType()))
		}

		conds = append(conds, sb.And(fieldKeyConds...))
		limit += fieldKeySelector.Limit
	}
	// the span_attribute_keys has historically pushed the top level column as attributes
	sb.Where(sb.Or(conds...)).Where("isColumn = false")
	sb.GroupBy("tagKey", "tagType", "dataType")
	if limit == 0 {
		limit = 1000
	}

	mainSb := sqlbuilder.Select("tag_key", "tag_type", "tag_data_type", "max(priority) as priority")
	mainSb.From(mainSb.BuilderAs(sb, "sub_query"))
	mainSb.GroupBy("tag_key", "tag_type", "tag_data_type")
	mainSb.OrderBy("priority")
	// query one extra to check if we hit the limit
	mainSb.Limit(limit + 1)

	query, args := mainSb.BuildWithFlavor(sqlbuilder.ClickHouse)

	rows, err := t.telemetrystore.ClickhouseDB().Query(ctx, query, args...)
	if err != nil {
		return nil, false, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetTracesKeys.Error())
	}
	defer rows.Close()
	keys := []*telemetrytypes.TelemetryFieldKey{}
	rowCount := 0
	for rows.Next() {
		rowCount++
		// reached the limit, we know there are more results
		if rowCount > limit {
			break
		}

		var name string
		var fieldContext telemetrytypes.FieldContext
		var fieldDataType telemetrytypes.FieldDataType
		var priority uint8
		err = rows.Scan(&name, &fieldContext, &fieldDataType, &priority)
		if err != nil {
			return nil, false, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetTracesKeys.Error())
		}
		key, ok := mapOfKeys[name+";"+fieldContext.StringValue()+";"+fieldDataType.StringValue()]

		// if there is no materialised column, create a key with the field context and data type
		if !ok {
			key = &telemetrytypes.TelemetryFieldKey{
				Name:          name,
				Signal:        telemetrytypes.SignalTraces,
				FieldContext:  fieldContext,
				FieldDataType: fieldDataType,
			}
		}

		keys = append(keys, key)
		mapOfKeys[name+";"+fieldContext.StringValue()+";"+fieldDataType.StringValue()] = key
	}

	if rows.Err() != nil {
		return nil, false, errors.Wrap(rows.Err(), errors.TypeInternal, errors.CodeInternal, ErrFailedToGetTracesKeys.Error())
	}

	// hit the limit? (only counting DB results)
	complete := rowCount <= limit

	// Add the matching static fields: the span scope selectors, the intrinsic
	// columns and the calculated columns. These don't count towards the limit
	staticFields := maps.Values(tracestelemetryschema.SpanSearchScopeFields)
	staticFields = append(staticFields, maps.Values(tracestelemetryschema.IntrinsicFields)...)
	staticFields = append(staticFields, maps.Values(tracestelemetryschema.CalculatedFields)...)

	for _, field := range staticFields {
		if !resolvercore.StaticFieldMatchesAny(field, fieldKeySelectors) {
			continue
		}
		if _, added := mapOfKeys[field.Name+";"+field.FieldContext.StringValue()+";"+field.FieldDataType.StringValue()]; added {
			continue
		}
		keys = append(keys, &field)
	}

	if err = t.updateColumnEvolutionMetadataForKeys(ctx, keys); err != nil {
		return nil, false, err
	}

	return keys, complete, nil
}

func (t *telemetryMetaStore) getSpanFieldValues(ctx context.Context, orgID valuer.UUID, fieldValueSelector *telemetrytypes.FieldValueSelector) (*telemetrytypes.TelemetryFieldValues, bool, error) {
	ctx = ctxtypes.NewContextWithCommentVals(ctx, map[string]string{
		instrumentationtypes.TelemetrySignal:  telemetrytypes.SignalTraces.StringValue(),
		instrumentationtypes.CodeNamespace:    "metadata",
		instrumentationtypes.CodeFunctionName: "getSpanFieldValues",
	})

	if values, ok := spanSearchScopeFieldValues(fieldValueSelector.Name, fieldValueSelector.Value); ok {
		return values, true, nil
	}
	knownBool := resolvercore.IsKnownBoolField(fieldValueSelector, tracestelemetryschema.IntrinsicFields, tracestelemetryschema.CalculatedFields)
	names := resolvercore.FamilyValueNames(ctx, orgID, t.fl, telemetrytypes.SignalTraces, fieldValueSelector)
	// unix_milli is the hour of the span start
	return resolvercore.TagTableValues(ctx, t.telemetrystore, t.tracesDBName+"."+t.tracesFieldsTblName, fieldValueSelector, names, knownBool)
}

// spanSearchScopeFieldValues is the suggestion set for a search-scope selector
// (isRoot, isEntryPoint), which only filters with true. ok is false for any
// other name.
func spanSearchScopeFieldValues(name, searchText string) (*telemetrytypes.TelemetryFieldValues, bool) {
	for scopeName := range tracestelemetryschema.SpanSearchScopeFields {
		if !strings.EqualFold(scopeName, name) {
			continue
		}
		values := &telemetrytypes.TelemetryFieldValues{}
		if needle := strings.ToLower(searchText); needle == "" || strings.Contains("true", needle) {
			values.BoolValues = []bool{true}
		}
		return values, true
	}
	return nil, false
}

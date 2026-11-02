package telemetrymetadata

import (
	"context"
	"fmt"
	"strings"

	"github.com/huandu/go-sqlbuilder"
	"golang.org/x/exp/maps"

	"github.com/SigNoz/signoz/pkg/clickhousesql"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/telemetrymetadata/parser"
	"github.com/SigNoz/signoz/pkg/telemetrymetadata/resolvercore"
	"github.com/SigNoz/signoz/pkg/telemetryschema/logstelemetryschema"
	"github.com/SigNoz/signoz/pkg/types/ctxtypes"
	"github.com/SigNoz/signoz/pkg/types/featuretypes"
	"github.com/SigNoz/signoz/pkg/types/instrumentationtypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// logsTblStatementToFieldKeys returns materialised attribute/resource/scope keys from the logs table.
func (t *telemetryMetaStore) logsTblStatementToFieldKeys(ctx context.Context) ([]*telemetrytypes.TelemetryFieldKey, error) {
	ctx = ctxtypes.NewContextWithCommentVals(ctx, map[string]string{
		instrumentationtypes.TelemetrySignal:  telemetrytypes.SignalLogs.StringValue(),
		instrumentationtypes.CodeNamespace:    "metadata",
		instrumentationtypes.CodeFunctionName: "logsTblStatementToFieldKeys",
	})
	query := fmt.Sprintf("SHOW CREATE TABLE %s.%s", t.logsDBName, t.logsV2TblName)
	statements := []telemetrytypes.ShowCreateTableStatement{}
	err := t.telemetrystore.ClickhouseDB().Select(ctx, &statements, query)
	if err != nil {
		return nil, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, resolvercore.ErrFailedToGetTblStatement.Error())
	}

	materialisedKeys, err := parser.ExtractFieldKeysFromTblStatement(statements[0].Statement)
	if err != nil {
		return nil, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetLogsKeys.Error())
	}

	for idx := range materialisedKeys {
		materialisedKeys[idx].Signal = telemetrytypes.SignalLogs
	}

	return materialisedKeys, nil
}

// getLogsKeys returns the keys from the spans that match the field selection criteria.
func (t *telemetryMetaStore) getLogsKeys(ctx context.Context, orgID valuer.UUID, fieldKeySelectors []*telemetrytypes.FieldKeySelector) ([]*telemetrytypes.TelemetryFieldKey, bool, error) {
	ctx = ctxtypes.NewContextWithCommentVals(ctx, map[string]string{
		instrumentationtypes.TelemetrySignal:  telemetrytypes.SignalLogs.StringValue(),
		instrumentationtypes.CodeNamespace:    "metadata",
		instrumentationtypes.CodeFunctionName: "getLogsKeys",
	})

	if len(fieldKeySelectors) == 0 {
		return nil, true, nil
	}

	// pre-fetch the materialised keys from the logs table
	matKeys, err := t.logsTblStatementToFieldKeys(ctx)
	if err != nil {
		return nil, false, err
	}
	mapOfKeys := make(map[string]*telemetrytypes.TelemetryFieldKey)
	for _, key := range matKeys {
		mapOfKeys[key.Name+";"+key.FieldContext.StringValue()+";"+key.FieldDataType.StringValue()] = key
	}

	// queries for both attribute and resource keys tables
	var queries []string
	var allArgs []any

	// tables to query based on field selectors
	queryAttributeTable := false
	queryResourceTable := false
	queryBodyTable := false

	for _, selector := range fieldKeySelectors {
		if selector.FieldContext == telemetrytypes.FieldContextUnspecified {
			// unspecified context, query all tables
			queryAttributeTable = true
			queryResourceTable = true
			queryBodyTable = true
			break
		} else if selector.FieldContext == telemetrytypes.FieldContextAttribute {
			queryAttributeTable = true
		} else if selector.FieldContext == telemetrytypes.FieldContextResource {
			queryResourceTable = true
		} else if selector.FieldContext == telemetrytypes.FieldContextBody {
			queryBodyTable = true
		}
	}

	// body keys are gated behind the feature flag
	queryBodyTable = queryBodyTable && t.fl.BooleanOrEmpty(ctx, flagger.FeatureUseJSONBody, featuretypes.NewFlaggerEvaluationContext(orgID))

	// requestedFieldKeySelectors is the set of names the user explicitly asked for.
	// Used to ensure a name that is both a parent path AND a directly requested field still surfaces
	// in the result keys (e.g. "a.b[].c" is a parent of "a.b[].c[].d" but also a queried field).
	mapOfRequestedSelectors := make(map[string]bool)
	for _, sel := range fieldKeySelectors {
		if sel.SelectorMatchType == telemetrytypes.FieldSelectorMatchTypeExact {
			mapOfRequestedSelectors[sel.Name] = true
		}
	}

	// pre-compute parent array path names from body selectors for JSON plan building;
	// these will be fetched as a separate UNION arm filtered to ArrayJSON/ArrayDynamic only.
	parentPaths := make(map[string]bool)
	if queryBodyTable {
		for _, sel := range fieldKeySelectors {
			if sel.FieldContext != telemetrytypes.FieldContextBody &&
				sel.FieldContext != telemetrytypes.FieldContextUnspecified {
				continue
			}
			key := &telemetrytypes.TelemetryFieldKey{
				Name:         sel.Name,
				Signal:       telemetrytypes.SignalLogs,
				FieldContext: telemetrytypes.FieldContextBody,
			}
			if !key.KeyNameContainsArray() {
				continue
			}
			for _, parent := range key.ArrayParentPaths() {
				parentPaths[parent] = true
			}
		}
	}

	// attribute and resource tables share identical schema (name/datatype columns, lower-cased select,
	// TagDataType encoding) — only the table name and field context differ.
	addTagTableQuery := func(tblName string, fieldContext telemetrytypes.FieldContext) {
		sb := sqlbuilder.Select(
			"name AS tag_key",
			fmt.Sprintf("'%s' AS tag_type", fieldContext.TagType()),
			"lower(datatype) AS tag_data_type", // logs had historical mixed-case data
			fmt.Sprintf("%d AS priority", resolvercore.PriorityForContext(fieldContext)),
		).From(tblName)

		conds := []string{}
		for _, sel := range fieldKeySelectors {
			// Include this selector if:
			// 1. It has unspecified context (matches all tables)
			// 2. Its context matches the current table's context
			if sel.FieldContext != telemetrytypes.FieldContextUnspecified && sel.FieldContext != fieldContext {
				continue
			}
			fieldKeyConds := []string{}
			if sel.SelectorMatchType == telemetrytypes.FieldSelectorMatchTypeExact {
				fieldKeyConds = append(fieldKeyConds, sb.E("name", sel.Name))
			} else {
				fieldKeyConds = append(fieldKeyConds, sb.ILike("name", "%"+clickhousesql.LikePattern(sel.Name)+"%"))
			}
			if sel.FieldDataType != telemetrytypes.FieldDataTypeUnspecified {
				fieldKeyConds = append(fieldKeyConds, sb.E("datatype", sel.FieldDataType.TagDataType()))
			}
			if len(fieldKeyConds) > 0 {
				conds = append(conds, sb.And(fieldKeyConds...))
			}
		}
		if len(conds) > 0 {
			sb.Where(sb.Or(conds...))
		}
		sb.GroupBy("name", "datatype")
		query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
		queries = append(queries, query)
		allArgs = append(allArgs, args...)
	}

	if queryAttributeTable {
		addTagTableQuery(t.logsDBName+"."+t.logAttributeKeysTblName, telemetrytypes.FieldContextAttribute)
	}
	if queryResourceTable {
		addTagTableQuery(t.logsDBName+"."+t.logResourceKeysTblName, telemetrytypes.FieldContextResource)
	}

	// body context uses a different table/schema (field_name, field_data_type) and requires
	// signal+context base filters. It also fetches parent array container types (ArrayJSON/ArrayDynamic)
	// needed for JSON access plan building.
	if queryBodyTable {
		sb := sqlbuilder.Select(
			"field_name AS tag_key",
			fmt.Sprintf("'%s' AS tag_type", telemetrytypes.FieldContextBody.TagType()),
			"field_data_type AS tag_data_type",
			fmt.Sprintf("%d AS priority", resolvercore.PriorityForContext(telemetrytypes.FieldContextBody)),
		).From(fmt.Sprintf("%s.%s", DBName, FieldKeysTable))

		sb.Where(sb.E("signal", telemetrytypes.SignalLogs.StringValue()))
		sb.Where(sb.E("field_context", telemetrytypes.FieldContextBody.StringValue()))

		branches := []string{}
		for _, sel := range fieldKeySelectors {
			if sel.FieldContext != telemetrytypes.FieldContextUnspecified && sel.FieldContext != telemetrytypes.FieldContextBody {
				continue
			}
			fieldKeyConds := []string{}
			if sel.SelectorMatchType == telemetrytypes.FieldSelectorMatchTypeExact {
				fieldKeyConds = append(fieldKeyConds, sb.E("field_name", sel.Name))
			} else {
				fieldKeyConds = append(fieldKeyConds, sb.ILike("field_name", "%"+clickhousesql.LikePattern(sel.Name)+"%"))
			}
			if sel.FieldDataType != telemetrytypes.FieldDataTypeUnspecified {
				fieldKeyConds = append(fieldKeyConds, sb.E("field_data_type", sel.FieldDataType.StringValue()))
			}
			if len(fieldKeyConds) > 0 {
				branches = append(branches, sb.And(fieldKeyConds...))
			}
		}
		if len(parentPaths) > 0 {
			names := make([]any, 0, len(parentPaths))
			for n := range parentPaths {
				names = append(names, n)
			}
			branches = append(branches, sb.And(
				sb.In("field_name", names...),
				sb.In("field_data_type",
					telemetrytypes.FieldDataTypeArrayDynamic.StringValue(),
					telemetrytypes.FieldDataTypeArrayJSON.StringValue(),
				),
			))
		}
		if len(branches) > 0 {
			sb.Where(sb.Or(branches...))
		}
		sb.GroupBy("field_name", "field_data_type")
		query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
		queries = append(queries, query)
		allArgs = append(allArgs, args...)
	}

	var limit int
	for _, fieldKeySelector := range fieldKeySelectors {
		limit += fieldKeySelector.Limit
	}
	if limit == 0 {
		limit = 1000
	}

	keys := []*telemetrytypes.TelemetryFieldKey{}
	parentTypes := make(map[string][]telemetrytypes.FieldDataType)
	rowCount := 0

	// the log and scope contexts have no keys table; they are served by the
	// static fields appended below
	if len(queries) > 0 {
		// Combine queries with UNION ALL
		mainQuery := fmt.Sprintf(`
		SELECT tag_key, tag_type, tag_data_type, max(priority) as priority
		FROM (
			%s
		) AS combined_results
		GROUP BY tag_key, tag_type, tag_data_type
		ORDER BY priority
		LIMIT %d
	`, strings.Join(queries, " UNION ALL "), limit+1)

		rows, err := t.telemetrystore.ClickhouseDB().Query(ctx, mainQuery, allArgs...)
		if err != nil {
			return nil, false, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetLogsKeys.Error())
		}
		defer rows.Close()

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
				return nil, false, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetLogsKeys.Error())
			}

			// ArrayJSON/ArrayDynamic body rows for parent paths are needed by the JSON access plan
			// builder (enrichJSONKeys). Always record them in parentTypes. Only skip adding to keys
			// if the user did not also directly request this name — a field like "education" can be
			// both a parent of "education[].name" and an explicitly queried field in its own right.
			switch fieldDataType {
			case telemetrytypes.FieldDataTypeArrayJSON, telemetrytypes.FieldDataTypeArrayDynamic:
				if fieldContext == telemetrytypes.FieldContextBody && parentPaths[name] {
					parentTypes[name] = append(parentTypes[name], fieldDataType)
					if !mapOfRequestedSelectors[name] {
						continue // skip; don't register the key.
					}
				}
			}

			key, ok := mapOfKeys[name+";"+fieldContext.StringValue()+";"+fieldDataType.StringValue()]

			// if there is no materialised column, create a key with the field context and data type
			if !ok {
				key = &telemetrytypes.TelemetryFieldKey{
					Name:          name,
					Signal:        telemetrytypes.SignalLogs,
					FieldContext:  fieldContext,
					FieldDataType: fieldDataType,
				}
			}

			keys = append(keys, key)
			mapOfKeys[name+";"+fieldContext.StringValue()+";"+fieldDataType.StringValue()] = key
		}

		if rows.Err() != nil {
			return nil, false, errors.Wrap(rows.Err(), errors.TypeInternal, errors.CodeInternal, ErrFailedToGetLogsKeys.Error())
		}
	}

	// hit the limit? (only counting DB results)
	complete := rowCount <= limit

	// Add the matching intrinsic columns. These don't count towards the limit
	for _, field := range maps.Values(logstelemetryschema.IntrinsicFields) {
		if !resolvercore.StaticFieldMatchesAny(field, fieldKeySelectors) {
			continue
		}
		if _, added := mapOfKeys[field.Name+";"+field.FieldContext.StringValue()+";"+field.FieldDataType.StringValue()]; added {
			continue
		}
		keys = append(keys, &field)
	}

	// enrich body keys with promoted paths, indexes, and JSON access plans
	if t.fl.BooleanOrEmpty(ctx, flagger.FeatureUseJSONBody, featuretypes.NewFlaggerEvaluationContext(orgID)) {
		if err := t.enrichJSONKeys(ctx, fieldKeySelectors, keys, parentTypes); err != nil {
			return nil, false, err
		}
	}

	if err := t.updateColumnEvolutionMetadataForKeys(ctx, keys); err != nil {
		return nil, false, err
	}

	return keys, complete, nil
}

func (t *telemetryMetaStore) getLogFieldValues(ctx context.Context, orgID valuer.UUID, fieldValueSelector *telemetrytypes.FieldValueSelector) (*telemetrytypes.TelemetryFieldValues, bool, error) {
	ctx = ctxtypes.NewContextWithCommentVals(ctx, map[string]string{
		instrumentationtypes.TelemetrySignal:  telemetrytypes.SignalLogs.StringValue(),
		instrumentationtypes.CodeNamespace:    "metadata",
		instrumentationtypes.CodeFunctionName: "getLogFieldValues",
	})

	knownBool := resolvercore.IsKnownBoolField(fieldValueSelector, logstelemetryschema.IntrinsicFields)
	names := resolvercore.FamilyValueNames(ctx, orgID, t.fl, telemetrytypes.SignalLogs, fieldValueSelector)
	// unix_milli is the hour the log was ingested, not the log's own timestamp
	return resolvercore.TagTableValues(ctx, t.telemetrystore, t.logsDBName+"."+t.logsFieldsTblName, fieldValueSelector, names, knownBool)
}

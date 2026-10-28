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
	"github.com/SigNoz/signoz/pkg/telemetryschema/audittelemetryschema"
	"github.com/SigNoz/signoz/pkg/types/ctxtypes"
	"github.com/SigNoz/signoz/pkg/types/instrumentationtypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

func (t *telemetryMetaStore) auditTblStatementToFieldKeys(ctx context.Context) ([]*telemetrytypes.TelemetryFieldKey, error) {
	ctx = ctxtypes.NewContextWithCommentVals(ctx, map[string]string{
		instrumentationtypes.TelemetrySignal:  telemetrytypes.SignalLogs.StringValue(),
		instrumentationtypes.CodeNamespace:    "metadata",
		instrumentationtypes.CodeFunctionName: "auditTblStatementToFieldKeys",
	})

	query := fmt.Sprintf("SHOW CREATE TABLE %s.%s", t.auditDBName, t.auditLogsTblName)
	statements := []telemetrytypes.ShowCreateTableStatement{}
	err := t.telemetrystore.ClickhouseDB().Select(ctx, &statements, query)
	if err != nil {
		return nil, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetTblStatement.Error())
	}

	materialisedKeys, err := parser.ExtractFieldKeysFromTblStatement(statements[0].Statement)
	if err != nil {
		return nil, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetAuditKeys.Error())
	}

	for idx := range materialisedKeys {
		materialisedKeys[idx].Signal = telemetrytypes.SignalLogs
	}

	return materialisedKeys, nil
}

func (t *telemetryMetaStore) getAuditKeys(ctx context.Context, fieldKeySelectors []*telemetrytypes.FieldKeySelector) ([]*telemetrytypes.TelemetryFieldKey, bool, error) {
	ctx = ctxtypes.NewContextWithCommentVals(ctx, map[string]string{
		instrumentationtypes.TelemetrySignal:  telemetrytypes.SignalLogs.StringValue(),
		instrumentationtypes.CodeNamespace:    "metadata",
		instrumentationtypes.CodeFunctionName: "getAuditKeys",
	})

	if len(fieldKeySelectors) == 0 {
		return nil, true, nil
	}

	matKeys, err := t.auditTblStatementToFieldKeys(ctx)
	if err != nil {
		return nil, false, err
	}
	mapOfKeys := make(map[string]*telemetrytypes.TelemetryFieldKey)
	for _, key := range matKeys {
		mapOfKeys[key.Name+";"+key.FieldContext.StringValue()+";"+key.FieldDataType.StringValue()] = key
	}

	var queries []string
	var allArgs []any

	queryAttributeTable := false
	queryResourceTable := false

	for _, selector := range fieldKeySelectors {
		if selector.FieldContext == telemetrytypes.FieldContextUnspecified {
			queryAttributeTable = true
			queryResourceTable = true
			break
		} else if selector.FieldContext == telemetrytypes.FieldContextAttribute {
			queryAttributeTable = true
		} else if selector.FieldContext == telemetrytypes.FieldContextResource {
			queryResourceTable = true
		}
	}

	tablesToQuery := []struct {
		fieldContext telemetrytypes.FieldContext
		shouldQuery  bool
		tblName      string
	}{
		{telemetrytypes.FieldContextAttribute, queryAttributeTable, t.auditDBName + "." + t.auditAttributeKeysTblName},
		{telemetrytypes.FieldContextResource, queryResourceTable, t.auditDBName + "." + t.auditResourceKeysTblName},
	}

	for _, table := range tablesToQuery {
		if !table.shouldQuery {
			continue
		}

		fieldContext := table.fieldContext
		tblName := table.tblName

		sb := sqlbuilder.Select(
			"name AS tag_key",
			fmt.Sprintf("'%s' AS tag_type", fieldContext.TagType()),
			"lower(datatype) AS tag_data_type",
			fmt.Sprintf("%d AS priority", getPriorityForContext(fieldContext)),
		).From(tblName)

		var limit int
		conds := []string{}

		for _, fieldKeySelector := range fieldKeySelectors {
			if fieldKeySelector.FieldContext != telemetrytypes.FieldContextUnspecified && fieldKeySelector.FieldContext != fieldContext {
				continue
			}

			fieldKeyConds := []string{}
			if fieldKeySelector.SelectorMatchType == telemetrytypes.FieldSelectorMatchTypeExact {
				fieldKeyConds = append(fieldKeyConds, sb.E("name", fieldKeySelector.Name))
			} else {
				fieldKeyConds = append(fieldKeyConds, sb.ILike("name", "%"+clickhousesql.LikePattern(fieldKeySelector.Name)+"%"))
			}

			if fieldKeySelector.FieldDataType != telemetrytypes.FieldDataTypeUnspecified {
				fieldKeyConds = append(fieldKeyConds, sb.E("datatype", fieldKeySelector.FieldDataType.TagDataType()))
			}

			if len(fieldKeyConds) > 0 {
				conds = append(conds, sb.And(fieldKeyConds...))
			}
			limit += fieldKeySelector.Limit
		}

		if len(conds) > 0 {
			sb.Where(sb.Or(conds...))
		}

		sb.GroupBy("name", "datatype")
		if limit == 0 {
			limit = 1000
		}

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
	rowCount := 0

	// the log and scope contexts have no keys table; they are served by the
	// static fields appended below
	if len(queries) > 0 {
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
			return nil, false, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetAuditKeys.Error())
		}
		defer rows.Close()

		for rows.Next() {
			rowCount++
			if rowCount > limit {
				break
			}

			var name string
			var fieldContext telemetrytypes.FieldContext
			var fieldDataType telemetrytypes.FieldDataType
			var priority uint8
			err = rows.Scan(&name, &fieldContext, &fieldDataType, &priority)
			if err != nil {
				return nil, false, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetAuditKeys.Error())
			}
			key, ok := mapOfKeys[name+";"+fieldContext.StringValue()+";"+fieldDataType.StringValue()]

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
			return nil, false, errors.Wrap(rows.Err(), errors.TypeInternal, errors.CodeInternal, ErrFailedToGetAuditKeys.Error())
		}
	}

	complete := rowCount <= limit

	// Add the matching intrinsic audit fields (same as logs intrinsics: body, severity_text, etc.)
	for _, field := range maps.Values(audittelemetryschema.IntrinsicFields) {
		if !resolvercore.StaticFieldMatchesAny(field, fieldKeySelectors) {
			continue
		}
		if _, added := mapOfKeys[field.Name+";"+field.FieldContext.StringValue()+";"+field.FieldDataType.StringValue()]; added {
			continue
		}
		keys = append(keys, &field)
	}

	return keys, complete, nil
}

func (t *telemetryMetaStore) getAuditFieldValues(ctx context.Context, fieldValueSelector *telemetrytypes.FieldValueSelector) (*telemetrytypes.TelemetryFieldValues, bool, error) {
	ctx = ctxtypes.NewContextWithCommentVals(ctx, map[string]string{
		instrumentationtypes.TelemetrySignal:  telemetrytypes.SignalLogs.StringValue(),
		instrumentationtypes.CodeNamespace:    "metadata",
		instrumentationtypes.CodeFunctionName: "getAuditFieldValues",
	})

	limit := fieldValueSelector.Limit
	if limit == 0 {
		limit = 50
	}

	sb := sqlbuilder.Select("DISTINCT string_value, number_value").From(t.auditDBName + "." + t.auditFieldsTblName)

	if fieldValueSelector.Name != "" {
		sb.Where(sb.E("tag_key", fieldValueSelector.Name))
	}

	if fieldValueSelector.FieldContext != telemetrytypes.FieldContextUnspecified {
		sb.Where(sb.E("tag_type", fieldValueSelector.FieldContext.TagType()))
	}

	if fieldValueSelector.FieldDataType != telemetrytypes.FieldDataTypeUnspecified {
		sb.Where(sb.E("tag_data_type", fieldValueSelector.FieldDataType.TagDataType()))
	}

	if fieldValueSelector.Value != "" {
		switch fieldValueSelector.FieldDataType {
		case telemetrytypes.FieldDataTypeString:
			sb.Where(sb.ILike("string_value", "%"+clickhousesql.LikePattern(fieldValueSelector.Value)+"%"))
		case telemetrytypes.FieldDataTypeNumber:
			sb.Where(sb.IsNotNull("number_value"))
			sb.Where(sb.ILike("toString(number_value)", "%"+clickhousesql.LikePattern(fieldValueSelector.Value)+"%"))
		case telemetrytypes.FieldDataTypeUnspecified:
			sb.Where(sb.Or(
				sb.ILike("string_value", "%"+clickhousesql.LikePattern(fieldValueSelector.Value)+"%"),
				sb.ILike("toString(number_value)", "%"+clickhousesql.LikePattern(fieldValueSelector.Value)+"%"),
			))
		}
	}

	// fetch one extra row to detect whether the result set is complete
	sb.Limit(limit + 1)

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	rows, err := t.telemetrystore.ClickhouseDB().Query(ctx, query, args...)
	if err != nil {
		return nil, false, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetAuditKeys.Error())
	}
	defer rows.Close()

	values := &telemetrytypes.TelemetryFieldValues{}
	seen := make(map[string]bool)
	rowCount := 0
	totalCount := 0

	for rows.Next() {
		rowCount++

		var stringValue string
		var numberValue float64
		err = rows.Scan(&stringValue, &numberValue)
		if err != nil {
			return nil, false, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, ErrFailedToGetAuditKeys.Error())
		}
		if stringValue != "" && !seen[stringValue] {
			if totalCount >= limit {
				break
			}
			values.StringValues = append(values.StringValues, stringValue)
			seen[stringValue] = true
			totalCount++
		}
		if numberValue != 0 {
			if totalCount >= limit {
				break
			}
			if !seen[fmt.Sprintf("%f", numberValue)] {
				values.NumberValues = append(values.NumberValues, numberValue)
				seen[fmt.Sprintf("%f", numberValue)] = true
				totalCount++
			}
		}
	}

	complete := rowCount <= limit

	return values, complete, nil
}

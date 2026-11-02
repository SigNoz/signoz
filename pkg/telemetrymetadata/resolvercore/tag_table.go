package resolvercore

import (
	"context"
	"fmt"

	"github.com/huandu/go-sqlbuilder"

	"github.com/SigNoz/signoz/pkg/clickhousesql"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// errFailedToGetTagValues keeps the message the tag table lookups have always
// wrapped with, which names logs keys for every signal.
var errFailedToGetTagValues = errors.Newf(errors.TypeInternal, errors.CodeInternal, "failed to get logs keys")

// TagTableValues returns the string and number values of the key from a
// tag table, and true and false when the key is a known bool field or the
// table holds bool rows for it. Bool rows do not count towards the limit.
func TagTableValues(ctx context.Context, store telemetrystore.TelemetryStore, table string, fieldValueSelector *telemetrytypes.FieldValueSelector, names []string, knownBool bool) (*telemetrytypes.TelemetryFieldValues, bool, error) {
	limit := fieldValueSelector.Limit
	if limit == 0 {
		limit = 50
	}

	values := &telemetrytypes.TelemetryFieldValues{}
	if knownBool {
		values.BoolValues = boolFieldValues(fieldValueSelector.Value).BoolValues
		if fieldValueSelector.FieldDataType == telemetrytypes.FieldDataTypeBool {
			return values, true, nil
		}
	} else if fieldValueSelector.FieldDataType == telemetrytypes.FieldDataTypeUnspecified {
		hasBoolRows, err := tagTableHasBoolRows(ctx, store, table, fieldValueSelector, names)
		if err != nil {
			return nil, false, err
		}
		if hasBoolRows {
			values.BoolValues = boolFieldValues(fieldValueSelector.Value).BoolValues
		}
	}

	sb := sqlbuilder.Select("DISTINCT string_value, number_value").From(table)

	if fieldValueSelector.Name != "" {
		sb.Where(tagKeyCondition(sb, fieldValueSelector.Name, names))
	}
	sb.Where(sb.NE("tag_data_type", telemetrytypes.FieldDataTypeBool.TagDataType()))

	tagTableSinceDay(sb, fieldValueSelector.StartUnixMilli)

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
			// or b/w string and number
			sb.Where(sb.Or(
				sb.ILike("string_value", "%"+clickhousesql.LikePattern(fieldValueSelector.Value)+"%"),
				sb.ILike("toString(number_value)", "%"+clickhousesql.LikePattern(fieldValueSelector.Value)+"%"),
			))
		}
	}

	// query one extra to check if we hit the limit
	sb.Limit(limit + 1)

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	rows, err := store.ClickhouseDB().Query(ctx, query, args...)
	if err != nil {
		return nil, false, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, errFailedToGetTagValues.Error())
	}
	defer rows.Close()

	seen := make(map[string]bool)
	rowCount := 0
	totalCount := 0 // Track total unique values

	for rows.Next() {
		rowCount++

		var stringValue string
		var numberValue float64
		if err := rows.Scan(&stringValue, &numberValue); err != nil {
			return nil, false, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, errFailedToGetTagValues.Error())
		}

		// Only add values if we haven't hit the limit yet
		if totalCount < limit {
			if _, ok := seen[stringValue]; !ok && stringValue != "" {
				values.StringValues = append(values.StringValues, stringValue)
				seen[stringValue] = true
				totalCount++
			}
			if _, ok := seen[fmt.Sprintf("%f", numberValue)]; !ok && numberValue != 0 && totalCount < limit {
				values.NumberValues = append(values.NumberValues, numberValue)
				seen[fmt.Sprintf("%f", numberValue)] = true
				totalCount++
			}
		}
	}

	// hit the limit?
	complete := rowCount <= limit

	return values, complete, nil
}

// tagKeyCondition matches the requested key, or every spelling of its
// family when there is more than one.
func tagKeyCondition(sb *sqlbuilder.SelectBuilder, name string, names []string) string {
	if len(names) > 1 {
		return sb.In("tag_key", sqlbuilder.List(names))
	}
	return sb.E("tag_key", name)
}

// tagTableSinceDay restricts rows to the tag table's day partitions from the
// start's day on. Partitions are toDate(unix_milli / 1000) in the server's
// timezone, and a value's surviving row within a day carries whichever hour
// was inserted last, so the day is the finest safe unit.
func tagTableSinceDay(sb *sqlbuilder.SelectBuilder, startUnixMilli int64) {
	if startUnixMilli != 0 {
		sb.Where(fmt.Sprintf("toDate(unix_milli / 1000) >= toDate(%d)", startUnixMilli/1000))
	}
}

// tagTableHasBoolRows reports whether the tag table holds a bool row for the
// key. Bool rows carry no value, so one row is enough to know the key takes
// the values true and false.
func tagTableHasBoolRows(ctx context.Context, store telemetrystore.TelemetryStore, table string, selector *telemetrytypes.FieldValueSelector, names []string) (bool, error) {
	sb := sqlbuilder.Select("1").From(table)
	sb.Where(tagKeyCondition(sb, selector.Name, names))
	sb.Where(sb.E("tag_data_type", telemetrytypes.FieldDataTypeBool.TagDataType()))
	if selector.FieldContext != telemetrytypes.FieldContextUnspecified {
		sb.Where(sb.E("tag_type", selector.FieldContext.TagType()))
	}
	tagTableSinceDay(sb, selector.StartUnixMilli)
	sb.Limit(1)

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	rows, err := store.ClickhouseDB().Query(ctx, query, args...)
	if err != nil {
		return false, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, errFailedToGetTagValues.Error())
	}
	defer rows.Close()
	return rows.Next(), rows.Err()
}

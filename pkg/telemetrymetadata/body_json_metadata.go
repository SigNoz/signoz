package telemetrymetadata

import (
	"context"
	"fmt"
	"reflect"
	"strings"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/chcol"
	schemamigrator "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	"github.com/SigNoz/signoz-otel-collector/constants"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/telemetrylogs"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
)

var (
	defaultPathLimit = 10000 // Default limit to prevent full table scans

	CodeUnknownJSONDataType     = errors.MustNewCode("unknown_json_data_type")
	CodeFailLoadPromotedPaths   = errors.MustNewCode("fail_load_promoted_paths")
	CodeFailCheckPathPromoted   = errors.MustNewCode("fail_check_path_promoted")
	CodeFailIterateBodyJSONKeys = errors.MustNewCode("fail_iterate_body_json_keys")
	CodeFailExtractBodyJSONKeys = errors.MustNewCode("fail_extract_body_json_keys")
	CodeFailLoadLogsJSONIndexes = errors.MustNewCode("fail_load_logs_json_indexes")
	CodeFailListJSONValues      = errors.MustNewCode("fail_list_json_values")
	CodeFailScanJSONValue       = errors.MustNewCode("fail_scan_json_value")
	CodeFailScanVariant         = errors.MustNewCode("fail_scan_variant")
)

// GetBodyJSONPaths extracts body JSON paths from the path_types table
// This function can be used by both JSONQueryBuilder and metadata extraction
// uniquePathLimit: 0 for no limit, >0 for maximum number of unique paths to return
//   - For startup load: set to 10000 to get top 10k unique paths
//   - For lookup: set to 0 (no limit needed for single path)
//   - For metadata API: set to desired pagination limit
//
// searchOperator: LIKE for pattern matching, EQUAL for exact match
// Returns: (paths, error)
func getBodyJSONPaths(ctx context.Context, telemetryStore telemetrystore.TelemetryStore,
	fieldKeySelectors []*telemetrytypes.FieldKeySelector) ([]*telemetrytypes.TelemetryFieldKey, bool, error) {

	query, limit, args := buildGetBodyJSONPathsQuery(fieldKeySelectors)
	rows, err := telemetryStore.ClickhouseDB().Query(ctx, query, args...)
	if err != nil {
		return nil, false, errors.WrapInternalf(err, CodeFailExtractBodyJSONKeys, "failed to extract body JSON keys")
	}
	defer rows.Close()

	paths := []*telemetrytypes.TelemetryFieldKey{}
	rowCount := 0
	for rows.Next() {
		var path string
		var typesArray []string // ClickHouse returns array as []string
		var lastSeen uint64

		err = rows.Scan(&path, &typesArray, &lastSeen)
		if err != nil {
			return nil, false, errors.WrapInternalf(err, CodeFailExtractBodyJSONKeys, "failed to scan body JSON key row")
		}

		promoted, err := IsPathPromoted(ctx, telemetryStore.ClickhouseDB(), path)
		if err != nil {
			return nil, false, err
		}

		for _, typ := range typesArray {
			mapping, found := telemetrytypes.MappingStringToJSONDataType[typ]
			if !found {
				return nil, false, errors.NewInternalf(CodeUnknownJSONDataType, "failed to map type string to JSON data type: %s", typ)
			}
			paths = append(paths, &telemetrytypes.TelemetryFieldKey{
				Name:          path,
				Signal:        telemetrytypes.SignalLogs,
				FieldContext:  telemetrytypes.FieldContextLog,
				FieldDataType: telemetrytypes.MappingJSONDataTypeToFieldDataType[mapping],
				JSONDataType:  &mapping,
				Materialized:  promoted,
			})
		}

		rowCount++
	}

	if rows.Err() != nil {
		return nil, false, errors.WrapInternalf(rows.Err(), CodeFailIterateBodyJSONKeys, "error iterating body JSON keys")
	}

	return paths, rowCount <= limit, nil
}

func buildGetBodyJSONPathsQuery(fieldKeySelectors []*telemetrytypes.FieldKeySelector) (string, int, []any) {
	from := fmt.Sprintf("%s.%s", DBName, PathTypesTableName)

	// Build a better query using GROUP BY to deduplicate at database level
	// This aggregates all types per path and gets the max last_seen, then applies LIMIT
	sb := sqlbuilder.Select(
		"path",
		"groupArray(DISTINCT type) AS types",
		"max(last_seen) AS last_seen",
	).From(from)

	limit := 0
	// Add search filter if provided
	orClauses := []string{}
	for _, fieldKeySelector := range fieldKeySelectors {
		// replace [*] with []
		fieldKeySelector.Name = strings.ReplaceAll(fieldKeySelector.Name, telemetrylogs.ArrayAnyIndex, telemetrylogs.ArraySep)
		// Extract search text for body JSON keys
		keyName := CleanPathPrefixes(fieldKeySelector.Name)
		if fieldKeySelector.SelectorMatchType == telemetrytypes.FieldSelectorMatchTypeExact {
			orClauses = append(orClauses, sb.Equal("path", keyName))
		} else {
			// Pattern matching for metadata API (defaults to LIKE behavior for other operators)
			orClauses = append(orClauses, sb.Like("path", querybuilder.FormatValueForContains(keyName)))
			limit += fieldKeySelector.Limit
		}
	}
	sb.Where(sb.Or(orClauses...))

	// Group by path to get unique paths with aggregated types
	sb.GroupBy("path")

	// Order by max last_seen to get most recent paths first
	sb.OrderBy("last_seen DESC")
	sb.Limit(limit)

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	return query, limit, args
}

func listLogsIndexesClean(ctx context.Context, cluster string, conn clickhouse.Conn) ([]string, error) {
	indexes, err := ListLogsJSONIndexes(ctx, cluster, conn)
	if err != nil {
		return nil, err
	}

	cleanIndexes := []string{}
	for _, index := range indexes {
		if !strings.HasPrefix(index.Expression, telemetrylogs.BodyJSONColumnPrefix) && !strings.HasPrefix(index.Expression, telemetrylogs.BodyPromotedColumnPrefix) {
			continue
		}

		expr, err := schemamigrator.UnfoldJSONSubColumnIndexExpr(index.Expression)
		if err != nil {
			return nil, errors.WrapInternalf(err, CodeFailLoadLogsJSONIndexes, "failed to unfold JSON sub column index expression: %s", index.Expression)
		}

		expr = strings.TrimPrefix(expr, telemetrylogs.BodyJSONColumnPrefix)
		expr = strings.TrimPrefix(expr, telemetrylogs.BodyPromotedColumnPrefix)

		cleanIndexes = append(cleanIndexes, expr)
	}

	return cleanIndexes, nil
}

func ListLogsJSONIndexes(ctx context.Context, cluster string, conn clickhouse.Conn) ([]schemamigrator.Index, error) {
	query := fmt.Sprintf(`SELECT name, type_full, expr, granularity FROM 
	clusterAllReplicas('%s', %s) 
	WHERE database = '%s' AND table = '%s'
	AND (expr LIKE '%%%s%%' OR expr LIKE '%%%s%%')`,
		cluster, SkipIndexTableName, telemetrylogs.DBName, telemetrylogs.LogsV2LocalTableName, constants.BodyJSONColumnPrefix, constants.BodyPromotedColumnPrefix)
	rows, err := conn.Query(ctx, query)
	if err != nil {
		return nil, errors.WrapInternalf(err, CodeFailLoadLogsJSONIndexes, "failed to load string indexed columns")
	}
	defer rows.Close()

	indexes := []schemamigrator.Index{}
	for rows.Next() {
		var name string
		var typeFull string
		var expr string
		var granularity uint64
		if err := rows.Scan(&name, &typeFull, &expr, &granularity); err != nil {
			return nil, errors.WrapInternalf(err, CodeFailLoadLogsJSONIndexes, "failed to scan string indexed column")
		}
		indexes = append(indexes, schemamigrator.Index{
			Name:        name,
			Type:        typeFull,
			Expression:  expr,
			Granularity: int(granularity),
		})
	}

	return indexes, nil
}

func ListPromotedPaths(ctx context.Context, conn clickhouse.Conn) (map[string]struct{}, error) {
	query := fmt.Sprintf("SELECT path FROM %s.%s", DBName, PromotedPathsTableName)
	rows, err := conn.Query(ctx, query)
	if err != nil {
		return nil, errors.WrapInternalf(err, CodeFailLoadPromotedPaths, "failed to load promoted paths")
	}
	defer rows.Close()

	next := make(map[string]struct{})
	for rows.Next() {
		var path string
		if err := rows.Scan(&path); err != nil {
			return nil, errors.WrapInternalf(err, CodeFailLoadPromotedPaths, "failed to scan promoted path")
		}
		next[path] = struct{}{}
	}

	return next, nil
}

func ListJSONValues(ctx context.Context, conn clickhouse.Conn, path string, limit int) (*telemetrytypes.TelemetryFieldValues, bool, error) {
	path = CleanPathPrefixes(path)

	if strings.Contains(path, telemetrylogs.ArraySep) || strings.Contains(path, telemetrylogs.ArrayAnyIndex) {
		return nil, false, errors.NewInvalidInputf(errors.CodeInvalidInput, "array paths are not supported")
	}

	promoted, err := IsPathPromoted(ctx, conn, path)
	if err != nil {
		return nil, false, err
	}

	if promoted {
		path = telemetrylogs.BodyPromotedColumnPrefix + path
	} else {
		path = telemetrylogs.BodyJSONColumnPrefix + path
	}

	from := fmt.Sprintf("%s.%s", telemetrylogs.DBName, telemetrylogs.LogsV2TableName)
	colExpr := func(typ telemetrytypes.JSONDataType) string {
		return fmt.Sprintf("dynamicElement(%s, '%s')", path, typ.StringValue())
	}

	sb := sqlbuilder.Select(
		colExpr(telemetrytypes.String),
		colExpr(telemetrytypes.Int64),
		colExpr(telemetrytypes.Float64),
		colExpr(telemetrytypes.Bool),
		colExpr(telemetrytypes.ArrayString),
		colExpr(telemetrytypes.ArrayInt64),
		colExpr(telemetrytypes.ArrayFloat64),
		colExpr(telemetrytypes.ArrayBool),
		colExpr(telemetrytypes.ArrayDynamic),
	).From(from)
	sb.Where(fmt.Sprintf("%s IS NOT NULL", path))
	sb.Limit(limit)

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	rows, err := conn.Query(ctx, query, args...)
	if err != nil {
		return nil, false, errors.WrapInternalf(err, CodeFailListJSONValues, "failed to list JSON values")
	}
	defer rows.Close()

	// Get column types to determine proper scan types
	colTypes := rows.ColumnTypes()
	scanTargets := make([]any, len(colTypes))
	for i := range colTypes {
		scanTargets[i] = reflect.New(colTypes[i].ScanType()).Interface()
	}

	values := &telemetrytypes.TelemetryFieldValues{}
	for rows.Next() {
		// Create fresh scan targets for each row
		scan := make([]any, len(colTypes))
		for i := range colTypes {
			scan[i] = reflect.New(colTypes[i].ScanType()).Interface()
		}

		if err := rows.Scan(scan...); err != nil {
			return nil, false, errors.WrapInternalf(err, CodeFailListJSONValues, "failed to scan JSON value row")
		}

		// Extract values from scan targets and process them
		// Column order: String, Int64, Float64, Bool, ArrayString, ArrayInt64, ArrayFloat64, ArrayBool, ArrayDynamic
		var consume func(scan []any) error
		consume = func(scan []any) error {
			for _, value := range scan {
				value := derefValue(value) // dereference the double pointer if it is a pointer
				switch value := value.(type) {
				case string:
					values.StringValues = append(values.StringValues, value)
				case int64:
					values.NumberValues = append(values.NumberValues, float64(value))
				case float64:
					values.NumberValues = append(values.NumberValues, value)
				case bool:
					values.BoolValues = append(values.BoolValues, value)
				case []*string:
					for _, str := range value {
						values.StringValues = append(values.StringValues, *str)
					}
				case []*int64:
					for _, num := range value {
						values.NumberValues = append(values.NumberValues, float64(*num))
					}
				case []*float64:
					for _, num := range value {
						values.NumberValues = append(values.NumberValues, float64(*num))
					}
				case []*bool:
					for _, boolVal := range value {
						values.BoolValues = append(values.BoolValues, *boolVal)
					}
				case chcol.Variant:
					if !value.Nil() {
						if err := consume([]any{value.Any()}); err != nil {
							return err
						}
					}
				case []chcol.Variant:
					extractedValues := make([]any, len(value))
					for _, variant := range value {
						if !variant.Nil() && variant.Type() != "JSON" { // skip JSON values cuz they're relevant for nested keys
							extractedValues = append(extractedValues, variant.Any())
						}
					}
					if err := consume(extractedValues); err != nil {
						return err
					}
				default:
					if value == nil {
						continue
					}
					return errors.NewInternalf(CodeFailScanJSONValue, "unknown JSON value type: %T", value)
				}
			}

			return nil
		}
		if err := consume(scan); err != nil {
			return nil, false, err
		}
	}

	if err := rows.Err(); err != nil {
		return nil, false, errors.WrapInternalf(err, CodeFailListJSONValues, "error iterating JSON values")
	}

	return values, true, nil
}

func derefValue(v any) any {
	if v == nil {
		return nil
	}

	val := reflect.ValueOf(v)
	for val.Kind() == reflect.Ptr {
		if val.IsNil() {
			return nil
		}
		val = val.Elem()
	}

	return val.Interface()
}

// IsPathPromoted checks if a specific path is promoted
func IsPathPromoted(ctx context.Context, conn clickhouse.Conn, path string) (bool, error) {
	query := fmt.Sprintf("SELECT 1 FROM %s.%s WHERE path = ? LIMIT 1", DBName, PromotedPathsTableName)
	rows, err := conn.Query(ctx, query, path)
	if err != nil {
		return false, errors.WrapInternalf(err, CodeFailCheckPathPromoted, "failed to check if path %s is promoted", path)
	}
	defer rows.Close()

	return rows.Next(), nil
}

func CleanPathPrefixes(path string) string {
	path = strings.TrimPrefix(path, telemetrylogs.BodyJSONStringSearchPrefix)
	path = strings.TrimPrefix(path, telemetrylogs.BodyJSONColumnPrefix)
	path = strings.TrimPrefix(path, telemetrylogs.BodyPromotedColumnPrefix)
	return path
}

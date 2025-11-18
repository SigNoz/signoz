package telemetrylogs

import (
	"context"
	"fmt"

	"github.com/ClickHouse/clickhouse-go/v2"
	schemamigrator "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	"github.com/SigNoz/signoz-otel-collector/constants"
	"github.com/SigNoz/signoz-otel-collector/utils"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
)

var (
	defaultPathLimit = 10000 // Default limit to prevent full table scans

	CodeUnknownJSONDataType = errors.MustNewCode("unknown_json_data_type")
)

// ExtractBodyPaths extracts body JSON paths from the path_types table
// This function can be used by both JSONQueryBuilder and metadata extraction
// lastSeen: 0 for full sync, >0 for incremental sync (only records newer than lastSeen)
// uniquePathLimit: 0 for no limit, >0 for maximum number of unique paths to return
//   - For startup load: set to 10000 to get top 10k unique paths
//   - For lookup: set to 0 (no limit needed for single path)
//   - For metadata API: set to desired pagination limit
//
// searchOperator: LIKE for pattern matching, EQUAL for exact match
// Returns: (paths, error)
func ExtractBodyPaths(ctx context.Context, telemetryStore telemetrystore.TelemetryStore,
	searchTexts []string, uniquePathLimit int, operator qbtypes.FilterOperator) (map[string]*utils.ConcurrentSet[telemetrytypes.JSONDataType], error) {

	query, args := buildExtractBodyPathsQuery(searchTexts, uniquePathLimit, operator)
	rows, err := telemetryStore.ClickhouseDB().Query(ctx, query, args...)
	if err != nil {
		return nil, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, "failed to extract body JSON keys")
	}
	defer rows.Close()

	paths := map[string]*utils.ConcurrentSet[telemetrytypes.JSONDataType]{}

	for rows.Next() {
		var path string
		var typesArray []string // ClickHouse returns array as []string
		var lastSeen uint64

		err = rows.Scan(&path, &typesArray, &lastSeen)
		if err != nil {
			return nil, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, "failed to scan body JSON key row")
		}

		set := utils.NewConcurrentSet[telemetrytypes.JSONDataType]()
		for _, typ := range typesArray {
			mapping, found := telemetrytypes.MappingStringToJSONDataType[typ]
			if !found {
				return nil, errors.New(errors.TypeInternal, CodeUnknownJSONDataType, fmt.Sprintf("failed to map type string to JSON data type: %s", typ))
			}
			set.Insert(mapping)
		}

		paths[path] = set
	}

	if rows.Err() != nil {
		return nil, errors.Wrap(rows.Err(), errors.TypeInternal, errors.CodeInternal, "error iterating body JSON keys")
	}

	return paths, nil
}

func buildExtractBodyPathsQuery(searchTexts []string, uniquePathLimit int, operator qbtypes.FilterOperator) (string, []any) {
	from := fmt.Sprintf("%s.%s", DBName, PathTypesTableName)

	// Build a better query using GROUP BY to deduplicate at database level
	// This aggregates all types per path and gets the max last_seen, then applies LIMIT
	sb := sqlbuilder.Select(
		"path",
		"groupArray(DISTINCT type) AS types",
		"max(last_seen) AS last_seen",
	).From(from)

	// Add search filter if provided
	if len(searchTexts) > 0 {
		orClauses := []string{}
		for _, searchText := range searchTexts {
			if operator == qbtypes.FilterOperatorEqual {
				// Exact match for lookup
				orClauses = append(orClauses, sb.E("path", searchText))
			} else {
				// Pattern matching for metadata API (defaults to LIKE behavior for other operators)
				orClauses = append(orClauses, sb.ILike("path", querybuilder.FormatValueForContains(searchText)))
			}
		}
		sb.Where(sb.Or(orClauses...))
	}

	// Group by path to get unique paths with aggregated types
	sb.GroupBy("path")

	// Order by max last_seen to get most recent paths first
	sb.OrderBy("max(last_seen) DESC")

	// Apply limit on unique paths (not rows)
	// Always set a default limit to prevent full table scans
	var pathLimit int
	if uniquePathLimit > 0 {
		pathLimit = uniquePathLimit
	} else {
		pathLimit = defaultPathLimit
	}
	sb.Limit(pathLimit)

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	return query, args
}

func ListIndexes(ctx context.Context, cluster string, conn clickhouse.Conn) ([]schemamigrator.Index, error) {
	query := fmt.Sprintf(`SELECT name, type_full, expr, granularity FROM 
	clusterAllReplicas('%s', %s) 
	WHERE database = '%s' AND table = '%s'
	AND (expr LIKE '%%%s%%' OR expr LIKE '%%%s%%')`,
		cluster, SkipIndexTableName, DBName, LogsV2LocalTableName, constants.BodyJSONColumnPrefix, constants.BodyPromotedColumnPrefix)
	rows, err := conn.Query(ctx, query)
	if err != nil {
		return nil, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, "failed to load string indexed columns")
	}
	defer rows.Close()

	indexes := []schemamigrator.Index{}
	for rows.Next() {
		var name string
		var typeFull string
		var expr string
		var granularity uint64
		if err := rows.Scan(&name, &typeFull, &expr, &granularity); err != nil {
			return nil, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, "failed to scan string indexed column")
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
		return nil, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, "failed to load promoted paths")
	}
	defer rows.Close()

	next := make(map[string]struct{})
	for rows.Next() {
		var path string
		if err := rows.Scan(&path); err != nil {
			return nil, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, "failed to scan promoted path")
		}
		next[path] = struct{}{}
	}

	return next, nil
}

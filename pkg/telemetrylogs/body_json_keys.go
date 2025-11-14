package telemetrylogs

import (
	"context"
	"fmt"

	schemamigrator "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	"github.com/SigNoz/signoz-otel-collector/constants"
	"github.com/SigNoz/signoz-otel-collector/utils"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
)

var CodeUnknownJSONDataType = errors.MustNewCode("unknown_json_data_type")

// ExtractBodyPaths extracts body JSON paths from the path_types table
// This function can be used by both JSONQueryBuilder and metadata extraction
// lastSeen: 0 for full sync, >0 for incremental sync (only records newer than lastSeen)
// limit: 0 for no limit (full sync), >0 for pagination (metadata API)
// Returns: (paths, complete, highestLastSeen, error)
func ExtractBodyPaths(ctx context.Context, telemetryStore telemetrystore.TelemetryStore,
	searchTexts []string, limit int, lastSeen uint64) (map[string]*utils.ConcurrentSet[telemetrytypes.JSONDataType], bool, uint64, error) {

	from := fmt.Sprintf("%s.%s", DBName, PathTypesTableName)
	// For full sync (lastSeen = 0), don't apply limit unless explicitly requested
	// For incremental sync or metadata API, use the provided limit
	applyLimit := limit > 0 || lastSeen > 0
	if !applyLimit {
		limit = 0 // No limit for full sync
		from = from + " FINAL"
	} else if limit == 0 {
		limit = 1000 // Default limit for incremental sync or metadata API
	}

	// Build the query to extract body JSON keys from path_types table
	sb := sqlbuilder.Select(
		"path",
		"type",
		"last_seen",
	).From(from)

	// Add search filter if provided
	if len(searchTexts) > 0 {
		orClauses := []string{}
		for _, searchText := range searchTexts {
			orClauses = append(orClauses, sb.ILike("path", querybuilder.FormatValueForContains(searchText)))
		}
		sb.Where(sb.Or(orClauses...))
	}

	// Add incremental sync filter if lastSeen > 0
	if lastSeen > 0 {
		sb.Where(sb.G("last_seen", lastSeen))
	}

	// Order by last_seen to get most recent keys first
	sb.OrderBy("last_seen DESC")

	// Only apply limit if we're doing pagination (not full sync)
	if applyLimit {
		// Query one extra to check if we hit the limit
		sb.Limit(limit + 1)
	}

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	rows, err := telemetryStore.ClickhouseDB().Query(ctx, query, args...)
	if err != nil {
		return nil, false, 0, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, "failed to extract body JSON keys")
	}
	defer rows.Close()

	paths := map[string]*utils.ConcurrentSet[telemetrytypes.JSONDataType]{}
	rowCount := 0
	var highestLastSeen uint64

	for rows.Next() {
		rowCount++
		// Check if we've reached the limit (only for pagination)
		if applyLimit && rowCount > limit {
			break
		}

		var path, typ string
		var rowLastSeen uint64
		err = rows.Scan(&path, &typ, &rowLastSeen)
		if err != nil {
			return nil, false, 0, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, "failed to scan body JSON key row")
		}

		// Track the highest lastSeen value
		if rowLastSeen > highestLastSeen {
			highestLastSeen = rowLastSeen
		}

		set, found := paths[path]
		if !found {
			set = utils.NewConcurrentSet[telemetrytypes.JSONDataType]()
			paths[path] = set
		}

		mapping, found := telemetrytypes.MappingStringToJSONDataType[typ]
		if !found {
			return nil, false, 0, errors.New(errors.TypeInternal, CodeUnknownJSONDataType, "failed to map type string to JSON data type")
		}

		set.Insert(mapping)
	}

	if rows.Err() != nil {
		return nil, false, 0, errors.Wrap(rows.Err(), errors.TypeInternal, errors.CodeInternal, "error iterating body JSON keys")
	}

	// Determine completeness
	var complete bool
	if applyLimit {
		// For pagination, check if we hit the limit
		complete = rowCount <= limit
	} else {
		// For full sync, we're always complete (no limit applied)
		complete = true
	}

	return paths, complete, highestLastSeen, nil
}

func ListIndexedPaths(ctx context.Context, telemetryStore telemetrystore.TelemetryStore) ([]string, error) {
	query := fmt.Sprintf(`SELECT type, expr FROM 
	clusterAllReplicas('%s', %s) 
	WHERE database = '%s' AND table = '%s' AND type = 'ngrambf_v1'
	AND (expr LIKE '%%%s%%' OR expr LIKE '%%%s%%')`,
		telemetryStore.Cluster(), SkipIndexTableName, DBName, LogsV2LocalTableName, constants.BodyJSONColumnPrefix, constants.BodyPromotedColumnPrefix)
	rows, err := telemetryStore.ClickhouseDB().Query(ctx, query)
	if err != nil {
		return nil, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, "failed to load string indexed columns")
	}
	defer rows.Close()

	paths := []string{}
	for rows.Next() {
		var typ string
		var expr string
		if err := rows.Scan(&typ, &expr); err != nil {
			return nil, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, "failed to scan string indexed column")
		}
		subColumn, err := schemamigrator.UnfoldJSONSubColumnIndexExpr(expr)
		if err != nil {
			return nil, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, fmt.Sprintf("failed to unfold JSON sub column index expression for %s", expr))
		}
		paths = append(paths, subColumn)
	}

	return paths, nil
}

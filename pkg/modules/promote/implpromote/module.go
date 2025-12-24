package implpromote

import (
	"context"
	"maps"
	"slices"
	"strings"

	schemamigrator "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/modules/promote"
	"github.com/SigNoz/signoz/pkg/telemetrylogs"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/promotetypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

var (
	CodeFailedToCreateIndex        = errors.MustNewCode("failed_to_create_index_promoted_paths")
	CodeFailedToQueryPromotedPaths = errors.MustNewCode("failed_to_query_promoted_paths")
)

type module struct {
	metadataStore  telemetrytypes.MetadataStore
	telemetryStore telemetrystore.TelemetryStore
}

func NewModule(metadataStore telemetrytypes.MetadataStore, telemetrystore telemetrystore.TelemetryStore) promote.Module {
	return &module{metadataStore: metadataStore, telemetryStore: telemetrystore}
}

func (m *module) ListPromotedAndIndexedPaths(ctx context.Context) ([]promotetypes.PromotePath, error) {
	logsIndexes, err := m.metadataStore.ListLogsJSONIndexes(ctx)
	if err != nil {
		return nil, err
	}
	// Flatten the map values (which are slices) into a single slice
	indexes := slices.Concat(slices.Collect(maps.Values(logsIndexes))...)

	aggr := map[string][]promotetypes.WrappedIndex{}
	for _, index := range indexes {
		path, columnType, err := schemamigrator.UnfoldJSONSubColumnIndexExpr(index.Expression)
		if err != nil {
			return nil, err
		}

		// clean backticks from the path
		path = strings.ReplaceAll(path, "`", "")

		aggr[path] = append(aggr[path], promotetypes.WrappedIndex{
			ColumnType:  columnType,
			Type:        index.Type,
			Granularity: index.Granularity,
		})
	}
	promotedPaths, err := m.listPromotedPaths(ctx)
	if err != nil {
		return nil, err
	}

	response := []promotetypes.PromotePath{}
	for _, path := range promotedPaths {
		fullPath := telemetrylogs.BodyPromotedColumnPrefix + path
		path = telemetrytypes.BodyJSONStringSearchPrefix + path
		item := promotetypes.PromotePath{
			Path:    path,
			Promote: true,
		}
		indexes, ok := aggr[fullPath]
		if ok {
			item.Indexes = indexes
			delete(aggr, fullPath)
		}
		response = append(response, item)
	}

	// add the paths that are not promoted but have indexes
	for path, indexes := range aggr {
		path := strings.TrimPrefix(path, telemetrylogs.BodyJSONColumnPrefix)
		path = telemetrytypes.BodyJSONStringSearchPrefix + path
		response = append(response, promotetypes.PromotePath{
			Path:    path,
			Indexes: indexes,
		})
	}
	return response, nil
}

func (m *module) listPromotedPaths(ctx context.Context) ([]string, error) {
	paths, err := m.metadataStore.ListPromotedPaths(ctx)
	if err != nil {
		return nil, err
	}
	return slices.Collect(maps.Keys(paths)), nil
}

// PromotePaths inserts provided JSON paths into the promoted paths table for logs queries.
func (m *module) PromotePaths(ctx context.Context, paths []string) error {
	if len(paths) == 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "paths cannot be empty")
	}

	return m.metadataStore.PromotePaths(ctx, paths...)
}

// createIndexes creates string ngram + token filter indexes on JSON path subcolumns for LIKE queries.
func (m *module) createIndexes(ctx context.Context, indexes []schemamigrator.Index) error {
	if len(indexes) == 0 {
		return nil
	}

	for _, index := range indexes {
		alterStmt := schemamigrator.AlterTableAddIndex{
			Database: telemetrylogs.DBName,
			Table:    telemetrylogs.LogsV2LocalTableName,
			Index:    index,
		}
		op := alterStmt.OnCluster(m.telemetryStore.Cluster())
		if err := m.telemetryStore.ClickhouseDB().Exec(ctx, op.ToSQL()); err != nil {
			return errors.WrapInternalf(err, CodeFailedToCreateIndex, "failed to create index")
		}
	}

	return nil
}

// PromoteAndIndexPaths handles promoting paths and creating indexes in one call.
func (m *module) PromoteAndIndexPaths(
	ctx context.Context,
	paths ...*promotetypes.PromotePath,
) error {
	if len(paths) == 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "paths cannot be empty")
	}

	pathsStr := []string{}
	// validate the paths
	for _, path := range paths {
		if err := path.ValidateAndSetDefaults(); err != nil {
			return err
		}
		pathsStr = append(pathsStr, path.Path)
	}

	existingPromotedPaths, err := m.metadataStore.ListPromotedPaths(ctx, pathsStr...)
	if err != nil {
		return err
	}

	var toInsert []string
	indexes := []schemamigrator.Index{}
	for _, it := range paths {
		if it.Promote {
			if _, promoted := existingPromotedPaths[it.Path]; !promoted {
				toInsert = append(toInsert, it.Path)
			}
		}
		if len(it.Indexes) > 0 {
			parentColumn := telemetrylogs.LogsV2BodyJSONColumn
			// if the path is already promoted or is being promoted, add it to the promoted column
			if _, promoted := existingPromotedPaths[it.Path]; promoted || it.Promote {
				parentColumn = telemetrylogs.LogsV2BodyPromotedColumn
			}

			for _, index := range it.Indexes {
				var typeIndex schemamigrator.IndexType
				switch {
				case strings.HasPrefix(index.Type, string(schemamigrator.IndexTypeNGramBF)):
					typeIndex = schemamigrator.IndexTypeNGramBF
				case strings.HasPrefix(index.Type, string(schemamigrator.IndexTypeTokenBF)):
					typeIndex = schemamigrator.IndexTypeTokenBF
				case strings.HasPrefix(index.Type, string(schemamigrator.IndexTypeMinMax)):
					typeIndex = schemamigrator.IndexTypeMinMax
				default:
					return errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid index type: %s", index.Type)
				}
				indexes = append(indexes, schemamigrator.Index{
					Name:        schemamigrator.JSONSubColumnIndexName(parentColumn, it.Path, index.JSONDataType.StringValue(), typeIndex),
					Expression:  schemamigrator.JSONSubColumnIndexExpr(parentColumn, it.Path, index.JSONDataType.StringValue()),
					Type:        index.Type,
					Granularity: index.Granularity,
				})
			}
		}
	}

	if len(toInsert) > 0 {
		err := m.PromotePaths(ctx, toInsert)
		if err != nil {
			return err
		}
	}

	if len(indexes) > 0 {
		if err := m.createIndexes(ctx, indexes); err != nil {
			return err
		}
	}

	return nil
}

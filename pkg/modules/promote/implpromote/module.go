package implpromote

import (
	"context"
	"fmt"
	"maps"
	"slices"
	"strings"
	"time"

	schemamigrator "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/modules/promote"
	"github.com/SigNoz/signoz/pkg/telemetrylogs"
	"github.com/SigNoz/signoz/pkg/telemetrymetadata"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/promotetypes"
)

var (
	CodeFailedToPrepareBatch       = errors.MustNewCode("failed_to_prepare_batch_promoted_paths")
	CodeFailedToSendBatch          = errors.MustNewCode("failed_to_send_batch_promoted_paths")
	CodeFailedToAppendPath         = errors.MustNewCode("failed_to_append_path_promoted_paths")
	CodeFailedToCreateIndex        = errors.MustNewCode("failed_to_create_index_promoted_paths")
	CodeFailedToQueryPromotedPaths = errors.MustNewCode("failed_to_query_promoted_paths")
)

type module struct {
	store telemetrystore.TelemetryStore
}

func NewModule(store telemetrystore.TelemetryStore) promote.Module {
	return &module{store: store}
}

func (m *module) ListBodySkipIndexes(ctx context.Context) ([]schemamigrator.Index, error) {
	indexes, err := telemetrymetadata.ListLogsJSONIndexes(ctx, m.store)
	if err != nil {
		return nil, err
	}
	// Flatten the map values (which are slices) into a single slice
	indexSlices := slices.Collect(maps.Values(indexes))
	return slices.Concat(indexSlices...), nil
}

func (m *module) ListPromotedPaths(ctx context.Context) ([]string, error) {
	paths, err := telemetrymetadata.ListPromotedPaths(ctx, m.store.ClickhouseDB())
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

	batch, err := m.store.ClickhouseDB().PrepareBatch(ctx,
		fmt.Sprintf("INSERT INTO %s.%s (path, created_at) VALUES", telemetrymetadata.DBName,
			telemetrymetadata.PromotedPathsTableName))
	if err != nil {
		return errors.WrapInternalf(err, CodeFailedToPrepareBatch, "failed to prepare batch")
	}

	nowMs := uint64(time.Now().UnixMilli())
	for _, p := range paths {
		trimmed := strings.TrimSpace(p)
		if trimmed == "" {
			continue
		}
		if err := batch.Append(trimmed, nowMs); err != nil {
			_ = batch.Abort()
			return errors.WrapInternalf(err, CodeFailedToAppendPath, "failed to append path")
		}
	}

	if err := batch.Send(); err != nil {
		return errors.WrapInternalf(err, CodeFailedToSendBatch, "failed to send batch")
	}
	return nil
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
		op := alterStmt.OnCluster(m.store.Cluster())
		if err := m.store.ClickhouseDB().Exec(ctx, op.ToSQL()); err != nil {
			return errors.WrapInternalf(err, CodeFailedToCreateIndex, "failed to create index")
		}
	}

	return nil
}

// PromoteAndIndexPaths handles promoting paths and creating indexes in one call.
func (m *module) PromoteAndIndexPaths(
	ctx context.Context,
	paths ...promotetypes.PromotePath,
) error {
	if len(paths) == 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "paths cannot be empty")
	}

	pathsStr := []string{}
	// validate the paths
	for _, path := range paths {
		if err := path.Validate(); err != nil {
			return err
		}
		pathsStr = append(pathsStr, path.Path)
	}

	existingPromotedPaths, err := telemetrymetadata.ListPromotedPaths(ctx, m.store.ClickhouseDB(), pathsStr...)
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
				typeIndex := schemamigrator.IndexTypeTokenBF
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

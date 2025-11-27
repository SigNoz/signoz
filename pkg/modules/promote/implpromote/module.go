package implpromote

import (
	"context"
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
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

type module struct {
	store telemetrystore.TelemetryStore
}

func NewModule(store telemetrystore.TelemetryStore) promote.Module {
	return &module{store: store}
}

func (m *module) ListBodySkipIndexes(ctx context.Context) ([]schemamigrator.Index, error) {
	return telemetrymetadata.ListLogsJSONIndexes(ctx, m.store.Cluster(), m.store.ClickhouseDB())
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

	// Table: signoz_logs.distributed_promoted_paths with columns: path, created_at (UInt64 epoch ms)
	batch, err := m.store.ClickhouseDB().PrepareBatch(ctx, "INSERT INTO signoz_logs.distributed_promoted_paths (path, created_at) VALUES")
	if err != nil {
		return errors.NewInternalf(errors.CodeInternal, "failed to prepare batch: %w", err)
	}

	nowMs := uint64(time.Now().UnixMilli())
	for _, p := range paths {
		trimmed := strings.TrimSpace(p)
		if trimmed == "" {
			continue
		}
		if err := batch.Append(trimmed, nowMs); err != nil {
			_ = batch.Abort()
			return errors.NewInternalf(errors.CodeInternal, "failed to append path: %w", err)
		}
	}

	if err := batch.Send(); err != nil {
		return errors.NewInternalf(errors.CodeInternal, "failed to send batch: %w", err)
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
			return errors.NewInternalf(errors.CodeInternal, "failed to create index: %s", err)
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

	// Load existing promoted paths once
	existingPromotedPaths := make(map[string]struct{})
	rows, qerr := m.store.ClickhouseDB().Query(ctx, "SELECT path FROM signoz_logs.distributed_promoted_paths")
	if qerr == nil {
		defer rows.Close()
		for rows.Next() {
			var p string
			if err := rows.Scan(&p); err == nil {
				existingPromotedPaths[p] = struct{}{}
			}
		}
	}

	var toInsert []string
	indexes := []schemamigrator.Index{}
	for _, it := range paths {
		if err := it.Validate(); err != nil {
			return err
		}
		// remove the "body." prefix from the path
		trimmedPath := strings.TrimPrefix(it.Path, telemetrytypes.BodyJSONStringSearchPrefix)
		if it.Promote {
			if _, promoted := existingPromotedPaths[trimmedPath]; !promoted {
				toInsert = append(toInsert, trimmedPath)
			}
		}
		if it.Index {
			parentColumn := telemetrylogs.LogsV2BodyJSONColumn
			// if the path is already promoted or is being promoted, add it to the promoted column
			if _, promoted := existingPromotedPaths[trimmedPath]; promoted || it.Promote {
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
					Name:        schemamigrator.JSONSubColumnIndexName(parentColumn, trimmedPath, index.JSONDataType.StringValue(), typeIndex),
					Expression:  schemamigrator.JSONSubColumnIndexExpr(parentColumn, trimmedPath, index.JSONDataType.StringValue()),
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

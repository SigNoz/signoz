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
	"github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/SigNoz/signoz/pkg/telemetrylogs"
	"github.com/SigNoz/signoz/pkg/telemetrymetadata"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type module struct {
	store telemetrystore.TelemetryStore
}

func NewModule(store telemetrystore.TelemetryStore) promote.Module {
	return &module{store: store}
}

func (m *module) Promote(ctx context.Context, orgID valuer.UUID, roleID valuer.UUID) error {
	return nil
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

// CreateJSONPathIndexes creates string ngram + token filter indexes on JSON path subcolumns for LIKE queries.
func (m *module) CreateJSONPathIndexes(ctx context.Context, expressions []string) error {
	if len(expressions) == 0 {
		return nil
	}
	indexes := []schemamigrator.Index{}
	// We'll add indexes on the local logs table across cluster
	// Index expression: lower(assumeNotNull(dynamicElement(body_json.<path>, 'String')))
	for _, expression := range expressions {
		split := strings.Split(expression, ".")
		parentColumn := split[0] // body_json or body_json_promoted
		path := strings.Join(split[1:], ".")
		ngramIndex := schemamigrator.Index{
			Name:        schemamigrator.JSONSubColumnIndexName(parentColumn, path, schemamigrator.IndexTypeNGramBF),
			Expression:  schemamigrator.JSONSubColumnIndexExpr(parentColumn, path),
			Type:        "ngrambf_v1(4, 60000, 5, 0)",
			Granularity: 1,
		}
		tokenIndex := schemamigrator.Index{
			Name:        schemamigrator.JSONSubColumnIndexName(parentColumn, path, schemamigrator.IndexTypeTokenBF),
			Expression:  schemamigrator.JSONSubColumnIndexExpr(parentColumn, path),
			Type:        "tokenbf_v1(10000, 2, 0)",
			Granularity: 1,
		}
		indexes = append(indexes, ngramIndex, tokenIndex)
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
	_ string,
	paths ...model.PromotePathItem,
) error {
	if len(paths) == 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "paths cannot be empty")
	}

	// Load existing promoted paths once
	existing := make(map[string]struct{})
	rows, qerr := m.store.ClickhouseDB().Query(ctx, "SELECT path FROM signoz_logs.distributed_promoted_paths")
	if qerr == nil {
		defer rows.Close()
		for rows.Next() {
			var p string
			if err := rows.Scan(&p); err == nil {
				existing[p] = struct{}{}
			}
		}
	}

	var toInsert []string
	indexes := []string{}
	for _, it := range paths {
		if err := it.Validate(); err != nil {
			return err
		}
		// remove the "body." prefix from the path
		trimmedPath := strings.TrimPrefix(it.Path, telemetrytypes.BodyJSONStringSearchPrefix)
		if it.Promote {
			if _, promoted := existing[trimmedPath]; !promoted {
				toInsert = append(toInsert, trimmedPath)
			}
		}
		if it.Index {
			parentColumn := telemetrylogs.LogsV2BodyJSONColumn
			// if the path is already promoted or is being promoted, add it to the promoted column
			if _, promoted := existing[trimmedPath]; promoted || it.Promote {
				parentColumn = telemetrylogs.LogsV2BodyPromotedColumn
			}

			indexes = append(indexes, parentColumn+"."+trimmedPath)
		}
	}

	if len(toInsert) > 0 {
		err := m.PromotePaths(ctx, toInsert)
		if err != nil {
			return err
		}
	}

	if len(indexes) > 0 {
		if err := m.CreateJSONPathIndexes(ctx, indexes); err != nil {
			return err
		}
	}

	return nil
}

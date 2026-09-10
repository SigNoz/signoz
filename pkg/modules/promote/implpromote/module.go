package implpromote

import (
	"context"
	"strings"

	schemamigrator "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/modules/promote"
	"github.com/SigNoz/signoz/pkg/telemetryschema/logstelemetryschema"
	"github.com/SigNoz/signoz/pkg/telemetryschema/tracestelemetryschema"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/ctxtypes"
	"github.com/SigNoz/signoz/pkg/types/instrumentationtypes"
	"github.com/SigNoz/signoz/pkg/types/promotetypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

var (
	CodeFailedToCreateIndex        = errors.MustNewCode("failed_to_create_index_promoted_paths")
	CodeFailedToQueryPromotedPaths = errors.MustNewCode("failed_to_query_promoted_paths")

	// logsBodyTarget is the promotion domain for the logs body JSON column
	// (body_v2 -> body_promoted), with per-path skip index support.
	logsBodyTarget = promotetypes.Target{
		Signal:             telemetrytypes.SignalLogs,
		FieldContext:       telemetrytypes.FieldContextBody,
		DBName:             logstelemetryschema.DBName,
		LocalTableName:     logstelemetryschema.LogsV2LocalTableName,
		BaseColumn:         logstelemetryschema.LogsV2BodyV2Column,
		PromotedColumn:     logstelemetryschema.LogsV2BodyPromotedColumn,
		RequiredPathPrefix: telemetrytypes.BodyJSONStringSearchPrefix,
		IndexesSupported:   true,
	}

	// tracesAttributesTarget is the promotion domain for the spans attributes
	// JSON column (attributes -> attributes_promoted). Per-path skip indexes
	// are not wired into the traces query builder yet, so only promotion is
	// supported for now.
	tracesAttributesTarget = promotetypes.Target{
		Signal:             telemetrytypes.SignalTraces,
		FieldContext:       telemetrytypes.FieldContextAttribute,
		DBName:             tracestelemetryschema.DBName,
		LocalTableName:     tracestelemetryschema.SpanIndexV3LocalTableName,
		BaseColumn:         tracestelemetryschema.SpanAttributesColumn,
		PromotedColumn:     tracestelemetryschema.SpanAttributesPromotedColumn,
		RequiredPathPrefix: "",
		IndexesSupported:   false,
	}
)

type module struct {
	metadataStore  telemetrytypes.MetadataStore
	telemetryStore telemetrystore.TelemetryStore
}

func NewModule(metadataStore telemetrytypes.MetadataStore, telemetrystore telemetrystore.TelemetryStore) promote.Module {
	return &module{metadataStore: metadataStore, telemetryStore: telemetrystore}
}

// ListPromotedPaths lists the promoted paths of the target JSON column,
// merged with per-path index metadata where the target supports indexes.
func (m *module) ListPromotedPaths(ctx context.Context, target promotetypes.Target) ([]promotetypes.PromotePath, error) {
	promotedPaths, err := m.metadataStore.GetPromotedPaths(ctx, target.Signal, target.PromotedColumn, target.FieldContext)
	if err != nil {
		return nil, err
	}

	response := make([]promotetypes.PromotePath, 0, len(promotedPaths))
	for path := range promotedPaths {
		response = append(response, promotetypes.PromotePath{
			Path:    target.RequiredPathPrefix + path,
			Promote: true,
		})
	}

	// Index metadata is optional per target; merge it in only where supported.
	if !target.IndexesSupported {
		return response, nil
	}

	indexes, err := m.metadataStore.ListLogsJSONIndexes(ctx)
	if err != nil {
		return nil, err
	}

	// index.Name is the bare path and index.BaseColumn carries the column
	// prefix, so the aggregate key is the full sub-column path.
	aggr := map[string][]promotetypes.WrappedIndex{}
	for _, index := range indexes {
		fullPath := index.BaseColumn + index.Name
		aggr[fullPath] = append(aggr[fullPath], promotetypes.WrappedIndex{
			FieldDataType: index.FieldDataType,
			Type:          index.IndexType,
			Granularity:   index.Granularity,
		})
	}

	for i := range response {
		fullPath := target.PromotedColumnPrefix() + strings.TrimPrefix(response[i].Path, target.RequiredPathPrefix)
		if indexes, ok := aggr[fullPath]; ok {
			response[i].Indexes = indexes
			delete(aggr, fullPath)
		}
	}

	// add the paths that are not promoted but have indexes
	for fullPath, indexes := range aggr {
		path := strings.TrimPrefix(fullPath, target.BaseColumnPrefix())
		path = strings.TrimPrefix(path, target.PromotedColumnPrefix())
		path = target.RequiredPathPrefix + path
		response = append(response, promotetypes.PromotePath{
			Path:    path,
			Indexes: indexes,
		})
	}
	return response, nil
}

// PromotePaths records new promotions of the target JSON column in the column
// evolution table and, for targets with index support, creates the requested
// per-path skip indexes.
func (m *module) PromotePaths(ctx context.Context, target promotetypes.Target, paths ...*promotetypes.PromotePath) error {
	if len(paths) == 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "paths cannot be empty")
	}

	pathsStr := []string{}
	// validate the paths
	for _, path := range paths {
		if err := path.ValidateAndSetDefaults(target); err != nil {
			return err
		}
		pathsStr = append(pathsStr, path.Path)
	}

	existingPromotedPaths, err := m.metadataStore.GetPromotedPaths(ctx, target.Signal, target.PromotedColumn, target.FieldContext, pathsStr...)
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
			parentColumn := target.BaseColumn
			// if the path is already promoted or is being promoted, add it to the promoted column
			if _, promoted := existingPromotedPaths[it.Path]; promoted || it.Promote {
				parentColumn = target.PromotedColumn
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
		err := m.metadataStore.PromotePaths(ctx, target.Signal, target.PromotedColumn, target.FieldContext, toInsert...)
		if err != nil {
			return err
		}
	}

	if len(indexes) > 0 {
		if err := m.createIndexes(ctx, target, indexes); err != nil {
			return err
		}
	}

	return nil
}

// createIndexes creates string ngram + token filter indexes on JSON path subcolumns for LIKE queries.
func (m *module) createIndexes(ctx context.Context, target promotetypes.Target, indexes []schemamigrator.Index) error {
	ctx = ctxtypes.NewContextWithCommentVals(ctx, map[string]string{
		instrumentationtypes.TelemetrySignal:  target.Signal.StringValue(),
		instrumentationtypes.CodeNamespace:    "promote",
		instrumentationtypes.CodeFunctionName: "createIndexes",
	})
	if len(indexes) == 0 {
		return nil
	}

	for _, index := range indexes {
		alterStmt := schemamigrator.AlterTableAddIndex{
			Database: target.DBName,
			Table:    target.LocalTableName,
			Index:    index,
		}
		op := alterStmt.OnCluster(m.telemetryStore.Cluster())
		if err := m.telemetryStore.ClickhouseDB().Exec(ctx, op.ToSQL()); err != nil {
			return errors.WrapInternalf(err, CodeFailedToCreateIndex, "failed to create index")
		}
	}

	return nil
}

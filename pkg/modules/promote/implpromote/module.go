package implpromote

import (
	"context"
	"strings"

	schemamigrator "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/modules/promote"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/ctxtypes"
	"github.com/SigNoz/signoz/pkg/types/instrumentationtypes"
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

func (m *module) ListPromotedPaths(ctx context.Context, filters promotetypes.ListPromotedPathsFilters) ([]promotetypes.PromotePath, error) {
	response := make([]promotetypes.PromotePath, 0)
	for _, target := range promotetypes.Targets() {
		if !filters.MatchesTarget(target) {
			continue
		}
		paths, err := m.listPromotedPaths(ctx, target)
		if err != nil {
			return nil, err
		}
		for _, path := range paths {
			if filters.MatchesPath(path) {
				response = append(response, path)
			}
		}
	}
	return response, nil
}

func (m *module) listPromotedPaths(ctx context.Context, target promotetypes.Target) ([]promotetypes.PromotePath, error) {
	promotedPaths, err := m.metadataStore.GetPromotedPaths(ctx, target.Entry)
	if err != nil {
		return nil, err
	}

	response := make([]promotetypes.PromotePath, 0, len(promotedPaths))
	for path := range promotedPaths {
		response = append(response, promotetypes.PromotePath{
			Signal:  target.Entry.Signal.StringValue(),
			Context: target.Entry.FieldContext.StringValue(),
			Path:    path,
			Promote: true,
		})
	}

	indexes, err := m.metadataStore.ListJSONIndexes(ctx, target.JSONIndexLookup())
	if err != nil {
		return nil, err
	}

	// aggr keys are full sub-column paths: index.BaseColumn carries the
	// column prefix and index.Name the bare path.
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
		fullPath := target.PromotedColumnPrefix() + response[i].Path
		if indexes, ok := aggr[fullPath]; ok {
			response[i].Indexes = indexes
			delete(aggr, fullPath)
		}
	}

	for fullPath, indexes := range aggr {
		path := strings.TrimPrefix(fullPath, target.BaseColumnPrefix())
		path = strings.TrimPrefix(path, target.PromotedColumnPrefix())
		response = append(response, promotetypes.PromotePath{
			Signal:  target.Entry.Signal.StringValue(),
			Context: target.Entry.FieldContext.StringValue(),
			Path:    path,
			Indexes: indexes,
		})
	}
	return response, nil
}

func (m *module) PromotePaths(ctx context.Context, paths ...*promotetypes.PromotePath) error {
	byTarget := map[promotetypes.Target][]*promotetypes.PromotePath{}
	targets := []promotetypes.Target{}
	for _, path := range paths {
		target, err := path.Target()
		if err != nil {
			return err
		}
		if _, ok := byTarget[target]; !ok {
			targets = append(targets, target)
		}
		byTarget[target] = append(byTarget[target], path)
	}

	for _, target := range targets {
		if err := m.promotePaths(ctx, target, byTarget[target]...); err != nil {
			return err
		}
	}
	return nil
}

func (m *module) createIndexes(ctx context.Context, target promotetypes.Target, indexes []schemamigrator.Index) error {
	ctx = ctxtypes.NewContextWithCommentVals(ctx, map[string]string{
		instrumentationtypes.TelemetrySignal:  target.Entry.Signal.StringValue(),
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

func (m *module) promotePaths(ctx context.Context, target promotetypes.Target, paths ...*promotetypes.PromotePath) error {
	pathsStr := []string{}
	for _, path := range paths {
		pathsStr = append(pathsStr, path.Path)
	}

	existingPromotedPaths, err := m.metadataStore.GetPromotedPaths(ctx, target.Entry, pathsStr...)
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
				parentColumn = target.PromotedColumn()
			}

			for _, index := range it.Indexes {
				nameType, ok := promotetypes.IndexNameType(index.Type)
				if !ok {
					return errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid index type: %s", index.Type)
				}
				indexes = append(indexes, schemamigrator.Index{
					Name:        schemamigrator.JSONSubColumnIndexName(parentColumn, it.Path, index.JSONDataType.StringValue(), nameType),
					Expression:  target.IndexExpression(parentColumn, it.Path, index.JSONDataType.StringValue()),
					Type:        index.Type,
					Granularity: index.Granularity,
				})
			}
		}
	}

	if len(toInsert) > 0 {
		err := m.metadataStore.PromotePaths(ctx, target.Entry, toInsert...)
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

func (m *module) createIndexes(ctx context.Context, target promotetypes.Target, indexes []schemamigrator.Index) error {
	ctx = ctxtypes.NewContextWithCommentVals(ctx, map[string]string{
		instrumentationtypes.TelemetrySignal:  target.Entry.Signal.StringValue(),
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

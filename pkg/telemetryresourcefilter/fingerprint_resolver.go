package telemetryresourcefilter

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type ResourceFingerprintResolver[T any] struct {
	stmtBuilder    *resourceFilterStatementBuilder[T]
	telemetryStore telemetrystore.TelemetryStore
	threshold      uint64
}

func NewResolver[T any](
	settings factory.ProviderSettings,
	dbName string,
	tableName string,
	signal telemetrytypes.Signal,
	source telemetrytypes.Source,
	metadataStore telemetrytypes.MetadataStore,
	fullTextColumn *telemetrytypes.TelemetryFieldKey,
	fl flagger.Flagger,
	telemetryStore telemetrystore.TelemetryStore,
	threshold uint64,
) *ResourceFingerprintResolver[T] {
	return &ResourceFingerprintResolver[T]{
		stmtBuilder: New[T](
			settings,
			dbName,
			tableName,
			signal,
			source,
			metadataStore,
			fullTextColumn,
			fl,
		),
		telemetryStore: telemetryStore,
		threshold:      threshold,
	}
}

func (r *ResourceFingerprintResolver[T]) StatementBuilder() qbtypes.StatementBuilder[T] {
	return r.stmtBuilder
}

func (r *ResourceFingerprintResolver[T]) Resolve(
	ctx context.Context,
	orgID valuer.UUID,
	query qbtypes.QueryBuilderQuery[T],
	start, end uint64,
	variables map[string]qbtypes.VariableItem,
) (qbtypes.ResourceFilterResolveKind, error) {
	countStmt, err := r.stmtBuilder.BuildCount(ctx, orgID, start, end, query, variables)
	if err != nil {
		return qbtypes.ResourceFilterResolveKindNoOp, err
	}
	if countStmt == nil {
		return qbtypes.ResourceFilterResolveKindNoOp, nil
	}

	var count uint64
	row := r.telemetryStore.ClickhouseDB().QueryRow(ctx, countStmt.Query, countStmt.Args...)
	if err := row.Scan(&count); err != nil {
		return qbtypes.ResourceFilterResolveKindNoOp, err
	}

	if count >= r.threshold {
		return qbtypes.ResourceFilterResolveKindFallback, nil
	}
	return qbtypes.ResourceFilterResolveKindUseCTE, nil
}

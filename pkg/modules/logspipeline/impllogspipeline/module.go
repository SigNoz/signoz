package impllogspipeline

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/modules/logspipeline"
	"github.com/SigNoz/signoz/pkg/query-service/agentConf"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/opamptypes"
	"github.com/SigNoz/signoz/pkg/types/pipelinetypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
	"go.uber.org/zap"
)

type module struct {
	sqlstore sqlstore.SQLStore
}

func NewModule(sqlstore sqlstore.SQLStore) logspipeline.Module {
	return &module{sqlstore: sqlstore}
}

func (m *module) ListPipelines(ctx context.Context, orgID valuer.UUID) ([]pipelinetypes.GettablePipeline, error) {
	latestVersion := -1
	// get latest agent config
	lastestConfig, err := agentConf.GetLatestVersion(ctx, orgID, opamptypes.ElementTypeLogPipelines)
	if err != nil && !errors.Ast(err, errors.TypeNotFound) {
		return nil, err
	}

	if lastestConfig != nil {
		latestVersion = lastestConfig.Version
	}
	return m.ListPipelinesByVersion(ctx, orgID, latestVersion)
}

func (m *module) ListPipelinesByVersion(ctx context.Context, orgID valuer.UUID, version int) ([]pipelinetypes.GettablePipeline, error) {
	var stored []pipelinetypes.StoreablePipeline
	err := m.sqlstore.BunDB().NewSelect().
		Model(&stored).
		Join("JOIN agent_config_element e ON p.id = e.element_id").
		Join("JOIN agent_config_version v ON v.id = e.version_id").
		Where("e.element_type = ?", opamptypes.ElementTypeLogPipelines.StringValue()).
		Where("v.version = ?", version).
		Where("v.org_id = ?", orgID.StringValue()).
		Order("p.order_id ASC").
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	pipelines := make([]pipelinetypes.GettablePipeline, len(stored))
	if len(stored) == 0 {
		return pipelines, nil
	}

	for i := range stored {
		pipelines[i].StoreablePipeline = stored[i]
		if err := pipelines[i].ParseRawConfig(); err != nil {
			return nil, err
		}
		if err := pipelines[i].ParseFilter(); err != nil {
			return nil, err
		}
	}

	return pipelines, nil
}

func (m *module) GetPipeline(ctx context.Context, orgID valuer.UUID, id string) (*pipelinetypes.GettablePipeline, error) {
	return nil, nil
}

func (m *module) CreatePipeline(ctx context.Context, orgID valuer.UUID, claims *authtypes.Claims, pipeline *pipelinetypes.PostablePipeline) (*pipelinetypes.GettablePipeline, error) {
	storeable, err := pipeline.ToStoreablePipeline()
	if err != nil {
		return nil, err
	}

	// regenerate the id and set other fields
	storeable.Identifiable.ID = valuer.GenerateUUID()
	storeable.OrgID = orgID.String()
	storeable.TimeAuditable = types.TimeAuditable{
		CreatedAt: time.Now(),
	}
	storeable.UserAuditable = types.UserAuditable{
		CreatedBy: claims.Email,
	}

	_, err = m.sqlstore.BunDB().NewInsert().
		Model(&storeable).
		Exec(ctx)
	if err != nil {
		zap.L().Error("error in inserting pipeline data", zap.Error(err))
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to insert pipeline")
	}

	return &pipelinetypes.GettablePipeline{
		StoreablePipeline: *storeable,
		Filter:            pipeline.Filter,
		Config:            pipeline.Config,
	}, nil
}

func (m *module) UpdatePipeline(ctx context.Context, orgID valuer.UUID, claims *authtypes.Claims, pipeline *pipelinetypes.PostablePipeline) (*pipelinetypes.GettablePipeline, error) {
	if err := pipeline.IsValid(); err != nil {
		return nil, err
	}

	storeable, err := pipeline.ToStoreablePipeline()
	if err != nil {
		return nil, err
	}

	storeable.OrgID = orgID.String()
	storeable.TimeAuditable = types.TimeAuditable{
		UpdatedAt: time.Now(),
	}
	storeable.UserAuditable = types.UserAuditable{
		UpdatedBy: claims.Email,
	}

	// get id from storeable pipeline
	id := storeable.ID.StringValue()

	// depending on the order_id update the rest of the table
	// example 1: total available pipelines are 6, and order_id 5 is moved to 2, then we need to update the rest of the table
	// old: 1, 2, 3, 4, 5, 6
	//         ^         |
	//         |_________|
	// So pipelines starting from 2nd position till 4th position shift to right (or increase their order_id) by 1 position
	// example 2: total available pipelines are 6, and order_id 2 is moved to 4, then we need to update the rest of the table
	// old: 1, 2, 3, 4, 5, 6
	//         |     ^
	//         |_____|
	// So pipelines starting from 3rd position till 4th position shift to left (or decrease their order_id) by 1 position
	if err := m.sqlstore.RunInTxCtx(ctx, nil, func(ctx context.Context) error {
		db := m.sqlstore.BunDBCtx(ctx)

		var existing pipelinetypes.StoreablePipeline
		if err := db.NewSelect().
			Column("order_id", "enabled").
			Model(&existing).
			Where("id = ?", id).
			Where("org_id = ?", orgID.StringValue()).
			Scan(ctx); err != nil {
			return m.sqlstore.WrapNotFoundErrf(
				err,
				errors.CodeNotFound,
				"pipeline with id %s does not exist in org %s",
				id,
				orgID.StringValue(),
			)
		}

		oldOrderID := existing.OrderID
		newOrderID := storeable.OrderID

		// Reorder other pipelines if the order has changed.
		if newOrderID != oldOrderID {
			if err := reorderPipelinesInTx(ctx, db, orgID.StringValue(), oldOrderID, newOrderID); err != nil {
				return err
			}
		}

		// Preserve primary key and immutable fields.
		storeable.ID = existing.ID

		// Persist the updated pipeline (including its new order).
		if _, err := db.NewUpdate().
			Model(storeable).
			Where("id = ?", id).
			Where("org_id = ?", orgID.StringValue()).
			Exec(ctx); err != nil {
			return err
		}

		// Apply pipelines if the enabled state has changed
		if existing.Enabled != storeable.Enabled {
			if err := m.applyPipelinesInTx(ctx, orgID, claims, db); err != nil {
				return err
			}
		}

		return nil
	}); err != nil {
		return nil, err
	}

	return &pipelinetypes.GettablePipeline{
		StoreablePipeline: *storeable,
		Filter:            pipeline.Filter,
		Config:            pipeline.Config,
	}, nil
}

func (m *module) applyPipelinesInTx(ctx context.Context, orgID valuer.UUID, claims *authtypes.Claims, tx bun.IDB) error {
	// Get ids pipelines for the given org
	var pipelines []pipelinetypes.StoreablePipeline
	if err := tx.NewSelect().
		Column("id").
		Model(&pipelines).
		Where("org_id = ?", orgID.StringValue()).
		Scan(ctx); err != nil {
		return m.sqlstore.WrapNotFoundErrf(
			err,
			errors.CodeNotFound,
			"no pipelines found for org %s",
			orgID.StringValue(),
		)
	}

	// prepare config elements
	elements := make([]string, len(pipelines))
	for i, p := range pipelines {
		elements[i] = p.ID.StringValue()
	}

	cfg, err := agentConf.StartNewVersion(ctx, orgID, valuer.MustNewUUID(claims.UserID), opamptypes.ElementTypeLogPipelines, elements)
	if err != nil || cfg == nil {
		return errors.WithAdditionalf(err, "failed to start new version for org %s", orgID.StringValue())
	}

	return nil
}

// reorderPipelinesInTx updates order_id of other pipelines in a transaction-aware way.
// It assumes that all pipelines for a given org have consecutive order_id values starting from 1.
// The logic is:
//   - When moving a pipeline from a higher position to a lower position (e.g., 5 -> 2),
//     all pipelines in [newOrderID, oldOrderID) are shifted right by +1.
//   - When moving from a lower position to a higher position (e.g., 2 -> 4),
//     all pipelines in (oldOrderID, newOrderID] are shifted left by -1.
func reorderPipelinesInTx(ctx context.Context, tx bun.IDB, orgID string, oldOrderID, newOrderID int) error {
	switch {
	case newOrderID < oldOrderID:
		// Move up: shift affected pipelines down (order_id + 1).
		_, err := tx.NewUpdate().
			Model((*pipelinetypes.StoreablePipeline)(nil)).
			Set("order_id = order_id + 1").
			Where("org_id = ?", orgID).
			Where("order_id >= ?", newOrderID).
			Where("order_id < ?", oldOrderID).
			Exec(ctx)
		return err
	case newOrderID > oldOrderID:
		// Move down: shift affected pipelines up (order_id - 1).
		_, err := tx.NewUpdate().
			Model((*pipelinetypes.StoreablePipeline)(nil)).
			Set("order_id = order_id - 1").
			Where("org_id = ?", orgID).
			Where("order_id > ?", oldOrderID).
			Where("order_id <= ?", newOrderID).
			Exec(ctx)
		return err
	default:
		return nil
	}
}

func (m *module) DeletePipeline(ctx context.Context, orgID valuer.UUID, claims *authtypes.Claims, pipeline *pipelinetypes.PostablePipeline) error {
	if err := pipeline.IsValid(); err != nil {
		return err
	}

	if err := m.sqlstore.RunInTxCtx(ctx, nil, func(ctx context.Context) error {
		db := m.sqlstore.BunDBCtx(ctx)

		// Fetch existing pipeline to determine its current order_id.
		var existing pipelinetypes.StoreablePipeline
		if err := db.NewSelect().
			Model(&existing).
			Column("order_id", "enabled").
			Where("id = ?", pipeline.ID).
			Where("org_id = ?", orgID.StringValue()).
			Scan(ctx); err != nil {
			return m.sqlstore.WrapNotFoundErrf(
				err,
				errors.CodeNotFound,
				"pipeline with id %s does not exist in org %s",
				pipeline.ID,
				orgID.StringValue(),
			)
		}

		if _, err := db.NewDelete().
			Model((*pipelinetypes.StoreablePipeline)(nil)).
			Where("id = ?", pipeline.ID).
			Where("org_id = ?", orgID.StringValue()).
			Exec(ctx); err != nil {
			return err
		}

		// Set order_ids of other pipelines by collapsing the gap left by the deleted pipeline.
		if _, err := db.NewUpdate().
			Model((*pipelinetypes.StoreablePipeline)(nil)).
			Set("order_id = order_id - 1").
			Where("org_id = ?", orgID.StringValue()).
			Where("order_id > ?", existing.OrderID).
			Exec(ctx); err != nil {
			return err
		}

		// Apply pipelines if the deleted pipeline was enabled
		if existing.Enabled {
			if err := m.applyPipelinesInTx(ctx, orgID, claims, db); err != nil {
				return err
			}
		}

		return nil
	}); err != nil {
		return err
	}

	return nil
}

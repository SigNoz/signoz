package impltracefunnel

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	traceFunnels "github.com/SigNoz/signoz/pkg/types/tracefunneltypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type store struct {
	sqlstore sqlstore.SQLStore
}

func NewStore(sqlstore sqlstore.SQLStore) traceFunnels.FunnelStore {
	return &store{sqlstore: sqlstore}
}

func (store *store) Create(ctx context.Context, funnel *traceFunnels.StorableFunnel) error {
	tx, err := store.sqlstore.BunDB().BeginTx(ctx, nil)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to start transaction")
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()

	// Check if a funnel with the same name already exists in the organization
	exists, err := tx.
		NewSelect().
		Model(new(traceFunnels.StorableFunnel)).
		Where("name = ? AND org_id = ?", funnel.Name, funnel.OrgID.String()).
		Exists(ctx)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to check for existing funnel")
	}
	if exists {
		return errors.Newf(errors.TypeAlreadyExists, errors.CodeAlreadyExists, "a funnel with name '%s' already exists in this organization", funnel.Name)
	}

	_, err = tx.
		NewInsert().
		Model(funnel).
		Exec(ctx)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to create funnel")
	}

	err = tx.Commit()
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to commit transaction")
	}

	return nil
}

// Get retrieves a funnel by ID
func (store *store) Get(ctx context.Context, uuid valuer.UUID, orgID valuer.UUID) (*traceFunnels.StorableFunnel, error) {
	funnel := &traceFunnels.StorableFunnel{}
	err := store.
		sqlstore.
		BunDB().
		NewSelect().
		Model(funnel).
		Relation("CreatedByUser").
		Where("?TableAlias.id = ? AND ?TableAlias.org_id = ?", uuid.String(), orgID.String()).
		Scan(ctx)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to get funnels")
	}
	return funnel, nil
}

// Update updates an existing funnel
func (store *store) Update(ctx context.Context, funnel *traceFunnels.StorableFunnel) error {
	tx, err := store.sqlstore.BunDB().BeginTx(ctx, nil)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to start transaction")
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()

	// Check if a funnel with the same name already exists in the organization (excluding current funnel)
	exists, err := tx.
		NewSelect().
		Model(new(traceFunnels.StorableFunnel)).
		Where("name = ? AND org_id = ? AND id != ?", funnel.Name, funnel.OrgID.String(), funnel.ID.String()).
		Exists(ctx)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to check for existing funnel")
	}
	if exists {
		return errors.Newf(errors.TypeAlreadyExists, errors.CodeAlreadyExists, "a funnel with name '%s' already exists in this organization", funnel.Name)
	}

	funnel.UpdatedAt = time.Now()

	_, err = tx.
		NewUpdate().
		Model(funnel).
		WherePK().
		Exec(ctx)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to update funnel")
	}

	err = tx.Commit()
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to commit transaction")
	}

	return nil
}

// List retrieves all funnels for a given organization
func (store *store) List(ctx context.Context, orgID valuer.UUID) ([]*traceFunnels.StorableFunnel, error) {
	var funnels []*traceFunnels.StorableFunnel
	err := store.
		sqlstore.
		BunDB().
		NewSelect().
		Model(&funnels).
		Relation("CreatedByUser").
		Where("?TableAlias.org_id = ?", orgID.String()).
		Scan(ctx)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to list funnels")
	}
	return funnels, nil
}

// Delete removes a funnel by ID
func (store *store) Delete(ctx context.Context, funnelID valuer.UUID, orgID valuer.UUID) error {
	_, err := store.
		sqlstore.
		BunDB().
		NewDelete().
		Model(new(traceFunnels.StorableFunnel)).
		Where("id = ? AND org_id = ?", funnelID.String(), orgID.String()).
		Exec(ctx)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to delete funnel")
	}
	return nil
}

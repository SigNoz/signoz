package impltracefunnel

import (
	"context"
	"fmt"
	"time"

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
	// Check if a funnel with the same name already exists in the organization
	exists, err := store.
		sqlstore.
		BunDB().
		NewSelect().
		Model((*traceFunnels.StorableFunnel)(nil)).
		Where("name = ? AND org_id = ?", funnel.Name, funnel.OrgID.String()).
		Exists(ctx)
	if err != nil {
		return fmt.Errorf("failed to check for existing funnel: %v", err)
	}
	if exists {
		return store.sqlstore.WrapAlreadyExistsErrf(nil, traceFunnels.ErrFunnelAlreadyExists, "a funnel with name '%s' already exists in this organization", funnel.Name)
	}

	_, err = store.
		sqlstore.
		BunDB().
		NewInsert().
		Model(funnel).
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to create funnel: %v", err)
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
		return nil, fmt.Errorf("failed to get funnel: %v", err)
	}
	return funnel, nil
}

// Update updates an existing funnel
func (store *store) Update(ctx context.Context, funnel *traceFunnels.StorableFunnel) error {
	funnel.UpdatedAt = time.Now()

	_, err := store.
		sqlstore.
		BunDB().
		NewUpdate().
		Model(funnel).
		WherePK().
		Exec(ctx)
	if err != nil {
		return store.sqlstore.WrapAlreadyExistsErrf(err, traceFunnels.ErrFunnelAlreadyExists, "a funnel with name '%s' already exists in this organization", funnel.Name)
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
		return nil, fmt.Errorf("failed to list funnels: %v", err)
	}
	return funnels, nil
}

// Delete removes a funnel by ID
func (store *store) Delete(ctx context.Context, funnelID valuer.UUID, orgID valuer.UUID) error {
	_, err := store.
		sqlstore.
		BunDB().
		NewDelete().
		Model((*traceFunnels.StorableFunnel)(nil)).
		Where("id = ? AND org_id = ?", funnelID.String(), orgID.String()).
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to delete funnel: %v", err)
	}
	return nil
}

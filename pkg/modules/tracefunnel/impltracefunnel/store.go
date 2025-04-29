package impltracefunnel

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/sqlstore"
	traceFunnels "github.com/SigNoz/signoz/pkg/types/tracefunnel"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type store struct {
	sqlstore sqlstore.SQLStore
}

func NewStore(sqlstore sqlstore.SQLStore) traceFunnels.FunnelStore {
	return &store{sqlstore: sqlstore}
}

func (store *store) Create(ctx context.Context, funnel *traceFunnels.Funnel) error {
	if funnel.ID.IsZero() {
		funnel.ID = valuer.GenerateUUID()
	}

	if funnel.CreatedAt.IsZero() {
		funnel.CreatedAt = time.Now()
	}
	if funnel.UpdatedAt.IsZero() {
		funnel.UpdatedAt = time.Now()
	}

	// Set created_by if CreatedByUser is present
	if funnel.CreatedByUser != nil {
		funnel.CreatedBy = funnel.CreatedByUser.ID
	}

	_, err := store.
		sqlstore.
		BunDB().
		NewInsert().
		Model(funnel).
		Exec(ctx)
	if err != nil {
		if strings.Contains(err.Error(), "idx_trace_funnel_org_id_name") {
			return fmt.Errorf("a funnel with name '%s' already exists in this organization", funnel.Name)
		}
		return fmt.Errorf("failed to create funnel: %v", err)
	}

	return nil
}

// Get retrieves a funnel by ID
func (store *store) Get(ctx context.Context, uuid valuer.UUID) (*traceFunnels.Funnel, error) {
	funnel := &traceFunnels.Funnel{}
	err := store.
		sqlstore.
		BunDB().
		NewSelect().
		Model(funnel).
		Relation("CreatedByUser").
		Where("?TableAlias.id = ?", uuid).
		Scan(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get funnel: %v", err)
	}
	return funnel, nil
}

// Update updates an existing funnel
func (store *store) Update(ctx context.Context, funnel *traceFunnels.Funnel) error {
	funnel.UpdatedAt = time.Now()

	_, err := store.
		sqlstore.
		BunDB().
		NewUpdate().
		Model(funnel).
		WherePK().
		Exec(ctx)
	if err != nil {
		if strings.Contains(err.Error(), "idx_trace_funnel_org_id_name") {
			return fmt.Errorf("a funnel with name '%s' already exists in this organization", funnel.Name)
		}
		return fmt.Errorf("failed to update funnel: %v", err)
	}
	return nil
}

// List retrieves all funnels for a given organization
func (store *store) List(ctx context.Context, orgID valuer.UUID) ([]*traceFunnels.Funnel, error) {
	var funnels []*traceFunnels.Funnel
	err := store.
		sqlstore.
		BunDB().
		NewSelect().
		Model(&funnels).
		Relation("CreatedByUser").
		Where("?TableAlias.org_id = ?", orgID).
		Scan(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to list funnels: %v", err)
	}
	return funnels, nil
}

// Delete removes a funnel by ID
func (store *store) Delete(ctx context.Context, uuid valuer.UUID) error {
	_, err := store.
		sqlstore.
		BunDB().
		NewDelete().
		Model((*traceFunnels.Funnel)(nil)).
		Where("id = ?", uuid).Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to delete funnel: %v", err)
	}
	return nil
}

package impltracefunnel

import (
	"context"
	"fmt"
	"time"

	"github.com/SigNoz/signoz/pkg/sqlstore"
	traceFunnels "github.com/SigNoz/signoz/pkg/types/tracefunnel"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type store struct {
	sqlstore sqlstore.SQLStore
}

func NewStore(sqlstore sqlstore.SQLStore) traceFunnels.TraceFunnelStore {
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

	_, err := store.
		sqlstore.
		BunDB().
		NewInsert().
		Model(funnel).
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to create funnel: %v", err)
	}

	if funnel.CreatedByUser != nil {
		_, err = store.sqlstore.BunDB().NewUpdate().
			Model(funnel).
			Set("created_by = ?", funnel.CreatedByUser.ID).
			Where("id = ?", funnel.ID).
			Exec(ctx)
		if err != nil {
			return fmt.Errorf("failed to update funnel user relationship: %v", err)
		}
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
	// Update the updated_at timestamp
	funnel.UpdatedAt = time.Now()

	_, err := store.
		sqlstore.
		BunDB().
		NewUpdate().
		Model(funnel).
		WherePK().
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to update funnel: %v", err)
	}
	return nil
}

// List retrieves all funnels
func (store *store) List(ctx context.Context) ([]*traceFunnels.Funnel, error) {
	var funnels []*traceFunnels.Funnel
	err := store.
		sqlstore.
		BunDB().
		NewSelect().
		Model(&funnels).
		Relation("CreatedByUser").
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

// ListByOrg retrieves all funnels for a specific organization
//func (store *store) ListByOrg(ctx context.Context, orgID valuer.UUID) ([]*traceFunnels.Funnel, error) {
//	var funnels []*traceFunnels.Funnel
//	err := store.
//		sqlstore.
//		BunDB().
//		NewSelect().
//		Model(&funnels).
//		Relation("CreatedByUser").
//		Where("org_id = ?", orgID).
//		Scan(ctx)
//	if err != nil {
//		return nil, fmt.Errorf("failed to list funnels by org: %v", err)
//	}
//	return funnels, nil
//}

// GetByIDAndOrg retrieves a funnel by ID and organization ID
//func (store *store) GetByIDAndOrg(ctx context.Context, id, orgID valuer.UUID) (*traceFunnels.Funnel, error) {
//	funnel := &traceFunnels.Funnel{}
//	err := store.
//		sqlstore.
//		BunDB().
//		NewSelect().
//		Model(funnel).
//		Relation("CreatedByUser").
//		Where("?TableAlias.id = ? AND ?TableAlias.org_id = ?", id, orgID).
//		Scan(ctx)
//	if err != nil {
//		return nil, fmt.Errorf("failed to get funnel by ID and org: %v", err)
//	}
//	return funnel, nil
//}

// UpdateSteps updates the steps of a funnel
//func (store *store) UpdateSteps(ctx context.Context, funnelID valuer.UUID, steps []traceFunnels.FunnelStep) error {
//	_, err := store.
//		sqlstore.
//		BunDB().
//		NewUpdate().
//		Model((*traceFunnels.Funnel)(nil)).
//		Set("steps = ?", steps).
//		Where("id = ?", funnelID).
//		Exec(ctx)
//	if err != nil {
//		return fmt.Errorf("failed to update funnel steps: %v", err)
//	}
//	return nil
//}

// UpdateMetadata updates the metadata of a funnel
//func (store *store) UpdateMetadata(ctx context.Context, funnelID valuer.UUID, name, description string, userID string) error {
//
//	// First get the current funnel to preserve other fields
//	funnel := &traceFunnels.Funnel{}
//	err := store.
//		sqlstore.
//		BunDB().
//		NewSelect().
//		Model(funnel).
//		Where("id = ?", funnelID).
//		Scan(ctx)
//	if err != nil {
//		return fmt.Errorf("failed to get funnel: %v", err)
//	}
//
//	// Update the fields
//	funnel.Name = name
//	funnel.Description = description
//	funnel.UpdatedAt = time.Now()
//	funnel.UpdatedBy = userID
//
//	// Save the updated funnel
//	_, err = store.
//		sqlstore.
//		BunDB().
//		NewUpdate().
//		Model(funnel).
//		WherePK().
//		Exec(ctx)
//	if err != nil {
//		return fmt.Errorf("failed to update funnel metadata: %v", err)
//	}
//
//	// Verify the update
//	updatedFunnel := &traceFunnels.Funnel{}
//	err = store.
//		sqlstore.
//		BunDB().
//		NewSelect().
//		Model(updatedFunnel).
//		Where("id = ?", funnelID).
//		Scan(ctx)
//	if err != nil {
//		return fmt.Errorf("failed to verify update: %v", err)
//	}
//
//	return nil
//}

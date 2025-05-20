package impltracefunnel

import (
	"context"
	"fmt"
	"time"

	"github.com/SigNoz/signoz/pkg/modules/tracefunnel"
	"github.com/SigNoz/signoz/pkg/types"
	traceFunnels "github.com/SigNoz/signoz/pkg/types/tracefunnel"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type module struct {
	store traceFunnels.FunnelStore
}

func NewModule(store traceFunnels.FunnelStore) tracefunnel.Module {
	return &module{
		store: store,
	}
}

func (module *module) Create(ctx context.Context, timestamp int64, name string, userID string, orgID string) (*traceFunnels.Funnel, error) {
	orgUUID, err := valuer.NewUUID(orgID)
	if err != nil {
		return nil, fmt.Errorf("invalid org ID: %v", err)
	}

	funnel := &traceFunnels.Funnel{
		BaseMetadata: traceFunnels.BaseMetadata{
			Name:  name,
			OrgID: orgUUID,
		},
	}
	funnel.CreatedAt = time.Unix(0, timestamp*1000000) // Convert to nanoseconds
	funnel.CreatedBy = userID

	// Set up the user relationship
	funnel.CreatedByUser = &types.User{
		Identifiable: types.Identifiable{
			ID: valuer.MustNewUUID(userID),
		},
	}

	if err := module.store.Create(ctx, funnel); err != nil {
		return nil, fmt.Errorf("failed to create funnel: %v", err)
	}

	return funnel, nil
}

// Get gets a funnel by ID
func (module *module) Get(ctx context.Context, funnelID string) (*traceFunnels.Funnel, error) {
	uuid, err := valuer.NewUUID(funnelID)
	if err != nil {
		return nil, fmt.Errorf("invalid funnel ID: %v", err)
	}
	return module.store.Get(ctx, uuid)
}

// Update updates a funnel
func (module *module) Update(ctx context.Context, funnel *traceFunnels.Funnel, userID string) error {
	funnel.UpdatedBy = userID
	return module.store.Update(ctx, funnel)
}

// List lists all funnels for an organization
func (module *module) List(ctx context.Context, orgID string) ([]*traceFunnels.Funnel, error) {
	orgUUID, err := valuer.NewUUID(orgID)
	if err != nil {
		return nil, fmt.Errorf("invalid org ID: %v", err)
	}

	funnels, err := module.store.List(ctx, orgUUID)
	if err != nil {
		return nil, fmt.Errorf("failed to list funnels: %v", err)
	}

	return funnels, nil
}

// Delete deletes a funnel
func (module *module) Delete(ctx context.Context, funnelID string) error {
	uuid, err := valuer.NewUUID(funnelID)
	if err != nil {
		return fmt.Errorf("invalid funnel ID: %v", err)
	}
	return module.store.Delete(ctx, uuid)
}

// Save saves a funnel
func (module *module) Save(ctx context.Context, funnel *traceFunnels.Funnel, userID string, orgID string) error {
	orgUUID, err := valuer.NewUUID(orgID)
	if err != nil {
		return fmt.Errorf("invalid org ID: %v", err)
	}

	funnel.UpdatedBy = userID
	funnel.OrgID = orgUUID
	return module.store.Update(ctx, funnel)
}

// GetFunnelMetadata gets metadata for a funnel
func (module *module) GetFunnelMetadata(ctx context.Context, funnelID string) (int64, int64, string, error) {
	uuid, err := valuer.NewUUID(funnelID)
	if err != nil {
		return 0, 0, "", fmt.Errorf("invalid funnel ID: %v", err)
	}

	funnel, err := module.store.Get(ctx, uuid)
	if err != nil {
		return 0, 0, "", err
	}

	return funnel.CreatedAt.UnixNano() / 1000000, funnel.UpdatedAt.UnixNano() / 1000000, funnel.Description, nil
}

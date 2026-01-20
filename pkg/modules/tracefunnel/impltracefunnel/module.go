package impltracefunnel

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/modules/tracefunnel"
	"github.com/SigNoz/signoz/pkg/types"
	traceFunnels "github.com/SigNoz/signoz/pkg/types/tracefunneltypes"
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

func (module *module) Create(ctx context.Context, timestamp int64, name string, userID valuer.UUID, orgID valuer.UUID) (*traceFunnels.StorableFunnel, error) {
	funnel := &traceFunnels.StorableFunnel{
		Name:  name,
		OrgID: orgID,
	}
	funnel.CreatedAt = time.Unix(0, timestamp*1000000) // Convert to nanoseconds
	funnel.CreatedBy = userID.String()

	// Set up the user relationship
	funnel.CreatedByUser = &types.User{
		Identifiable: types.Identifiable{
			ID: userID,
		},
	}

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
		funnel.CreatedBy = funnel.CreatedByUser.Identifiable.ID.String()
	}

	err := module.store.Create(ctx, funnel)

	if err != nil {
		return nil, err
	}

	return funnel, nil
}

// Get gets a funnel by ID
func (module *module) Get(ctx context.Context, funnelID valuer.UUID, orgID valuer.UUID) (*traceFunnels.StorableFunnel, error) {
	return module.store.Get(ctx, funnelID, orgID)
}

// Update updates a funnel
func (module *module) Update(ctx context.Context, funnel *traceFunnels.StorableFunnel, userID valuer.UUID) error {
	funnel.UpdatedBy = userID.String()
	return module.store.Update(ctx, funnel)
}

// List lists all funnels for an organization
func (module *module) List(ctx context.Context, orgID valuer.UUID) ([]*traceFunnels.StorableFunnel, error) {
	funnels, err := module.store.List(ctx, orgID)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to list funnels")
	}

	return funnels, nil
}

// Delete deletes a funnel
func (module *module) Delete(ctx context.Context, funnelID valuer.UUID, orgID valuer.UUID) error {
	return module.store.Delete(ctx, funnelID, orgID)
}

// GetFunnelMetadata gets metadata for a funnel
func (module *module) GetFunnelMetadata(ctx context.Context, funnelID valuer.UUID, orgID valuer.UUID) (int64, int64, string, error) {
	funnel, err := module.store.Get(ctx, funnelID, orgID)
	if err != nil {
		return 0, 0, "", err
	}

	return funnel.CreatedAt.UnixNano() / 1000000, funnel.UpdatedAt.UnixNano() / 1000000, funnel.Description, nil
}

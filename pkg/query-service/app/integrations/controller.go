package integrations

import (
	"context"
	"fmt"

	"github.com/jmoiron/sqlx"
	"go.signoz.io/signoz/pkg/query-service/model"
)

type Controller struct {
	mgr *Manager
}

func NewController(db *sqlx.DB) (
	*Controller, error,
) {
	mgr, err := NewManager(db)
	if err != nil {
		return nil, fmt.Errorf("couldn't create integrations manager: %w", err)
	}

	return &Controller{
		mgr: mgr,
	}, nil
}

func (c *Controller) ListAvailableIntegrations(ctx context.Context) (
	*IntegrationsListResponse, *model.ApiError,
) {
	// TODO(Raj): See if there is a way to pass context
	integrations, apiErr := c.mgr.ListIntegrations(ctx, nil)
	if apiErr != nil {
		return nil, apiErr
	}

	return &IntegrationsListResponse{
		Integrations: integrations,
	}, nil
}

type IntegrationsListResponse struct {
	Integrations []IntegrationsListItem `json:"integrations"`

	// Pagination details to come later
}

package routingtypes

import (
	"context"
	"fmt"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

type ExpressionRoutes struct {
	Expression string  `json:"expression"`
	Actions    Actions `json:"actions"`
}

type Actions struct {
	Channels []string `json:"channels"`
	Priority string   `json:"priority"`
}

type ExpressionRouteRequest struct {
	Expression  string   `json:"expression"`
	Actions     Actions  `json:"actions"`
	Name        string   `bun:"name,type:text" json:"name"`
	Description string   `bun:"description,type:text" json:"description"`
	Tags        []string `bun:"tags,type:jsonb" json:"tags,omitempty"`
}

func (req *ExpressionRouteRequest) Validate() error {
	if req.Expression == "" {
		return fmt.Errorf("expression required")
	}

	if req.Name == "" {
		return fmt.Errorf("name required")
	}

	if req.Actions.Channels == nil || len(req.Actions.Channels) == 0 {
		return fmt.Errorf("channels required")
	}
	return nil
}

// ToExpressionRoute converts ExpressionRouteRequest to ExpressionRoute
func (req *ExpressionRouteRequest) ToExpressionRoute(orgID, userID string) *ExpressionRoute {
	return &ExpressionRoute{
		Expression:  req.Expression,
		Channels:    req.Actions.Channels,
		Priority:    req.Actions.Priority,
		Name:        req.Name,
		Description: req.Description,
		Enabled:     true, // Default to enabled
		Tags:        req.Tags,
		OrgID:       orgID,
		Identifiable: types.Identifiable{
			ID: valuer.GenerateUUID(),
		},
		UserAuditable: types.UserAuditable{
			CreatedBy: userID,
			UpdatedBy: userID,
		},
	}
}

type ExpressionRoute struct {
	bun.BaseModel `bun:"table:notification_routes"`
	types.Identifiable
	types.TimeAuditable
	types.UserAuditable

	// Core routing fields
	Expression string `bun:"expression,type:text,notnull" json:"expression"`

	// Action configuration (stored as JSON)
	Channels []string `bun:"channels,type:jsonb" json:"channels"`
	Priority string   `bun:"priority,type:text" json:"priority"`

	// Extensibility fields
	Name        string   `bun:"name,type:text" json:"name"`
	Description string   `bun:"description,type:text" json:"description"`
	Enabled     bool     `bun:"enabled,type:boolean,default:true" json:"enabled"`
	Tags        []string `bun:"tags,type:jsonb" json:"tags,omitempty"`

	// Organization/tenant isolation
	OrgID string `bun:"org_id,type:text,notnull" json:"orgId"`
}

type RouteStore interface {
	GetAll(ctx context.Context) ([]ExpressionRoutes, error)
	GetByID(ctx context.Context, id string) (*ExpressionRoute, error)
	Create(ctx context.Context, route *ExpressionRoute) error
	Update(ctx context.Context, route *ExpressionRoute) error
	Delete(ctx context.Context, id string) error
	GetAllByOrgID(ctx context.Context, orgID string) ([]ExpressionRoutes, error)
}

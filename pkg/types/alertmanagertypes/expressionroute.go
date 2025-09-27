package alertmanagertypes

import (
	"context"
	"fmt"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

type Actions struct {
	Channels []string `json:"channels"`
	Priority string   `json:"priority"`
}

type PolicyRouteRequest struct {
	Expression  string
	Actions     Actions
	Name        string
	Description string
	Tags        []string
	Kind        ExpressionKind
}

func (req *PolicyRouteRequest) Validate() error {
	if req.Expression == "" {
		return fmt.Errorf("expression required")
	}

	if req.Name == "" {
		return fmt.Errorf("name required")
	}

	if len(req.Actions.Channels) == 0 {
		return fmt.Errorf("channels required")
	}
	return nil
}

// ToExpressionRoute converts PolicyRouteRequest to ExpressionRoute
func (req *PolicyRouteRequest) ToExpressionRoute(orgID, userID string, kind ExpressionKind) *ExpressionRoute {
	return &ExpressionRoute{
		Expression:  req.Expression,
		Channels:    req.Actions.Channels,
		Priority:    req.Actions.Priority,
		Name:        req.Name,
		Description: req.Description,
		Enabled:     true,
		Tags:        req.Tags,
		OrgID:       orgID,
		Identifiable: types.Identifiable{
			ID: valuer.GenerateUUID(),
		},
		ExpressionKind: kind,
		UserAuditable: types.UserAuditable{
			CreatedBy: userID,
			UpdatedBy: userID,
		},
	}
}

type ExpressionKind struct {
	valuer.String
}

var (
	RuleBasedExpression   = ExpressionKind{valuer.NewString("rule")}
	PolicyBasedExpression = ExpressionKind{valuer.NewString("policy")}
)

type ExpressionRoute struct {
	bun.BaseModel `bun:"table:notification_routes"`
	types.Identifiable
	types.TimeAuditable
	types.UserAuditable

	// Core routing fields
	Expression     string         `bun:"expression,type:text,notnull" json:"expression"`
	ExpressionKind ExpressionKind `bun:"kind,type:text" json:"kind"`

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

func (er *ExpressionRoute) Validate() error {
	if er == nil {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "expression route cannot be nil")
	}

	if er.Expression == "" {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "expression is required")
	}

	if er.Name == "" {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "name is required")
	}

	if er.OrgID == "" {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "organization ID is required")
	}

	if len(er.Channels) == 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "at least one channel is required")
	}

	// Validate channels are not empty
	for i, channel := range er.Channels {
		if channel == "" {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "channel at index %d cannot be empty", i)
		}
	}

	if er.ExpressionKind != PolicyBasedExpression && er.ExpressionKind != RuleBasedExpression {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported expression kind: %s", er.ExpressionKind.StringValue())
	}

	return nil
}

type RouteStore interface {
	GetByID(ctx context.Context, orgId string, id string) (*ExpressionRoute, error)
	Create(ctx context.Context, route *ExpressionRoute) error
	CreateBatch(ctx context.Context, routes []*ExpressionRoute) error
	Delete(ctx context.Context, orgId string, id string) error
	GetAllByKindAndOrgID(ctx context.Context, orgID string, kind ExpressionKind) ([]*ExpressionRoute, error)
	GetAllByName(ctx context.Context, orgID string, name string) ([]*ExpressionRoute, error)
	DeleteRouteByName(ctx context.Context, orgID string, name string) error
}

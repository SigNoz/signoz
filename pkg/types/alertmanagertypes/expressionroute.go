package alertmanagertypes

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

type PostableExpressionRoute struct {
	Expression     string         `json:"expression"`
	ExpressionKind ExpressionKind `json:"kind"`
	Channels       []string       `json:"channels"`
	Priority       string         `json:"priority"`
	Name           string         `json:"name"`
	Description    string         `json:"description"`
	Enabled        bool           `json:"enabled"`
	Tags           []string       `json:"tags,omitempty"`
}

func (p *PostableExpressionRoute) Validate() error {
	if p.Expression == "" {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "expression is required")
	}

	if p.Name == "" {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "name is required")
	}

	if len(p.Channels) == 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "at least one channel is required")
	}

	// Validate channels are not empty
	for i, channel := range p.Channels {
		if channel == "" {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "channel at index %d cannot be empty", i)
		}
	}

	if p.ExpressionKind != PolicyBasedExpression && p.ExpressionKind != RuleBasedExpression {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported expression kind: %s", p.ExpressionKind.StringValue())
	}

	return nil
}

type GettableExpressionRoute struct {
	PostableExpressionRoute // Embedded

	ID string `json:"id"`

	// Audit fields
	CreatedAt *time.Time `json:"createdAt"`
	UpdatedAt *time.Time `json:"updatedAt"`
	CreatedBy *string    `json:"createdBy"`
	UpdatedBy *string    `json:"updatedBy"`
}

type ExpressionKind struct {
	valuer.String
}

var (
	RuleBasedExpression   = ExpressionKind{valuer.NewString("rule")}
	PolicyBasedExpression = ExpressionKind{valuer.NewString("policy")}
)

// ExpressionRoute represents the database model for expression routes
type ExpressionRoute struct {
	bun.BaseModel `bun:"table:notification_routes"`
	types.Identifiable
	types.TimeAuditable
	types.UserAuditable

	Expression     string         `bun:"expression,type:text,notnull" json:"expression"`
	ExpressionKind ExpressionKind `bun:"kind,type:text" json:"kind"`

	Channels []string `bun:"channels,type:jsonb" json:"channels"`
	Priority string   `bun:"priority,type:text" json:"priority"`

	Name        string   `bun:"name,type:text" json:"name"`
	Description string   `bun:"description,type:text" json:"description"`
	Enabled     bool     `bun:"enabled,type:boolean,default:true" json:"enabled"`
	Tags        []string `bun:"tags,type:jsonb" json:"tags,omitempty"`

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
	GetAllByKind(ctx context.Context, orgID string, kind ExpressionKind) ([]*ExpressionRoute, error)
	GetAllByName(ctx context.Context, orgID string, name string) ([]*ExpressionRoute, error)
	DeleteRouteByName(ctx context.Context, orgID string, name string) error
}

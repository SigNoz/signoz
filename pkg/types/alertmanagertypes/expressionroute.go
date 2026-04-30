package alertmanagertypes

import (
	"context"
	"github.com/expr-lang/expr"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

type PostableRoutePolicy struct {
	Expression     string         `json:"expression" required:"true"`
	ExpressionKind ExpressionKind `json:"kind"`
	Channels       []string       `json:"channels" required:"true"`
	Name           string         `json:"name" required:"true"`
	Description    string         `json:"description"`
	Tags           []string       `json:"tags,omitempty" nullable:"true"`
}

func (p *PostableRoutePolicy) Validate() error {
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

	_, err := expr.Compile(p.Expression)
	if err != nil {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid expression syntax: %v", err)
	}

	return nil
}

type GettableRoutePolicy struct {
	PostableRoutePolicy

	ID        string    `json:"id" required:"true"`
	CreatedAt time.Time `json:"createdAt" required:"true"`
	UpdatedAt time.Time `json:"updatedAt" required:"true"`
	CreatedBy *string   `json:"createdBy" nullable:"true"`
	UpdatedBy *string   `json:"updatedBy" nullable:"true"`
}

type ExpressionKind struct {
	valuer.String
}

var (
	RuleBasedExpression   = ExpressionKind{valuer.NewString("rule")}
	PolicyBasedExpression = ExpressionKind{valuer.NewString("policy")}
)

func (ExpressionKind) Enum() []any {
	return []any{
		RuleBasedExpression,
		PolicyBasedExpression,
	}
}

// RoutePolicy represents the database model for expression routes.
type RoutePolicy struct {
	bun.BaseModel `bun:"table:route_policy"`
	types.Identifiable
	types.TimeAuditable
	types.UserAuditable

	Expression     string         `bun:"expression,type:text,notnull" json:"expression"`
	ExpressionKind ExpressionKind `bun:"kind,type:text" json:"kind"`

	Channels []string `bun:"channels,type:jsonb" json:"channels"`

	Name        string   `bun:"name,type:text" json:"name"`
	Description string   `bun:"description,type:text" json:"description"`
	Enabled     bool     `bun:"enabled,type:boolean,default:true" json:"enabled"`
	Tags        []string `bun:"tags,type:jsonb" json:"tags,omitempty"`

	OrgID string `bun:"org_id,type:text,notnull" json:"orgId"`
}

func (er *RoutePolicy) Validate() error {
	if er == nil {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "route_policy cannot be nil")
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
	GetByID(ctx context.Context, orgId string, id string) (*RoutePolicy, error)
	Create(ctx context.Context, route *RoutePolicy) error
	CreateBatch(ctx context.Context, routes []*RoutePolicy) error
	Delete(ctx context.Context, orgId string, id string) error
	GetAllByKind(ctx context.Context, orgID string, kind ExpressionKind) ([]*RoutePolicy, error)
	GetAllByName(ctx context.Context, orgID string, name string) ([]*RoutePolicy, error)
	DeleteRouteByName(ctx context.Context, orgID string, name string) error
	GetAll(ctx context.Context, orgID string) ([]*RoutePolicy, error)
}

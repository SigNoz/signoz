package nfroutingtypes

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/prometheus/alertmanager/featurecontrol"
	"github.com/prometheus/alertmanager/matcher/compat"
	"github.com/uptrace/bun"
)

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
	} else {
		if !CanConvertToPrometheusMatchers(req.Expression) {
			return fmt.Errorf("expression cannot be converted to valid Prometheus matchers")
		}
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
		TimeAuditable: types.TimeAuditable{
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
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
	GetByID(ctx context.Context, id valuer.UUID) (*ExpressionRoute, error)
	Create(ctx context.Context, route *ExpressionRoute) (valuer.UUID, error)
	Update(ctx context.Context, route *ExpressionRoute) error
	Delete(ctx context.Context, id string) error
	GetAllByOrgID(ctx context.Context, orgID string) ([]ExpressionRoute, error)
}

var (
	initOnce sync.Once
)

// CanConvertToPrometheusMatchers checks if an expression can be converted to valid Prometheus matchers
func CanConvertToPrometheusMatchers(expression string) bool {
	expression = strings.TrimSpace(expression)
	if expression == "" {
		return false
	}

	// Initialize parser once
	initOnce.Do(func() {
		logger := slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelError}))
		compat.InitFromFlags(logger, featurecontrol.NoopFlags{})
	})

	// Split by logical operators and validate each part
	parts := strings.FieldsFunc(expression, func(r rune) bool {
		return r == '&' || r == '|'
	})

	for _, part := range parts {
		part = strings.Trim(strings.TrimSpace(part), "()")
		if part == "" {
			continue
		}

		if _, err := compat.Matcher(part, "noop"); err != nil {
			return false
		}
	}

	return true
}

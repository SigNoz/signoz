// Package nfmanager provides interfaces and implementations for alert notification grouping strategies.
package nfmanager

import (
	"context"

	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/prometheus/common/model"
)

// NotificationManager defines how alerts should be grouped and configured for notification.
type NotificationManager interface {
	// Notification Config CRUD
	GetNotificationConfig(orgID string, ruleID string) (*alertmanagertypes.NotificationConfig, error)
	SetNotificationConfig(orgID string, ruleID string, config *alertmanagertypes.NotificationConfig) error
	DeleteNotificationConfig(orgID string, ruleID string) error

	// Route Policy CRUD
	CreateRoutePolicy(ctx context.Context, orgID string, route *alertmanagertypes.RoutePolicy) error
	CreateRoutePolicies(ctx context.Context, orgID string, routes []*alertmanagertypes.RoutePolicy) error
	GetRoutePolicyByID(ctx context.Context, orgID string, routeID string) (*alertmanagertypes.RoutePolicy, error)
	GetAllRoutePolicies(ctx context.Context, orgID string) ([]*alertmanagertypes.RoutePolicy, error)
	DeleteRoutePolicy(ctx context.Context, orgID string, routeID string) error
	DeleteAllRoutePoliciesByName(ctx context.Context, orgID string, name string) error

	// Route matching
	Match(ctx context.Context, orgID string, ruleID string, set model.LabelSet) ([]string, error)
}

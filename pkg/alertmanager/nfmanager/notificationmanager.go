// Package nfmanager provides interfaces and implementations for alert notification grouping strategies.
// It supports multi-tenancy and rule-based grouping configurations.
package nfmanager

import (
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/prometheus/alertmanager/types"
)

// NotificationManager defines how alerts should be grouped and configured for notification with multi-tenancy support.
type NotificationManager interface {
	GetNotificationConfig(orgID string, ruleID string, alert *types.Alert) (*alertmanagertypes.NotificationConfig, error)
	SetNotificationConfig(orgID string, ruleID string, config *alertmanagertypes.NotificationConfig) error
}

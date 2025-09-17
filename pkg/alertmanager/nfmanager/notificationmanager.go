// Package nfmanager provides interfaces and implementations for alert notification grouping strategies.
package nfmanager

import (
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
)

// NotificationManager defines how alerts should be grouped and configured for notification with multi-tenancy support.
type NotificationManager interface {
	GetNotificationConfig(orgID string, ruleID string) (*alertmanagertypes.NotificationConfig, error)
	SetNotificationConfig(orgID string, ruleID string, config *alertmanagertypes.NotificationConfig) error
	DeleteNotificationConfig(orgID string, ruleID string) error
}

// Package nfmanager provides interfaces and implementations for alert notification grouping strategies.
// It supports multi-tenancy and rule-based grouping configurations.
package nfmanager

import (
	"time"

	"github.com/prometheus/alertmanager/types"
	"github.com/prometheus/common/model"
)

// NotificationConfig holds configuration for alert notifications timing.
type NotificationConfig struct {
	NotificationGroup model.LabelSet `json:"notification_group"`
	RenotifyInterval  time.Duration  `json:"renotifyInterval,omitempty"`
}

// NotificationManager defines how alerts should be grouped and configured for notification with multi-tenancy support.
type NotificationManager interface {
	GetNotificationConfig(orgID string, alert *types.Alert) (*NotificationConfig, error)
	SetNotificationConfig(orgID string, alert *types.Alert, config *NotificationConfig) error
}

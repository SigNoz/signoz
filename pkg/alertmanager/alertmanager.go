package alertmanager

import (
	"context"

	"go.signoz.io/signoz/pkg/types/alertmanagertypes"
)

type Alertmanager interface {
	// GetAlerts gets the alerts from the alertmanager per organization.
	GetAlerts(context.Context, string, alertmanagertypes.GettableAlertsParams) (alertmanagertypes.GettableAlerts, error)

	// PutAlerts puts the alerts into the alertmanager per organization.
	PutAlerts(context.Context, string, alertmanagertypes.PostableAlerts) error

	// SetConfig sets the config into the alertmanager per organization.
	SetConfig(context.Context, string, *alertmanagertypes.Config) error

	// TestReceiver sends a test alert to a receiver.
	TestReceiver(context.Context, string, alertmanagertypes.Receiver) error
}

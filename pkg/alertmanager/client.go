package alertmanager

import (
	"context"

	"go.signoz.io/signoz/pkg/alertmanager/alertmanagertypes"
)

type Client interface {
	// PutAlerts puts the alerts into the alertmanager per organization.
	PutAlerts(context.Context, string, alertmanagertypes.PostableAlerts) error

	// SetConfig sets the config into the alertmanager per organization.
	SetConfig(context.Context, string, *alertmanagertypes.Config) error

	// TestReceiver sends a test alert to a receiver.
	TestReceiver(context.Context, string, alertmanagertypes.Receiver) error
}

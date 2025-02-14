package alertmanager

import (
	"context"

	"go.signoz.io/signoz/pkg/types/alertmanagertypes"
)

type Client interface {
	// GetAlerts gets the alerts from the alertmanager per organization.
	GetAlerts(context.Context, string, alertmanagertypes.GettableAlertsParams) (alertmanagertypes.GettableAlerts, error)

	// PutAlerts puts the alerts into the alertmanager per organization.
	PutAlerts(context.Context, string, alertmanagertypes.PostableAlerts) error

	// SetConfig sets the config into the alertmanager per organization.
	SetConfig(context.Context, string, alertmanagertypes.PostableConfig) error

	// TestReceiver sends a test alert to a receiver.
	TestReceiver(context.Context, string, alertmanagertypes.Receiver) error

	// CreateChannel creates a channel for the organization.
	CreateChannel(context.Context, string, *alertmanagertypes.Channel) error

	// GetChannel gets a channel for the organization.
	GetChannel(context.Context, string, uint64) (*alertmanagertypes.Channel, error)

	// DeleteChannel deletes a channel for the organization.
	DelChannel(context.Context, string, uint64) error

	// ListChannels lists all channels for the organization.
	ListChannels(context.Context, string) (alertmanagertypes.Channels, error)

	// UpdateChannel updates a channel for the organization.
	UpdateChannel(context.Context, string, uint64, string) error
}

package alertmanager

import (
	"context"

	"go.signoz.io/signoz/pkg/errors"
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/types/alertmanagertypes"
)

var (
	ErrCodeAlertmanagerNotFound = errors.MustNewCode("alertmanager_not_found")
)

type Alertmanager interface {
	factory.Service
	// GetAlerts gets the alerts from the alertmanager per organization.
	GetAlerts(context.Context, string, alertmanagertypes.GettableAlertsParams) (alertmanagertypes.DeprecatedGettableAlerts, error)

	// PutAlerts puts the alerts into the alertmanager per organization.
	PutAlerts(context.Context, string, alertmanagertypes.PostableAlerts) error

	// TestReceiver sends a test alert to a receiver.
	TestReceiver(context.Context, string, alertmanagertypes.Receiver) error

	// ListChannels lists all channels for the organization.
	ListChannels(context.Context, string) ([]*alertmanagertypes.Channel, error)

	// ListAllChannels lists all channels for all organizations. It is used by the legacy alertmanager only.
	ListAllChannels(context.Context) ([]*alertmanagertypes.Channel, error)

	// GetChannelByID gets a channel for the organization.
	GetChannelByID(context.Context, string, int) (*alertmanagertypes.Channel, error)

	// UpdateChannel updates a channel for the organization.
	UpdateChannelByReceiverAndID(context.Context, string, alertmanagertypes.Receiver, int) error

	// CreateChannel creates a channel for the organization.
	CreateChannel(context.Context, string, alertmanagertypes.Receiver) error

	// DeleteChannelByID deletes a channel for the organization.
	DeleteChannelByID(context.Context, string, int) error
}

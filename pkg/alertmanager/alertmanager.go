package alertmanager

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/statsreporter"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/valuer"
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

	// TestAlert sends an alert to a list of receivers.
	TestAlert(ctx context.Context, orgID string, alert *alertmanagertypes.PostableAlert, receivers []string) error

	// ListChannels lists all channels for the organization.
	ListChannels(context.Context, string) ([]*alertmanagertypes.Channel, error)

	// ListAllChannels lists all channels for all organizations. It is used by the legacy alertmanager only.
	ListAllChannels(context.Context) ([]*alertmanagertypes.Channel, error)

	// GetChannelByID gets a channel for the organization.
	GetChannelByID(context.Context, string, valuer.UUID) (*alertmanagertypes.Channel, error)

	// UpdateChannel updates a channel for the organization.
	UpdateChannelByReceiverAndID(context.Context, string, alertmanagertypes.Receiver, valuer.UUID) error

	// CreateChannel creates a channel for the organization.
	CreateChannel(context.Context, string, alertmanagertypes.Receiver) error

	// DeleteChannelByID deletes a channel for the organization.
	DeleteChannelByID(context.Context, string, valuer.UUID) error

	// SetConfig sets the config for the organization.
	SetConfig(context.Context, *alertmanagertypes.Config) error

	// GetConfig gets the config for the organization.
	GetConfig(context.Context, string) (*alertmanagertypes.Config, error)

	// SetDefaultConfig sets the default config for the organization.
	SetDefaultConfig(context.Context, string) error

	// Collects stats for the organization.
	statsreporter.StatsCollector
}

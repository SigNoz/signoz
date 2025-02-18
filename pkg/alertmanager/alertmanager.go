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
	GetAlerts(context.Context, string, alertmanagertypes.GettableAlertsParams) (alertmanagertypes.GettableAlerts, error)

	// PutAlerts puts the alerts into the alertmanager per organization.
	PutAlerts(context.Context, string, alertmanagertypes.PostableAlerts) error

	// TestReceiver sends a test alert to a receiver.
	TestReceiver(context.Context, string, alertmanagertypes.Receiver) error
}

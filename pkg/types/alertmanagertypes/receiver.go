package alertmanagertypes

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/template"
	"github.com/prometheus/common/model"

	"github.com/prometheus/alertmanager/config"
	"github.com/prometheus/alertmanager/config/receiver"
)

type (
	// Receiver is the type for the receiver configuration.
	Receiver = config.Receiver
)

func NewReceiverIntegrations(nc Receiver, tmpl *template.Template, logger *slog.Logger) ([]notify.Integration, error) {
	return receiver.BuildReceiverIntegrations(nc, tmpl, logger)
}

func NewTestAlert(receiver Receiver, startsAt time.Time, updatedAt time.Time) *Alert {
	return &Alert{
		Alert: model.Alert{
			StartsAt: startsAt,
			Labels: model.LabelSet{
				"alertname": model.LabelValue(fmt.Sprintf("Test Alert (%s)", receiver.Name)),
				"severity":  "critical",
			},
			Annotations: model.LabelSet{
				"description": "Test alert fired from SigNoz",
				"summary":     "Test alert fired from SigNoz",
				"message":     "Test alert fired from SigNoz",
			},
		},
		UpdatedAt: updatedAt,
	}
}

func TestReceiver(ctx context.Context, receiver Receiver, tmpl *template.Template, logger *slog.Logger) error {
	now := time.Now()
	testAlert := NewTestAlert(receiver, now, now)

	ctx = notify.WithGroupKey(ctx, fmt.Sprintf("%s-%s-%d", receiver.Name, testAlert.Labels.Fingerprint(), now.Unix()))
	ctx = notify.WithGroupLabels(ctx, testAlert.Labels)
	ctx = notify.WithReceiverName(ctx, receiver.Name)

	integrations, err := NewReceiverIntegrations(receiver, tmpl, logger)
	if err != nil {
		return err
	}

	if _, err = integrations[0].Notify(ctx, testAlert); err != nil {
		return err
	}

	return nil
}

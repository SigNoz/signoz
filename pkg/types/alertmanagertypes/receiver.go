package alertmanagertypes

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/template"

	"github.com/prometheus/alertmanager/config"
	"github.com/prometheus/alertmanager/config/receiver"
)

type (
	// Receiver is the type for the receiver configuration.
	Receiver = config.Receiver
)

func NewReceiver(input string) (Receiver, error) {
	receiver := Receiver{}
	err := json.Unmarshal([]byte(input), &receiver)
	if err != nil {
		return Receiver{}, err
	}

	return receiver, nil
}

func NewReceiverIntegrations(nc Receiver, tmpl *template.Template, logger *slog.Logger) ([]notify.Integration, error) {
	return receiver.BuildReceiverIntegrations(nc, tmpl, logger)
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

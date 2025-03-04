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

func newRouteFromReceiver(receiver Receiver) *config.Route {
	return &config.Route{Receiver: receiver.Name, Continue: true}
}

func NewReceiverIntegrations(nc Receiver, tmpl *template.Template, logger *slog.Logger) ([]notify.Integration, error) {
	return receiver.BuildReceiverIntegrations(nc, tmpl, logger)
}

func TestReceiver(ctx context.Context, receiver Receiver, tmpl *template.Template, logger *slog.Logger, alert *Alert) error {
	ctx = notify.WithGroupKey(ctx, fmt.Sprintf("%s-%s-%d", receiver.Name, alert.Labels.Fingerprint(), time.Now().Unix()))
	ctx = notify.WithGroupLabels(ctx, alert.Labels)
	ctx = notify.WithReceiverName(ctx, receiver.Name)

	integrations, err := NewReceiverIntegrations(receiver, tmpl, logger)
	if err != nil {
		return err
	}

	if _, err = integrations[0].Notify(ctx, alert); err != nil {
		return err
	}

	return nil
}

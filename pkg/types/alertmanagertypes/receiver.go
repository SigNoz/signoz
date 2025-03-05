package alertmanagertypes

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/template"
	"go.signoz.io/signoz/pkg/errors"

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

func TestReceiver(ctx context.Context, receiver Receiver, config *Config, tmpl *template.Template, logger *slog.Logger, alert *Alert) error {
	ctx = notify.WithGroupKey(ctx, fmt.Sprintf("%s-%s-%d", receiver.Name, alert.Labels.Fingerprint(), time.Now().Unix()))
	ctx = notify.WithGroupLabels(ctx, alert.Labels)
	ctx = notify.WithReceiverName(ctx, receiver.Name)

	testConfig, err := config.CopyWithReset()
	if err != nil {
		return err
	}

	if err := testConfig.CreateReceiver(receiver); err != nil {
		return err
	}

	integrations, err := NewReceiverIntegrations(receiver, tmpl, logger)
	if err != nil {
		return err
	}

	if len(integrations) == 0 {
		return errors.Newf(errors.TypeNotFound, errors.CodeNotFound, "no integrations found for receiver %s", receiver.Name)
	}

	if _, err = integrations[0].Notify(ctx, alert); err != nil {
		return err
	}

	return nil
}

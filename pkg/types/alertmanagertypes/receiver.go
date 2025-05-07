package alertmanagertypes

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/template"
	"gopkg.in/yaml.v2"

	"github.com/prometheus/alertmanager/config"
	"github.com/prometheus/alertmanager/config/receiver"
)

type (
	// Receiver is the type for the receiver configuration.
	Receiver = config.Receiver
)

// Creates a new receiver from a string. The input is initialized with the default values from the upstream alertmanager.
// The only default value which is missed is `send_resolved` (as it is a bool) which if not set in the input will always be set to `false`.
func NewReceiver(input string) (Receiver, error) {
	receiver := Receiver{}
	err := json.Unmarshal([]byte(input), &receiver)
	if err != nil {
		return Receiver{}, err
	}

	// We marshal and unmarshal the receiver to ensure that the receiver is
	// initialized with defaults from the upstream alertmanager.
	bytes, err := yaml.Marshal(receiver)
	if err != nil {
		return Receiver{}, err
	}

	receiverWithDefaults := Receiver{}
	if err := yaml.Unmarshal(bytes, &receiverWithDefaults); err != nil {
		return Receiver{}, err
	}

	if err := receiverWithDefaults.UnmarshalYAML(func(i interface{}) error { return nil }); err != nil {
		return Receiver{}, err
	}

	return receiverWithDefaults, nil
}

func NewReceiverIntegrations(nc Receiver, tmpl *template.Template, logger *slog.Logger) ([]notify.Integration, error) {
	return receiver.BuildReceiverIntegrations(nc, tmpl, logger)
}

func TestReceiver(ctx context.Context, receiver Receiver, config *Config, tmpl *template.Template, logger *slog.Logger, alert *Alert) error {
	ctx = notify.WithGroupKey(ctx, fmt.Sprintf("%s-%s-%d", receiver.Name, alert.Labels.Fingerprint(), time.Now().Unix()))
	ctx = notify.WithGroupLabels(ctx, alert.Labels)
	ctx = notify.WithReceiverName(ctx, receiver.Name)

	// We need to create a new config with the same global and route config but empty receivers and routes
	// This is so that we can call CreateReceiver without worrying about the existing receivers and routes.
	// CreateReceiver will ensure that any defaults (such as http config in the case of slack) are set. Otherwise the integration will panic.
	testConfig, err := config.CopyWithReset()
	if err != nil {
		return err
	}

	if err := testConfig.CreateReceiver(receiver); err != nil {
		return err
	}

	receiver, err = testConfig.GetReceiver(receiver.Name)
	if err != nil {
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

// This is needed by the legacy alertmanager to convert the MSTeamsV2Configs to MSTeamsConfigs
func MSTeamsV2ReceiverToMSTeamsReceiver(receiver Receiver) Receiver {
	if receiver.MSTeamsV2Configs == nil {
		return receiver
	}

	var msTeamsConfigs []*config.MSTeamsConfig
	for _, cfg := range receiver.MSTeamsV2Configs {
		msTeamsConfigs = append(msTeamsConfigs, &config.MSTeamsConfig{
			NotifierConfig: cfg.NotifierConfig,
			HTTPConfig:     cfg.HTTPConfig,
			WebhookURL:     cfg.WebhookURL,
			WebhookURLFile: cfg.WebhookURLFile,
			Title:          cfg.Title,
			Text:           cfg.Text,
		})
	}

	receiver.MSTeamsV2Configs = nil
	receiver.MSTeamsConfigs = msTeamsConfigs

	return receiver
}

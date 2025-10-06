package alertmanagertypes

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/prometheus/common/model"
	"log/slog"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/template"
	"gopkg.in/yaml.v2"

	"github.com/prometheus/alertmanager/config"
)

type (
	// Receiver is the type for the receiver configuration.
	Receiver                 = config.Receiver
	ReceiverIntegrationsFunc = func(nc Receiver, tmpl *template.Template, logger *slog.Logger) ([]notify.Integration, error)
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

func TestReceiver(ctx context.Context, receiver Receiver, receiverIntegrationsFunc ReceiverIntegrationsFunc, config *Config, tmpl *template.Template, logger *slog.Logger, lSet model.LabelSet, alert ...*Alert) error {
	ctx = notify.WithGroupKey(ctx, fmt.Sprintf("%s-%s-%d", receiver.Name, lSet.Fingerprint(), time.Now().Unix()))
	ctx = notify.WithGroupLabels(ctx, lSet)
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

	integrations, err := receiverIntegrationsFunc(receiver, tmpl, logger)
	if err != nil {
		return err
	}

	if len(integrations) == 0 {
		return errors.Newf(errors.TypeNotFound, errors.CodeNotFound, "no integrations found for receiver %s", receiver.Name)
	}

	if _, err = integrations[0].Notify(ctx, alert...); err != nil {
		return err
	}

	return nil
}

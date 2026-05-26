package alertmanagertypes

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/prometheus/common/model"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/template"
	"gopkg.in/yaml.v2"

	"github.com/prometheus/alertmanager/config"
)

// Receiver extends the upstream alertmanager config.Receiver with SigNoz-native
// notifier configs (e.g. Google Chat) that upstream does not know about.
//
// The embedded *config.Receiver carries every upstream notifier field; the
// SigNoz-native configs are declared alongside it. Because config.Receiver has
// no custom (Un)MarshalJSON, encoding/json marshals the embed inline, so
// json.Marshal and json.Unmarshal of a *Receiver round-trip both the upstream
// and the native configs in a single pass — no side maps or field allow-lists
// are needed. To add another native channel, add a field here and a loop in
// alertmanagernotify.NewReceiverIntegrations.
type Receiver struct {
	*config.Receiver
	GoogleChatConfigs []*GoogleChatReceiverConfig `json:"googlechat_configs,omitempty" yaml:"googlechat_configs,omitempty"`
}

// NewReceiver builds a Receiver from its JSON representation, applying the
// upstream alertmanager defaults to the base receiver. The only default missed
// is `send_resolved` (a bool) which, if absent from the input, stays false.
func NewReceiver(input string) (*Receiver, error) {
	receiver := &Receiver{Receiver: &config.Receiver{}}
	if err := json.Unmarshal([]byte(input), receiver); err != nil {
		return nil, err
	}

	// Round-trip the base receiver through YAML so the upstream defaults are
	// applied via each notifier config's UnmarshalYAML (mirrors upstream
	// alertmanager). The native configs on the embed are unaffected.
	withDefaults, err := defaultedBaseReceiver(receiver.Receiver)
	if err != nil {
		return nil, err
	}
	receiver.Receiver = withDefaults

	return receiver, nil
}

func defaultedBaseReceiver(base *config.Receiver) (*config.Receiver, error) {
	bytes, err := yaml.Marshal(base)
	if err != nil {
		return nil, err
	}

	withDefaults := &config.Receiver{}
	if err := yaml.Unmarshal(bytes, withDefaults); err != nil {
		return nil, err
	}

	if err := withDefaults.UnmarshalYAML(func(i interface{}) error { return nil }); err != nil {
		return nil, err
	}

	return withDefaults, nil
}

func TestReceiver(ctx context.Context, receiver *Receiver, receiverIntegrationsFunc ReceiverIntegrationsFunc, config *Config, tmpl *template.Template, logger *slog.Logger, templater Templater, lSet model.LabelSet, alert ...*Alert) error {
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

	defaultedReceiver, err := testConfig.GetReceiver(receiver.Name)
	if err != nil {
		return err
	}

	integrations, err := receiverIntegrationsFunc(defaultedReceiver, tmpl, logger, templater)
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

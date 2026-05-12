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
	commoncfg "github.com/prometheus/common/config"
	"gopkg.in/yaml.v2"

	"github.com/prometheus/alertmanager/config"
)

// Receiver extends the base alertmanager config.Receiver with custom configs support.
type Receiver struct {
	*config.Receiver
	GoogleChatConfigs []*GoogleChatReceiverConfig `json:"googlechat_configs,omitempty" yaml:"googlechat_configs,omitempty"`
}

type ReceiverIntegrationsFunc = func(nc *Receiver, tmpl *template.Template, logger *slog.Logger) ([]notify.Integration, error)

// Creates a new receiver from a string. The input is initialized with the default values from the upstream alertmanager.
// The only default value which is missed is `send_resolved` (as it is a bool) which if not set in the input will always be set to `false`.
func NewReceiver(input string) (*Receiver, error) {
	var rawData map[string]interface{}
	if err := json.Unmarshal([]byte(input), &rawData); err != nil {
		return nil, err
	}

	googleChatConfigs := extractReceiverConfigList[GoogleChatReceiverConfig](rawData, receiverFieldGoogleChatConfigs)

	cleanedInput, err := json.Marshal(rawData)
	if err != nil {
		return nil, err
	}

	baseReceiver := &config.Receiver{}
	if err := json.Unmarshal(cleanedInput, baseReceiver); err != nil {
		return nil, err
	}

	bytes, err := yaml.Marshal(baseReceiver)
	if err != nil {
		return nil, err
	}

	receiverWithDefaults := &config.Receiver{}
	if err := yaml.Unmarshal(bytes, &receiverWithDefaults); err != nil {
		return nil, err
	}

	if err := receiverWithDefaults.UnmarshalYAML(func(i interface{}) error { return nil }); err != nil {
		return nil, err
	}
	defaultReceiverHTTPConfigs(receiverWithDefaults)

	return &Receiver{
		Receiver:          receiverWithDefaults,
		GoogleChatConfigs: googleChatConfigs,
	}, nil
}

func defaultReceiverHTTPConfigs(receiver *config.Receiver) {
	for _, cfg := range receiver.WebhookConfigs {
		if cfg.HTTPConfig == nil {
			cfg.HTTPConfig = &commoncfg.HTTPClientConfig{}
		}
	}
	for _, cfg := range receiver.SlackConfigs {
		if cfg.HTTPConfig == nil {
			cfg.HTTPConfig = &commoncfg.HTTPClientConfig{}
		}
	}
	for _, cfg := range receiver.PagerdutyConfigs {
		if cfg.HTTPConfig == nil {
			cfg.HTTPConfig = &commoncfg.HTTPClientConfig{}
		}
	}
	for _, cfg := range receiver.OpsGenieConfigs {
		if cfg.HTTPConfig == nil {
			cfg.HTTPConfig = &commoncfg.HTTPClientConfig{}
		}
	}
	for _, cfg := range receiver.MSTeamsConfigs {
		if cfg.HTTPConfig == nil {
			cfg.HTTPConfig = &commoncfg.HTTPClientConfig{}
		}
	}
	for _, cfg := range receiver.MSTeamsV2Configs {
		if cfg.HTTPConfig == nil {
			cfg.HTTPConfig = &commoncfg.HTTPClientConfig{}
		}
	}
}

func TestReceiver(ctx context.Context, receiver *Receiver, receiverIntegrationsFunc ReceiverIntegrationsFunc, config *Config, tmpl *template.Template, logger *slog.Logger, lSet model.LabelSet, alert ...*Alert) error {
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

	baseReceiver, err := testConfig.GetReceiver(receiver.Name)
	if err != nil {
		return err
	}

	integrations, err := receiverIntegrationsFunc(baseReceiver, tmpl, logger)
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

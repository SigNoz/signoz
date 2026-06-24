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

// Receiver embeds upstream config.Receiver to support custom receivers
// To add another native notifier, mirror GoogleChatConfigs here
// and extend customReceiverConfigs in config.go.
type Receiver struct {
	*config.Receiver
	GoogleChatConfigs []*GoogleChatReceiverConfig `json:"googlechat_configs,omitempty" yaml:"googlechat_configs,omitempty"`
}

// NewReceiver builds a Receiver from its JSON input, applying each notifier
// config's per-config defaults via UnmarshalYAML.
func NewReceiver(input string) (*Receiver, error) {
	receiver := &Receiver{Receiver: &config.Receiver{}}
	if err := json.Unmarshal([]byte(input), receiver); err != nil {
		return nil, err
	}

	withDefaults, err := defaultedBaseReceiver(receiver.Receiver)
	if err != nil {
		return nil, err
	}
	receiver.Receiver = withDefaults

	// Fix custom_fields: YAML unmarshal converts map[string]interface{} to map[interface{}]interface{}
	// which breaks JSON marshaling. We need to convert it back. Jira rides on the native
	// config.JiraConfigs carried by the embedded *config.Receiver.
	for _, jiraConfig := range receiver.Receiver.JiraConfigs {
		if jiraConfig.Fields != nil {
			jiraConfig.Fields = convertMapInterfaceToMapString(jiraConfig.Fields)
		}
	}

	// Extend this block when adding another native notifier type.
	for i, gc := range receiver.GoogleChatConfigs {
		defaulted, err := defaultedNotifierConfig(gc)
		if err != nil {
			return nil, err
		}
		receiver.GoogleChatConfigs[i] = defaulted
	}

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

// defaultedNotifierConfig triggers T.UnmarshalYAML via a yaml round-trip,
// installing T's DefaultXxxConfig over user values.
func defaultedNotifierConfig[T any](cfg *T) (*T, error) {
	bytes, err := yaml.Marshal(cfg)
	if err != nil {
		return nil, err
	}
	out := new(T)
	if err := yaml.Unmarshal(bytes, out); err != nil {
		return nil, err
	}
	return out, nil
}

// convertMapInterfaceToMapString recursively converts map[interface{}]interface{} to map[string]interface{}
// This is needed because YAML unmarshal creates map[interface{}]interface{} but JSON marshal requires map[string]interface{}
func convertMapInterfaceToMapString(input map[string]interface{}) map[string]interface{} {
	output := make(map[string]interface{})
	for key, value := range input {
		output[key] = convertValue(value)
	}
	return output
}

func convertValue(value interface{}) interface{} {
	switch v := value.(type) {
	case map[interface{}]interface{}:
		// Convert map[interface{}]interface{} to map[string]interface{}
		result := make(map[string]interface{})
		for key, val := range v {
			if strKey, ok := key.(string); ok {
				result[strKey] = convertValue(val)
			}
		}
		return result
	case map[string]interface{}:
		// Recursively convert nested maps
		result := make(map[string]interface{})
		for key, val := range v {
			result[key] = convertValue(val)
		}
		return result
	case []interface{}:
		// Recursively convert slices
		result := make([]interface{}, len(v))
		for i, val := range v {
			result[i] = convertValue(val)
		}
		return result
	default:
		return value
	}
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

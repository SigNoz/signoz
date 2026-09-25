package alertmanagertypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/prometheus/alertmanager/config"
)

// ChannelJSMOpsConfig carries no API URL: JSM Ops is a single global gateway
// keyed by the integration API key, which the notifier pins itself.
type ChannelJSMOpsConfig struct {
	SendResolved *bool                        `json:"sendResolved,omitempty"`
	APIKey       string                       `json:"apiKey" required:"true" format:"password"`
	Message      valuer.UnsetOrNonEmptyString `json:"message,omitzero"`
	Description  valuer.UnsetOrNonEmptyString `json:"description,omitzero"`
	Priority     string                       `json:"priority"`
	// Tags is the comma-separated list JSM Ops attaches to the alert.
	Tags valuer.UnsetOrNonEmptyString `json:"tags,omitzero"`
}

func (c *ChannelJSMOpsConfig) UnmarshalJSON(data []byte) error {
	type alias ChannelJSMOpsConfig
	if err := decodeStrict(data, (*alias)(c)); err != nil {
		return err
	}

	fillSendResolved(&c.SendResolved, DefaultJSMOpsReceiverConfig.VSendResolved)
	c.Message.SetIfUnset(DefaultJSMOpsReceiverConfig.Message)
	c.Description.SetIfUnset(DefaultJSMOpsReceiverConfig.Description)
	c.Tags.SetIfUnset(DefaultJSMOpsReceiverConfig.Tags)

	return c.Validate()
}

func (c ChannelJSMOpsConfig) Validate() error {
	if c.APIKey == "" {
		return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.apiKey is required for a jsmops channel")
	}

	return nil
}

func (c ChannelJSMOpsConfig) toUndefaultedReceiver(displayName string) (*Receiver, error) {
	return &Receiver{
		Receiver: &config.Receiver{Name: displayName},
		JSMOpsConfigs: []*JSMOpsReceiverConfig{{
			NotifierConfig: config.NotifierConfig{VSendResolved: resolveSendResolved(c.SendResolved, DefaultJSMOpsReceiverConfig.VSendResolved)},
			APIKey:         config.Secret(c.APIKey),
			Message:        c.Message.StringValue(),
			Description:    c.Description.StringValue(),
			Priority:       c.Priority,
			Tags:           c.Tags.StringValue(),
		}},
	}, nil
}

func newChannelJSMOpsConfigFromReceiver(name string, receiver *Receiver) (ChannelSpec, error) {
	jsmops := receiver.JSMOpsConfigs[0]
	sendResolved := jsmops.VSendResolved

	if err := rejectAnyHTTPAuth(name, jsmops.HTTPConfig); err != nil {
		return nil, err
	}

	return &ChannelJSMOpsConfig{
		SendResolved: &sendResolved,
		APIKey:       string(jsmops.APIKey),
		Message:      valuer.UnsetIfEmpty(jsmops.Message),
		Description:  valuer.UnsetIfEmpty(jsmops.Description),
		Priority:     jsmops.Priority,
		Tags:         valuer.UnsetIfEmpty(jsmops.Tags),
	}, nil
}

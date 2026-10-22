package alertmanagertypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/prometheus/alertmanager/config"
)

type ChannelOpsgenieConfig struct {
	SendResolved *bool                        `json:"sendResolved,omitempty"`
	APIKey       string                       `json:"apiKey" required:"true" format:"password"`
	APIURL       string                       `json:"apiUrl"`
	Message      valuer.UnsetOrNonEmptyString `json:"message,omitzero"`
	Description  valuer.UnsetOrNonEmptyString `json:"description,omitzero"`
	Source       valuer.UnsetOrNonEmptyString `json:"source,omitzero"`
	Details      map[string]string            `json:"details,omitzero"`
	Priority     string                       `json:"priority"`
}

func (c *ChannelOpsgenieConfig) UnmarshalJSON(data []byte) error {
	type alias ChannelOpsgenieConfig
	if err := decodeStrict(data, (*alias)(c)); err != nil {
		return err
	}

	fillSendResolved(&c.SendResolved, config.DefaultOpsGenieConfig.VSendResolved)
	c.Message.SetIfUnset(config.DefaultOpsGenieConfig.Message)
	c.Description.SetIfUnset(config.DefaultOpsGenieConfig.Description)
	c.Source.SetIfUnset(config.DefaultOpsGenieConfig.Source)

	return c.Validate()
}

func (c ChannelOpsgenieConfig) Validate() error {
	if c.APIKey == "" {
		return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.apiKey is required for an opsgenie channel")
	}

	return nil
}

func (c ChannelOpsgenieConfig) toUndefaultedReceiver(displayName string) (*Receiver, error) {
	var apiURL *config.URL
	if c.APIURL != "" {
		parsed, err := parseUpstreamURL(c.APIURL)
		if err != nil {
			return nil, err
		}
		apiURL = parsed
	}

	return &Receiver{Receiver: &config.Receiver{
		Name: displayName,
		OpsGenieConfigs: []*config.OpsGenieConfig{{
			NotifierConfig: config.NotifierConfig{VSendResolved: resolveSendResolved(c.SendResolved, config.DefaultOpsGenieConfig.VSendResolved)},
			APIKey:         config.Secret(c.APIKey),
			APIURL:         apiURL,
			Message:        c.Message.StringValue(),
			Description:    c.Description.StringValue(),
			Source:         c.Source.StringValue(),
			Priority:       c.Priority,
			Details:        c.Details,
		}},
	}}, nil
}

func newChannelOpsgenieConfigFromReceiver(name string, receiver *Receiver) (ChannelSpec, error) {
	opsgenie := receiver.OpsGenieConfigs[0]
	sendResolved := opsgenie.VSendResolved

	if err := rejectAnyHTTPAuth(name, opsgenie.HTTPConfig); err != nil {
		return nil, err
	}

	return &ChannelOpsgenieConfig{
		SendResolved: &sendResolved,
		APIKey:       string(opsgenie.APIKey),
		APIURL:       formatUpstreamURL(opsgenie.APIURL),
		Message:      valuer.UnsetIfEmpty(opsgenie.Message),
		Description:  valuer.UnsetIfEmpty(opsgenie.Description),
		Source:       valuer.UnsetIfEmpty(opsgenie.Source),
		Priority:     opsgenie.Priority,
		Details:      opsgenie.Details,
	}, nil
}

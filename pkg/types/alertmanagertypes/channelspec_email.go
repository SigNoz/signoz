package alertmanagertypes

import (
	"maps"
	"net/textproto"
	"slices"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/prometheus/alertmanager/config"
)

// ChannelEmailConfig carries no SMTP transport fields: the smarthost,
// credentials and TLS settings come from the deployment's global config, so a
// channel can only choose recipients and body.
type ChannelEmailConfig struct {
	SendResolved *bool                        `json:"sendResolved,omitempty"`
	To           string                       `json:"to" required:"true"`
	HTML         valuer.UnsetOrNonEmptyString `json:"html,omitzero"`
	Headers      map[string]string            `json:"headers,omitzero" nullable:"false"`
}

func (c *ChannelEmailConfig) UnmarshalJSON(data []byte) error {
	type alias ChannelEmailConfig
	if err := decodeStrict(data, (*alias)(c)); err != nil {
		return err
	}

	fillSendResolved(&c.SendResolved, config.DefaultEmailConfig.VSendResolved)
	c.HTML.SetIfUnset(config.DefaultEmailConfig.HTML)

	return c.Validate()
}

func (c ChannelEmailConfig) Validate() error {
	if c.To == "" {
		return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.to is required for an email channel")
	}

	// A read reports header names as textproto canonicalizes them, turning
	// "subject" into "Subject", so a name that is not already in that form is
	// rejected rather than answered with one the caller never sent.
	for _, header := range slices.Sorted(maps.Keys(c.Headers)) {
		if canonical := textproto.CanonicalMIMEHeaderKey(header); canonical != header {
			return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.headers name %q must be written as %q", header, canonical)
		}
	}

	return nil
}

func (c ChannelEmailConfig) toUndefaultedReceiver(displayName string) (*Receiver, error) {
	return &Receiver{Receiver: &config.Receiver{
		Name: displayName,
		EmailConfigs: []*config.EmailConfig{{
			NotifierConfig: config.NotifierConfig{VSendResolved: resolveSendResolved(c.SendResolved, config.DefaultEmailConfig.VSendResolved)},
			To:             c.To,
			HTML:           c.HTML.StringValue(),
			Headers:        c.Headers,
		}},
	}}, nil
}

func newChannelEmailConfigFromReceiver(_ string, receiver *Receiver) (ChannelSpec, error) {
	email := receiver.EmailConfigs[0]
	sendResolved := email.VSendResolved

	return &ChannelEmailConfig{
		SendResolved: &sendResolved,
		To:           email.To,
		HTML:         valuer.UnsetIfEmpty(email.HTML),
		Headers:      email.Headers,
	}, nil
}

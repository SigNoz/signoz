package alertmanagertypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/prometheus/alertmanager/config"
)

type ChannelIncidentIOConfig struct {
	SendResolved *bool                        `json:"sendResolved,omitempty"`
	URL          string                       `json:"url" required:"true"`
	Token        string                       `json:"token" required:"true" format:"password"`
	Title        valuer.UnsetOrNonEmptyString `json:"title,omitzero"`
	Description  valuer.UnsetOrNonEmptyString `json:"description,omitzero"`
	Metadata     map[string]string            `json:"metadata,omitzero" nullable:"false"`
}

func (c *ChannelIncidentIOConfig) UnmarshalJSON(data []byte) error {
	type alias ChannelIncidentIOConfig
	if err := decodeStrict(data, (*alias)(c)); err != nil {
		return err
	}

	fillSendResolved(&c.SendResolved, DefaultIncidentIOReceiverConfig.VSendResolved)
	c.Title.SetIfUnset(DefaultIncidentIOReceiverConfig.Title)
	c.Description.SetIfUnset(DefaultIncidentIOReceiverConfig.Description)

	return c.Validate()
}

func (c ChannelIncidentIOConfig) Validate() error {
	if c.URL == "" {
		return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.url is required for an incidentio channel")
	}

	if c.Token == "" {
		return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.token is required for an incidentio channel")
	}

	return nil
}

func (c ChannelIncidentIOConfig) toUndefaultedReceiver(displayName string) (*Receiver, error) {
	return &Receiver{
		Receiver: &config.Receiver{Name: displayName},
		IncidentIOConfigs: []*IncidentIOReceiverConfig{{
			NotifierConfig: config.NotifierConfig{VSendResolved: resolveSendResolved(c.SendResolved, DefaultIncidentIOReceiverConfig.VSendResolved)},
			URL:            c.URL,
			Token:          config.Secret(c.Token),
			Title:          c.Title.StringValue(),
			Description:    c.Description.StringValue(),
			Metadata:       c.Metadata,
		}},
	}, nil
}

func newChannelIncidentIOConfigFromReceiver(name string, receiver *Receiver) (ChannelSpec, error) {
	incidentio := receiver.IncidentIOConfigs[0]
	sendResolved := incidentio.VSendResolved

	if err := rejectAnyHTTPAuth(name, incidentio.HTTPConfig); err != nil {
		return nil, err
	}

	return &ChannelIncidentIOConfig{
		SendResolved: &sendResolved,
		URL:          incidentio.URL,
		Token:        string(incidentio.Token),
		Title:        valuer.UnsetIfEmpty(incidentio.Title),
		Description:  valuer.UnsetIfEmpty(incidentio.Description),
		Metadata:     incidentio.Metadata,
	}, nil
}

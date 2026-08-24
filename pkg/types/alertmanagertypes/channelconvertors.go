package alertmanagertypes

import (
	"encoding/json"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/prometheus/alertmanager/config"
)

// ════════════════════════════════════════════════════════════════════════
// API -> storage
// ════════════════════════════════════════════════════════════════════════

// ToReceiver hands the assembled receiver to newDefaultedReceiver, which is the
// only place upstream applies a notifier's defaults and validation — several
// integrations panic without them.
func (p *PostableNotificationChannel) ToReceiver() (*Receiver, error) {
	spec, ok := p.Config.Spec.(ChannelSpec)
	if !ok {
		return nil, errors.NewInternalf(errors.CodeInternal, "config.spec was not decoded into a known type")
	}

	receiver, err := spec.toReceiver(p.DisplayName)
	if err != nil {
		return nil, err
	}

	return newDefaultedReceiver(receiver)
}

// ════════════════════════════════════════════════════════════════════════
// Storage -> API
// ════════════════════════════════════════════════════════════════════════

// toPostableNotificationChannel derives the kind from the config the receiver
// actually carries rather than from Channel.Type, so a row written with several
// notifier kinds is rejected instead of reported under whichever one
// receiverChannelType happened to pick.
func (c *Channel) toPostableNotificationChannel() (*PostableNotificationChannel, error) {
	receiver := &Receiver{Receiver: &config.Receiver{}}
	if err := json.Unmarshal([]byte(c.Data), receiver); err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "unmarshal channel %q", c.Name)
	}

	if total := countNotifierConfigs(receiver); total > 1 {
		return nil, errors.NewInvalidInputf(
			ErrCodeAlertmanagerChannelInvalid,
			"channel %q carries %d notifier configurations; only one per channel is supported", c.Name, total,
		)
	}

	for _, channelKind := range channelKinds {
		if channelKind.countConfigs(receiver) == 0 {
			continue
		}

		spec, err := channelKind.extractSpec(c.Name, receiver)
		if err != nil {
			return nil, err
		}

		return &PostableNotificationChannel{
			Name:        c.InternalName,
			DisplayName: c.Name,
			Config:      ChannelConfig{Kind: channelKind.kind, Spec: spec},
		}, nil
	}

	return nil, errors.NewNotFoundf(
		ErrCodeChannelUnsupportedKind,
		"channel %q carries no supported notifier configuration", c.Name,
	)
}

func (c *Channel) ToGettableNotificationChannel() (*GettableNotificationChannel, error) {
	postable, err := c.toPostableNotificationChannel()
	if err != nil {
		return nil, err
	}

	return &GettableNotificationChannel{
		Name:        postable.Name,
		DisplayName: postable.DisplayName,
		Config:      postable.Config,
		ID:          c.ID,
		CreatedAt:   c.CreatedAt,
		UpdatedAt:   c.UpdatedAt,
	}, nil
}

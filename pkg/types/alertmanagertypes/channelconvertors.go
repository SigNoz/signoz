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

	postable := &PostableNotificationChannel{Name: c.InternalName, DisplayName: c.Name}
	found := 0

	for _, channelKind := range channelKinds {
		count := channelKind.countConfigs(receiver)
		if count == 0 {
			continue
		}
		found += count

		spec, err := channelKind.extractSpec(c.Name, receiver)
		if err != nil {
			return nil, err
		}

		postable.Config = ChannelConfig{Kind: channelKind.kind, Spec: spec}
	}

	if found == 0 {
		return nil, errors.NewNotFoundf(
			ErrCodeChannelUnsupportedKind,
			"channel %q carries no notifier configuration this API supports", c.Name,
		)
	}

	if found > 1 {
		return nil, errors.NewInvalidInputf(
			ErrCodeAlertmanagerChannelInvalid,
			"channel %q carries %d notifier configurations; this API represents one per channel", c.Name, found,
		)
	}

	return postable, nil
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

package alertmanagertypes

import (
	"encoding/json"
	"reflect"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/prometheus/alertmanager/config"
)

// ════════════════════════════════════════════════════════════════════════
// API -> storage
// ════════════════════════════════════════════════════════════════════════

// ToChannel returns the receiver alongside because the alertmanager config is
// updated from it, not from the channel.
func (p *PostableNotificationChannel) ToChannel(orgID string) (*Channel, *Receiver, error) {
	receiver, err := p.ToReceiver()
	if err != nil {
		return nil, nil, err
	}

	data, err := json.Marshal(receiver)
	if err != nil {
		return nil, nil, errors.WrapInternalf(err, errors.CodeInternal, "marshal receiver")
	}

	return &Channel{
		Identifiable:  types.Identifiable{ID: valuer.GenerateUUID()},
		TimeAuditable: types.TimeAuditable{CreatedAt: time.Now(), UpdatedAt: time.Now()},
		Name:          p.Name,
		DisplayName:   p.DisplayName,
		Type:          p.Config.Kind.ToStoredType(),
		Data:          string(data),
		Config:        p.Config,
		OrgID:         orgID,
	}, receiver, nil
}

// ToReceiver hands the assembled receiver to newDefaultedReceiver, which is the
// only place upstream applies a notifier's defaults and validation — several
// integrations panic without them.
func (p *PostableNotificationChannel) ToReceiver() (*Receiver, error) {
	spec, ok := p.Config.Spec.(ChannelSpec)
	if !ok {
		return nil, errors.NewInternalf(errors.CodeInternal, "config.spec was not decoded into a known type")
	}

	receiver, err := spec.toUndefaultedReceiver(p.DisplayName)
	if err != nil {
		return nil, err
	}

	return newDefaultedReceiver(receiver)
}

// ToReceiver builds the upstream receiver for an existing channel, whose display
// name the caller supplies because the update body cannot carry it.
func (u *UpdatableNotificationChannel) ToReceiver(displayName string) (*Receiver, error) {
	postable := PostableNotificationChannel{DisplayName: displayName, Config: u.Config}
	return postable.ToReceiver()
}

const testReceiverName = "test-receiver"

// ToReceiver builds a throwaway receiver for a test send. The name is never
// stored, so it only has to be something the notifier accepts.
func (t *TestableNotificationChannel) ToReceiver() (*Receiver, error) {
	postable := PostableNotificationChannel{DisplayName: testReceiverName, Config: t.Config}
	return postable.ToReceiver()
}

func (c *Channel) UpdateFromUpdatable(updatable UpdatableNotificationChannel) (*Receiver, error) {
	receiver, err := updatable.ToReceiver(c.DisplayName)
	if err != nil {
		return nil, err
	}

	data, err := json.Marshal(receiver)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "marshal receiver")
	}

	c.Type = updatable.Config.Kind.ToStoredType()
	c.Data = string(data)
	c.Config = updatable.Config
	c.UpdatedAt = time.Now()

	return receiver, nil
}

// ════════════════════════════════════════════════════════════════════════
// Storage -> API
// ════════════════════════════════════════════════════════════════════════

// toChannelConfig returns the stored config. Only a row the migration could not
// backfill has none, so deriving it here reports why.
func (c *Channel) toChannelConfig() (ChannelConfig, error) {
	if c.Config.IsZero() {
		return c.deriveChannelConfig()
	}

	return c.Config, nil
}

// deriveChannelConfig derives the kind from the config the receiver actually
// carries rather than from Channel.Type, so a row written with several notifier
// kinds is rejected instead of reported under whichever one receiverChannelType
// happened to pick.
func (c *Channel) deriveChannelConfig() (ChannelConfig, error) {
	receiver := &Receiver{Receiver: &config.Receiver{}}
	if err := json.Unmarshal([]byte(c.Data), receiver); err != nil {
		return ChannelConfig{}, errors.WrapInternalf(err, errors.CodeInternal, "unmarshal channel %q", c.DisplayName)
	}

	if total := countNotifierConfigs(receiver); total > 1 {
		return ChannelConfig{}, errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "channel %q carries %d notifier configurations; only one per channel is supported", c.DisplayName, total)
	}

	for _, channelKind := range channelKinds {
		if channelKind.countConfigs(receiver) == 0 {
			continue
		}

		spec, err := channelKind.extractSpec(c.DisplayName, receiver)
		if err != nil {
			return ChannelConfig{}, err
		}

		// The derived config is stored and decoded back through the same
		// validation a request goes through, so one that would not decode is
		// unrepresentable rather than stored.
		channelConfig := ChannelConfig{Kind: channelKind.kind, Spec: spec}
		if err := channelConfig.Validate(); err != nil {
			return ChannelConfig{}, errors.WrapInvalidInputf(err, ErrCodeAlertmanagerChannelInvalid, "channel %q: %s", c.DisplayName, err.Error())
		}

		return channelConfig, nil
	}

	return ChannelConfig{}, errors.NewInvalidInputf(ErrCodeChannelUnsupportedKind, "channel %q carries no supported notifier configuration", c.DisplayName)
}

// countNotifierConfigs totals every *_configs entry on the receiver, including
// notifier kinds no ChannelSpec models, so a row mixing a modelled kind with
// an unmodelled one is not mistaken for a single-notifier channel.
func countNotifierConfigs(receiver *Receiver) int {
	return countConfigsFields(reflect.ValueOf(*receiver)) +
		countConfigsFields(reflect.ValueOf(*receiver.Receiver))
}

func countConfigsFields(v reflect.Value) int {
	t := v.Type()
	total := 0
	for i := 0; i < t.NumField(); i++ {
		fieldVal := v.Field(i)
		if fieldVal.Kind() != reflect.Slice || fieldVal.Len() == 0 {
			continue
		}

		if !receiverTypeRegex.MatchString(t.Field(i).Tag.Get("yaml")) {
			continue
		}

		total += fieldVal.Len()
	}

	return total
}

func (c *Channel) ToGettableNotificationChannel() (*GettableNotificationChannel, error) {
	channelConfig, err := c.toChannelConfig()
	if err != nil {
		return nil, err
	}

	return &GettableNotificationChannel{
		Name:        c.Name,
		DisplayName: c.DisplayName,
		Config:      channelConfig,
		ID:          c.ID,
		CreatedAt:   c.CreatedAt,
		UpdatedAt:   c.UpdatedAt,
	}, nil
}

// ToListedNotificationChannel reports an empty Kind for a row whose stored type
// no ChannelKind models, which v1 allowed because it accepted every upstream
// notifier kind. One such row must not fail the whole page.
func (c *Channel) ToListedNotificationChannel() *ListedNotificationChannel {
	channelKind, _ := parseStoredChannelType(c.Type)

	return &ListedNotificationChannel{
		ID:          c.ID,
		Name:        c.Name,
		DisplayName: c.DisplayName,
		Kind:        channelKind,
		CreatedAt:   c.CreatedAt,
		UpdatedAt:   c.UpdatedAt,
	}
}

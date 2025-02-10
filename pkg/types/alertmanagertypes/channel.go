package alertmanagertypes

import (
	"encoding/json"
	"reflect"
	"regexp"
	"time"

	"github.com/prometheus/alertmanager/config"
	"github.com/uptrace/bun"
	"go.signoz.io/signoz/pkg/errors"
)

var (
	// Regular expression to match anything before "_configs"
	typeRegex = regexp.MustCompile(`^(.+)_configs`)
)

type Channels = []*Channel

// Channel represents a single receiver of the alertmanager config.
type Channel struct {
	bun.BaseModel `bun:"table:notification_channels"`

	ID        int       `json:"id" bun:"id,pk,autoincrement"`
	Name      string    `json:"name" bun:"name"`
	Type      string    `json:"type" bun:"type"`
	Data      string    `json:"data" bun:"data"`
	CreatedAt time.Time `json:"created_at" bun:"created_at"`
	UpdatedAt time.Time `json:"updated_at" bun:"updated_at"`
	OrgID     string    `json:"org_id" bun:"org_id"`
}

func NewChannelFromReceiver(receiver config.Receiver, orgID string) (*Channel, error) {
	if receiver.Name == DefaultReceiverName {
		return nil, errors.New(errors.TypeUnsupported, ErrCodeAlertmanagerChannelDefaultReceiver, "default receiver is not allowed as a channel")
	}

	// Initialize channel with common fields
	channel := Channel{
		Name:      receiver.Name,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
		OrgID:     orgID,
	}

	// Use reflection to examine receiver struct fields
	receiverType := reflect.TypeOf(receiver)
	receiverVal := reflect.ValueOf(receiver)

	// Iterate through fields looking for *Config fields
	for i := 0; i < receiverType.NumField(); i++ {
		field := receiverType.Field(i)
		fieldVal := receiverVal.Field(i)

		// Skip if not a slice or is empty
		if fieldVal.Kind() != reflect.Slice || fieldVal.Len() == 0 {
			continue
		}

		// Get channel type from yaml tag
		yamlTag := field.Tag.Get("yaml")
		if yamlTag == "" {
			continue
		}

		// Extract the base type name (e.g., "email_configs" -> "email")
		matches := typeRegex.FindStringSubmatch(yamlTag)
		if len(matches) != 2 {
			continue
		}

		channelType := matches[1]

		// Marshal config data to JSON
		configData, err := json.Marshal(receiver)
		if err != nil {
			continue
		}

		channel.Type = channelType
		channel.Data = string(configData)
		break
	}

	return &channel, nil
}

func NewChannelsFromConfig(c *config.Config, orgID string) Channels {
	channels := Channels{}
	for _, receiver := range c.Receivers {
		channel, err := NewChannelFromReceiver(receiver, orgID)
		if err != nil {
			continue
		}

		channels = append(channels, channel)
	}

	return channels
}

func NewConfigFromChannels(
	resolveTimeout time.Duration,
	smtpHello string,
	smtpFrom string,
	smtpHost string,
	smtpPort int,
	smtpAuthUsername string,
	smtpAuthPassword string,
	smtpAuthSecret string,
	smtpAuthIdentity string,
	smtpRequireTLS bool,
	routeGroupByStr []string,
	routeGroupInterval time.Duration,
	routeGroupWait time.Duration,
	routeRepeatInterval time.Duration,
	channels Channels,
	orgID string,
) (*Config, error) {
	cfg := NewDefaultConfig(
		resolveTimeout,
		smtpHello,
		smtpFrom,
		smtpHost,
		smtpPort,
		smtpAuthUsername,
		smtpAuthPassword,
		smtpAuthSecret,
		smtpAuthIdentity,
		smtpRequireTLS,
		routeGroupByStr,
		routeGroupInterval,
		routeGroupWait,
		routeRepeatInterval,
		orgID,
	)

	for _, channel := range channels {
		receiver := config.Receiver{}
		err := json.Unmarshal([]byte(channel.Data), &receiver)
		if err != nil {
			return nil, err
		}

		err = cfg.CreateReceiver(&config.Route{Receiver: channel.Name, Continue: true}, receiver)
		if err != nil {
			return nil, err
		}
	}

	return cfg, nil
}

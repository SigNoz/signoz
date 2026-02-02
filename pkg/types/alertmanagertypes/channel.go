package alertmanagertypes

import (
	"encoding/json"
	"reflect"
	"regexp"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/prometheus/alertmanager/config"
	"github.com/uptrace/bun"
)

var (
	ErrCodeAlertmanagerChannelNotFound     = errors.MustNewCode("alertmanager_channel_not_found")
	ErrCodeAlertmanagerChannelNameMismatch = errors.MustNewCode("alertmanager_channel_name_mismatch")
	ErrCodeAlertmanagerChannelInvalid      = errors.MustNewCode("alertmanager_channel_invalid")
)

var (
	// Regular expression to match anything before "_configs"
	receiverTypeRegex = regexp.MustCompile(`^(.+)_configs`)
)

type Channels = []*Channel

type GettableChannels = []*Channel

// Channel represents a single receiver of the alertmanager config.
type Channel struct {
	bun.BaseModel `bun:"table:notification_channel"`

	types.Identifiable
	types.TimeAuditable
	Name  string `json:"name" bun:"name"`
	Type  string `json:"type" bun:"type"`
	Data  string `json:"data" bun:"data"`
	OrgID string `json:"org_id" bun:"org_id"`
}

// NewChannelFromReceiver creates a new Channel from a Receiver.
// It can return nil if the receiver is the default receiver.
func NewChannelFromReceiver(receiver config.Receiver, orgID string) (*Channel, error) {
	if receiver.Name == DefaultReceiverName {
		return nil, errors.Newf(errors.TypeInvalidInput, ErrCodeAlertmanagerChannelInvalid, "cannot use %s name as a channel name", receiver.Name)
	}

	// Initialize channel with common fields
	channel := Channel{
		Identifiable: types.Identifiable{
			ID: valuer.GenerateUUID(),
		},
		TimeAuditable: types.TimeAuditable{
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		Name:  receiver.Name,
		OrgID: orgID,
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
		matches := receiverTypeRegex.FindStringSubmatch(yamlTag)
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

	// If we were unable to find the channel type, return an error
	if channel.Type == "" {
		return nil, errors.Newf(errors.TypeInvalidInput, ErrCodeAlertmanagerChannelInvalid, "channel '%s' must have at least one notification configuration (e.g., email_configs, webhook_configs, slack_configs)", receiver.Name)
	}

	return &channel, nil
}

func NewConfigFromChannels(globalConfig GlobalConfig, routeConfig RouteConfig, channels Channels, orgID string) (*Config, error) {
	cfg, err := NewDefaultConfig(
		globalConfig,
		routeConfig,
		orgID,
	)
	if err != nil {
		return nil, err
	}

	for _, channel := range channels {
		receiver, err := NewReceiver(channel.Data)
		if err != nil {
			return nil, err
		}

		err = cfg.CreateReceiver(receiver)
		if err != nil {
			return nil, err
		}
	}

	return cfg, nil
}

func GetChannelByID(channels Channels, id valuer.UUID) (int, *Channel, error) {
	for i, channel := range channels {
		if channel.ID == id {
			return i, channel, nil
		}
	}

	return 0, nil, errors.Newf(errors.TypeNotFound, ErrCodeAlertmanagerChannelNotFound, "cannot find channel with id %s", id.StringValue())
}

func GetChannelByName(channels Channels, name string) (int, *Channel, error) {
	for i, channel := range channels {
		if channel.Name == name {
			return i, channel, nil
		}
	}

	return 0, nil, errors.Newf(errors.TypeNotFound, ErrCodeAlertmanagerChannelNotFound, "cannot find channel with name %s", name)
}

func NewStatsFromChannels(channels Channels) map[string]any {
	stats := make(map[string]any)
	for _, channel := range channels {
		key := "alertmanager.channel.type." + channel.Type

		if _, ok := stats[key]; !ok {
			stats[key] = int64(1)
		} else {
			stats[key] = stats[key].(int64) + 1
		}
	}

	stats["alertmanager.channel.count"] = int64(len(channels))
	return stats
}

func (c *Channel) Update(receiver Receiver) error {
	channel, err := NewChannelFromReceiver(receiver, c.OrgID)
	if err != nil {
		return err
	}

	if c.Name != channel.Name {
		return errors.Newf(errors.TypeInvalidInput, ErrCodeAlertmanagerChannelNameMismatch, "cannot update channel name")
	}

	c.Data = channel.Data
	c.UpdatedAt = time.Now()

	return nil
}

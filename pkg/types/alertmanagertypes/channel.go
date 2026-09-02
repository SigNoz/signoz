package alertmanagertypes

import (
	"encoding/json"
	"reflect"
	"regexp"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/prometheus/alertmanager/config"
	"github.com/swaggest/jsonschema-go"
	"github.com/uptrace/bun"
)

var (
	ErrCodeAlertmanagerChannelNotFound      = errors.MustNewCode("alertmanager_channel_not_found")
	ErrCodeAlertmanagerChannelNameMismatch  = errors.MustNewCode("alertmanager_channel_name_mismatch")
	ErrCodeAlertmanagerChannelInvalid       = errors.MustNewCode("alertmanager_channel_invalid")
	ErrCodeAlertmanagerChannelAlreadyExists = errors.MustNewCode("alertmanager_channel_already_exists")
)

var (
	// Regular expression to match anything before "_configs".
	receiverTypeRegex = regexp.MustCompile(`^(.+)_configs`)
)

type Channels = []*Channel

type GettableChannels = []*Channel

// TODO: the oneOf emitted by JSONSchema is not the shape OpenAPI wants for a
// discriminated union. OpenAPI's discriminator requires every oneOf branch to
// be a $ref to a named component and a sibling property whose value selects
// the variant. Our payload instead uses the *presence* of one of the 18
// *_configs arrays to imply the type, so no discriminator can be attached.
// Refactor PostableChannel into a {name, type, config} envelope (see
// ruletypes.RuleThresholdData for the pattern) so each notification kind
// becomes a named component and the discriminator can be wired up properly.
type PostableChannel struct {
	Receiver
}

// Channel represents a single receiver of the alertmanager config.
type Channel struct {
	bun.BaseModel `bun:"table:notification_channel"`

	types.Identifiable
	types.TimeAuditable
	// Name is the DNS1123 identity references will migrate onto. Until then
	// DisplayName is the receiver name inside Data and what policies and rules
	// reference, so it keeps the v1 wire tag and Name stays off the v1 contract.
	Name        string `json:"-" bun:"name"`
	DisplayName string `json:"name" required:"true" bun:"display_name"`
	Type        string `json:"type" required:"true" bun:"type"`
	Data        string `json:"data" required:"true" bun:"data"`
	OrgID       string `json:"orgId" required:"true" bun:"org_id"`
}

// NewChannelFromReceiver creates a new Channel from a Receiver.
// It can return nil if the receiver is the default receiver.
// A receiver carries no internal name, so one is generated from its name.
func NewChannelFromReceiver(receiver *Receiver, orgID string) (*Channel, error) {
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
		Name:        generateChannelName(receiver.Name),
		DisplayName: receiver.Name,
		OrgID:       orgID,
	}

	data, err := json.Marshal(receiver)
	if err != nil {
		return nil, errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "marshal receiver")
	}
	channel.Data = string(data)

	channel.Type = receiverChannelType(receiver)
	if channel.Type == "" {
		return nil, errors.Newf(errors.TypeInvalidInput, ErrCodeAlertmanagerChannelInvalid, "channel '%s' must have at least one notification configuration (e.g., email_configs, webhook_configs, slack_configs)", receiver.Name)
	}

	return &channel, nil
}

// NewChannelFromReceiverWithName overrides the name that NewChannelFromReceiver
// generates.
func NewChannelFromReceiverWithName(receiver *Receiver, name string, orgID string) (*Channel, error) {
	channel, err := NewChannelFromReceiver(receiver, orgID)
	if err != nil {
		return nil, err
	}

	channel.Name = name

	return channel, nil
}

// receiverChannelType returns the channel.Type discriminator. Walks
// Receiver's own fields first (native), then the embed (upstream); first
// non-empty *_configs slice wins.
func receiverChannelType(receiver *Receiver) string {
	if t := nonEmptyConfigsField(reflect.ValueOf(*receiver)); t != "" {
		return t
	}
	if t := nonEmptyConfigsField(reflect.ValueOf(*receiver.Receiver)); t != "" {
		return t
	}
	return ""
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

func nonEmptyConfigsField(v reflect.Value) string {
	t := v.Type()
	for i := 0; i < t.NumField(); i++ {
		field := t.Field(i)
		fieldVal := v.Field(i)

		if fieldVal.Kind() != reflect.Slice || fieldVal.Len() == 0 {
			continue
		}

		yamlTag := field.Tag.Get("yaml")
		if yamlTag == "" {
			continue
		}

		// Extract the base type name (e.g., "email_configs" -> "email").
		matches := receiverTypeRegex.FindStringSubmatch(yamlTag)
		if len(matches) != 2 {
			continue
		}
		return matches[1]
	}
	return ""
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

func (c *Channel) Update(receiver *Receiver) error {
	channel, err := NewChannelFromReceiverWithName(receiver, c.Name, c.OrgID)
	if err != nil {
		return err
	}

	if c.DisplayName != channel.DisplayName {
		return errors.Newf(errors.TypeInvalidInput, ErrCodeAlertmanagerChannelNameMismatch, "cannot update channel name")
	}

	// Unreachable while the name is passed in above rather than derived from the
	// receiver, which is why this is internal rather than invalid input.
	if c.Name != channel.Name {
		return errors.NewInternalf(ErrCodeAlertmanagerChannelNameMismatch, "cannot update channel internal name")
	}

	c.Type = channel.Type
	c.Data = channel.Data
	c.UpdatedAt = time.Now()

	return nil
}

func (PostableChannel) JSONSchema() (jsonschema.Schema, error) {
	type alias PostableChannel
	reflector := &jsonschema.Reflector{}

	schema, err := reflector.Reflect(alias{}, jsonschema.DefinitionsPrefix("#/components/schemas/"))
	if err != nil {
		return jsonschema.Schema{}, err
	}

	schema.WithRequired("name")

	var oneOf []jsonschema.SchemaOrBool
	seen := map[string]struct{}{}
	// Walk both halves: native fields on Receiver, upstream on the embed. A native
	// field can shadow an upstream one with the same tag (e.g. jira_configs), so
	// dedupe to avoid emitting two identical oneOf branches.
	collect := func(t reflect.Type) {
		for i := 0; i < t.NumField(); i++ {
			jsonTag := strings.Split(t.Field(i).Tag.Get("json"), ",")[0]
			if !strings.HasSuffix(jsonTag, "_configs") {
				continue
			}
			if _, ok := seen[jsonTag]; ok {
				continue
			}
			seen[jsonTag] = struct{}{}
			branch := (&jsonschema.Schema{}).WithRequired(jsonTag)
			oneOf = append(oneOf, branch.ToSchemaOrBool())
		}
	}
	collect(reflect.TypeOf(Receiver{}))
	collect(reflect.TypeOf(config.Receiver{}))

	schema.WithOneOf(oneOf...)

	return schema, nil
}

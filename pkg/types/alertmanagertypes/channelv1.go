package alertmanagertypes

import (
	"encoding/json"
	"reflect"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/prometheus/alertmanager/config"
	"github.com/swaggest/jsonschema-go"
)

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

// NewChannelFromReceiver builds the channel a v1 write carries. The receiver is
// all there is, so the name is generated from its display name and the type and
// config derived from it.
func NewChannelFromReceiver(receiver *Receiver, orgID string) (*Channel, error) {
	if receiver.Name == DefaultReceiverName {
		return nil, errors.Newf(errors.TypeInvalidInput, ErrCodeAlertmanagerChannelInvalid, "cannot use %s name as a channel name", receiver.Name)
	}

	channelType := receiverChannelType(receiver)
	if channelType == "" {
		return nil, errors.Newf(errors.TypeInvalidInput, ErrCodeAlertmanagerChannelInvalid, "channel '%s' must have at least one notification configuration (e.g., email_configs, webhook_configs, slack_configs)", receiver.Name)
	}

	data, err := json.Marshal(receiver)
	if err != nil {
		return nil, errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "marshal receiver")
	}

	channel := &Channel{
		Identifiable:  types.Identifiable{ID: valuer.GenerateUUID()},
		TimeAuditable: types.TimeAuditable{CreatedAt: time.Now(), UpdatedAt: time.Now()},
		Name:          generateChannelName(receiver.Name),
		DisplayName:   receiver.Name,
		Type:          channelType,
		Data:          string(data),
		OrgID:         orgID,
	}

	// A receiver v2 cannot represent is refused rather than stored, so every
	// row written from here on reads through v2.
	channel.Config, err = channel.deriveChannelConfig()
	if err != nil {
		return nil, err
	}

	return channel, nil
}

func (c *Channel) Update(receiver *Receiver) error {
	channel, err := NewChannelFromReceiver(receiver, c.OrgID)
	if err != nil {
		return err
	}

	if c.DisplayName != channel.DisplayName {
		return errors.Newf(errors.TypeInvalidInput, ErrCodeAlertmanagerChannelNameMismatch, "cannot update channel name")
	}

	c.Type = channel.Type
	c.Data = channel.Data
	c.Config = channel.Config
	c.UpdatedAt = time.Now()

	return nil
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

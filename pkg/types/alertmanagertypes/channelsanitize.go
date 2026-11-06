package alertmanagertypes

import (
	"encoding/json"
	"reflect"
	"strings"
)

// RedactedSecretValue is the placeholder substituted for credential-bearing
// values in channel read responses served to callers without channel-management
// rights. The stored channel and the internal alertmanager configuration keep
// the real secrets; only the API projection is redacted.
const RedactedSecretValue = "********"

// secretKeysByReceiverConfig maps a receiver "*_configs" key to the top-level
// JSON keys whose string values are credential-bearing and must not be served
// to non-admin readers of the v1 channel APIs.
var secretKeysByReceiverConfig = map[string]map[string]struct{}{
	"slack_configs":      {"api_url": {}},
	"webhook_configs":    {"url": {}},
	"pagerduty_configs":  {"routing_key": {}, "service_key": {}},
	"opsgenie_configs":   {"api_key": {}},
	"email_configs":      {"auth_password": {}, "auth_secret": {}},
	"victorops_configs":  {"api_key": {}, "routing_key": {}},
	"pushover_configs":   {"user_key": {}, "token": {}},
	"wechat_configs":     {"api_secret": {}},
	"telegram_configs":   {"bot_token": {}},
	"msteams_configs":    {"webhook_url": {}},
	"msteamsv2_configs":  {"webhook_url": {}},
	"googlechat_configs": {"webhook_url": {}},
	"jsmops_configs":     {"api_key": {}},
	"incidentio_configs": {"token": {}},
	"jira_configs":       {},
}

// fallbackSecretKeys is the fail-closed set applied to the top level of a
// "*_configs" entry the table above does not model, so an unknown notifier
// kind cannot leak a credential through a read response.
var fallbackSecretKeys = map[string]struct{}{
	"api_url": {}, "webhook_url": {}, "url": {}, "api_key": {}, "routing_key": {},
	"service_key": {}, "token": {}, "bot_token": {}, "api_secret": {},
	"user_key": {}, "password": {}, "auth_password": {}, "auth_secret": {},
	"bearer_token": {}, "credentials": {}, "client_secret": {},
}

// secretHTTPConfigKeys holds the credential-bearing keys redacted anywhere
// inside an "http_config" subtree (basic_auth.password,
// authorization.credentials, bearer_token, oauth2.client_secret).
var secretHTTPConfigKeys = map[string]struct{}{
	"password": {}, "bearer_token": {}, "credentials": {}, "client_secret": {},
}

// WithSecretsRedacted returns a copy of the channel whose Data has
// credential-bearing values replaced with RedactedSecretValue. The receiver
// is never mutated, so persistence and the internal alertmanager configuration
// keep using the real secrets.
func (c *Channel) WithSecretsRedacted() *Channel {
	redacted := *c
	redacted.Data = RedactReceiverSecrets(c.Data)
	return &redacted
}

// RedactReceiverSecrets redacts credential-bearing values in a v1 receiver
// JSON payload (the shape stored in Channel.Data). Non-secret configuration is
// preserved so channel listings stay useful to viewers. A payload that cannot
// be parsed is replaced with an empty object rather than returned verbatim,
// so malformed stored data cannot become a leak vector.
func RedactReceiverSecrets(data string) string {
	var payload map[string]any
	if err := json.Unmarshal([]byte(data), &payload); err != nil {
		return "{}"
	}

	for key, value := range payload {
		if !strings.HasSuffix(key, "_configs") {
			continue
		}
		configs, ok := value.([]any)
		if !ok {
			continue
		}
		secretKeys, modelled := secretKeysByReceiverConfig[key]
		if !modelled {
			secretKeys = fallbackSecretKeys
		}
		for _, config := range configs {
			configMap, ok := config.(map[string]any)
			if !ok {
				continue
			}
			redactConfigSecrets(configMap, secretKeys)
		}
	}

	redacted, err := json.Marshal(payload)
	if err != nil {
		return "{}"
	}
	return string(redacted)
}

// redactConfigSecrets redacts top-level secret keys of one notifier config and
// descends into any http_config subtree.
func redactConfigSecrets(config map[string]any, secretKeys map[string]struct{}) {
	for key, value := range config {
		lower := strings.ToLower(key)
		if _, ok := secretKeys[lower]; ok {
			if _, isString := value.(string); isString {
				config[key] = RedactedSecretValue
			}
			continue
		}
		if lower == "http_config" {
			if nested, ok := value.(map[string]any); ok {
				redactNestedSecrets(nested, secretHTTPConfigKeys)
			}
		}
	}
}

// redactNestedSecrets redacts secret keys recursively inside a nested object
// such as http_config.
func redactNestedSecrets(obj map[string]any, secretKeys map[string]struct{}) {
	for key, value := range obj {
		if _, ok := secretKeys[strings.ToLower(key)]; ok {
			if _, isString := value.(string); isString {
				obj[key] = RedactedSecretValue
			}
			continue
		}
		switch nested := value.(type) {
		case map[string]any:
			redactNestedSecrets(nested, secretKeys)
		case []any:
			for _, item := range nested {
				if itemMap, ok := item.(map[string]any); ok {
					redactNestedSecrets(itemMap, secretKeys)
				}
			}
		}
	}
}

// WithSecretsRedacted returns a copy of the gettable channel with every
// credential-bearing spec field (tagged `format:"password"`) replaced with
// RedactedSecretValue. The source channel is never mutated.
func (g *GettableNotificationChannel) WithSecretsRedacted() (*GettableNotificationChannel, error) {
	spec, ok := buildEmptyChannelSpecForKind(g.Config.Kind)
	if !ok {
		return nil, ErrUnsupportedChannelKind(g.Config.Kind.StringValue())
	}

	raw, err := json.Marshal(g.Config.Spec)
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(raw, spec); err != nil {
		return nil, err
	}

	redactPasswordFormatFields(reflect.ValueOf(spec))

	redacted := *g
	redacted.Config.Spec = spec
	return &redacted, nil
}

// redactPasswordFormatFields walks a spec value and replaces every string
// field tagged `format:"password"` with RedactedSecretValue.
func redactPasswordFormatFields(value reflect.Value) {
	for value.Kind() == reflect.Ptr || value.Kind() == reflect.Interface {
		if value.IsNil() {
			return
		}
		value = value.Elem()
	}
	if value.Kind() != reflect.Struct {
		return
	}

	typ := value.Type()
	for i := 0; i < value.NumField(); i++ {
		field := value.Field(i)
		fieldType := typ.Field(i)
		if !field.CanSet() {
			continue
		}
		if fieldType.Tag.Get("format") == "password" && field.Kind() == reflect.String {
			field.SetString(RedactedSecretValue)
			continue
		}
		switch field.Kind() {
		case reflect.Ptr, reflect.Interface, reflect.Struct:
			redactPasswordFormatFields(field)
		case reflect.Slice, reflect.Array:
			for j := 0; j < field.Len(); j++ {
				redactPasswordFormatFields(field.Index(j))
			}
		}
	}
}

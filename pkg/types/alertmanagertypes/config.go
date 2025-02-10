package alertmanagertypes

import (
	"crypto/md5"
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"github.com/prometheus/alertmanager/config"
	"github.com/prometheus/common/model"
	"github.com/uptrace/bun"
	"go.signoz.io/signoz/pkg/errors"
)

const (
	DefaultReceiverName string = "default-receiver"
)

const (
	PostableConfigActionCreate int = iota + 1
	PostableConfigActionUpdate
	PostableConfigActionDelete
)

var (
	ErrCodeAlertmanagerConfigInvalid          = errors.MustNewCode("alertmanager_config_invalid")
	ErrCodeAlertmanagerConfigConflict         = errors.MustNewCode("alertmanager_config_conflict")
	ErrCodeAlertmanagerChannelDefaultReceiver = errors.MustNewCode("alertmanager_channel_default_receiver")
)

// PostableConfig is the type for the receiver configuration that can be posted to the API.
type PostableConfig struct {
	Receiver Receiver
	Action   int
}

type Config struct {
	alertmanagerConfig *config.Config
	storedConfig       *StoredConfig
	channels           Channels
	orgID              string
}

type StoredConfig struct {
	bun.BaseModel `bun:"table:alertmanager_config"`

	ID            uint64    `bun:"id"`
	Config        string    `bun:"config"`
	SilencesState string    `bun:"silences_state,nullzero"`
	NFLogState    string    `bun:"nflog_state,nullzero"`
	CreatedAt     time.Time `bun:"created_at"`
	UpdatedAt     time.Time `bun:"updated_at"`
	OrgID         string    `bun:"org_id"`
}

func NewConfig(c *config.Config, orgID string) *Config {
	channels := NewChannelsFromConfig(c, orgID)
	return &Config{
		alertmanagerConfig: c,
		storedConfig: &StoredConfig{
			Config:        string(newRawFromConfig(c)),
			SilencesState: "",
			NFLogState:    "",
			CreatedAt:     time.Now(),
			UpdatedAt:     time.Now(),
			OrgID:         orgID,
		},
		channels: channels,
	}
}

func NewDefaultConfig(
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
	orgID string,
) *Config {
	global := config.DefaultGlobalConfig()
	global.ResolveTimeout = model.Duration(resolveTimeout)

	// Override the default SMTP config with the user provided config.
	global.SMTPHello = smtpHello
	global.SMTPFrom = smtpFrom
	global.SMTPSmarthost = config.HostPort{
		Host: smtpHost,
		Port: strconv.Itoa(smtpPort),
	}
	global.SMTPAuthUsername = smtpAuthUsername
	global.SMTPAuthPassword = config.Secret(smtpAuthPassword)
	global.SMTPAuthSecret = config.Secret(smtpAuthSecret)
	global.SMTPAuthIdentity = smtpAuthIdentity
	global.SMTPRequireTLS = smtpRequireTLS

	return NewConfig(&config.Config{
		Global: &global,
		Route: &config.Route{
			Receiver:       DefaultReceiverName,
			GroupByStr:     routeGroupByStr,
			GroupInterval:  (*model.Duration)(&routeGroupInterval),
			GroupWait:      (*model.Duration)(&routeGroupWait),
			RepeatInterval: (*model.Duration)(&routeRepeatInterval),
		},
		Receivers: []config.Receiver{{Name: DefaultReceiverName}},
	}, orgID)
}

func NewConfigFromString(s string, orgID string) (*Config, error) {
	config := new(config.Config)
	err := json.Unmarshal([]byte(s), config)
	if err != nil {
		return nil, err
	}

	return NewConfig(config, orgID), nil
}

func newRawFromConfig(c *config.Config) []byte {
	b, err := json.Marshal(c)
	if err != nil {
		// Taking inspiration from the upstream. This is never expected to happen.
		return []byte(fmt.Sprintf("<error creating config string: %s>", err))
	}

	return b
}

func (c *Config) MergeWithPostableConfig(postableConfig PostableConfig) error {
	switch postableConfig.Action {
	case PostableConfigActionCreate:
		return c.CreateReceiver(&config.Route{Receiver: postableConfig.Receiver.Name, Continue: true}, postableConfig.Receiver)
	case PostableConfigActionUpdate:
		return c.UpdateReceiver(&config.Route{Receiver: postableConfig.Receiver.Name, Continue: true}, postableConfig.Receiver)
	case PostableConfigActionDelete:
		return c.DeleteReceiver(postableConfig.Receiver.Name)
	default:
		return errors.New(errors.TypeInvalidInput, ErrCodeAlertmanagerConfigInvalid, "invalid action")
	}
}

func (c *Config) AlertmanagerConfig() *config.Config {
	return c.alertmanagerConfig
}

func (c *Config) StoredConfig() *StoredConfig {
	return c.storedConfig
}

func (c *Config) Channels() Channels {
	return c.channels
}

func (c *Config) OrgID() string {
	return c.orgID
}

func (c *Config) Raw() []byte {
	return newRawFromConfig(c.alertmanagerConfig)
}

func (c *Config) Hash() [16]byte {
	return md5.Sum(newRawFromConfig(c.alertmanagerConfig))
}

func (c *Config) CreateReceiver(route *config.Route, receiver config.Receiver) error {
	if route == nil {
		return errors.New(errors.TypeInvalidInput, ErrCodeAlertmanagerConfigInvalid, "route is nil")
	}

	if route.Receiver == "" || receiver.Name == "" {
		return errors.New(errors.TypeInvalidInput, ErrCodeAlertmanagerConfigInvalid, "receiver is mandatory in route and receiver")
	}

	// check that receiver name is not already used
	for _, existingReceiver := range c.alertmanagerConfig.Receivers {
		if existingReceiver.Name == receiver.Name || existingReceiver.Name == route.Receiver {
			return errors.New(errors.TypeInvalidInput, ErrCodeAlertmanagerConfigConflict, "the receiver name has to be unique, please choose a different name")
		}
	}
	// must set continue on route to allow subsequent
	// routes to work. may have to rethink on this after
	// adding matchers and filters in upstream
	route.Continue = true

	c.alertmanagerConfig.Route.Routes = append(c.alertmanagerConfig.Route.Routes, route)
	c.alertmanagerConfig.Receivers = append(c.alertmanagerConfig.Receivers, receiver)

	if err := c.alertmanagerConfig.UnmarshalYAML(func(i interface{}) error { return nil }); err != nil {
		return err
	}

	channel, err := NewChannelFromReceiver(receiver, c.orgID)
	if err == nil {
		c.channels = append(c.channels, channel)
	}

	c.storedConfig.Config = string(newRawFromConfig(c.alertmanagerConfig))
	c.storedConfig.UpdatedAt = time.Now()
	return nil
}

func (c *Config) UpdateReceiver(route *config.Route, receiver config.Receiver) error {
	if route == nil {
		return errors.New(errors.TypeInvalidInput, ErrCodeAlertmanagerConfigInvalid, "route is nil")
	}

	if route.Receiver == "" || receiver.Name == "" {
		return errors.New(errors.TypeInvalidInput, ErrCodeAlertmanagerConfigInvalid, "receiver is mandatory in route and receiver")
	}

	// find and update receiver
	for i, existingReceiver := range c.alertmanagerConfig.Receivers {
		if existingReceiver.Name == receiver.Name {
			c.alertmanagerConfig.Receivers[i] = receiver
			channel, err := NewChannelFromReceiver(receiver, c.orgID)
			if err != nil {
				return err
			}
			c.channels[i] = channel
			c.channels[i].UpdatedAt = time.Now()
			break
		}
	}

	routes := c.alertmanagerConfig.Route.Routes
	for i, existingRoute := range routes {
		if existingRoute.Receiver == route.Receiver {
			c.alertmanagerConfig.Route.Routes[i] = route
			break
		}
	}

	c.storedConfig.Config = string(newRawFromConfig(c.alertmanagerConfig))
	c.storedConfig.UpdatedAt = time.Now()

	return nil
}

func (c *Config) DeleteReceiver(name string) error {
	if name == "" {
		return errors.New(errors.TypeInvalidInput, ErrCodeAlertmanagerConfigInvalid, "delete receiver requires the receiver name")
	}

	routes := c.alertmanagerConfig.Route.Routes
	for i, r := range routes {
		if r.Receiver == name {
			c.alertmanagerConfig.Route.Routes = append(routes[:i], routes[i+1:]...)
			break
		}
	}

	for i, existingReceiver := range c.alertmanagerConfig.Receivers {
		if existingReceiver.Name == name {
			c.alertmanagerConfig.Receivers = append(c.alertmanagerConfig.Receivers[:i], c.alertmanagerConfig.Receivers[i+1:]...)
			c.channels = append(c.channels[:i], c.channels[i+1:]...)
			break
		}
	}

	c.storedConfig.Config = string(newRawFromConfig(c.alertmanagerConfig))
	c.storedConfig.UpdatedAt = time.Now()

	return nil
}

// MarshalSecretValue if set to true will expose Secret type
// through the marshal interfaces. We need to store the actual value of the secret
// in the database, so we need to set this to true.
func init() {
	config.MarshalSecretValue = true
}

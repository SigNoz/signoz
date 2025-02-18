package alertmanagertypes

import (
	"context"
	"crypto/md5"
	"encoding/json"
	"fmt"
	"time"

	"dario.cat/mergo"
	"github.com/prometheus/alertmanager/config"
	"github.com/prometheus/common/model"
	"github.com/uptrace/bun"
	"go.signoz.io/signoz/pkg/errors"
)

const (
	DefaultReceiverName string = "default-receiver"
)

var (
	ErrCodeAlertmanagerConfigInvalid  = errors.MustNewCode("alertmanager_config_invalid")
	ErrCodeAlertmanagerConfigNotFound = errors.MustNewCode("alertmanager_config_not_found")
	ErrCodeAlertmanagerConfigConflict = errors.MustNewCode("alertmanager_config_conflict")
)

type (
	// GlobalConfig is the type for the global configuration
	GlobalConfig = config.GlobalConfig
)

type RouteConfig struct {
	GroupByStr     []string
	GroupInterval  time.Duration
	GroupWait      time.Duration
	RepeatInterval time.Duration
}

type StoreableConfig struct {
	bun.BaseModel `bun:"table:alertmanager_config"`

	ID        uint64    `bun:"id,pk,autoincrement"`
	Config    string    `bun:"config"`
	CreatedAt time.Time `bun:"created_at"`
	UpdatedAt time.Time `bun:"updated_at"`
	OrgID     string    `bun:"org_id"`
}

// Config is the type for the entire alertmanager configuration
type Config struct {
	// alertmanagerConfig is the actual alertmanager configuration referenced from the upstream
	alertmanagerConfig *config.Config

	// storeableConfig is the representation of the config in the store
	storeableConfig *StoreableConfig

	// channels is the list of channels
	channels Channels

	// orgID is the organization ID
	orgID string
}

func NewConfig(c *config.Config, orgID string) *Config {
	channels := NewChannelsFromConfig(c, orgID)
	return &Config{
		alertmanagerConfig: c,
		storeableConfig: &StoreableConfig{
			Config:    string(newRawFromConfig(c)),
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
			OrgID:     orgID,
		},
		channels: channels,
	}
}

func NewConfigFromStoreableConfig(sc *StoreableConfig) (*Config, error) {
	alertmanagerConfig, err := newConfigFromString(sc.Config)
	if err != nil {
		return nil, err
	}

	channels := NewChannelsFromConfig(alertmanagerConfig, sc.OrgID)

	return &Config{
		alertmanagerConfig: alertmanagerConfig,
		storeableConfig:    sc,
		channels:           channels,
		orgID:              sc.OrgID,
	}, nil
}

func NewRouteFromReceiver(receiver Receiver) *config.Route {
	return &config.Route{Receiver: receiver.Name, Continue: true}
}

func NewDefaultConfig(globalConfig GlobalConfig, routeConfig RouteConfig, orgID string) (*Config, error) {
	err := mergo.Merge(&globalConfig, config.DefaultGlobalConfig())
	if err != nil {
		return nil, err
	}

	return NewConfig(&config.Config{
		Global: &globalConfig,
		Route: &config.Route{
			Receiver:       DefaultReceiverName,
			GroupByStr:     routeConfig.GroupByStr,
			GroupInterval:  (*model.Duration)(&routeConfig.GroupInterval),
			GroupWait:      (*model.Duration)(&routeConfig.GroupWait),
			RepeatInterval: (*model.Duration)(&routeConfig.RepeatInterval),
		},
		Receivers: []config.Receiver{{Name: DefaultReceiverName}},
	}, orgID), nil
}

func newConfigFromString(s string) (*config.Config, error) {
	config := new(config.Config)
	err := json.Unmarshal([]byte(s), config)
	if err != nil {
		return nil, err
	}

	return config, nil
}

func newRawFromConfig(c *config.Config) []byte {
	b, err := json.Marshal(c)
	if err != nil {
		// Taking inspiration from the upstream. This is never expected to happen.
		return []byte(fmt.Sprintf("<error creating config string: %s>", err))
	}

	return b
}

func (c *Config) AlertmanagerConfig() *config.Config {
	return c.alertmanagerConfig
}

func (c *Config) StoreableConfig() *StoreableConfig {
	return c.storeableConfig
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

	channel := NewChannelFromReceiver(receiver, c.orgID)
	if channel != nil {
		c.channels[channel.Name] = channel
	}

	c.storeableConfig.Config = string(newRawFromConfig(c.alertmanagerConfig))
	c.storeableConfig.UpdatedAt = time.Now()
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
			channel := NewChannelFromReceiver(receiver, c.orgID)
			if channel != nil {
				c.channels[channel.Name] = channel
				c.channels[channel.Name].UpdatedAt = time.Now()
			}
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

	c.storeableConfig.Config = string(newRawFromConfig(c.alertmanagerConfig))
	c.storeableConfig.UpdatedAt = time.Now()

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
			delete(c.channels, name)
			break
		}
	}

	c.storeableConfig.Config = string(newRawFromConfig(c.alertmanagerConfig))
	c.storeableConfig.UpdatedAt = time.Now()

	return nil
}

type ConfigStore interface {
	// Set creates or updates a config.
	Set(context.Context, *Config) error

	// Get returns the config for the given orgID
	Get(context.Context, string) (*Config, error)

	// ListOrgs returns the list of orgs
	ListOrgs(context.Context) ([]string, error)
}

// MarshalSecretValue if set to true will expose Secret type
// through the marshal interfaces. We need to store the actual value of the secret
// in the database, so we need to set this to true.
func init() {
	config.MarshalSecretValue = true
}

package alertmanagertypes

import (
	"context"
	"crypto/md5"
	"encoding/json"
	"fmt"
	"slices"
	"time"

	"dario.cat/mergo"
	"github.com/prometheus/alertmanager/config"
	commoncfg "github.com/prometheus/common/config"
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
	GroupByStr     []string      `mapstructure:"group_by"`
	GroupInterval  time.Duration `mapstructure:"group_interval"`
	GroupWait      time.Duration `mapstructure:"group_wait"`
	RepeatInterval time.Duration `mapstructure:"repeat_interval"`
}

type StoreableConfig struct {
	bun.BaseModel `bun:"table:alertmanager_config"`

	ID        uint64    `bun:"id,pk,autoincrement"`
	Config    string    `bun:"config"`
	Hash      string    `bun:"hash"`
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
}

func NewConfig(c *config.Config, orgID string) *Config {
	raw := string(newRawFromConfig(c))
	return &Config{
		alertmanagerConfig: c,
		storeableConfig: &StoreableConfig{
			Config:    raw,
			Hash:      fmt.Sprintf("%x", newConfigHash(raw)),
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
			OrgID:     orgID,
		},
	}
}

func NewConfigFromStoreableConfig(sc *StoreableConfig) (*Config, error) {
	alertmanagerConfig, err := newConfigFromString(sc.Config)
	if err != nil {
		return nil, err
	}

	return &Config{
		alertmanagerConfig: alertmanagerConfig,
		storeableConfig:    sc,
	}, nil
}

func NewDefaultConfig(globalConfig GlobalConfig, routeConfig RouteConfig, orgID string) (*Config, error) {
	err := mergo.Merge(&globalConfig, config.DefaultGlobalConfig())
	if err != nil {
		return nil, err
	}

	route, err := NewRouteFromRouteConfig(nil, routeConfig)
	if err != nil {
		return nil, err
	}

	return NewConfig(&config.Config{
		Global:    &globalConfig,
		Route:     route,
		Receivers: []config.Receiver{{Name: DefaultReceiverName}},
	}, orgID), nil
}

func newConfigFromString(s string) (*config.Config, error) {
	config := new(config.Config)
	err := json.Unmarshal([]byte(s), config)
	if err != nil {
		return nil, err
	}

	for i, receiver := range config.Receivers {
		bytes, err := json.Marshal(receiver)
		if err != nil {
			return nil, err
		}

		receiver, err := NewReceiver(string(bytes))
		if err != nil {
			return nil, err
		}

		config.Receivers[i] = receiver
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

func newConfigHash(s string) [16]byte {
	return md5.Sum([]byte(s))
}

func (c *Config) CopyWithReset() (*Config, error) {
	newConfig, err := NewDefaultConfig(
		*c.alertmanagerConfig.Global,
		RouteConfig{
			GroupByStr:     c.alertmanagerConfig.Route.GroupByStr,
			GroupInterval:  time.Duration(*c.alertmanagerConfig.Route.GroupInterval),
			GroupWait:      time.Duration(*c.alertmanagerConfig.Route.GroupWait),
			RepeatInterval: time.Duration(*c.alertmanagerConfig.Route.RepeatInterval),
		},
		c.storeableConfig.OrgID,
	)
	if err != nil {
		return nil, err
	}

	return newConfig, nil
}

func (c *Config) SetGlobalConfig(globalConfig GlobalConfig) error {
	err := mergo.Merge(&globalConfig, config.DefaultGlobalConfig())
	if err != nil {
		return err
	}

	c.alertmanagerConfig.Global = &globalConfig
	c.storeableConfig.Config = string(newRawFromConfig(c.alertmanagerConfig))
	c.storeableConfig.Hash = fmt.Sprintf("%x", newConfigHash(c.storeableConfig.Config))
	c.storeableConfig.UpdatedAt = time.Now()

	return nil
}

func (c *Config) SetRouteConfig(routeConfig RouteConfig) error {
	route, err := NewRouteFromRouteConfig(c.alertmanagerConfig.Route, routeConfig)
	if err != nil {
		return err
	}
	c.alertmanagerConfig.Route = route

	c.storeableConfig.Config = string(newRawFromConfig(c.alertmanagerConfig))
	c.storeableConfig.Hash = fmt.Sprintf("%x", newConfigHash(c.storeableConfig.Config))
	c.storeableConfig.UpdatedAt = time.Now()

	return nil
}

func (c *Config) AlertmanagerConfig() *config.Config {
	return c.alertmanagerConfig
}

func (c *Config) StoreableConfig() *StoreableConfig {
	return c.storeableConfig
}

func (c *Config) CreateReceiver(receiver config.Receiver) error {
	// check that receiver name is not already used
	for _, existingReceiver := range c.alertmanagerConfig.Receivers {
		if existingReceiver.Name == receiver.Name {
			return errors.New(errors.TypeInvalidInput, ErrCodeAlertmanagerConfigConflict, "the receiver name has to be unique, please choose a different name")
		}
	}

	route, err := NewRouteFromReceiver(receiver)
	if err != nil {
		return err
	}

	c.alertmanagerConfig.Route.Routes = append(c.alertmanagerConfig.Route.Routes, route)
	c.alertmanagerConfig.Receivers = append(c.alertmanagerConfig.Receivers, receiver)

	if err := c.alertmanagerConfig.UnmarshalYAML(func(i interface{}) error { return nil }); err != nil {
		return err
	}

	c.storeableConfig.Config = string(newRawFromConfig(c.alertmanagerConfig))
	c.storeableConfig.Hash = fmt.Sprintf("%x", newConfigHash(c.storeableConfig.Config))
	c.storeableConfig.UpdatedAt = time.Now()
	return nil
}

func (c *Config) GetReceiver(name string) (Receiver, error) {
	for _, receiver := range c.alertmanagerConfig.Receivers {
		if receiver.Name == name {
			return receiver, nil
		}
	}

	return Receiver{}, errors.Newf(errors.TypeNotFound, ErrCodeAlertmanagerChannelNotFound, "channel with name %q not found", name)
}

func (c *Config) UpdateReceiver(receiver config.Receiver) error {
	// find and update receiver
	for i, existingReceiver := range c.alertmanagerConfig.Receivers {
		if existingReceiver.Name == receiver.Name {
			c.alertmanagerConfig.Receivers[i] = receiver
			break
		}
	}

	if err := c.alertmanagerConfig.UnmarshalYAML(func(i interface{}) error { return nil }); err != nil {
		return err
	}

	c.storeableConfig.Config = string(newRawFromConfig(c.alertmanagerConfig))
	c.storeableConfig.Hash = fmt.Sprintf("%x", newConfigHash(c.storeableConfig.Config))
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
			break
		}
	}

	c.storeableConfig.Config = string(newRawFromConfig(c.alertmanagerConfig))
	c.storeableConfig.Hash = fmt.Sprintf("%x", newConfigHash(c.storeableConfig.Config))
	c.storeableConfig.UpdatedAt = time.Now()

	return nil
}

func (c *Config) CreateRuleIDMatcher(ruleID string, receiverNames []string) error {
	if c.alertmanagerConfig.Route == nil {
		return errors.New(errors.TypeInvalidInput, ErrCodeAlertmanagerConfigInvalid, "route is nil")
	}

	for _, route := range c.alertmanagerConfig.Route.Routes {
		if slices.Contains(receiverNames, route.Receiver) {
			if err := addRuleIDToRoute(route, ruleID); err != nil {
				return err
			}
		}
	}

	c.storeableConfig.Config = string(newRawFromConfig(c.alertmanagerConfig))
	c.storeableConfig.Hash = fmt.Sprintf("%x", newConfigHash(c.storeableConfig.Config))
	c.storeableConfig.UpdatedAt = time.Now()

	return nil
}

func (c *Config) UpdateRuleIDMatcher(ruleID string, receiverNames []string) error {
	err := c.DeleteRuleIDMatcher(ruleID)
	if err != nil {
		return err
	}

	return c.CreateRuleIDMatcher(ruleID, receiverNames)
}

func (c *Config) DeleteRuleIDMatcher(ruleID string) error {
	for i := range c.alertmanagerConfig.Route.Routes {
		if err := removeRuleIDFromRoute(c.alertmanagerConfig.Route.Routes[i], ruleID); err != nil {
			return err
		}
	}

	c.storeableConfig.Config = string(newRawFromConfig(c.alertmanagerConfig))
	c.storeableConfig.Hash = fmt.Sprintf("%x", newConfigHash(c.storeableConfig.Config))
	c.storeableConfig.UpdatedAt = time.Now()

	return nil
}

func (c *Config) ReceiverNamesFromRuleID(ruleID string) []string {
	receiverNames := make([]string, 0)
	routes := c.alertmanagerConfig.Route.Routes
	for _, route := range routes {
		if ok := matcherContainsRuleID(route.Matchers, ruleID); ok {
			receiverNames = append(receiverNames, route.Receiver)
		}
	}

	return receiverNames
}

type storeOptions struct {
	Cb func(context.Context) error
}

type StoreOption func(*storeOptions)

func WithCb(cb func(context.Context) error) StoreOption {
	return func(o *storeOptions) {
		o.Cb = cb
	}
}

func NewStoreOptions(opts ...StoreOption) *storeOptions {
	o := &storeOptions{
		Cb: nil,
	}

	for _, opt := range opts {
		opt(o)
	}

	return o
}

type ConfigStore interface {
	// Set creates or updates a config.
	Set(context.Context, *Config, ...StoreOption) error

	// Get returns the config for the given orgID
	Get(context.Context, string) (*Config, error)

	// ListOrgs returns the list of orgs
	ListOrgs(context.Context) ([]string, error)

	// CreateChannel creates a new channel.
	CreateChannel(context.Context, *Channel, ...StoreOption) error

	// GetChannelByID returns the channel for the given id.
	GetChannelByID(context.Context, string, int) (*Channel, error)

	// UpdateChannel updates a channel.
	UpdateChannel(context.Context, string, *Channel, ...StoreOption) error

	// DeleteChannelByID deletes a channel.
	DeleteChannelByID(context.Context, string, int, ...StoreOption) error

	// ListChannels returns the list of channels.
	ListChannels(context.Context, string) ([]*Channel, error)

	// ListAllChannels returns the list of channels for all organizations.
	ListAllChannels(context.Context) ([]*Channel, error)

	// GetMatchers gets a list of matchers per organization.
	// Matchers is an array of ruleId to receiver names.
	GetMatchers(context.Context, string) (map[string][]string, error)
}

// MarshalSecretValue if set to true will expose Secret type
// through the marshal interfaces. We need to store the actual value of the secret
// in the database, so we need to set this to true.
func init() {
	commoncfg.MarshalSecretValue = true
	config.MarshalSecretValue = true
	model.NameValidationScheme = model.UTF8Validation
}

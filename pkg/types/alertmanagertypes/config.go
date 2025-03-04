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
	"github.com/prometheus/alertmanager/pkg/labels"
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

func newConfigHash(s string) [16]byte {
	return md5.Sum([]byte(s))
}

func (c *Config) SetGlobalConfig(globalConfig GlobalConfig) {
	c.alertmanagerConfig.Global = &globalConfig
	c.storeableConfig.Config = string(newRawFromConfig(c.alertmanagerConfig))
	c.storeableConfig.Hash = fmt.Sprintf("%x", newConfigHash(c.storeableConfig.Config))
	c.storeableConfig.UpdatedAt = time.Now()
}

func (c *Config) SetRouteConfig(routeConfig RouteConfig) {
	c.alertmanagerConfig.Route = &config.Route{
		Receiver:       DefaultReceiverName,
		GroupByStr:     routeConfig.GroupByStr,
		GroupInterval:  (*model.Duration)(&routeConfig.GroupInterval),
		GroupWait:      (*model.Duration)(&routeConfig.GroupWait),
		RepeatInterval: (*model.Duration)(&routeConfig.RepeatInterval),
	}
	c.storeableConfig.Config = string(newRawFromConfig(c.alertmanagerConfig))
	c.storeableConfig.Hash = fmt.Sprintf("%x", newConfigHash(c.storeableConfig.Config))
	c.storeableConfig.UpdatedAt = time.Now()
}

func (c *Config) UpdateRouteConfig(routeConfig RouteConfig) {
	for _, route := range c.alertmanagerConfig.Route.Routes {
		route.GroupByStr = routeConfig.GroupByStr
		route.GroupInterval = (*model.Duration)(&routeConfig.GroupInterval)
		route.GroupWait = (*model.Duration)(&routeConfig.GroupWait)
		route.RepeatInterval = (*model.Duration)(&routeConfig.RepeatInterval)
	}

	c.storeableConfig.Config = string(newRawFromConfig(c.alertmanagerConfig))
	c.storeableConfig.Hash = fmt.Sprintf("%x", newConfigHash(c.storeableConfig.Config))
	c.storeableConfig.UpdatedAt = time.Now()
}

func (c *Config) AlertmanagerConfig() *config.Config {
	return c.alertmanagerConfig
}

func (c *Config) StoreableConfig() *StoreableConfig {
	return c.storeableConfig
}

func (c *Config) CreateReceiver(receiver config.Receiver) error {
	if receiver.Name == "" {
		return errors.New(errors.TypeInvalidInput, ErrCodeAlertmanagerConfigInvalid, "receiver is mandatory in route and receiver")
	}

	// check that receiver name is not already used
	for _, existingReceiver := range c.alertmanagerConfig.Receivers {
		if existingReceiver.Name == receiver.Name {
			return errors.New(errors.TypeInvalidInput, ErrCodeAlertmanagerConfigConflict, "the receiver name has to be unique, please choose a different name")
		}
	}

	c.alertmanagerConfig.Route.Routes = append(c.alertmanagerConfig.Route.Routes, newRouteFromReceiver(receiver))
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

	return Receiver{}, errors.Newf(errors.TypeInvalidInput, ErrCodeAlertmanagerChannelNotFound, "channel with name %q not found", name)
}

func (c *Config) UpdateReceiver(receiver config.Receiver) error {
	if receiver.Name == "" {
		return errors.New(errors.TypeInvalidInput, ErrCodeAlertmanagerConfigInvalid, "receiver is mandatory in route and receiver")
	}

	// find and update receiver
	for i, existingReceiver := range c.alertmanagerConfig.Receivers {
		if existingReceiver.Name == receiver.Name {
			c.alertmanagerConfig.Receivers[i] = receiver
			break
		}
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

	routes := c.alertmanagerConfig.Route.Routes
	for i, r := range routes {
		if slices.Contains(receiverNames, r.Receiver) {
			matcher, err := labels.NewMatcher(labels.MatchEqual, "ruleId", ruleID)
			if err != nil {
				return err
			}

			c.alertmanagerConfig.Route.Routes[i].Matchers = append(r.Matchers, matcher)
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
	routes := c.alertmanagerConfig.Route.Routes
	for i, r := range routes {
		j := slices.IndexFunc(r.Matchers, func(m *labels.Matcher) bool {
			return m.Name == "ruleId" && m.Value == ruleID
		})
		if j != -1 {
			c.alertmanagerConfig.Route.Routes[i].Matchers = slices.Delete(r.Matchers, j, j+1)
		}
	}

	c.storeableConfig.Config = string(newRawFromConfig(c.alertmanagerConfig))
	c.storeableConfig.Hash = fmt.Sprintf("%x", newConfigHash(c.storeableConfig.Config))
	c.storeableConfig.UpdatedAt = time.Now()

	return nil
}

func (c *Config) ReceiverNamesFromRuleID(ruleID string) ([]string, error) {
	receiverNames := make([]string, 0)
	routes := c.alertmanagerConfig.Route.Routes
	for _, r := range routes {
		for _, m := range r.Matchers {
			if m.Name == "ruleId" && m.Value == ruleID {
				receiverNames = append(receiverNames, r.Receiver)
			}
		}
	}

	return receiverNames, nil
}

type ConfigStore interface {
	// Set creates or updates a config.
	Set(context.Context, *Config) error

	// Get returns the config for the given orgID
	Get(context.Context, string) (*Config, error)

	// ListOrgs returns the list of orgs
	ListOrgs(context.Context) ([]string, error)

	// CreateChannel creates a new channel.
	CreateChannel(context.Context, *Channel, func(context.Context) error) error

	// GetChannelByID returns the channel for the given id.
	GetChannelByID(context.Context, string, int) (*Channel, error)

	// UpdateChannel updates a channel.
	UpdateChannel(context.Context, string, *Channel, func(context.Context) error) error

	// DeleteChannelByID deletes a channel.
	DeleteChannelByID(context.Context, string, int, func(context.Context) error) error

	// ListChannels returns the list of channels.
	ListChannels(context.Context, string) ([]*Channel, error)

	// ListAllChannels returns the list of channels for all organizations.
	ListAllChannels(context.Context) ([]*Channel, error)
}

// MarshalSecretValue if set to true will expose Secret type
// through the marshal interfaces. We need to store the actual value of the secret
// in the database, so we need to set this to true.
func init() {
	config.MarshalSecretValue = true
}

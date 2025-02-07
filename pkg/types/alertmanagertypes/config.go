package alertmanagertypes

import (
	"crypto/md5"
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"github.com/prometheus/alertmanager/config"
	"github.com/prometheus/common/model"
	"go.signoz.io/signoz/pkg/errors"
)

var (
	ErrCodeAlertmanagerConfigInvalid  = errors.MustNewCode("alertmanager_config_invalid")
	ErrCodeAlertmanagerConfigConflict = errors.MustNewCode("alertmanager_config_conflict")
)

type Config struct {
	c   *config.Config
	raw []byte
}

func NewConfig(c *config.Config) *Config {
	return &Config{c: c, raw: newRawFromConfig(c)}
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
			Receiver:       "default-receiver",
			GroupByStr:     routeGroupByStr,
			GroupInterval:  (*model.Duration)(&routeGroupInterval),
			GroupWait:      (*model.Duration)(&routeGroupWait),
			RepeatInterval: (*model.Duration)(&routeRepeatInterval),
		},
		Receivers: []config.Receiver{{Name: "default-receiver"}},
	})
}

func NewConfigFromString(s string) (*Config, error) {
	config := new(config.Config)
	err := json.Unmarshal([]byte(s), config)
	if err != nil {
		return nil, err
	}

	return &Config{c: config, raw: newRawFromConfig(config)}, nil
}

func newRawFromConfig(c *config.Config) []byte {
	b, err := json.Marshal(c)
	if err != nil {
		// Taking inspiration from the upstream. This is never expected to happen.
		return []byte(fmt.Sprintf("<error creating config string: %s>", err))
	}

	return b
}

func (c *Config) Config() *config.Config {
	return c.c
}

func (c *Config) Raw() []byte {
	return c.raw
}

func (c *Config) Hash() [16]byte {
	return md5.Sum(c.raw)
}

func (c *Config) Add(route *config.Route, receiver config.Receiver) error {
	if route == nil {
		return errors.New(errors.TypeInvalidInput, ErrCodeAlertmanagerConfigInvalid, "route is nil")
	}

	if route.Receiver == "" || receiver.Name == "" {
		return errors.New(errors.TypeInvalidInput, ErrCodeAlertmanagerConfigInvalid, "receiver is mandatory in route and receiver")
	}

	// check that receiver name is not already used
	for _, existingReceiver := range c.c.Receivers {
		if existingReceiver.Name == receiver.Name || existingReceiver.Name == route.Receiver {
			return errors.New(errors.TypeInvalidInput, ErrCodeAlertmanagerConfigConflict, "the receiver name has to be unique, please choose a different name")
		}
	}
	// must set continue on route to allow subsequent
	// routes to work. may have to rethink on this after
	// adding matchers and filters in upstream
	route.Continue = true

	c.c.Route.Routes = append(c.c.Route.Routes, route)
	c.c.Receivers = append(c.c.Receivers, receiver)
	return nil
}

func (c *Config) Edit(route *config.Route, receiver config.Receiver) error {
	if route == nil {
		return errors.New(errors.TypeInvalidInput, ErrCodeAlertmanagerConfigInvalid, "route is nil")
	}

	if route.Receiver == "" || receiver.Name == "" {
		return errors.New(errors.TypeInvalidInput, ErrCodeAlertmanagerConfigInvalid, "receiver is mandatory in route and receiver")
	}

	// find and update receiver
	for i, existingReceiver := range c.c.Receivers {
		if existingReceiver.Name == receiver.Name {
			c.c.Receivers[i] = receiver
		}
	}

	routes := c.c.Route.Routes
	for i, existingRoute := range routes {
		if existingRoute.Receiver == route.Receiver {
			c.c.Route.Routes[i] = route
			break
		}
	}

	return nil
}

func (c *Config) Delete(name string) error {
	if name == "" {
		return errors.New(errors.TypeInvalidInput, ErrCodeAlertmanagerConfigInvalid, "delete receiver requires the receiver name")
	}

	routes := c.c.Route.Routes
	for i, r := range routes {
		if r.Receiver == name {
			c.c.Route.Routes = append(routes[:i], routes[i+1:]...)
			break
		}
	}

	for i, existingReceiver := range c.c.Receivers {
		if existingReceiver.Name == name {
			c.c.Receivers = append(c.c.Receivers[:i], c.c.Receivers[i+1:]...)
			break
		}
	}

	return nil
}

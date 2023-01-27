package otelconfig

import (
	"fmt"
	"reflect"

	"go.opentelemetry.io/collector/component"
	"go.opentelemetry.io/collector/confmap"
)

type Configs[F component.Factory] struct {
	cfgs map[component.ID]component.Config

	factories map[component.Type]F
}

func NewConfigs[F component.Factory](factories map[component.Type]F) *Configs[F] {
	return &Configs[F]{factories: factories}
}

func (c *Configs[F]) Unmarshal(conf *confmap.Conf) error {
	rawCfgs := make(map[component.ID]map[string]interface{})
	if err := conf.Unmarshal(&rawCfgs, confmap.WithErrorUnused()); err != nil {
		return err
	}

	// Prepare resulting map.
	c.cfgs = make(map[component.ID]component.Config)
	// Iterate over raw configs and create a config for each.
	for id, value := range rawCfgs {
		// Find factory based on component kind and type that we read from config source.
		factory, ok := c.factories[id.Type()]
		if !ok {
			return errorUnknownType(id, reflect.ValueOf(c.factories).MapKeys())
		}

		// Create the default config for this component.
		cfg := factory.CreateDefaultConfig()

		// Now that the default config struct is created we can Unmarshal into it,
		// and it will apply user-defined config on top of the default.
		if err := component.UnmarshalConfig(confmap.NewFromStringMap(value), cfg); err != nil {
			return errorUnmarshalError(id, err)
		}

		c.cfgs[id] = cfg
	}

	return nil
}

func (c *Configs[F]) Configs() map[component.ID]component.Config {
	return c.cfgs
}

func errorUnknownType(id component.ID, factories []reflect.Value) error {
	return fmt.Errorf("unknown type: %q for id: %q (valid values: %v)", id.Type(), id, factories)
}

func errorUnmarshalError(id component.ID, err error) error {
	return fmt.Errorf("error reading configuration for %q: %w", id, err)
}

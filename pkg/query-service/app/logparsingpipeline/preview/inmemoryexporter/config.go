package inmemoryexporter

import "fmt"

type Config struct {
	// Unique id for the exporter.
	// Useful for examining received data without having access
	// to the exact exporter instance.
	Id string `mapstructure:"id"`
}

func (c *Config) Validate() error {
	if len(c.Id) < 1 {
		return fmt.Errorf("inmemory exporter: id is required")
	}
	return nil
}

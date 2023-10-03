package inmemoryexporter

import "fmt"

type Config struct {
	// Unique id for the exporter.
	// Useful for getting a hold of the exporter in code that doesn't control its instantiation.
	Id string `mapstructure:"id"`
}

func (c *Config) Validate() error {
	if len(c.Id) < 1 {
		return fmt.Errorf("inmemory exporter: id is required")
	}
	return nil
}

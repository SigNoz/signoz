package inmemoryreceiver

import "fmt"

type Config struct {
	// Unique id for the receiver.
	// Useful for getting a hold of the receiver in code that doesn't control its instantiation.
	Id string `mapstructure:"id"`
}

func (c *Config) Validate() error {
	if len(c.Id) < 1 {
		return fmt.Errorf("inmemory receiver: id is required")
	}
	return nil
}

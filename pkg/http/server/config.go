package server

import (
	"go.signoz.io/signoz/pkg/confmap"
)

// Config satisfies the confmap.Config interface
var _ confmap.Config = (*Config)(nil)

// Config holds the configuration for http.
type Config struct {
	//Address specifies the TCP address for the server to listen on, in the form "host:port".
	// If empty, ":http" (port 80) is used. The service names are defined in RFC 6335 and assigned by IANA.
	// See net.Dial for details of the address format.
	Address string `mapstructure:"address"`
}

func (c *Config) NewWithDefaults() confmap.Config {
	return &Config{
		Address: "0.0.0.0:8080",
	}

}

func (c *Config) Validate() error {
	return nil
}

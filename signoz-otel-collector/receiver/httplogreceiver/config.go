package httplogreceiver

import (
	"errors"
	"fmt"
	"net"
	"strconv"

	"go.opentelemetry.io/collector/config/confighttp"
)

const (
	heroku = "heroku"
	google = "google"
	json   = "json"
)

// Config defines configuration for the https receiver.
type Config struct {
	confighttp.HTTPServerSettings `mapstructure:",squash"` // squash ensures fields are correctly decoded in embedded struct

	Source string `mapstructure:"source"` // ex:- heroku, google etc
}

// Validate verifies that the endpoint is valid and the configured port is not 0
func (rCfg *Config) Validate() error {
	if rCfg.HTTPServerSettings.Endpoint == "" {
		return errors.New("must specify an endpoint for the httplogreceiver")
	}

	// validate port
	_, portStr, err := net.SplitHostPort(rCfg.HTTPServerSettings.Endpoint)
	if err != nil {
		return fmt.Errorf("endpoint is not formatted correctly: %w", err)
	}
	port, err := strconv.ParseInt(portStr, 10, 0)
	if err != nil {
		return fmt.Errorf("endpoint port is not a number: %w", err)
	}
	if port < 1 || port > 65535 {
		return fmt.Errorf("port number must be between 1 and 65535")
	}

	// validate source
	if rCfg.Source != heroku && rCfg.Source != google && rCfg.Source != json && rCfg.Source != "" {
		return fmt.Errorf("source must be one of %s or %s or empty", heroku, google)
	}

	return nil
}

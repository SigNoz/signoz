package config

// Config defines the entire configuration of signoz.
type Config struct{}

// Validate returns an error if the config is invalid.
func (config *Config) Validate() error {
	return nil
}

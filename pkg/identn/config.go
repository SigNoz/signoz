package identn

import (
	"github.com/SigNoz/signoz/pkg/factory"
)

type Config struct {
	// Config for tokenizer identN resolver
	Tokenizer TokenizerConfig `mapstructure:"tokenizer"`

	// Config for apikey identN resolver
	APIKeyConfig APIKeyConfig `mapstructure:"apikey"`
}

type TokenizerConfig struct {
	// Toggles the identN resolver
	Enabled bool `mapstructure:"enabled"`
	// Headers to extract from incoming requests
	Headers []string `mapstructure:"headers"`
}

type APIKeyConfig struct {
	// Toggles the identN resolver
	Enabled bool `mapstructure:"enabled"`
	// Headers to extract from incoming requests
	Headers []string `mapstructure:"headers"`
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("identn"), newConfig)
}

func newConfig() factory.Config {
	return &Config{
		Tokenizer: TokenizerConfig{
			Enabled: true,
			Headers: []string{"Authorization", "Sec-WebSocket-Protocol"},
		},
		APIKeyConfig: APIKeyConfig{
			Enabled: true,
			Headers: []string{"SIGNOZ-API-KEY"},
		},
	}
}

func (c Config) Validate() error {
	return nil
}

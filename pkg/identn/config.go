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
	Headers []string `mapstructure:"headers"`
}

type APIKeyConfig struct {
	Headers []string `mapstructure:"headers"`
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("identn"), newConfig)
}

func newConfig() factory.Config {
	return &Config{
		Tokenizer: TokenizerConfig{
			Headers: []string{"Authorization", "Sec-WebSocket-Protocol"},
		},
		APIKeyConfig: APIKeyConfig{
			Headers: []string{"SIGNOZ-API-KEY"},
		},
	}
}

func (c Config) Validate() error {
	return nil
}

package tokenizer

import (
	"time"

	"github.com/SigNoz/signoz/pkg/factory"
)

type Config struct {
	// GCInterval is the interval to perform garbage collection
	GCInterval time.Duration `mapstructure:"gc_interval"`

	// Interval to rotate tokens
	RotationInterval time.Duration `mapstructure:"rotation_interval"`

	// Max for a user to be idle before being required to authenticate
	IdleDuration time.Duration `mapstructure:"idle_duration"`

	// Max a user can remain logged in before being asked to login.
	MaxDuration time.Duration `mapstructure:"max_duration"`

	// Max tokens a user can have
	MaxTokens int `mapstructure:"max_tokens"`
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("tokenizer"), newConfig)
}

func newConfig() factory.Config {
	return &Config{
		GCInterval:       1 * time.Hour,
		RotationInterval: 30 * time.Minute,
		IdleDuration:     7 * 24 * time.Hour,
		MaxDuration:      30 * 24 * time.Hour,
		MaxTokens:        5,
	}
}

func (c Config) Validate() error {
	return nil
}

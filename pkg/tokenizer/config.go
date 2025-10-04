package tokenizer

import (
	"time"

	"github.com/SigNoz/signoz/pkg/factory"
)

type Config struct {
	// GC config
	GC GCConfig `mapstructure:"gc"`

	// Rotation config
	Rotation RotationConfig `mapstructure:"rotation"`

	// Lifetime config
	Lifetime LifetimeConfig `mapstructure:"lifetime"`

	// Token config
	Token TokenConfig `mapstructure:"token"`
}

type RotationConfig struct {
	// The interval to rotate tokens in.
	Interval time.Duration `mapstructure:"interval"`

	// The duration for which the previous token pair remains valid after a token pair is rotated.
	Duration time.Duration `mapstructure:"duration"`
}

type GCConfig struct {
	// The interval to perform garbage collection.
	Interval time.Duration `mapstructure:"interval"`
}

type LifetimeConfig struct {
	// The duration for which a user can be idle before being required to authenticate.
	Idle time.Duration `mapstructure:"idle"`

	// The duration for which a user can remain logged in before being asked to login.
	Max time.Duration `mapstructure:"max"`
}

type TokenConfig struct {
	// The maximum number of tokens a user can have.
	MaxPerUser int `mapstructure:"max_per_user"`
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("tokenizer"), newConfig)
}

func newConfig() factory.Config {
	return &Config{
		GC: GCConfig{
			Interval: 1 * time.Hour, // 1 hour
		},
		Rotation: RotationConfig{
			Interval: 30 * time.Minute, // 30 minutes
			Duration: 60 * time.Second, // 60 seconds
		},
		Lifetime: LifetimeConfig{
			Idle: 7 * 24 * time.Hour,  // 7 days
			Max:  30 * 24 * time.Hour, // 30 days
		},
		Token: TokenConfig{
			MaxPerUser: 5,
		},
	}
}

func (c Config) Validate() error {
	return nil
}

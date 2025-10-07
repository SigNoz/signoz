package tokenizer

import (
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
)

type Config struct {
	// The provider to use for tokenization.
	Provider string `mapstructure:"provider"`

	// Config for the opaque tokenizer.
	Opaque OpaqueConfig `mapstructure:"opaque"`

	// Config for the JWT tokenizer.
	JWT JWTConfig `mapstructure:"jwt"`

	// Rotation config
	Rotation RotationConfig `mapstructure:"rotation"`

	// Lifetime config
	Lifetime LifetimeConfig `mapstructure:"lifetime"`
}

type OpaqueConfig struct {
	// GC config
	GC GCConfig `mapstructure:"gc"`

	// Token config
	Token TokenConfig `mapstructure:"token"`
}

type JWTConfig struct {
	// The secret to sign the JWT tokens.
	Secret string `mapstructure:"secret"`
}

type GCConfig struct {
	// The interval to perform garbage collection.
	Interval time.Duration `mapstructure:"interval"`
}

type RotationConfig struct {
	// The interval to rotate tokens in.
	Interval time.Duration `mapstructure:"interval"`

	// The duration for which the previous token pair remains valid after a token pair is rotated.
	Duration time.Duration `mapstructure:"duration"`
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
		Provider: "jwt",
		Opaque: OpaqueConfig{
			GC: GCConfig{
				Interval: 1 * time.Hour, // 1 hour
			},
			Token: TokenConfig{
				MaxPerUser: 5,
			},
		},
		JWT: JWTConfig{
			Secret: "",
		},
		Rotation: RotationConfig{
			Interval: 30 * time.Minute, // 30 minutes
			Duration: 60 * time.Second, // 60 seconds
		},
		Lifetime: LifetimeConfig{
			Idle: 7 * 24 * time.Hour,  // 7 days
			Max:  30 * 24 * time.Hour, // 30 days
		},
	}
}

func (c Config) Validate() error {
	// Ensure that rotation interval is smaller than lifetime idle
	if c.Rotation.Interval >= c.Lifetime.Idle {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "rotation::interval must be smaller than lifetime::idle")
	}

	// Ensure that lifetime idle interval is smaller than lifetime max
	if c.Lifetime.Idle >= c.Lifetime.Max {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "lifetime::idle must be smaller than lifetime::max")
	}

	// Ensure that rotation duration is smaller than rotation interval
	if c.Rotation.Duration >= c.Rotation.Interval {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "rotation::duration must be smaller than rotation::interval")
	}

	return nil
}

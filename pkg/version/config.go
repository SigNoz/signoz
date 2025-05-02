package version

import "github.com/SigNoz/signoz/pkg/factory"

type BannerConfig struct {
	Enabled bool `mapstructure:"enabled"`
}

type Config struct {
	Banner BannerConfig `mapstructure:"banner"`
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("version"), newConfig)

}

func newConfig() factory.Config {
	return Config{
		Banner: BannerConfig{
			Enabled: true,
		},
	}
}

func (c Config) Validate() error {
	return nil
}

package auth

import "go.signoz.io/signoz/pkg/confmap"

type Config struct {
	Jwt Secret `mapstructure:"jwt"`
}

type Secret struct {
	Secret string `mapstructure:"secret"`
}

func (c *Config) NewWithDefaults() confmap.Config {
	return &Config{
		Jwt: Secret{
			Secret: "",
		},
	}
}

func (c *Config) Validate() error {
	return nil
}

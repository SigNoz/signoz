package featureflag

type Config struct {
	// Enable is a list of features to enable
	Enable []string `mapstructure:"enable"`
}

func (c Config) Validate() error {
	return nil
}

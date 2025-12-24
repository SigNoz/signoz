package flagger

import "github.com/SigNoz/signoz/pkg/factory"

type Config struct {
	Priority []string `json:"priority"`
	// Overrides are the overrides for the feature flags.
	Overrides Overrides `json:"overrides"`
	// More provider configs here...
}

type Overrides struct {
	Enabled bool               `json:"enabled"`
	Boolean map[string]bool    `json:"boolean"`
	String  map[string]string  `json:"string"`
	Float   map[string]float64 `json:"float"`
	Int     map[string]int64   `json:"int"`
	Object  map[string]any     `json:"object"`
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(
		factory.MustNewName("flagger"), newConfig,
	)
}

// newConfig creates a new config with the default values.
func newConfig() factory.Config {
	return &Config{
		Priority: []string{"config"},
		Overrides: Overrides{
			Enabled: true,
			Boolean: map[string]bool{},
			String:  map[string]string{},
			Float:   map[string]float64{},
			Int:     map[string]int64{},
			Object:  map[string]any{},
		},
	}
}

func (c Config) Validate() error {
	return nil
}

func (c Config) IsProviderEnabled(providerName string) bool {
	switch providerName {
	case "config":
		return c.Overrides.Enabled
	default:
		return false
	}
}

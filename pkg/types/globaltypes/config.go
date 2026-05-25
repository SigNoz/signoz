package globaltypes

type Config struct {
	Endpoint
	IdentN IdentNConfig `json:"identN"`
}

func NewConfig(endpoint Endpoint, identN IdentNConfig) *Config {
	return &Config{
		Endpoint: endpoint,
		IdentN:   identN,
	}
}

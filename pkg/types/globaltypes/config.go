package globaltypes

type Config struct {
	Endpoint
	IdentN IdentNConfig `json:"identN"`
	Web    WebConfig    `json:"web"`
}

func NewConfig(endpoint Endpoint, identN IdentNConfig, web WebConfig) *Config {
	return &Config{
		Endpoint: endpoint,
		IdentN:   identN,
		Web:      web,
	}
}

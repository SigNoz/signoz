package globaltypes

type IdentNConfig struct {
	Tokenizer     TokenizerConfig     `json:"tokenizer"`
	APIKey        APIKeyConfig        `json:"apikey"`
	Impersonation ImpersonationConfig `json:"impersonation"`
}

type TokenizerConfig struct {
	Enabled bool `json:"enabled"`
}

type APIKeyConfig struct {
	Enabled bool `json:"enabled"`
}

type ImpersonationConfig struct {
	Enabled bool `json:"enabled"`
}

func NewIdentNConfig(tokenizer TokenizerConfig, apiKey APIKeyConfig, impersonation ImpersonationConfig) IdentNConfig {
	return IdentNConfig{
		Tokenizer:     tokenizer,
		APIKey:        apiKey,
		Impersonation: impersonation,
	}
}

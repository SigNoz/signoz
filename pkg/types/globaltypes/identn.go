package globaltypes

type IdentNConfig struct {
	Tokenizer     TokenizerConfig     `json:"tokenizer"`
	APIKey        APIKeyConfig        `json:"apikey"`
	Impersonation ImpersonationConfig `json:"impersonation"`
	TrustedHeader TrustedHeaderConfig `json:"trustedHeader"`
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

// TrustedHeaderConfig tells the browser that identity comes from a fronting
// proxy, so it should not render a login form. It deliberately carries neither
// the trust mode nor any secret.
type TrustedHeaderConfig struct {
	Enabled           bool   `json:"enabled"`
	LogoutRedirectURL string `json:"logoutRedirectUrl"`
}

func NewIdentNConfig(tokenizer TokenizerConfig, apiKey APIKeyConfig, impersonation ImpersonationConfig, trustedHeader TrustedHeaderConfig) IdentNConfig {
	return IdentNConfig{
		Tokenizer:     tokenizer,
		APIKey:        apiKey,
		Impersonation: impersonation,
		TrustedHeader: trustedHeader,
	}
}

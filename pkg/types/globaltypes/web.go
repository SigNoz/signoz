package globaltypes

type WebConfig struct {
	Settings Settings `json:"settings" required:"true"`
}

type Settings struct {
	Sentry  Sentry  `json:"sentry" required:"true"`
	Posthog Posthog `json:"posthog" required:"true"`
	Pylon   Pylon   `json:"pylon" required:"true"`
	Appcues Appcues `json:"appcues" required:"true"`
}

type Sentry struct {
	Enabled   bool   `json:"enabled" required:"true"`
	DSN       string `json:"dsn,omitempty"`
	TunnelURL string `json:"tunnelURL,omitempty"`
}

type Posthog struct {
	Enabled bool   `json:"enabled" required:"true"`
	Key     string `json:"key,omitempty"`
}

type Pylon struct {
	Enabled     bool   `json:"enabled" required:"true"`
	AppID       string `json:"appID,omitempty"`
	IdentSecret string `json:"identSecret,omitempty"`
}

type Appcues struct {
	Enabled bool   `json:"enabled" required:"true"`
	AppID   string `json:"appID,omitempty"`
}

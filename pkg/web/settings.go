package web

type Settings struct {
	Posthog Posthog `json:"posthog" required:"true"`
	Appcues Appcues `json:"appcues" required:"true"`
	Sentry  Sentry  `json:"sentry" required:"true"`
	Pylon   Pylon   `json:"pylon" required:"true"`
}

type Posthog struct {
	Enabled bool   `json:"enabled" required:"true"`
	Key     string `json:"key"`
	APIHost string `json:"apiHost"`
	UIHost  string `json:"uiHost"`
}

type Appcues struct {
	Enabled bool   `json:"enabled" required:"true"`
	AppID   string `json:"appId"`
}

type Sentry struct {
	Enabled bool   `json:"enabled" required:"true"`
	DSN     string `json:"dsn"`
	Tunnel  string `json:"tunnel"`
}

type Pylon struct {
	Enabled        bool   `json:"enabled" required:"true"`
	AppID          string `json:"appId"`
	IdentitySecret string `json:"identitySecret"`
}

func NewSettings(config Config) Settings {
	return Settings{
		Posthog: Posthog{
			Enabled: config.Settings.Posthog.Enabled,
			Key:     config.Settings.Posthog.Key,
			APIHost: config.Settings.Posthog.APIHost,
			UIHost:  config.Settings.Posthog.UIHost,
		},
		Appcues: Appcues{
			Enabled: config.Settings.Appcues.Enabled,
			AppID:   config.Settings.Appcues.AppID,
		},
		Sentry: Sentry{
			Enabled: config.Settings.Sentry.Enabled,
			DSN:     config.Settings.Sentry.DSN,
			Tunnel:  config.Settings.Sentry.Tunnel,
		},
		Pylon: Pylon{
			Enabled:        config.Settings.Pylon.Enabled,
			AppID:          config.Settings.Pylon.AppID,
			IdentitySecret: config.Settings.Pylon.IdentitySecret,
		},
	}
}

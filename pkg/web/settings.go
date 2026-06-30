package web

type Settings struct {
	Posthog Posthog `json:"posthog" required:"true"`
	Appcues Appcues `json:"appcues" required:"true"`
	Sentry  Sentry  `json:"sentry" required:"true"`
	Pylon   Pylon   `json:"pylon" required:"true"`
}

type Posthog struct {
	Enabled bool   `json:"enabled" required:"true"`
	Key     string `json:"key" required:"true"`
	APIHost string `json:"apiHost" required:"true"`
	UIHost  string `json:"uiHost" required:"true"`
}

type Appcues struct {
	Enabled bool   `json:"enabled" required:"true"`
	AppID   string `json:"appId" required:"true"`
}

type Sentry struct {
	Enabled bool   `json:"enabled" required:"true"`
	DSN     string `json:"dsn" required:"true"`
	Tunnel  string `json:"tunnel" required:"true"`
}

type Pylon struct {
	Enabled        bool   `json:"enabled" required:"true"`
	AppID          string `json:"appId" required:"true"`
	IdentitySecret string `json:"identitySecret" required:"true"`
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

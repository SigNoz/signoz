package web

type Settings struct {
	Posthog Posthog `json:"posthog" required:"true"`
	Appcues Appcues `json:"appcues" required:"true"`
}

type Posthog struct {
	Enabled bool `json:"enabled" required:"true"`
}

type Appcues struct {
	Enabled bool `json:"enabled" required:"true"`
}

func NewSettings(config Config) Settings {
	return Settings{
		Posthog: Posthog{
			Enabled: config.Settings.Posthog.Enabled,
		},
		Appcues: Appcues{
			Enabled: config.Settings.Appcues.Enabled,
		},
	}
}

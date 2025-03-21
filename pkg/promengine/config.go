package promengine

import "net/url"

type ActiveQueryTrackerConfig struct {
	Enabled       bool   `mapstructure:"enabled"`
	Path          string `mapstructure:"path"`
	MaxConcurrent int    `mapstructure:"max_concurrent"`
}

type RemoteReadConfig struct {
	URL *url.URL `mapstructure:"url"`
}

type Config struct {
	RemoteReadConfig         RemoteReadConfig         `mapstructure:"remote_read"`
	ActiveQueryTrackerConfig ActiveQueryTrackerConfig `mapstructure:"active_query_tracker"`
}

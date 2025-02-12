package server

import (
	"net/url"
	"time"

	"github.com/prometheus/alertmanager/config"
	"github.com/prometheus/common/model"
	"go.signoz.io/signoz/pkg/types/alertmanagertypes"
)

type Config struct {
	// The URL under which Alertmanager is externally reachable (for example, if Alertmanager is served via a reverse proxy). Used for generating relative and absolute links back to Alertmanager itself.
	// See https://github.com/prometheus/alertmanager/blob/3b06b97af4d146e141af92885a185891eb79a5b0/cmd/alertmanager/main.go#L155C54-L155C249
	ExternalUrl *url.URL `mapstructure:"external_url"`

	// GlobalConfig is the global configuration for the alertmanager
	Global alertmanagertypes.GlobalConfig `mapstructure:"global"`

	// Config of the root node of the routing tree.
	Route alertmanagertypes.RouteConfig `mapstructure:"route"`

	// Configuration for alerts.
	Alerts AlertsConfig `mapstructure:"alerts"`

	// Configuration for silences.
	Silences SilencesConfig `mapstructure:"silences"`

	// Configuration for the notification log.
	NFLog NFLogConfig `mapstructure:"nflog"`
}

type AlertsConfig struct {
	// Interval between garbage collection of alerts.
	// See https://github.com/prometheus/alertmanager/blob/3b06b97af4d146e141af92885a185891eb79a5b0/cmd/alertmanager/main.go#L152
	GCInterval time.Duration `mapstructure:"gc_interval"`
}

type SilencesConfig struct {
	// Maximum number of silences, including expired silences. If negative or zero, no limit is set.
	// See https://github.com/prometheus/alertmanager/blob/3b06b97af4d146e141af92885a185891eb79a5b0/cmd/alertmanager/main.go#L150C64-L150C157
	Max int `mapstructure:"max"`

	// Maximum size of the silences in bytes. If negative or zero, no limit is set.
	// See https://github.com/prometheus/alertmanager/blob/3b06b97af4d146e141af92885a185891eb79a5b0/cmd/alertmanager/main.go#L150C64-L150C157
	MaxSizeBytes int `mapstructure:"max_size_bytes"`

	// Interval between garbage collection and snapshotting of the silences. The snapshot will be stored in the state store.
	// The upstream alertmanager config (https://github.com/prometheus/alertmanager/blob/3b06b97af4d146e141af92885a185891eb79a5b0/cmd/alertmanager/main.go#L149) has
	// been split between silences and nflog.
	MaintenanceInterval time.Duration `mapstructure:"maintenance_interval"`

	// Retention of the silences.
	Retention time.Duration `mapstructure:"retention"`
}

type NFLogConfig struct {
	// Interval between garbage collection and snapshotting of the notification logs. The snapshot will be stored in the state store.
	// The upstream alertmanager config (https://github.com/prometheus/alertmanager/blob/3b06b97af4d146e141af92885a185891eb79a5b0/cmd/alertmanager/main.go#L149) has
	// been split between silences and nflog.
	MaintenanceInterval time.Duration `mapstructure:"maintenance_interval"`

	// Retention of the notification logs.
	Retention time.Duration `mapstructure:"retention"`
}

func NewConfig() Config {
	return Config{
		ExternalUrl: &url.URL{
			Host: "localhost:8080",
		},
		Global: alertmanagertypes.GlobalConfig{
			// Corresponds to the default in upstream (https://github.com/prometheus/alertmanager/blob/3b06b97af4d146e141af92885a185891eb79a5b0/config/config.go#L727)
			ResolveTimeout: model.Duration(5 * time.Minute),
			SMTPHello:      "localhost",
			SMTPFrom:       "alertmanager@signoz.io",
			SMTPSmarthost:  config.HostPort{Host: "localhost", Port: "25"},
			SMTPRequireTLS: true,
		},
		Route: alertmanagertypes.RouteConfig{
			GroupByStr:     []string{"alertname"},
			GroupInterval:  5 * time.Minute,
			GroupWait:      30 * time.Second,
			RepeatInterval: 4 * time.Hour,
		},
		// Corresponds to the default in upstream (https://github.com/prometheus/alertmanager/blob/3b06b97af4d146e141af92885a185891eb79a5b0/cmd/alertmanager/main.go#L152)
		Alerts: AlertsConfig{
			GCInterval: 30 * time.Minute,
		},
		// Corresponds to the default in upstream (https://github.com/prometheus/alertmanager/blob/3b06b97af4d146e141af92885a185891eb79a5b0/cmd/alertmanager/main.go#L149-L151)
		Silences: SilencesConfig{
			Max:                 0,
			MaxSizeBytes:        0,
			MaintenanceInterval: 15 * time.Minute,
			Retention:           120 * time.Hour,
		},
		// Corresponds to the default in upstream (https://github.com/prometheus/alertmanager/blob/3b06b97af4d146e141af92885a185891eb79a5b0/cmd/alertmanager/main.go#L149)
		NFLog: NFLogConfig{
			MaintenanceInterval: 15 * time.Minute,
			Retention:           120 * time.Hour,
		},
	}
}

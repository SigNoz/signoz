package alertmanager

import (
	"net/url"
	"time"

	"go.signoz.io/signoz/pkg/alertmanager/alertmanagerstore"
	"go.signoz.io/signoz/pkg/factory"
)

type Config struct {
	// PollInterval is the interval at which the alertmanager config is polled from the store.
	PollInterval time.Duration `mapstructure:"poll_interval"`

	// The URL under which Alertmanager is externally reachable (for example, if Alertmanager is served via a reverse proxy). Used for generating relative and absolute links back to Alertmanager itself.
	// See https://github.com/prometheus/alertmanager/blob/3b06b97af4d146e141af92885a185891eb79a5b0/cmd/alertmanager/main.go#L155C54-L155C249
	ExternalUrl *url.URL `mapstructure:"external_url"`

	// ResolveTimeout is the time after which an alert is declared resolved if it has not been updated.
	// See https://github.com/prometheus/alertmanager/blob/3b06b97af4d146e141af92885a185891eb79a5b0/config/config.go#L836
	ResolveTimeout time.Duration `mapstructure:"resolve_timeout"`

	// Config of the root node of the routing tree.
	Route RouteConfig `mapstructure:"route"`

	// Configuration for alerts.
	Alerts AlertsConfig `mapstructure:"alerts"`

	// Configuration for silences.
	Silences SilencesConfig `mapstructure:"silences"`

	// Configuration for the notification log.
	NFLog NFLogConfig `mapstructure:"nflog"`

	// Configuration for the Email receiver. We are explicitly defining this here instead of taking it as part of the receiver configuration.
	// This is because we want to use the same SMTP configuration for all receivers.
	SMTP SMTPConfig `mapstructure:"smtp"`

	// Configuration for the alertmanagerstore.
	Store alertmanagerstore.Config `mapstructure:"store"`
}

type RouteConfig struct {
	GroupBy        []string      `mapstructure:"group_by"`
	GroupInterval  time.Duration `mapstructure:"group_interval"`
	GroupWait      time.Duration `mapstructure:"group_wait"`
	RepeatInterval time.Duration `mapstructure:"repeat_interval"`
}

// This is a best effort to make it similar to the upstream alertmanager config. See
// https://github.com/prometheus/alertmanager/blob/3b06b97af4d146e141af92885a185891eb79a5b0/config/config.go#L843
type SMTPConfig struct {
	Hello        string `mapstructure:"hello"`
	From         string `mapstructure:"from"`
	Host         string `mapstructure:"host"`
	Port         int    `mapstructure:"port"`
	AuthUsername string `mapstructure:"auth_username"`
	AuthPassword string `mapstructure:"auth_password"`
	AuthSecret   string `mapstructure:"auth_secret"`
	AuthIdentity string `mapstructure:"auth_identity"`
	RequireTLS   bool   `mapstructure:"require_tls"`
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

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("alertmanager"), newConfig)
}

func newConfig() factory.Config {
	return Config{
		PollInterval: 15 * time.Second,
		ExternalUrl: &url.URL{
			Host: "localhost:8080",
		},
		// Corresponds to the default in upstream (https://github.com/prometheus/alertmanager/blob/3b06b97af4d146e141af92885a185891eb79a5b0/config/config.go#L727)
		ResolveTimeout: 5 * time.Minute,
		Route: RouteConfig{
			GroupBy:        []string{"alertname"},
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
		SMTP: SMTPConfig{
			Hello:      "localhost",
			From:       "alertmanager@signoz.io",
			Host:       "localhost",
			Port:       25,
			RequireTLS: true,
		},
		Store: alertmanagerstore.NewConfig().(alertmanagerstore.Config),
	}
}

func (c Config) Validate() error {
	return nil
}

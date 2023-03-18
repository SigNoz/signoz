package lbexporter

// borrowed from https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/release/v0.66.x/exporter/loadbalancingexporter/config.go

import (
	"time"

	"go.opentelemetry.io/collector/exporter/otlpexporter"
)

func MakeConfig(i interface{}) Config {
	return i.(Config)
}

// config for lb exporter
type Config struct {
	Protocol   Protocol         `mapstructure:"protocol"`
	Resolver   ResolverSettings `mapstructure:"resolver"`
	RoutingKey string           `mapstructure:"routing_key"`
}

// Protocol holds the individual protocol-specific settings. Only OTLP is supported at the moment.
type Protocol struct {
	OTLP otlpexporter.Config `mapstructure:"otlp"`
}

// ResolverSettings defines the configurations for the backend resolver
type ResolverSettings struct {
	Static *StaticResolver `mapstructure:"static"`
	DNS    *DNSResolver    `mapstructure:"dns"`
}

// StaticResolver defines the configuration for the resolver providing a fixed list of backends
type StaticResolver struct {
	Hostnames []string `mapstructure:"hostnames"`
}

// DNSResolver defines the configuration for the DNS resolver
type DNSResolver struct {
	Hostname string        `mapstructure:"hostname"`
	Port     string        `mapstructure:"port"`
	Interval time.Duration `mapstructure:"interval"`
	Timeout  time.Duration `mapstructure:"timeout"`
}

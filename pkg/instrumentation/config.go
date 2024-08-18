package instrumentation

import "github.com/spf13/pflag"

type Config struct {
	Tracing  bool
	Metering bool
}

func (cfg *Config) RegisterFlags(pf *pflag.FlagSet) {
	pf.BoolVar(&cfg.Tracing, "instrumentation.tracing", false, "Whether to enable tracing or not. If enabled, the application will be instrumented by OpenTelemetry.")
	pf.BoolVar(&cfg.Metering, "instrumentation.metering", false, "Whether to enable metering or not. If enabled, the application will be instrumented by OpenTelemetry.")
}

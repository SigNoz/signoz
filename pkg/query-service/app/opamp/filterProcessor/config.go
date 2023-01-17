package filterprocessor

// copy of config required for open-telemetry-contrib/processors/filterprocessor

type Config struct {
	Metrics MetricFilters `mapstructure:"metrics"`
}

type MetricFilters struct {
	DataPointConditions []string `mapstructure:"datapoint"`
}

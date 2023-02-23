package filterprocessor

type Config struct {
	Metrics MetricFilters `mapstructure:"metrics"`
}

// MetricFilters filters by Metric properties.
type MetricFilters struct {
	MetricConditions    []string `mapstructure:"metric"`
	DataPointConditions []string `mapstructure:"datapoint"`
}

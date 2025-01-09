package cloudservicesintegration

import (
	"go.signoz.io/signoz/pkg/query-service/app/dashboards"
)

type CloudServiceLogsConfig struct {
	Enabled bool `json:"enabled"`
}

type CloudServiceMetricsConfig struct {
	Enabled bool `json:"enabled"`
}

type CloudServiceConfig struct {
	Logs    CloudServiceLogsConfig    `json:"logs"`
	Metrics CloudServiceMetricsConfig `json:"metrics"`
}

type CloudServiceSummary struct {
	Id       string `json:"id"`
	Title    string `json:"title"`
	Icon     string `json:"icon"`
	Overview string `json:"overview"` // markdown

	// Provided only if the service has been configured in the
	// context of a cloud provider account.
	Config *CloudServiceConfig `json:"config,omitempty"`
}

type CloudServiceAssets struct {
	Dashboards []dashboards.Data `json:"dashboards"`
}

type CloudServiceDetails struct {
	CloudServiceSummary

	Assets CloudServiceAssets `json:"assets"`
}

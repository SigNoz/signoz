package services

type Metadata struct {
	Id    string `json:"id"`
	Title string `json:"title"`
	Icon  string `json:"icon"`

	// Present only if the service has been configured in the
	// context of a cloud provider account.
	// Config *CloudServiceConfig `json:"config,omitempty"`
}

type Definition struct {
	Metadata

	Overview string `json:"overview"` // markdown

	Assets Assets `json:"assets"`

	SupportedSignals SupportedSignals `json:"supported_signals"`

	DataCollected DataCollected `json:"data_collected"`

	ConnectionStatus *ConnectionStatus `json:"status,omitempty"`

	TelemetryCollectionStrategy *CloudTelemetryCollectionStrategy `json:"telemetry_collection_strategy"`
}

type Assets struct {
	Dashboards []CloudServiceDashboard `json:"dashboards"`
}

type SupportedSignals struct {
	Logs    bool `json:"logs"`
	Metrics bool `json:"metrics"`
}

type DataCollected struct {
	Logs    []CollectedLogAttribute `json:"logs"`
	Metrics []CollectedMetric       `json:"metrics"`
}

type CollectedLogAttribute struct {
	Name string `json:"name"`
	Path string `json:"path"`
	Type string `json:"type"`
}

type CollectedMetric struct {
	Name        string `json:"name"`
	Type        string `json:"type"`
	Unit        string `json:"unit"`
	Description string `json:"description"`
}

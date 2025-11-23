package metricsmoduletypes

import (
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

// StatsRequest represents the payload accepted by the metrics stats endpoint.
type StatsRequest struct {
	Expression string           `json:"expression"`
	Start      int64            `json:"start"`
	End        int64            `json:"end"`
	Limit      int              `json:"limit"`
	Offset     int              `json:"offset"`
	OrderBy    *qbtypes.OrderBy `json:"orderBy,omitempty"`
}

// Stat represents the summary information returned per metric.
type Stat struct {
	MetricName   string           `json:"metricName"`
	Description  string           `json:"description"`
	MetricType   metrictypes.Type `json:"type"`
	MetricUnit   string           `json:"unit"`
	TimeSeries   uint64           `json:"timeseries"`
	Samples      uint64           `json:"samples"`
	LastReceived int64            `json:"lastReceived"`
}

// StatsResponse represents the aggregated metrics statistics.
type StatsResponse struct {
	Metrics []Stat `json:"metrics"`
	Total   uint64 `json:"total"`
}

type MetricMetadata struct {
	Description string                  `json:"description"`
	MetricType  metrictypes.Type        `json:"type"`
	MetricUnit  string                  `json:"unit"`
	Temporality metrictypes.Temporality `json:"temporality"`
	IsMonotonic bool                    `json:"isMonotonic"`
}

// TreemapRequest represents the payload for the metrics treemap endpoint.
type TreemapRequest struct {
	Expression string                  `json:"expression"`
	Start      int64                   `json:"start"`
	End        int64                   `json:"end"`
	Limit      int                     `json:"limit"`
	Treemap    metrictypes.TreemapMode `json:"treemap"`
}

// TreemapEntry represents each node in the treemap response.
type TreemapEntry struct {
	MetricName string  `json:"metricName"`
	Percentage float64 `json:"percentage"`
	TotalValue uint64  `json:"totalValue"`
}

// TreemapResponse is the output structure for the treemap endpoint.
type TreemapResponse struct {
	TimeSeries []TreemapEntry `json:"timeseries"`
	Samples    []TreemapEntry `json:"samples"`
}

// UpdateMetricsMetadataRequest represents the payload for updating metrics metadata.
type UpdateMetricsMetadataRequest struct {
	MetricName  string                  `json:"metricName"`
	MetricType  metrictypes.Type        `json:"metricType"`
	Description string                  `json:"description"`
	Unit        string                  `json:"unit"`
	Temporality metrictypes.Temporality `json:"temporality"`
	IsMonotonic bool                    `json:"isMonotonic"`
}

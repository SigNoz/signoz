package model

import (
	"encoding/json"
	"time"

	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
)

type UpdateMetricsMetadata struct {
	MetricName  string         `json:"metricName" ch:"metric_name"`
	MetricType  v3.MetricType  `json:"metricType" ch:"type"`
	Description string         `json:"description" ch:"description"`
	Unit        string         `json:"unit" ch:"unit"`
	Temporality v3.Temporality `json:"temporality" ch:"temporality"`
	IsMonotonic bool           `json:"is_monotonic" ch:"is_monotonic"`
	CreatedAt   time.Time      `json:"created_at" ch:"created_at"`
}

func (c *UpdateMetricsMetadata) MarshalBinary() (data []byte, err error) {
	return json.Marshal(c)
}
func (c *UpdateMetricsMetadata) UnmarshalBinary(data []byte) error {
	return json.Unmarshal(data, c)
}

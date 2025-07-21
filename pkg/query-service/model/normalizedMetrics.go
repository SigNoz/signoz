package model

import "encoding/json"

type MetricsNormalizedMap struct {
	MetricName     string `json:"metricName"`
	IsUnNormalized bool   `json:"isUnNormalized"`
}

func (c *MetricsNormalizedMap) MarshalBinary() (data []byte, err error) {
	return json.Marshal(c)
}
func (c *MetricsNormalizedMap) UnmarshalBinary(data []byte) error {
	return json.Unmarshal(data, c)
}

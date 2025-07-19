package model

import "encoding/json"

type NormalizedMetricsMap struct {
	NormalizedMetricName   string `json:"normalizedMetricName"`
	UnNormalizedMetricName string `json:"unNormalizedMetricName"`
}

func (c *NormalizedMetricsMap) MarshalBinary() (data []byte, err error) {
	return json.Marshal(c)
}
func (c *NormalizedMetricsMap) UnmarshalBinary(data []byte) error {
	return json.Unmarshal(data, c)
}

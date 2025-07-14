package model

import "encoding/json"

type NormalizedMetricsMap struct {
	MetricsMap map[string]string `json:"metrics"`
}

func (c *NormalizedMetricsMap) MarshalBinary() (data []byte, err error) {
	return json.Marshal(c)
}
func (c *NormalizedMetricsMap) UnmarshalBinary(data []byte) error {
	return json.Unmarshal(data, c)
}

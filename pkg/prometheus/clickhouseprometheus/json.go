package clickhouseprometheus

import (
	"encoding/json"

	"github.com/prometheus/prometheus/prompb"
)

// Unmarshals JSON into Prometheus labels. It does not preserve order.
func unmarshalLabels(b []byte) ([]prompb.Label, string, error) {
	var metricName string
	m := make(map[string]string)
	if err := json.Unmarshal(b, &m); err != nil {
		return nil, metricName, err
	}
	res := make([]prompb.Label, 0, len(m))
	for n, v := range m {
		if n == "__name__" {
			metricName = v
		}
		res = append(res, prompb.Label{
			Name:  n,
			Value: v,
		})
	}
	return res, metricName, nil
}

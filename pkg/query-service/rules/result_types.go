package rules

import (
	"encoding/json"
	"fmt"
	"strconv"

	"go.signoz.io/signoz/pkg/query-service/utils/labels"
)

// common result format of query

type Vector []Sample

type Sample struct {
	Point

	Metric labels.Labels

	IsMissing bool
}

func (s Sample) String() string {
	return fmt.Sprintf("%s => %s", s.Metric, s.Point)
}

func (s Sample) MarshalJSON() ([]byte, error) {
	v := struct {
		M labels.Labels `json:"metric"`
		V Point         `json:"value"`
	}{
		M: s.Metric,
		V: s.Point,
	}
	return json.Marshal(v)
}

type Point struct {
	T  int64
	V  float64
	Vs []float64
}

func (p Point) String() string {
	v := strconv.FormatFloat(p.V, 'f', -1, 64)
	return fmt.Sprintf("%v @[%v]", v, p.T)
}

// MarshalJSON implements json.Marshaler.
func (p Point) MarshalJSON() ([]byte, error) {
	v := strconv.FormatFloat(p.V, 'f', -1, 64)
	return json.Marshal([...]interface{}{float64(p.T) / 1000, v})
}

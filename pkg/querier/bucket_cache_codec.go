package querier

import (
	"encoding/json"

	"github.com/SigNoz/signoz/pkg/errors"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

// The cache keeps points at full precision. The response encoder of
// TimeSeriesValue rounds values for readers, and a rounded value fed back
// into post-processing gives another answer than the uncached query.

type cachedPoint struct {
	Timestamp int64     `json:"t"`
	Value     float64   `json:"v"`
	Values    []float64 `json:"vs,omitempty"`
	Partial   bool      `json:"p,omitempty"`
}

type cachedSeries struct {
	Labels []*qbtypes.Label `json:"labels,omitempty"`
	Points []*cachedPoint   `json:"points"`
}

type cachedAggregation struct {
	Index  int                     `json:"index"`
	Alias  string                  `json:"alias,omitempty"`
	Meta   qbtypes.AggregationMeta `json:"meta,omitempty"`
	Series []*cachedSeries         `json:"series"`
}

type cachedValue struct {
	QueryName    string               `json:"queryName,omitempty"`
	Aggregations []*cachedAggregation `json:"aggregations"`
}

func encodeBucketValue(data *qbtypes.TimeSeriesData) ([]byte, error) {
	value := cachedValue{QueryName: data.QueryName, Aggregations: make([]*cachedAggregation, 0, len(data.Aggregations))}
	for _, agg := range data.Aggregations {
		if agg == nil {
			continue
		}
		encoded := &cachedAggregation{Index: agg.Index, Alias: agg.Alias, Meta: agg.Meta, Series: make([]*cachedSeries, 0, len(agg.Series))}
		for _, s := range agg.Series {
			if s == nil {
				continue
			}
			series := &cachedSeries{Labels: s.Labels, Points: make([]*cachedPoint, 0, len(s.Values))}
			for _, v := range s.Values {
				if v == nil {
					continue
				}
				series.Points = append(series.Points, &cachedPoint{Timestamp: v.Timestamp, Value: v.Value, Values: v.Values, Partial: v.Partial})
			}
			encoded.Series = append(encoded.Series, series)
		}
		value.Aggregations = append(value.Aggregations, encoded)
	}
	return json.Marshal(value)
}

// decodeBucketValue rejects a payload with null elements: a bucket is either
// whole or not usable, since a reader cannot tell a dropped point from an
// absent one.
func decodeBucketValue(raw []byte) (*qbtypes.TimeSeriesData, error) {
	var value cachedValue
	if err := json.Unmarshal(raw, &value); err != nil {
		return nil, err
	}
	data := &qbtypes.TimeSeriesData{QueryName: value.QueryName, Aggregations: make([]*qbtypes.AggregationBucket, 0, len(value.Aggregations))}
	for _, agg := range value.Aggregations {
		if agg == nil {
			return nil, errors.NewInternalf(errors.CodeInternal, "cached bucket has a null aggregation")
		}
		decoded := &qbtypes.AggregationBucket{Index: agg.Index, Alias: agg.Alias, Meta: agg.Meta, Series: make([]*qbtypes.TimeSeries, 0, len(agg.Series))}
		for _, s := range agg.Series {
			if s == nil {
				return nil, errors.NewInternalf(errors.CodeInternal, "cached bucket has a null series")
			}
			series := &qbtypes.TimeSeries{Labels: s.Labels, Values: make([]*qbtypes.TimeSeriesValue, 0, len(s.Points))}
			for _, p := range s.Points {
				if p == nil {
					return nil, errors.NewInternalf(errors.CodeInternal, "cached bucket has a null point")
				}
				series.Values = append(series.Values, &qbtypes.TimeSeriesValue{Timestamp: p.Timestamp, Value: p.Value, Values: p.Values, Partial: p.Partial})
			}
			decoded.Series = append(decoded.Series, series)
		}
		data.Aggregations = append(data.Aggregations, decoded)
	}
	return data, nil
}

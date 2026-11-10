package querybuildertypesv5

import (
	"math"

	jsonv2 "github.com/go-json-experiment/json"
	"github.com/go-json-experiment/json/jsontext"
	jsonv1 "github.com/go-json-experiment/json/v1"
)

// SetZeroFill makes every series render one point per step over [startMs, endMs], writing 0 for
// a step without a value, instead of storing those points. Points off the step grid are dropped.
func (t *TimeSeriesData) SetZeroFill(startMs, endMs, stepMs int64) {
	if stepMs <= 0 {
		return
	}
	t.zeroFill = &zeroFill{start: startMs, end: endMs, step: stepMs}
}

func (q QueryRangeResponse) MarshalJSON() ([]byte, error) {
	return jsonv2.Marshal(q, jsonv1.DefaultOptionsV1())
}

// MarshalJSONTo lets a time series response stream to the writer instead of being held in
// memory whole.
func (q QueryRangeResponse) MarshalJSONTo(enc *jsontext.Encoder) error {
	type alias QueryRangeResponse
	return jsonv2.MarshalEncode(enc, (*alias)(&q))
}

func (t TimeSeriesData) MarshalJSON() ([]byte, error) {
	return jsonv2.Marshal(t, jsonv1.DefaultOptionsV1())
}

func (t TimeSeriesData) MarshalJSONTo(enc *jsontext.Encoder) error {
	writer := tokenWriter{enc: enc}
	writer.token(jsontext.BeginObject)
	writer.token(jsontext.String("queryName"))
	writer.token(jsontext.String(t.QueryName))
	writer.token(jsontext.String("aggregations"))
	if t.Aggregations == nil {
		writer.token(jsontext.Null)
	} else {
		writer.token(jsontext.BeginArray)
		for _, bucket := range t.Aggregations {
			if writer.err != nil {
				return writer.err
			}
			writer.aggregationBucket(bucket, t.zeroFill)
		}
		writer.token(jsontext.EndArray)
	}
	writer.token(jsontext.EndObject)
	return writer.err
}

func (t TimeSeriesValue) MarshalJSON() ([]byte, error) {
	return jsonv2.Marshal(t, jsonv1.DefaultOptionsV1())
}

func (t TimeSeriesValue) MarshalJSONTo(enc *jsontext.Encoder) error {
	writer := tokenWriter{enc: enc}
	writer.token(jsontext.BeginObject)
	writer.token(jsontext.String("timestamp"))
	writer.token(jsontext.Int(t.Timestamp))
	if t.Partial {
		writer.token(jsontext.String("partial"))
		writer.token(jsontext.True)
	}
	// a heatmap point's counts are spread across Values, so there is no one
	// number Value could carry
	if t.Values == nil {
		writer.token(jsontext.String("value"))
		writer.token(sanitizedFloatToken(t.Value))
	} else {
		writer.token(jsontext.String("values"))
		writer.token(jsontext.BeginArray)
		for _, v := range t.Values {
			writer.token(sanitizedFloatToken(v))
		}
		writer.token(jsontext.EndArray)
	}
	writer.token(jsontext.EndObject)
	return writer.err
}

type zeroFill struct {
	start int64
	end   int64
	step  int64
}

// tokenWriter keeps the first error so a sequence of writes needs a single check.
type tokenWriter struct {
	enc *jsontext.Encoder
	err error
}

func (writer *tokenWriter) token(t jsontext.Token) {
	if writer.err == nil {
		writer.err = writer.enc.WriteToken(t)
	}
}

func (writer *tokenWriter) value(v any) {
	if writer.err == nil {
		writer.err = jsonv2.MarshalEncode(writer.enc, v)
	}
}

func (writer *tokenWriter) aggregationBucket(a *AggregationBucket, fill *zeroFill) {
	if a == nil {
		writer.token(jsontext.Null)
		return
	}

	writer.token(jsontext.BeginObject)
	writer.token(jsontext.String("index"))
	writer.token(jsontext.Int(int64(a.Index)))
	writer.token(jsontext.String("alias"))
	writer.token(jsontext.String(a.Alias))
	writer.token(jsontext.String("meta"))
	writer.value(a.Meta)
	writer.token(jsontext.String("series"))
	writer.seriesList(a.Series, fill)
	writer.optionalSeriesList("predictedSeries", a.PredictedSeries)
	writer.optionalSeriesList("upperBoundSeries", a.UpperBoundSeries)
	writer.optionalSeriesList("lowerBoundSeries", a.LowerBoundSeries)
	writer.optionalSeriesList("anomalyScores", a.AnomalyScores)
	writer.token(jsontext.EndObject)
}

func (writer *tokenWriter) optionalSeriesList(name string, series []*TimeSeries) {
	if len(series) == 0 {
		return
	}
	writer.token(jsontext.String(name))
	writer.seriesList(series, nil)
}

func (writer *tokenWriter) seriesList(series []*TimeSeries, fill *zeroFill) {
	if series == nil {
		writer.token(jsontext.Null)
		return
	}

	writer.token(jsontext.BeginArray)
	for _, s := range series {
		if writer.err != nil {
			return
		}
		writer.series(s, fill)
	}
	writer.token(jsontext.EndArray)
}

func (writer *tokenWriter) series(s *TimeSeries, fill *zeroFill) {
	if writer.err != nil {
		return
	}
	if s == nil {
		writer.token(jsontext.Null)
		return
	}

	writer.token(jsontext.BeginObject)
	if len(s.Labels) > 0 {
		writer.token(jsontext.String("labels"))
		writer.value(s.Labels)
	}
	writer.token(jsontext.String("values"))
	switch {
	case fill != nil:
		writer.zeroFilledValues(s.Values, fill)
	case s.Values == nil:
		writer.token(jsontext.Null)
	default:
		writer.token(jsontext.BeginArray)
		for _, v := range s.Values {
			if writer.err != nil {
				return
			}
			writer.point(v)
		}
		writer.token(jsontext.EndArray)
	}
	writer.token(jsontext.EndObject)
}

func (writer *tokenWriter) zeroFilledValues(values []*TimeSeriesValue, fill *zeroFill) {
	byTimestamp := make(map[int64]*TimeSeriesValue, len(values))
	for _, v := range values {
		byTimestamp[v.Timestamp] = v
	}

	writer.token(jsontext.BeginArray)
	for ts := fill.start - fill.start%fill.step; ts <= fill.end && writer.err == nil; ts += fill.step {
		if v, ok := byTimestamp[ts]; ok {
			writer.point(v)
			continue
		}
		writer.token(jsontext.BeginObject)
		writer.token(jsontext.String("timestamp"))
		writer.token(jsontext.Int(ts))
		writer.token(jsontext.String("value"))
		writer.token(jsontext.Int(0))
		writer.token(jsontext.EndObject)
	}
	writer.token(jsontext.EndArray)
}

func (writer *tokenWriter) point(v *TimeSeriesValue) {
	if v == nil {
		writer.token(jsontext.Null)
		return
	}
	if writer.err == nil {
		writer.err = v.MarshalJSONTo(writer.enc)
	}
}

// sanitizedFloatToken encodes f the way sanitizeValue renders it.
func sanitizedFloatToken(f float64) jsontext.Token {
	switch {
	case math.IsNaN(f):
		return jsontext.String("NaN")
	case math.IsInf(f, 1):
		return jsontext.String("Inf")
	case math.IsInf(f, -1):
		return jsontext.String("-Inf")
	}
	return jsontext.Float(roundToNonZeroDecimals(f, 3))
}

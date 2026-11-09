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
	w := tokenWriter{enc: enc}
	w.token(jsontext.BeginObject)
	w.token(jsontext.String("queryName"))
	w.token(jsontext.String(t.QueryName))
	w.token(jsontext.String("aggregations"))
	if t.Aggregations == nil {
		w.token(jsontext.Null)
	} else {
		w.token(jsontext.BeginArray)
		for _, bucket := range t.Aggregations {
			w.aggregationBucket(bucket, t.zeroFill)
		}
		w.token(jsontext.EndArray)
	}
	w.token(jsontext.EndObject)
	return w.err
}

func (t TimeSeriesValue) MarshalJSON() ([]byte, error) {
	return jsonv2.Marshal(t, jsonv1.DefaultOptionsV1())
}

func (t TimeSeriesValue) MarshalJSONTo(enc *jsontext.Encoder) error {
	w := tokenWriter{enc: enc}
	w.token(jsontext.BeginObject)
	w.token(jsontext.String("timestamp"))
	w.token(jsontext.Int(t.Timestamp))
	if t.Partial {
		w.token(jsontext.String("partial"))
		w.token(jsontext.True)
	}
	// a heatmap point's counts are spread across Values, so there is no one
	// number Value could carry
	if t.Values == nil {
		w.token(jsontext.String("value"))
		w.token(sanitizedFloatToken(t.Value))
	} else {
		w.token(jsontext.String("values"))
		w.token(jsontext.BeginArray)
		for _, v := range t.Values {
			w.token(sanitizedFloatToken(v))
		}
		w.token(jsontext.EndArray)
	}
	w.token(jsontext.EndObject)
	return w.err
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

func (w *tokenWriter) token(t jsontext.Token) {
	if w.err == nil {
		w.err = w.enc.WriteToken(t)
	}
}

func (w *tokenWriter) value(v any) {
	if w.err == nil {
		w.err = jsonv2.MarshalEncode(w.enc, v)
	}
}

func (w *tokenWriter) aggregationBucket(a *AggregationBucket, fill *zeroFill) {
	if a == nil {
		w.token(jsontext.Null)
		return
	}

	w.token(jsontext.BeginObject)
	w.token(jsontext.String("index"))
	w.token(jsontext.Int(int64(a.Index)))
	w.token(jsontext.String("alias"))
	w.token(jsontext.String(a.Alias))
	w.token(jsontext.String("meta"))
	w.value(a.Meta)
	w.token(jsontext.String("series"))
	w.seriesList(a.Series, fill)
	w.optionalSeriesList("predictedSeries", a.PredictedSeries)
	w.optionalSeriesList("upperBoundSeries", a.UpperBoundSeries)
	w.optionalSeriesList("lowerBoundSeries", a.LowerBoundSeries)
	w.optionalSeriesList("anomalyScores", a.AnomalyScores)
	w.token(jsontext.EndObject)
}

func (w *tokenWriter) optionalSeriesList(name string, series []*TimeSeries) {
	if len(series) == 0 {
		return
	}
	w.token(jsontext.String(name))
	w.seriesList(series, nil)
}

func (w *tokenWriter) seriesList(series []*TimeSeries, fill *zeroFill) {
	if series == nil {
		w.token(jsontext.Null)
		return
	}

	w.token(jsontext.BeginArray)
	for _, s := range series {
		w.series(s, fill)
	}
	w.token(jsontext.EndArray)
}

func (w *tokenWriter) series(s *TimeSeries, fill *zeroFill) {
	if s == nil {
		w.token(jsontext.Null)
		return
	}

	w.token(jsontext.BeginObject)
	if len(s.Labels) > 0 {
		w.token(jsontext.String("labels"))
		w.value(s.Labels)
	}
	w.token(jsontext.String("values"))
	switch {
	case fill != nil:
		w.zeroFilledValues(s.Values, fill)
	case s.Values == nil:
		w.token(jsontext.Null)
	default:
		w.token(jsontext.BeginArray)
		for _, v := range s.Values {
			w.point(v)
		}
		w.token(jsontext.EndArray)
	}
	w.token(jsontext.EndObject)
}

func (w *tokenWriter) zeroFilledValues(values []*TimeSeriesValue, fill *zeroFill) {
	byTimestamp := make(map[int64]*TimeSeriesValue, len(values))
	for _, v := range values {
		byTimestamp[v.Timestamp] = v
	}

	w.token(jsontext.BeginArray)
	for ts := fill.start - fill.start%fill.step; ts <= fill.end; ts += fill.step {
		if v, ok := byTimestamp[ts]; ok {
			w.point(v)
			continue
		}
		w.token(jsontext.BeginObject)
		w.token(jsontext.String("timestamp"))
		w.token(jsontext.Int(ts))
		w.token(jsontext.String("value"))
		w.token(jsontext.Int(0))
		w.token(jsontext.EndObject)
	}
	w.token(jsontext.EndArray)
}

func (w *tokenWriter) point(v *TimeSeriesValue) {
	if v == nil {
		w.token(jsontext.Null)
		return
	}
	if w.err == nil {
		w.err = v.MarshalJSONTo(w.enc)
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

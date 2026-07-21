package clickhouseprometheus

import (
	"testing"

	"github.com/prometheus/prometheus/prompb"
	"github.com/stretchr/testify/assert"
)

func mkSeries(value string, samples ...prompb.Sample) *prompb.TimeSeries {
	return &prompb.TimeSeries{
		Labels:  []prompb.Label{{Name: "job", Value: value}},
		Samples: samples,
	}
}

func TestMergeSeriesWithIdenticalLabels(t *testing.T) {
	s := func(ts int64, v float64) prompb.Sample { return prompb.Sample{Timestamp: ts, Value: v} }

	t.Run("empty and single series pass through untouched", func(t *testing.T) {
		assert.Nil(t, mergeSeriesWithIdenticalLabels(nil))
		one := []*prompb.TimeSeries{mkSeries("a", s(1, 1))}
		got := mergeSeriesWithIdenticalLabels(one)
		assert.Equal(t, one, got)
	})

	t.Run("no collisions returns the input slice as is", func(t *testing.T) {
		in := []*prompb.TimeSeries{mkSeries("a", s(1, 1)), mkSeries("b", s(1, 2))}
		got := mergeSeriesWithIdenticalLabels(in)
		// same backing slice: the fast path must not rebuild anything
		assert.Equal(t, &in[0], &got[0])
	})

	t.Run("disjoint streams concatenate in timestamp order", func(t *testing.T) {
		// the #8563 shape: the series transitioned fingerprints at a point
		// in time, so the streams do not overlap at all
		got := mergeSeriesWithIdenticalLabels([]*prompb.TimeSeries{
			mkSeries("a", s(1, 1), s(2, 2)),
			mkSeries("a", s(3, 3), s(4, 4)),
		})
		assert.Equal(t, []prompb.Sample{s(1, 1), s(2, 2), s(3, 3), s(4, 4)}, got[0].Samples)
	})

	t.Run("three fingerprints one labelset", func(t *testing.T) {
		got := mergeSeriesWithIdenticalLabels([]*prompb.TimeSeries{
			mkSeries("a", s(1, 1), s(4, 4)),
			mkSeries("a", s(2, 2)),
			mkSeries("a", s(3, 3)),
		})
		assert.Len(t, got, 1)
		assert.Equal(t, []prompb.Sample{s(1, 1), s(2, 2), s(3, 3), s(4, 4)}, got[0].Samples)
	})

	t.Run("equal timestamps everywhere keep the last stream's value", func(t *testing.T) {
		// input is in ascending fingerprint order; the highest wins each tie
		got := mergeSeriesWithIdenticalLabels([]*prompb.TimeSeries{
			mkSeries("a", s(1, 1), s(2, 1)),
			mkSeries("a", s(1, 9), s(2, 9)),
		})
		assert.Equal(t, []prompb.Sample{s(1, 9), s(2, 9)}, got[0].Samples)
	})

	t.Run("zero-sample series in a group is harmless", func(t *testing.T) {
		got := mergeSeriesWithIdenticalLabels([]*prompb.TimeSeries{
			mkSeries("a"),
			mkSeries("a", s(1, 1)),
		})
		assert.Len(t, got, 1)
		assert.Equal(t, []prompb.Sample{s(1, 1)}, got[0].Samples)
	})

	t.Run("colliding and distinct series interleave without cross-talk", func(t *testing.T) {
		got := mergeSeriesWithIdenticalLabels([]*prompb.TimeSeries{
			mkSeries("a", s(1, 1)),
			mkSeries("b", s(1, 2)),
			mkSeries("a", s(2, 3)),
		})
		assert.Len(t, got, 2)
		assert.Equal(t, []prompb.Sample{s(1, 1), s(2, 3)}, got[0].Samples)
		assert.Equal(t, []prompb.Sample{s(1, 2)}, got[1].Samples)
	})
}

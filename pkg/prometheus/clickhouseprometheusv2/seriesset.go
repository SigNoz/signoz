package clickhouseprometheusv2

import (
	"sort"

	"github.com/prometheus/prometheus/model/histogram"
	"github.com/prometheus/prometheus/model/labels"
	"github.com/prometheus/prometheus/storage"
	"github.com/prometheus/prometheus/tsdb/chunkenc"
	"github.com/prometheus/prometheus/util/annotations"
)

// series is one time series with samples stored as parallel slices, ordered
// by timestamp. The compact layout avoids per-sample allocations and keeps
// iteration cache friendly.
type series struct {
	lset labels.Labels
	ts   []int64
	vs   []float64
}

var _ storage.Series = (*series)(nil)

func (s *series) Labels() labels.Labels {
	return s.lset
}

func (s *series) Iterator(it chunkenc.Iterator) chunkenc.Iterator {
	if fit, ok := it.(*floatIterator); ok {
		fit.reset(s)
		return fit
	}
	fit := &floatIterator{}
	fit.reset(s)
	return fit
}

// floatIterator implements chunkenc.Iterator over a series' sample slices.
type floatIterator struct {
	s *series
	i int
}

var _ chunkenc.Iterator = (*floatIterator)(nil)

func (it *floatIterator) reset(s *series) {
	it.s = s
	it.i = -1
}

func (it *floatIterator) Next() chunkenc.ValueType {
	it.i++
	if it.i >= len(it.s.ts) {
		return chunkenc.ValNone
	}
	return chunkenc.ValFloat
}

func (it *floatIterator) Seek(t int64) chunkenc.ValueType { //nolint:govet // stdmethods flags io.Seeker; this is chunkenc.Iterator's Seek
	if it.i < 0 {
		it.i = 0
	}
	if it.i >= len(it.s.ts) {
		return chunkenc.ValNone
	}
	// The current position, once valid, must not move backwards.
	if it.s.ts[it.i] >= t {
		return chunkenc.ValFloat
	}
	it.i += sort.Search(len(it.s.ts)-it.i, func(j int) bool {
		return it.s.ts[it.i+j] >= t
	})
	if it.i >= len(it.s.ts) {
		return chunkenc.ValNone
	}
	return chunkenc.ValFloat
}

func (it *floatIterator) At() (int64, float64) {
	return it.s.ts[it.i], it.s.vs[it.i]
}

func (it *floatIterator) AtHistogram(*histogram.Histogram) (int64, *histogram.Histogram) {
	return 0, nil
}

func (it *floatIterator) AtFloatHistogram(*histogram.FloatHistogram) (int64, *histogram.FloatHistogram) {
	return 0, nil
}

func (it *floatIterator) AtT() int64 {
	return it.s.ts[it.i]
}

// AtST returns the current start timestamp; not tracked by this storage.
func (it *floatIterator) AtST() int64 {
	return 0
}

func (it *floatIterator) Err() error {
	return nil
}

// seriesSet iterates a fully materialized, label-sorted list of series.
type seriesSet struct {
	series []*series
	i      int
}

var _ storage.SeriesSet = (*seriesSet)(nil)

func newSeriesSet(list []*series) *seriesSet {
	return &seriesSet{series: list, i: -1}
}

func (s *seriesSet) Next() bool {
	s.i++
	return s.i < len(s.series)
}

func (s *seriesSet) At() storage.Series {
	return s.series[s.i]
}

func (s *seriesSet) Err() error {
	return nil
}

func (s *seriesSet) Warnings() annotations.Annotations {
	return nil
}

// sortAndMerge orders series by label set and merges series whose label sets
// are identical. Distinct fingerprints can carry identical label sets (e.g.
// series differing only in a non-label dimension); Prometheus storages never
// expose duplicate label sets to the engine, so merge their samples by
// timestamp, keeping the first sample on ties.
func sortAndMerge(list []*series) []*series {
	if len(list) < 2 {
		return list
	}
	sort.Slice(list, func(i, j int) bool {
		return labels.Compare(list[i].lset, list[j].lset) < 0
	})
	out := list[:1]
	for _, s := range list[1:] {
		last := out[len(out)-1]
		if labels.Compare(last.lset, s.lset) != 0 {
			out = append(out, s)
			continue
		}
		merged := mergeSamples(last, s)
		out[len(out)-1] = merged
	}
	return out
}

func mergeSamples(a, b *series) *series {
	ts := make([]int64, 0, len(a.ts)+len(b.ts))
	vs := make([]float64, 0, len(a.ts)+len(b.ts))
	i, j := 0, 0
	for i < len(a.ts) && j < len(b.ts) {
		switch {
		case a.ts[i] < b.ts[j]:
			ts = append(ts, a.ts[i])
			vs = append(vs, a.vs[i])
			i++
		case a.ts[i] > b.ts[j]:
			ts = append(ts, b.ts[j])
			vs = append(vs, b.vs[j])
			j++
		default:
			ts = append(ts, a.ts[i])
			vs = append(vs, a.vs[i])
			i++
			j++
		}
	}
	ts = append(ts, a.ts[i:]...)
	vs = append(vs, a.vs[i:]...)
	ts = append(ts, b.ts[j:]...)
	vs = append(vs, b.vs[j:]...)
	return &series{lset: a.lset, ts: ts, vs: vs}
}

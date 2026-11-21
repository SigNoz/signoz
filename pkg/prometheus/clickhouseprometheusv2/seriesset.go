package clickhouseprometheusv2

import (
	"sort"

	"github.com/prometheus/prometheus/model/histogram"
	"github.com/prometheus/prometheus/model/labels"
	"github.com/prometheus/prometheus/storage"
	"github.com/prometheus/prometheus/tsdb/chunkenc"
	"github.com/prometheus/prometheus/util/annotations"
)

// series is one time series with samples as parallel slices ordered by
// timestamp. Deliberately not storage.NewListSeries: that boxes every sample
// as an interface value, a per-sample allocation this fetch path exists to
// avoid.
type series struct {
	lset labels.Labels
	ts   []int64
	vs   []float64
}

var _ storage.Series = (*series)(nil)

func (series *series) Labels() labels.Labels {
	return series.lset
}

func (series *series) Iterator(it chunkenc.Iterator) chunkenc.Iterator {
	if fit, ok := it.(*floatIterator); ok {
		fit.reset(series)
		return fit
	}
	fit := &floatIterator{}
	fit.reset(series)
	return fit
}

// floatIterator implements chunkenc.Iterator over a series' sample slices.
type floatIterator struct {
	s *series
	i int
}

var _ chunkenc.Iterator = (*floatIterator)(nil)

func (iterator *floatIterator) reset(s *series) {
	iterator.s = s
	iterator.i = -1
}

func (iterator *floatIterator) Next() chunkenc.ValueType {
	iterator.i++
	if iterator.i >= len(iterator.s.ts) {
		return chunkenc.ValNone
	}
	return chunkenc.ValFloat
}

func (iterator *floatIterator) Seek(t int64) chunkenc.ValueType { //nolint:govet // stdmethods flags io.Seeker; this is chunkenc.Iterator's Seek
	if iterator.i < 0 {
		iterator.i = 0
	}
	if iterator.i >= len(iterator.s.ts) {
		return chunkenc.ValNone
	}
	// The current position, once valid, must not move backwards.
	if iterator.s.ts[iterator.i] >= t {
		return chunkenc.ValFloat
	}
	iterator.i += sort.Search(len(iterator.s.ts)-iterator.i, func(j int) bool {
		return iterator.s.ts[iterator.i+j] >= t
	})
	if iterator.i >= len(iterator.s.ts) {
		return chunkenc.ValNone
	}
	return chunkenc.ValFloat
}

func (iterator *floatIterator) At() (int64, float64) {
	return iterator.s.ts[iterator.i], iterator.s.vs[iterator.i]
}

func (iterator *floatIterator) AtHistogram(*histogram.Histogram) (int64, *histogram.Histogram) {
	return 0, nil
}

func (iterator *floatIterator) AtFloatHistogram(*histogram.FloatHistogram) (int64, *histogram.FloatHistogram) {
	return 0, nil
}

func (iterator *floatIterator) AtT() int64 {
	return iterator.s.ts[iterator.i]
}

// AtST returns the current start timestamp; not tracked by this storage.
func (iterator *floatIterator) AtST() int64 {
	return 0
}

func (iterator *floatIterator) Err() error {
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

func (set *seriesSet) Next() bool {
	set.i++
	return set.i < len(set.series)
}

func (set *seriesSet) At() storage.Series {
	return set.series[set.i]
}

func (set *seriesSet) Err() error {
	return nil
}

func (set *seriesSet) Warnings() annotations.Annotations {
	return nil
}

// sortAndMerge orders series by label set and merges identical label sets
// by timestamp (first sample wins ties): distinct fingerprints can carry
// identical label sets, and the engine assumes storages never emit
// duplicates.
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

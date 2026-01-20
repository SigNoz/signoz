package querier

import (
	"sync"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

// Pools for reducing allocations in hot paths
var (
	// Pool for label slices
	labelSlicePool = sync.Pool{
		New: func() any {
			s := make([]*qbtypes.Label, 0, 16)
			return &s
		},
	}

	// Pool for string slices used in label processing
	stringSlicePool = sync.Pool{
		New: func() any {
			s := make([]string, 0, 16)
			return &s
		},
	}

	// Pool for time series value slices
	valueSlicePool = sync.Pool{
		New: func() any {
			s := make([]*qbtypes.TimeSeriesValue, 0, 100)
			return &s
		},
	}

	// Pool for aggregation value maps
	aggValueMapPool = sync.Pool{
		New: func() any {
			m := make(map[int]float64, 4)
			return &m
		},
	}
)

// GetLabelSlice gets a label slice from the pool
func GetLabelSlice() []*qbtypes.Label {
	sp := labelSlicePool.Get().(*[]*qbtypes.Label)
	return *sp
}

// PutLabelSlice returns a label slice to the pool
func PutLabelSlice(s []*qbtypes.Label) {
	s = s[:0] // Reset slice
	labelSlicePool.Put(&s)
}

// GetStringSlice gets a string slice from the pool
func GetStringSlice() []string {
	sp := stringSlicePool.Get().(*[]string)
	return *sp
}

// PutStringSlice returns a string slice to the pool
func PutStringSlice(s []string) {
	s = s[:0] // Reset slice
	stringSlicePool.Put(&s)
}

// GetValueSlice gets a time series value slice from the pool
func GetValueSlice() []*qbtypes.TimeSeriesValue {
	sp := valueSlicePool.Get().(*[]*qbtypes.TimeSeriesValue)
	return *sp
}

// PutValueSlice returns a time series value slice to the pool
func PutValueSlice(s []*qbtypes.TimeSeriesValue) {
	s = s[:0] // Reset slice
	valueSlicePool.Put(&s)
}

// GetAggValueMap gets an aggregation value map from the pool
func GetAggValueMap() map[int]float64 {
	mp := aggValueMapPool.Get().(*map[int]float64)
	m := *mp
	// Clear the map
	for k := range m {
		delete(m, k)
	}
	return m
}

// PutAggValueMap returns an aggregation value map to the pool
func PutAggValueMap(m map[int]float64) {
	// Clear before returning to pool
	for k := range m {
		delete(m, k)
	}
	aggValueMapPool.Put(&m)
}

package querier

import (
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMergeTimeSeriesDataUnionsHeatmapAxes(t *testing.T) {
	// a log axis holds whichever bands the data reached, so a wide cached range
	// and a narrow fresh one routinely disagree on which bands exist
	cached := &qbtypes.TimeSeriesData{
		QueryName: "A",
		Aggregations: []*qbtypes.AggregationBucket{{
			Index: 0,
			Meta:  qbtypes.AggregationMeta{Buckets: []float64{1, 4, 16}},
			Series: []*qbtypes.TimeSeries{{
				Labels: []*qbtypes.Label{{Key: telemetrytypes.TelemetryFieldKey{Name: "host.name"}, Value: "node-1"}},
				Values: []*qbtypes.TimeSeriesValue{{Timestamp: 1710000000000, Values: []float64{1, 2, 3, 4}}},
			}},
		}},
	}
	fresh := &qbtypes.TimeSeriesData{
		QueryName: "A",
		Aggregations: []*qbtypes.AggregationBucket{{
			Index: 0,
			Meta:  qbtypes.AggregationMeta{Buckets: []float64{2, 4}},
			Series: []*qbtypes.TimeSeries{{
				Labels: []*qbtypes.Label{{Key: telemetrytypes.TelemetryFieldKey{Name: "host.name"}, Value: "node-1"}},
				Values: []*qbtypes.TimeSeriesValue{{Timestamp: 1710000060000, Values: []float64{5, 6, 7}}},
			}},
		}},
	}

	merged := mergeTimeSeriesData([]*qbtypes.TimeSeriesData{cached, fresh})

	require.Len(t, merged.Aggregations, 1)
	aggBucket := merged.Aggregations[0]
	assert.Equal(t, []float64{1, 2, 4, 16}, aggBucket.Meta.Buckets)

	require.Len(t, aggBucket.Series, 1)
	require.Len(t, aggBucket.Series[0].Values, 2)
	// the cached 16 band survives even though the fresh range never reached it
	assert.Equal(t, []float64{1, 0, 2, 3, 4}, aggBucket.Series[0].Values[0].Values)
	// and the fresh 2 band survives even though the cached range never had it
	assert.Equal(t, []float64{0, 5, 6, 0, 7}, aggBucket.Series[0].Values[1].Values)

	// the parts are left as they were, since the fresh one is written to the cache afterwards
	assert.Equal(t, []float64{2, 4}, fresh.Aggregations[0].Meta.Buckets)
	assert.Equal(t, []float64{5, 6, 7}, fresh.Aggregations[0].Series[0].Values[0].Values)
}

func TestRealignFromAnEmptyAxisCollapsesIntoTheOverflow(t *testing.T) {
	// pins the behaviour the trim bug exposed: with no axis to read the counts
	// against, everything lands in the overflow slot
	aggBucket := &qbtypes.AggregationBucket{
		Series: []*qbtypes.TimeSeries{{
			Values: []*qbtypes.TimeSeriesValue{{Timestamp: 1710000000000, Values: []float64{7, 8, 9, 10}}},
		}},
	}

	aggBucket.ReindexValuesToNewUpperBounds([]float64{1, 2, 4})

	assert.Equal(t, []float64{0, 0, 0, 7}, aggBucket.Series[0].Values[0].Values)
}

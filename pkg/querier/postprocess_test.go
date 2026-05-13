package querier

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// Multiple series with different number of labels, shouldn't panic and should align labels correctly.
func TestConvertTimeSeriesDataToScalar_RaggedLabels(t *testing.T) {
	label := func(name string, value any) *qbtypes.Label {
		return &qbtypes.Label{
			Key:   telemetrytypes.TelemetryFieldKey{Name: name},
			Value: value,
		}
	}
	series := func(labels []*qbtypes.Label, value float64) *qbtypes.TimeSeries {
		return &qbtypes.TimeSeries{
			Labels: labels,
			Values: []*qbtypes.TimeSeriesValue{{Timestamp: 1, Value: value}},
		}
	}

	tsData := &qbtypes.TimeSeriesData{
		QueryName: "A",
		Aggregations: []*qbtypes.AggregationBucket{{
			Index: 0,
			Series: []*qbtypes.TimeSeries{
				series([]*qbtypes.Label{label("label_1", "orphan-0")}, 20),
				series([]*qbtypes.Label{label("label_1", "box-0"), label("label_2", "rpc-0")}, 10),
			},
		}},
	}

	var sd *qbtypes.ScalarData
	require.NotPanics(t, func() {
		sd = convertTimeSeriesDataToScalar(tsData, "A")
	})

	require.NotNil(t, sd)
	require.Len(t, sd.Columns, 3)
	assert.Equal(t, "label_1", sd.Columns[0].Name)
	assert.Equal(t, "label_2", sd.Columns[1].Name)
	assert.Equal(t, "__result_0", sd.Columns[2].Name)

	require.Len(t, sd.Data, 2)
	assert.Equal(t, []any{"orphan-0", nil, 20.0}, sd.Data[0])
	assert.Equal(t, []any{"box-0", "rpc-0", 10.0}, sd.Data[1])
}

package querybuildertypesv5

import (
	"encoding/json"
	"testing"

	jsonv2 "github.com/go-json-experiment/json"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestTimeSeriesData_ZeroFill(t *testing.T) {
	testCases := []struct {
		name     string
		values   []*TimeSeriesValue
		start    int64
		end      int64
		step     int64
		expected string
	}{
		{
			name:     "Gaps",
			values:   []*TimeSeriesValue{{Timestamp: 1000, Value: 1}, {Timestamp: 4000, Value: 4}},
			start:    1000,
			end:      4000,
			step:     1000,
			expected: `[{"timestamp":1000,"value":1},{"timestamp":2000,"value":0},{"timestamp":3000,"value":0},{"timestamp":4000,"value":4}]`,
		},
		{
			name:     "Empty",
			values:   []*TimeSeriesValue{},
			start:    1000,
			end:      3000,
			step:     1000,
			expected: `[{"timestamp":1000,"value":0},{"timestamp":2000,"value":0},{"timestamp":3000,"value":0}]`,
		},
		{
			name:     "Nil",
			values:   nil,
			start:    1000,
			end:      2000,
			step:     1000,
			expected: `[{"timestamp":1000,"value":0},{"timestamp":2000,"value":0}]`,
		},
		{
			name:     "UnalignedBounds",
			values:   []*TimeSeriesValue{{Timestamp: 60000, Value: 1}, {Timestamp: 240000, Value: 4}},
			start:    50000,
			end:      250000,
			step:     60000,
			expected: `[{"timestamp":0,"value":0},{"timestamp":60000,"value":1},{"timestamp":120000,"value":0},{"timestamp":180000,"value":0},{"timestamp":240000,"value":4}]`,
		},
		{
			name:     "OffGridAndOutOfRangeDropped",
			values:   []*TimeSeriesValue{{Timestamp: 500, Value: 5}, {Timestamp: 1500, Value: 15}, {Timestamp: 2000, Value: 2}, {Timestamp: 3000, Value: 3}},
			start:    1000,
			end:      2000,
			step:     1000,
			expected: `[{"timestamp":1000,"value":0},{"timestamp":2000,"value":2}]`,
		},
		{
			name:     "DuplicateTimestampKeepsLast",
			values:   []*TimeSeriesValue{{Timestamp: 1000, Value: 1}, {Timestamp: 1000, Value: 9}},
			start:    1000,
			end:      1000,
			step:     1000,
			expected: `[{"timestamp":1000,"value":9}]`,
		},
		{
			name:     "PointFieldsKept",
			values:   []*TimeSeriesValue{{Timestamp: 2000, Value: 2.12345, Partial: true}},
			start:    1000,
			end:      2000,
			step:     1000,
			expected: `[{"timestamp":1000,"value":0},{"timestamp":2000,"partial":true,"value":2.123}]`,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			series := &TimeSeries{Values: testCase.values}
			data := &TimeSeriesData{
				QueryName: "A",
				Aggregations: []*AggregationBucket{{
					Series:          []*TimeSeries{series},
					PredictedSeries: []*TimeSeries{{Values: []*TimeSeriesValue{{Timestamp: 3000, Value: 3}}}},
				}},
			}
			data.SetZeroFill(testCase.start, testCase.end, testCase.step)

			expected := `{"queryName":"A","aggregations":[{"index":0,"alias":"","meta":{},"series":[{"values":` + testCase.expected + `}],"predictedSeries":[{"values":[{"timestamp":3000,"value":3}]}]}]}`

			marshalled, err := json.Marshal(data)
			require.NoError(t, err)
			assert.JSONEq(t, expected, string(marshalled))

			response := QueryRangeResponse{Type: RequestTypeTimeSeries, Data: QueryData{Results: []any{data}}}
			viaMarshalJSON, err := json.Marshal(response)
			require.NoError(t, err)
			viaMarshalJSONTo, err := jsonv2.Marshal(response)
			require.NoError(t, err)
			assert.Equal(t, string(viaMarshalJSON), string(viaMarshalJSONTo))

			var decoded struct {
				Data struct {
					Results []json.RawMessage `json:"results"`
				} `json:"data"`
			}
			require.NoError(t, json.Unmarshal(viaMarshalJSONTo, &decoded))
			require.Len(t, decoded.Data.Results, 1)
			assert.JSONEq(t, expected, string(decoded.Data.Results[0]))

			assert.Equal(t, testCase.values, series.Values)
		})
	}
}

func TestTimeSeriesData_ZeroFillMatchesFuncFillZero(t *testing.T) {
	values := []*TimeSeriesValue{{Timestamp: 500, Value: 5}, {Timestamp: 60000, Value: 1}, {Timestamp: 90000, Value: 9}, {Timestamp: 240000, Value: 4, Partial: true}}

	filled := &TimeSeriesData{QueryName: "A", Aggregations: []*AggregationBucket{{Series: []*TimeSeries{funcFillZero(&TimeSeries{Values: values}, 50000, 250000, 60000)}}}}
	deferred := &TimeSeriesData{QueryName: "A", Aggregations: []*AggregationBucket{{Series: []*TimeSeries{{Values: values}}}}}
	deferred.SetZeroFill(50000, 250000, 60000)

	expected, err := json.Marshal(filled)
	require.NoError(t, err)
	actual, err := json.Marshal(deferred)
	require.NoError(t, err)
	assert.Equal(t, string(expected), string(actual))
}

// failingWriter accepts its first write and fails every one after it.
type failingWriter struct {
	writes int
}

func (writer *failingWriter) Write(p []byte) (int, error) {
	writer.writes++
	if writer.writes == 1 {
		return len(p), nil
	}
	return 0, assert.AnError
}

func TestQueryRangeResponse_MarshalStopsOnWriteError(t *testing.T) {
	values := make([]*TimeSeriesValue, 16)
	for i := range values {
		values[i] = &TimeSeriesValue{Timestamp: int64(i) * 1000, Value: 1}
	}
	series := make([]*TimeSeries, 10000)
	for i := range series {
		series[i] = &TimeSeries{Values: values}
	}
	data := &TimeSeriesData{QueryName: "A", Aggregations: []*AggregationBucket{{Series: series}}}
	data.SetZeroFill(0, 1000*1000, 1000)

	response := QueryRangeResponse{Type: RequestTypeTimeSeries, Data: QueryData{Results: []any{data}}}

	writer := &failingWriter{}
	err := jsonv2.MarshalWrite(writer, response)
	assert.ErrorIs(t, err, assert.AnError)
	assert.Equal(t, 2, writer.writes)

	allocs := testing.AllocsPerRun(1, func() {
		_ = jsonv2.MarshalWrite(&failingWriter{}, response)
	})
	assert.Less(t, allocs, float64(len(series)))
}

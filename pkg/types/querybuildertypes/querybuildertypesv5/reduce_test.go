package querybuildertypesv5

import (
	"math"
	"testing"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
)

func TestFunctionReduceTo(t *testing.T) {
	createLabels := func() []*Label {
		return []*Label{
			{
				Key:   telemetrytypes.TelemetryFieldKey{Name: "service", FieldDataType: telemetrytypes.FieldDataTypeString},
				Value: "test-service",
			},
		}
	}

	createValues := func(pairs ...struct {
		ts  int64
		val float64
	}) []*TimeSeriesValue {
		values := make([]*TimeSeriesValue, len(pairs))
		for i, pair := range pairs {
			values[i] = &TimeSeriesValue{
				Timestamp: pair.ts,
				Value:     pair.val,
			}
		}
		return values
	}

	t.Run("Empty series", func(t *testing.T) {
		ts := &TimeSeries{
			Labels: createLabels(),
			Values: []*TimeSeriesValue{},
		}

		result := FunctionReduceTo(ts, ReduceToSum)
		assert.Equal(t, ts, result, "Empty series should return unchanged")
	})

	t.Run("ReduceToLast", func(t *testing.T) {
		ts := &TimeSeries{
			Labels: createLabels(),
			Values: createValues(
				struct {
					ts  int64
					val float64
				}{1000, 10.0},
				struct {
					ts  int64
					val float64
				}{2000, 20.0},
				struct {
					ts  int64
					val float64
				}{3000, 30.0},
			),
		}

		result := FunctionReduceTo(ts, ReduceToLast)

		assert.Len(t, result.Values, 1)
		assert.Equal(t, int64(3000), result.Values[0].Timestamp)
		assert.Equal(t, 30.0, result.Values[0].Value)
		assert.Equal(t, ts.Labels, result.Labels)
	})

	t.Run("ReduceToSum", func(t *testing.T) {
		ts := &TimeSeries{
			Labels: createLabels(),
			Values: createValues(
				struct {
					ts  int64
					val float64
				}{1000, 10.0},
				struct {
					ts  int64
					val float64
				}{2000, 20.0},
				struct {
					ts  int64
					val float64
				}{3000, 30.0},
			),
		}

		result := FunctionReduceTo(ts, ReduceToSum)

		assert.Len(t, result.Values, 1)
		assert.Equal(t, int64(3000), result.Values[0].Timestamp) // Last timestamp
		assert.Equal(t, 60.0, result.Values[0].Value)            // 10 + 20 + 30
	})

	t.Run("ReduceToSum with NaN values", func(t *testing.T) {
		ts := &TimeSeries{
			Labels: createLabels(),
			Values: createValues(
				struct {
					ts  int64
					val float64
				}{1000, 10.0},
				struct {
					ts  int64
					val float64
				}{2000, math.NaN()},
				struct {
					ts  int64
					val float64
				}{3000, 30.0},
			),
		}

		result := FunctionReduceTo(ts, ReduceToSum)

		assert.Len(t, result.Values, 1)
		assert.Equal(t, int64(3000), result.Values[0].Timestamp)
		assert.Equal(t, 40.0, result.Values[0].Value) // 10 + 30 (NaN skipped)
	})

	t.Run("ReduceToAvg", func(t *testing.T) {
		ts := &TimeSeries{
			Labels: createLabels(),
			Values: createValues(
				struct {
					ts  int64
					val float64
				}{1000, 10.0},
				struct {
					ts  int64
					val float64
				}{2000, 20.0},
				struct {
					ts  int64
					val float64
				}{3000, 30.0},
			),
		}

		result := FunctionReduceTo(ts, ReduceToAvg)

		assert.Len(t, result.Values, 1)
		assert.Equal(t, int64(3000), result.Values[0].Timestamp)
		assert.Equal(t, 20.0, result.Values[0].Value) // (10 + 20 + 30) / 3
	})

	t.Run("ReduceToAvg with all NaN values", func(t *testing.T) {
		ts := &TimeSeries{
			Labels: createLabels(),
			Values: createValues(
				struct {
					ts  int64
					val float64
				}{1000, math.NaN()},
				struct {
					ts  int64
					val float64
				}{2000, math.NaN()},
			),
		}

		result := FunctionReduceTo(ts, ReduceToAvg)

		assert.Len(t, result.Values, 1)
		assert.Equal(t, int64(2000), result.Values[0].Timestamp)
		assert.True(t, math.IsNaN(result.Values[0].Value))
	})

	t.Run("ReduceToMin", func(t *testing.T) {
		ts := &TimeSeries{
			Labels: createLabels(),
			Values: createValues(
				struct {
					ts  int64
					val float64
				}{1000, 30.0},
				struct {
					ts  int64
					val float64
				}{2000, 10.0}, // minimum
				struct {
					ts  int64
					val float64
				}{3000, 20.0},
			),
		}

		result := FunctionReduceTo(ts, ReduceToMin)

		assert.Len(t, result.Values, 1)
		assert.Equal(t, int64(2000), result.Values[0].Timestamp) // Timestamp of minimum value
		assert.Equal(t, 10.0, result.Values[0].Value)
	})

	t.Run("ReduceToMin with all NaN values", func(t *testing.T) {
		ts := &TimeSeries{
			Labels: createLabels(),
			Values: createValues(
				struct {
					ts  int64
					val float64
				}{1000, math.NaN()},
				struct {
					ts  int64
					val float64
				}{2000, math.NaN()},
			),
		}

		result := FunctionReduceTo(ts, ReduceToMin)

		assert.Len(t, result.Values, 1)
		assert.Equal(t, int64(2000), result.Values[0].Timestamp) // Last timestamp
		assert.True(t, math.IsNaN(result.Values[0].Value))
	})

	t.Run("ReduceToMax", func(t *testing.T) {
		ts := &TimeSeries{
			Labels: createLabels(),
			Values: createValues(
				struct {
					ts  int64
					val float64
				}{1000, 10.0},
				struct {
					ts  int64
					val float64
				}{2000, 30.0}, // maximum
				struct {
					ts  int64
					val float64
				}{3000, 20.0},
			),
		}

		result := FunctionReduceTo(ts, ReduceToMax)

		assert.Len(t, result.Values, 1)
		assert.Equal(t, int64(2000), result.Values[0].Timestamp) // Timestamp of maximum value
		assert.Equal(t, 30.0, result.Values[0].Value)
	})

	t.Run("ReduceToMax with all NaN values", func(t *testing.T) {
		ts := &TimeSeries{
			Labels: createLabels(),
			Values: createValues(
				struct {
					ts  int64
					val float64
				}{1000, math.NaN()},
				struct {
					ts  int64
					val float64
				}{2000, math.NaN()},
			),
		}

		result := FunctionReduceTo(ts, ReduceToMax)

		assert.Len(t, result.Values, 1)
		assert.Equal(t, int64(2000), result.Values[0].Timestamp) // Last timestamp
		assert.True(t, math.IsNaN(result.Values[0].Value))
	})

	t.Run("ReduceToCount", func(t *testing.T) {
		ts := &TimeSeries{
			Labels: createLabels(),
			Values: createValues(
				struct {
					ts  int64
					val float64
				}{1000, 10.0},
				struct {
					ts  int64
					val float64
				}{2000, math.NaN()},
				struct {
					ts  int64
					val float64
				}{3000, 30.0},
				struct {
					ts  int64
					val float64
				}{4000, 40.0},
			),
		}

		result := FunctionReduceTo(ts, ReduceToCount)

		assert.Len(t, result.Values, 1)
		assert.Equal(t, int64(4000), result.Values[0].Timestamp) // Last timestamp
		assert.Equal(t, 3.0, result.Values[0].Value)             // 3 non-NaN values
	})

	t.Run("ReduceToMedian odd number of values", func(t *testing.T) {
		ts := &TimeSeries{
			Labels: createLabels(),
			Values: createValues(
				struct {
					ts  int64
					val float64
				}{1000, 30.0},
				struct {
					ts  int64
					val float64
				}{2000, 10.0},
				struct {
					ts  int64
					val float64
				}{3000, 20.0}, // median when sorted: 10, 20, 30
			),
		}

		result := FunctionReduceTo(ts, ReduceToMedian)

		assert.Len(t, result.Values, 1)
		assert.Equal(t, 20.0, result.Values[0].Value)            // Middle value
		assert.Equal(t, int64(3000), result.Values[0].Timestamp) // Timestamp of median value
	})

	t.Run("ReduceToMedian even number of values", func(t *testing.T) {
		ts := &TimeSeries{
			Labels: createLabels(),
			Values: createValues(
				struct {
					ts  int64
					val float64
				}{1000, 40.0},
				struct {
					ts  int64
					val float64
				}{2000, 10.0},
				struct {
					ts  int64
					val float64
				}{3000, 30.0},
				struct {
					ts  int64
					val float64
				}{4000, 20.0},
			),
		}

		result := FunctionReduceTo(ts, ReduceToMedian)

		assert.Len(t, result.Values, 1)
		assert.Equal(t, 25.0, result.Values[0].Value)        // (20 + 30) / 2 when sorted: 10, 20, 30, 40
		expectedTimestamp := (int64(4000) + int64(3000)) / 2 // Average of middle timestamps
		assert.Equal(t, expectedTimestamp, result.Values[0].Timestamp)
	})

	t.Run("ReduceToMedian with NaN values", func(t *testing.T) {
		ts := &TimeSeries{
			Labels: createLabels(),
			Values: createValues(
				struct {
					ts  int64
					val float64
				}{1000, 30.0},
				struct {
					ts  int64
					val float64
				}{2000, math.NaN()},
				struct {
					ts  int64
					val float64
				}{3000, 10.0},
				struct {
					ts  int64
					val float64
				}{4000, 20.0},
			),
		}

		result := FunctionReduceTo(ts, ReduceToMedian)

		assert.Len(t, result.Values, 1)
		assert.Equal(t, 20.0, result.Values[0].Value) // Median of [10, 20, 30]
		assert.Equal(t, int64(4000), result.Values[0].Timestamp)
	})

	t.Run("ReduceToMedian with all NaN values", func(t *testing.T) {
		ts := &TimeSeries{
			Labels: createLabels(),
			Values: createValues(
				struct {
					ts  int64
					val float64
				}{1000, math.NaN()},
				struct {
					ts  int64
					val float64
				}{2000, math.NaN()},
			),
		}

		result := FunctionReduceTo(ts, ReduceToMedian)

		assert.Len(t, result.Values, 1)
		assert.Equal(t, int64(2000), result.Values[0].Timestamp) // Last timestamp
		assert.True(t, math.IsNaN(result.Values[0].Value))
	})

	t.Run("ReduceToUnknown", func(t *testing.T) {
		ts := &TimeSeries{
			Labels: createLabels(),
			Values: createValues(
				struct {
					ts  int64
					val float64
				}{1000, 10.0},
				struct {
					ts  int64
					val float64
				}{2000, 20.0},
			),
		}

		result := FunctionReduceTo(ts, ReduceToUnknown)

		assert.Equal(t, ts, result, "Unknown reduce operation should return original series")
	})

	t.Run("Invalid ReduceTo", func(t *testing.T) {
		ts := &TimeSeries{
			Labels: createLabels(),
			Values: createValues(
				struct {
					ts  int64
					val float64
				}{1000, 10.0},
				struct {
					ts  int64
					val float64
				}{2000, 20.0},
			),
		}

		// Create an invalid ReduceTo value
		invalidReduceTo := ReduceTo{valuer.NewString("invalid")}
		result := FunctionReduceTo(ts, invalidReduceTo)

		assert.Equal(t, ts, result, "Invalid reduce operation should return original series")
	})

	t.Run("Single value series", func(t *testing.T) {
		ts := &TimeSeries{
			Labels: createLabels(),
			Values: createValues(
				struct {
					ts  int64
					val float64
				}{1000, 42.0},
			),
		}

		testCases := []struct {
			reduceTo ReduceTo
			expected float64
		}{
			{ReduceToLast, 42.0},
			{ReduceToSum, 42.0},
			{ReduceToAvg, 42.0},
			{ReduceToMin, 42.0},
			{ReduceToMax, 42.0},
			{ReduceToCount, 1.0},
			{ReduceToMedian, 42.0},
		}

		for _, tc := range testCases {
			t.Run(tc.reduceTo.StringValue(), func(t *testing.T) {
				result := FunctionReduceTo(ts, tc.reduceTo)
				assert.Len(t, result.Values, 1)
				assert.Equal(t, tc.expected, result.Values[0].Value)
				assert.Equal(t, int64(1000), result.Values[0].Timestamp)
			})
		}
	})

	t.Run("Labels preservation", func(t *testing.T) {
		originalLabels := []*Label{
			{
				Key:   telemetrytypes.TelemetryFieldKey{Name: "service", FieldDataType: telemetrytypes.FieldDataTypeString},
				Value: "test-service",
			},
			{
				Key:   telemetrytypes.TelemetryFieldKey{Name: "instance", FieldDataType: telemetrytypes.FieldDataTypeString},
				Value: "test-instance",
			},
		}

		ts := &TimeSeries{
			Labels: originalLabels,
			Values: createValues(
				struct {
					ts  int64
					val float64
				}{1000, 10.0},
				struct {
					ts  int64
					val float64
				}{2000, 20.0},
			),
		}

		result := FunctionReduceTo(ts, ReduceToSum)

		assert.Equal(t, originalLabels, result.Labels, "Labels should be preserved")
		assert.Len(t, result.Labels, 2)
		assert.Equal(t, "test-service", result.Labels[0].Value)
		assert.Equal(t, "test-instance", result.Labels[1].Value)
	})
}

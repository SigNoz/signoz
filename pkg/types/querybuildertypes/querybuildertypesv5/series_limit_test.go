package querybuildertypesv5

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
)

func TestApplySeriesLimit(t *testing.T) {
	t.Run("Sort by value with limit", func(t *testing.T) {
		// Create test series with different values
		series := []*TimeSeries{
			{
				Labels: []*Label{
					{
						Key: telemetrytypes.TelemetryFieldKey{
							Name:          "service",
							FieldDataType: telemetrytypes.FieldDataTypeString,
						},
						Value: "service-a",
					},
				},
				Values: []*TimeSeriesValue{
					{Timestamp: 1000, Value: 10.0},
				},
			},
			{
				Labels: []*Label{
					{
						Key: telemetrytypes.TelemetryFieldKey{
							Name:          "service",
							FieldDataType: telemetrytypes.FieldDataTypeString,
						},
						Value: "service-b",
					},
				},
				Values: []*TimeSeriesValue{
					{Timestamp: 1000, Value: 50.0},
				},
			},
			{
				Labels: []*Label{
					{
						Key: telemetrytypes.TelemetryFieldKey{
							Name:          "service",
							FieldDataType: telemetrytypes.FieldDataTypeString,
						},
						Value: "service-c",
					},
				},
				Values: []*TimeSeriesValue{
					{Timestamp: 1000, Value: 30.0},
				},
			},
			{
				Labels: []*Label{
					{
						Key: telemetrytypes.TelemetryFieldKey{
							Name:          "service",
							FieldDataType: telemetrytypes.FieldDataTypeString,
						},
						Value: "service-d",
					},
				},
				Values: []*TimeSeriesValue{
					{Timestamp: 1000, Value: 20.0},
				},
			},
		}

		// Sort by value descending with limit of 2
		orderBy := []OrderBy{
			{
				Key: OrderByKey{
					TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
						Name:          DefaultOrderByKey,
						FieldDataType: telemetrytypes.FieldDataTypeFloat64,
					},
				},
				Direction: OrderDirectionDesc,
			},
		}

		result := ApplySeriesLimit(series, orderBy, 2)

		// Should return top 2 series by value: service-b (50.0), service-c (30.0)
		assert.Len(t, result, 2)

		// First series should be service-b with value 50.0
		assert.Equal(t, "service-b", result[0].Labels[0].Value)
		assert.Equal(t, 50.0, result[0].Values[0].Value)

		// Second series should be service-c with value 30.0
		assert.Equal(t, "service-c", result[1].Labels[0].Value)
		assert.Equal(t, 30.0, result[1].Values[0].Value)
	})

	t.Run("Sort by labels with two keys", func(t *testing.T) {
		// Create test series with different label combinations
		series := []*TimeSeries{
			{
				Labels: []*Label{
					{
						Key: telemetrytypes.TelemetryFieldKey{
							Name:          "service",
							FieldDataType: telemetrytypes.FieldDataTypeString,
						},
						Value: "backend",
					},
					{
						Key: telemetrytypes.TelemetryFieldKey{
							Name:          "environment",
							FieldDataType: telemetrytypes.FieldDataTypeString,
						},
						Value: "prod",
					},
				},
				Values: []*TimeSeriesValue{
					{Timestamp: 1000, Value: 10.0},
				},
			},
			{
				Labels: []*Label{
					{
						Key: telemetrytypes.TelemetryFieldKey{
							Name:          "service",
							FieldDataType: telemetrytypes.FieldDataTypeString,
						},
						Value: "frontend",
					},
					{
						Key: telemetrytypes.TelemetryFieldKey{
							Name:          "environment",
							FieldDataType: telemetrytypes.FieldDataTypeString,
						},
						Value: "dev",
					},
				},
				Values: []*TimeSeriesValue{
					{Timestamp: 1000, Value: 20.0},
				},
			},
			{
				Labels: []*Label{
					{
						Key: telemetrytypes.TelemetryFieldKey{
							Name:          "service",
							FieldDataType: telemetrytypes.FieldDataTypeString,
						},
						Value: "backend",
					},
					{
						Key: telemetrytypes.TelemetryFieldKey{
							Name:          "environment",
							FieldDataType: telemetrytypes.FieldDataTypeString,
						},
						Value: "dev",
					},
				},
				Values: []*TimeSeriesValue{
					{Timestamp: 1000, Value: 30.0},
				},
			},
			{
				Labels: []*Label{
					{
						Key: telemetrytypes.TelemetryFieldKey{
							Name:          "service",
							FieldDataType: telemetrytypes.FieldDataTypeString,
						},
						Value: "frontend",
					},
					{
						Key: telemetrytypes.TelemetryFieldKey{
							Name:          "environment",
							FieldDataType: telemetrytypes.FieldDataTypeString,
						},
						Value: "prod",
					},
				},
				Values: []*TimeSeriesValue{
					{Timestamp: 1000, Value: 40.0},
				},
			},
		}

		// Sort by service (asc) then by environment (desc) with limit of 3
		orderBy := []OrderBy{
			{
				Key: OrderByKey{
					TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
						Name:          "service",
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
				},
				Direction: OrderDirectionAsc,
			},
			{
				Key: OrderByKey{
					TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
						Name:          "environment",
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
				},
				Direction: OrderDirectionDesc,
			},
		}

		result := ApplySeriesLimit(series, orderBy, 3)

		// Should return 3 series sorted by service (asc), then environment (desc)
		// Expected order:
		// 1. backend + prod
		// 2. backend + dev
		// 3. frontend + prod
		assert.Len(t, result, 3)

		// First: backend + prod
		assert.Equal(t, "backend", result[0].Labels[0].Value)
		assert.Equal(t, "prod", result[0].Labels[1].Value)
		assert.Equal(t, 10.0, result[0].Values[0].Value)

		// Second: backend + dev
		assert.Equal(t, "backend", result[1].Labels[0].Value)
		assert.Equal(t, "dev", result[1].Labels[1].Value)
		assert.Equal(t, 30.0, result[1].Values[0].Value)

		// Third: frontend + prod
		assert.Equal(t, "frontend", result[2].Labels[0].Value)
		assert.Equal(t, "prod", result[2].Labels[1].Value)
		assert.Equal(t, 40.0, result[2].Values[0].Value)
	})
}

package querybuildertypesv5

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func createFormulaTestTimeSeriesData(queryName string, series []*TimeSeries) *TimeSeriesData {
	return &TimeSeriesData{
		QueryName: queryName,
		Aggregations: []*AggregationBucket{
			{
				Index:  0,
				Alias:  queryName + "_agg",
				Series: series,
			},
		},
	}
}

func createLabels(labelMap map[string]string) []*Label {
	var labels []*Label
	for key, value := range labelMap {
		labels = append(labels, &Label{
			Key: telemetrytypes.TelemetryFieldKey{
				Name:          key,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			Value: value,
		})
	}
	return labels
}

func createValues(points map[int64]float64) []*TimeSeriesValue {
	var values []*TimeSeriesValue
	for timestamp, value := range points {
		values = append(values, &TimeSeriesValue{
			Timestamp: timestamp,
			Value:     value,
		})
	}
	return values
}

func TestFindUniqueLabelSets(t *testing.T) {
	tests := []struct {
		name       string
		tsData     map[string]*TimeSeriesData
		expression string
		expected   int // number of unique label sets
	}{
		{
			name: "two distinct label sets",
			tsData: map[string]*TimeSeriesData{
				"A": createFormulaTestTimeSeriesData("A", []*TimeSeries{
					{
						Labels: createLabels(map[string]string{
							"service_name": "frontend",
							"operation":    "GET /api",
						}),
						Values: createValues(map[int64]float64{1: 10}),
					},
				}),
				"B": createFormulaTestTimeSeriesData("B", []*TimeSeries{
					{
						Labels: createLabels(map[string]string{
							"service_name": "redis",
						}),
						Values: createValues(map[int64]float64{1: 30}),
					},
				}),
			},
			expression: "A + B",
			expected:   2,
		},
		{
			name: "subset elimination test",
			tsData: map[string]*TimeSeriesData{
				"A": createFormulaTestTimeSeriesData("A", []*TimeSeries{
					{
						Labels: createLabels(map[string]string{
							"service_name": "frontend",
							"operation":    "GET /api",
						}),
						Values: createValues(map[int64]float64{1: 10}),
					},
				}),
				"B": createFormulaTestTimeSeriesData("B", []*TimeSeries{
					{
						Labels: createLabels(map[string]string{
							"service_name": "frontend",
						}),
						Values: createValues(map[int64]float64{1: 30}),
					},
				}),
				"C": createFormulaTestTimeSeriesData("C", []*TimeSeries{
					{
						Labels: createLabels(map[string]string{
							"operation": "PUT /api",
						}),
						Values: createValues(map[int64]float64{1: 30}),
					},
				}),
				"D": createFormulaTestTimeSeriesData("D", []*TimeSeries{
					{
						Labels: createLabels(map[string]string{
							"service_name": "frontend",
							"http_status":  "200",
						}),
						Values: createValues(map[int64]float64{1: 30}),
					},
				}),
			},
			expression: "A + B + C + D",
			expected:   3, // Three unique label sets after subset elimination
		},
		{
			name: "empty series",
			tsData: map[string]*TimeSeriesData{
				"A": createFormulaTestTimeSeriesData("A", []*TimeSeries{}),
				"B": createFormulaTestTimeSeriesData("B", []*TimeSeries{}),
			},
			expression: "A + B",
			expected:   0,
		},
		{
			name: "overlapping labels",
			tsData: map[string]*TimeSeriesData{
				"A": createFormulaTestTimeSeriesData("A", []*TimeSeries{
					{
						Labels: createLabels(map[string]string{
							"service_name": "frontend",
							"operation":    "GET /api",
						}),
						Values: createValues(map[int64]float64{1: 10}),
					},
					{
						Labels: createLabels(map[string]string{
							"service_name": "redis",
							"operation":    "GET /api",
						}),
						Values: createValues(map[int64]float64{1: 12}),
					},
				}),
				"B": createFormulaTestTimeSeriesData("B", []*TimeSeries{
					{
						Labels: createLabels(map[string]string{
							"service_name": "redis",
						}),
						Values: createValues(map[int64]float64{1: 30}),
					},
					{
						Labels: createLabels(map[string]string{
							"service_name": "frontend",
						}),
						Values: createValues(map[int64]float64{1: 25}),
					},
				}),
			},
			expression: "A + B",
			expected:   2, // Two unique label sets after subset detection
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {

			evaluator, err := NewFormulaEvaluator(tt.expression, map[string]bool{"A": false, "B": false})
			require.NoError(t, err)

			lookup := evaluator.buildSeriesLookup(tt.tsData)
			uniqueLabelSets := evaluator.findUniqueLabelSets(lookup)

			assert.Equal(t, tt.expected, len(uniqueLabelSets))
		})
	}
}

func TestBasicFormulaEvaluation(t *testing.T) {
	tests := []struct {
		name       string
		tsData     map[string]*TimeSeriesData
		expression string
		expected   int // number of result series
	}{
		{
			name: "simple addition",
			tsData: map[string]*TimeSeriesData{
				"A": createFormulaTestTimeSeriesData("A", []*TimeSeries{
					{
						Labels: createLabels(map[string]string{
							"service_name": "frontend",
							"operation":    "GET /api",
						}),
						Values: createValues(map[int64]float64{
							1: 10,
							2: 20,
						}),
					},
				}),
				"B": createFormulaTestTimeSeriesData("B", []*TimeSeries{
					{
						Labels: createLabels(map[string]string{
							"service_name": "redis",
						}),
						Values: createValues(map[int64]float64{
							1: 30,
							3: 40,
						}),
					},
				}),
			},
			expression: "A + B",
			expected:   2,
		},
		{
			name: "division with zeros",
			tsData: map[string]*TimeSeriesData{
				"A": createFormulaTestTimeSeriesData("A", []*TimeSeries{
					{
						Labels: createLabels(map[string]string{}),
						Values: createValues(map[int64]float64{
							1: 10,
							2: 0,
						}),
					},
				}),
				"B": createFormulaTestTimeSeriesData("B", []*TimeSeries{
					{
						Labels: createLabels(map[string]string{}),
						Values: createValues(map[int64]float64{
							1: 0,
							3: 10,
						}),
					},
				}),
			},
			expression: "A/B",
			expected:   1,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			evaluator, err := NewFormulaEvaluator(tt.expression, map[string]bool{"A": true, "B": true})
			require.NoError(t, err)

			result, err := evaluator.EvaluateFormula(tt.tsData)
			require.NoError(t, err)
			require.NotNil(t, result)

			assert.Equal(t, tt.expected, len(result))
		})
	}
}

func TestErrorRateCalculation(t *testing.T) {
	tsData := map[string]*TimeSeriesData{
		"A": createFormulaTestTimeSeriesData("A", []*TimeSeries{
			{
				Labels: createLabels(map[string]string{
					"service_name": "frontend",
				}),
				Values: createValues(map[int64]float64{
					1: 10,
					2: 20,
				}),
			},
			{
				Labels: createLabels(map[string]string{
					"service_name": "redis",
				}),
				Values: createValues(map[int64]float64{
					1: 12,
					2: 45,
				}),
			},
			{
				Labels: createLabels(map[string]string{
					"service_name": "route",
				}),
				Values: createValues(map[int64]float64{
					1: 2,
					2: 45,
				}),
			},
		}),
		"B": createFormulaTestTimeSeriesData("B", []*TimeSeries{
			{
				Labels: createLabels(map[string]string{
					"service_name": "redis",
				}),
				Values: createValues(map[int64]float64{
					1: 6,
					2: 9,
				}),
			},
		}),
	}

	evaluator, err := NewFormulaEvaluator("B/A", map[string]bool{"A": true, "B": true})
	require.NoError(t, err)

	result, err := evaluator.EvaluateFormula(tsData)
	require.NoError(t, err)
	require.NotNil(t, result)

	// Should have 3 result series (frontend gets 0, redis gets calculated values, route gets 0)
	assert.Equal(t, 3, len(result))

	// Find the redis series and check its values
	for _, series := range result {
		for _, label := range series.Labels {
			if label.Key.Name == "service_name" && label.Value == "redis" {
				assert.Len(t, series.Values, 2)
				assert.Equal(t, 0.5, series.Values[0].Value) // 6/12
				assert.Equal(t, 0.2, series.Values[1].Value) // 9/45
			}
		}
	}
}

func TestNoGroupKeysOnLeftSide(t *testing.T) {
	tsData := map[string]*TimeSeriesData{
		"A": createFormulaTestTimeSeriesData("A", []*TimeSeries{
			{
				Labels: createLabels(map[string]string{
					"service_name": "frontend",
				}),
				Values: createValues(map[int64]float64{
					1: 10,
					2: 20,
				}),
			},
			{
				Labels: createLabels(map[string]string{
					"service_name": "redis",
				}),
				Values: createValues(map[int64]float64{
					1: 12,
					2: 45,
				}),
			},
		}),
		"B": createFormulaTestTimeSeriesData("B", []*TimeSeries{
			{
				Labels: createLabels(map[string]string{}),
				Values: createValues(map[int64]float64{
					1: 22,
					2: 65,
				}),
			},
		}),
	}

	evaluator, err := NewFormulaEvaluator("B/A", map[string]bool{"A": true, "B": true})
	require.NoError(t, err)

	result, err := evaluator.EvaluateFormula(tsData)
	require.NoError(t, err)
	require.NotNil(t, result)

	// Should have 2 result series (frontend and redis)
	assert.Equal(t, 2, len(result))

	// Verify calculations
	expectedValues := map[string][]float64{
		"frontend": {2.2, 3.25},                              // 22/10, 65/20
		"redis":    {1.8333333333333333, 1.4444444444444444}, // 22/12, 65/45
	}

	for _, series := range result {
		for _, label := range series.Labels {
			if label.Key.Name == "service_name" {
				serviceName := label.Value.(string)
				if expected, exists := expectedValues[serviceName]; exists {
					assert.Len(t, series.Values, len(expected))
					for i, expectedVal := range expected {
						assert.InDelta(t, expectedVal, series.Values[i].Value, 0.0001)
					}
				}
			}
		}
	}
}

func TestSameGroupKeys(t *testing.T) {
	tsData := map[string]*TimeSeriesData{
		"A": createFormulaTestTimeSeriesData("A", []*TimeSeries{
			{
				Labels: createLabels(map[string]string{
					"host_name": "ip-10-420-69-1",
					"state":     "running",
				}),
				Values: createValues(map[int64]float64{
					1: 10,
					2: 20,
					4: 40,
					5: 50,
					7: 70,
				}),
			},
			{
				Labels: createLabels(map[string]string{
					"host_name": "ip-10-420-69-2",
					"state":     "idle",
				}),
				Values: createValues(map[int64]float64{
					1: 12,
					2: 45,
					3: 30,
					4: 40,
					5: 50,
				}),
			},
		}),
		"B": createFormulaTestTimeSeriesData("B", []*TimeSeries{
			{
				Labels: createLabels(map[string]string{
					"host_name": "ip-10-420-69-1",
					"state":     "running",
				}),
				Values: createValues(map[int64]float64{
					1: 22,
					2: 65,
					3: 30,
					4: 40,
					5: 50,
				}),
			},
			{
				Labels: createLabels(map[string]string{
					"host_name": "ip-10-420-69-2",
					"state":     "idle",
				}),
				Values: createValues(map[int64]float64{
					1: 22,
					2: 65,
					4: 40,
					5: 50,
				}),
			},
		}),
	}

	evaluator, err := NewFormulaEvaluator("A/B", map[string]bool{"A": true, "B": true})
	require.NoError(t, err)

	result, err := evaluator.EvaluateFormula(tsData)
	require.NoError(t, err)
	require.NotNil(t, result)

	// Should have 2 result series
	assert.Equal(t, 2, len(result))

	// Verify that we get the expected calculations
	for _, series := range result {
		hostName := ""
		state := ""
		for _, label := range series.Labels {
			if label.Key.Name == "host_name" {
				hostName = label.Value.(string)
			}
			if label.Key.Name == "state" {
				state = label.Value.(string)
			}
		}

		if hostName == "ip-10-420-69-1" && state == "running" {
			// Check specific calculations
			assert.Equal(t, float64(10)/float64(22), series.Values[0].Value)      // timestamp 1
			assert.InDelta(t, 0.3076923076923077, series.Values[1].Value, 0.0001) // timestamp 2
		}
	}
}

func TestGroupKeysDifferentValues(t *testing.T) {
	tsData := map[string]*TimeSeriesData{
		"A": createFormulaTestTimeSeriesData("A", []*TimeSeries{
			{
				Labels: createLabels(map[string]string{
					"host_name": "ip-10-420-69-1",
					"state":     "running",
				}),
				Values: createValues(map[int64]float64{
					1: 10,
					2: 20,
					4: 40,
					5: 50,
					7: 70,
				}),
			},
			{
				Labels: createLabels(map[string]string{
					"host_name": "ip-10-420-69-2",
					"state":     "idle",
				}),
				Values: createValues(map[int64]float64{
					1: 12,
					2: 45,
					3: 30,
					4: 40,
					5: 50,
				}),
			},
		}),
		"B": createFormulaTestTimeSeriesData("B", []*TimeSeries{
			{
				Labels: createLabels(map[string]string{
					"host_name": "ip-10-420-69-1",
					"state":     "not_running_chalamet",
				}),
				Values: createValues(map[int64]float64{
					1: 22,
					2: 65,
					3: 30,
					4: 40,
					5: 50,
				}),
			},
			{
				Labels: createLabels(map[string]string{
					"host_name": "ip-10-420-69-2",
					"state":     "busy",
				}),
				Values: createValues(map[int64]float64{
					1: 22,
					2: 65,
					4: 40,
					5: 50,
				}),
			},
		}),
	}

	evaluator, err := NewFormulaEvaluator("A/B", map[string]bool{"A": true, "B": true})
	require.NoError(t, err)

	result, err := evaluator.EvaluateFormula(tsData)
	require.NoError(t, err)
	require.NotNil(t, result)

	// Should have 2 result series with all zero values (no label matches)
	assert.Equal(t, 2, len(result))

	for _, series := range result {
		for _, value := range series.Values {
			assert.Equal(t, 0.0, value.Value) // All values should be 0 due to default zero
		}
	}
}

func TestLeftSideSuperset(t *testing.T) {
	tsData := map[string]*TimeSeriesData{
		"A": createFormulaTestTimeSeriesData("A", []*TimeSeries{
			{
				Labels: createLabels(map[string]string{
					"host_name": "ip-10-420-69-1",
					"state":     "running",
					"os.type":   "linux",
				}),
				Values: createValues(map[int64]float64{
					1: 10,
					2: 20,
					4: 40,
					5: 50,
					7: 70,
				}),
			},
			{
				Labels: createLabels(map[string]string{
					"host_name": "ip-10-420-69-2",
					"state":     "idle",
					"os.type":   "linux",
				}),
				Values: createValues(map[int64]float64{
					1: 12,
					2: 45,
					3: 30,
					4: 40,
					5: 50,
				}),
			},
		}),
		"B": createFormulaTestTimeSeriesData("B", []*TimeSeries{
			{
				Labels: createLabels(map[string]string{
					"state":   "running",
					"os.type": "linux",
				}),
				Values: createValues(map[int64]float64{
					1: 22,
					2: 65,
					3: 30,
					4: 40,
					5: 50,
				}),
			},
			{
				Labels: createLabels(map[string]string{
					"state":   "busy",
					"os.type": "linux",
				}),
				Values: createValues(map[int64]float64{
					1: 22,
					2: 65,
					4: 40,
					5: 50,
				}),
			},
		}),
	}

	evaluator, err := NewFormulaEvaluator("A/B", map[string]bool{"A": true, "B": true})
	require.NoError(t, err)

	result, err := evaluator.EvaluateFormula(tsData)
	require.NoError(t, err)
	require.NotNil(t, result)

	// Should have 2 result series
	assert.Equal(t, 2, len(result))

	// Find the running series and verify calculation
	for _, series := range result {
		hasRunning := false
		hasHost := false
		for _, label := range series.Labels {
			if label.Key.Name == "state" && label.Value == "running" {
				hasRunning = true
			}
			if label.Key.Name == "host_name" {
				hasHost = true
			}
		}

		if hasRunning && hasHost {
			// This should be the matched series
			assert.Equal(t, float64(10)/float64(22), series.Values[0].Value)      // timestamp 1
			assert.InDelta(t, 0.3076923076923077, series.Values[1].Value, 0.0001) // timestamp 2
		}
	}
}

func TestNoDefaultZero(t *testing.T) {
	tsData := map[string]*TimeSeriesData{
		"A": createFormulaTestTimeSeriesData("A", []*TimeSeries{
			{
				Labels: createLabels(map[string]string{
					"service_name": "frontend",
					"operation":    "GET /api",
				}),
				Values: createValues(map[int64]float64{
					1: 10,
					2: 20,
				}),
			},
		}),
		"B": createFormulaTestTimeSeriesData("B", []*TimeSeries{
			{
				Labels: createLabels(map[string]string{
					"service_name": "redis",
				}),
				Values: createValues(map[int64]float64{
					1: 30,
					3: 40,
				}),
			},
		}),
	}

	// No default zero - should have no results since label sets don't match
	evaluator, err := NewFormulaEvaluator("A + B", map[string]bool{"A": false, "B": false})
	require.NoError(t, err)

	result, err := evaluator.EvaluateFormula(tsData)
	require.NoError(t, err)

	// Should have no result series since labels don't match and no default zero
	assert.Equal(t, 0, len(result))
}

func TestMixedQueries(t *testing.T) {
	tsData := map[string]*TimeSeriesData{
		"A": createFormulaTestTimeSeriesData("A", []*TimeSeries{
			{
				Labels: createLabels(map[string]string{
					"service_name": "frontend",
					"operation":    "GET /api",
				}),
				Values: createValues(map[int64]float64{
					1: 10,
					2: 20,
				}),
			},
		}),
		"B": createFormulaTestTimeSeriesData("B", []*TimeSeries{
			{
				Labels: createLabels(map[string]string{
					"service_name": "frontend",
					"operation":    "GET /api",
				}),
				Values: createValues(map[int64]float64{
					1: 10,
					2: 20,
				}),
			},
		}),
		"C": createFormulaTestTimeSeriesData("C", []*TimeSeries{
			{
				Labels: createLabels(map[string]string{
					"service_name": "redis",
				}),
				Values: createValues(map[int64]float64{
					1: 30,
					2: 50,
					3: 45,
				}),
			},
		}),
	}

	evaluator, err := NewFormulaEvaluator("A / B", map[string]bool{"A": true, "B": true, "C": true})
	require.NoError(t, err)

	result, err := evaluator.EvaluateFormula(tsData)
	require.NoError(t, err)
	require.NotNil(t, result)

	// Should have 1 result series (only A and B have matching labels)
	assert.Equal(t, 1, len(result))

	// Verify the result is A/B = 1 for matching timestamps
	series := result[0]
	assert.Len(t, series.Values, 2)
	assert.Equal(t, 1.0, series.Values[0].Value) // 10/10
	assert.Equal(t, 1.0, series.Values[1].Value) // 20/20
}

func TestComplexExpression(t *testing.T) {
	tsData := map[string]*TimeSeriesData{
		"A": createFormulaTestTimeSeriesData("A", []*TimeSeries{
			{
				Labels: createLabels(map[string]string{
					"state": "running",
				}),
				Values: createValues(map[int64]float64{
					1: 10,
					2: 20,
					4: 40,
					5: 50,
					7: 70,
				}),
			},
			{
				Labels: createLabels(map[string]string{
					"state": "idle",
				}),
				Values: createValues(map[int64]float64{
					1: 12,
					2: 45,
					3: 30,
					4: 40,
					5: 50,
				}),
			},
		}),
		"B": createFormulaTestTimeSeriesData("B", []*TimeSeries{
			{
				Labels: createLabels(map[string]string{
					"host_name": "ip-10-420-69-1",
					"state":     "running",
				}),
				Values: createValues(map[int64]float64{
					1: 22,
					2: 65,
					3: 30,
					4: 40,
					5: 50,
				}),
			},
			{
				Labels: createLabels(map[string]string{
					"host_name": "ip-10-420-69-2",
					"state":     "idle",
				}),
				Values: createValues(map[int64]float64{
					1: 22,
					2: 65,
					4: 40,
					5: 50,
				}),
			},
		}),
		"C": createFormulaTestTimeSeriesData("C", []*TimeSeries{
			{
				Labels: createLabels(map[string]string{
					"host_name": "ip-10-420-69-1",
					"state":     "running",
					"os.type":   "linux",
				}),
				Values: createValues(map[int64]float64{
					1: 10,
					2: 20,
					4: 40,
					5: 50,
					7: 70,
				}),
			},
			{
				Labels: createLabels(map[string]string{
					"host_name": "ip-10-420-69-2",
					"state":     "idle",
					"os.type":   "linux",
				}),
				Values: createValues(map[int64]float64{
					1: 12,
					2: 45,
					3: 30,
					4: 40,
					5: 50,
				}),
			},
		}),
	}

	// Complex expression: A/B + C
	evaluator, err := NewFormulaEvaluator("A/B + C", map[string]bool{"A": true, "B": true, "C": true})
	require.NoError(t, err)

	result, err := evaluator.EvaluateFormula(tsData)
	require.NoError(t, err)
	require.NotNil(t, result)

	// Should have 2 result series
	assert.Equal(t, 2, len(result))

	// Verify the complex calculation: A/B + C for the first series
	for _, series := range result {
		hasRunning := false
		hasHost := false
		for _, label := range series.Labels {
			if label.Key.Name == "state" && label.Value == "running" {
				hasRunning = true
			}
			if label.Key.Name == "host_name" {
				hasHost = true
			}
		}

		if hasRunning && hasHost {
			// timestamp 1: 10/22 + 10 = 10.45454545454545
			expectedVal1 := 10.0/22.0 + 10.0
			assert.InDelta(t, expectedVal1, series.Values[0].Value, 0.0001)

			// timestamp 2: 20/65 + 20 = 20.3076923076923077
			expectedVal2 := 20.0/65.0 + 20.0
			assert.InDelta(t, expectedVal2, series.Values[1].Value, 0.0001)
		}
	}
}

func TestAbsValueExpression(t *testing.T) {
	tsData := map[string]*TimeSeriesData{
		"A": createFormulaTestTimeSeriesData("A", []*TimeSeries{
			{
				Labels: createLabels(map[string]string{"service_name": "frontend"}),
				Values: createValues(map[int64]float64{
					1: -10,
					2: 20,
				}),
			},
		}),
		"B": createFormulaTestTimeSeriesData("B", []*TimeSeries{
			{
				Labels: createLabels(map[string]string{"service_name": "frontend"}),
				Values: createValues(map[int64]float64{
					1: 5,
					2: -4,
				}),
			},
		}),
	}

	evaluator, err := NewFormulaEvaluator("abs(A) + abs(B)", map[string]bool{"A": true, "B": true})
	require.NoError(t, err)

	result, err := evaluator.EvaluateFormula(tsData)
	require.NoError(t, err)
	require.NotNil(t, result)
	require.Equal(t, 1, len(result))

	series := result[0]
	require.Equal(t, 2, len(series.Values))
	assert.Equal(t, 15.0, series.Values[0].Value) // |−10| + |5| = 15
	assert.Equal(t, 24.0, series.Values[1].Value) // |20| + |−4| = 24
}

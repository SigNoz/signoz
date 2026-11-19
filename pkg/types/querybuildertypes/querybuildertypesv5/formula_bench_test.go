package querybuildertypesv5

import (
	"context"
	"fmt"
	"testing"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/require"
)

// createBenchmarkTimeSeriesData creates test data for benchmarking.
func createBenchmarkTimeSeriesData(queryName string, numSeries, numPoints int) *TimeSeriesData {
	series := make([]*TimeSeries, numSeries)

	for i := 0; i < numSeries; i++ {
		// Create labels: service-{i} and env-{i%5} to have some variety
		labels := []*Label{
			{
				Key: telemetrytypes.TelemetryFieldKey{
					Name:          "service",
					FieldDataType: telemetrytypes.FieldDataTypeString,
				},
				Value: fmt.Sprintf("service-%d", i),
			},
			{
				Key: telemetrytypes.TelemetryFieldKey{
					Name:          "env",
					FieldDataType: telemetrytypes.FieldDataTypeString,
				},
				Value: fmt.Sprintf("env-%d", i%5), // 5 different environments
			},
		}

		// Create time series values
		values := make([]*TimeSeriesValue, numPoints)
		baseTime := int64(1000000)  // Start timestamp
		baseValue := float64(i + 1) // Different base value per series

		for j := 0; j < numPoints; j++ {
			values[j] = &TimeSeriesValue{
				Timestamp: baseTime + int64(j*60), // 1-minute intervals
				Value:     baseValue + float64(j), // Incrementing values
			}
		}

		series[i] = &TimeSeries{
			Labels: labels,
			Values: values,
		}
	}

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

// BenchmarkFormulaEvaluator_10k_Series_300_Points benchmarks the target scenario.
func BenchmarkFormulaEvaluator_10k_Series_300_Points(b *testing.B) {
	// Create test data: 10k series, 300 points each
	const numSeries = 10000
	const numPoints = 300

	timeSeriesData := map[string]*TimeSeriesData{
		"A": createBenchmarkTimeSeriesData("A", numSeries, numPoints),
		"B": createBenchmarkTimeSeriesData("B", numSeries, numPoints), // Same structure as A
	}

	// Create evaluator for A + B
	evaluator, err := NewFormulaEvaluator("A + B", map[string]bool{"A": false, "B": false})
	require.NoError(b, err)

	b.ResetTimer()
	b.ReportAllocs()

	// Log data size being processed
	totalDataPoints := numSeries * numPoints * 2 // 2 queries
	b.Logf("Processing %d series × %d points × 2 queries = %d total data points",
		numSeries, numPoints, totalDataPoints)

	for i := 0; i < b.N; i++ {
		result, err := evaluator.EvaluateFormula(context.Background(), timeSeriesData)
		if err != nil {
			b.Fatal(err)
		}
		if len(result) == 0 {
			b.Fatal("No results produced")
		}
		// Verify we got the expected number of series
		if len(result) != numSeries {
			b.Fatalf("Expected %d result series, got %d", numSeries, len(result))
		}
	}
}

// BenchmarkFormulaEvaluator_Scaling tests different scales for comparison.
func BenchmarkFormulaEvaluator_1k_Series_300_Points(b *testing.B) {
	const numSeries = 1000
	const numPoints = 300

	timeSeriesData := map[string]*TimeSeriesData{
		"A": createBenchmarkTimeSeriesData("A", numSeries, numPoints),
		"B": createBenchmarkTimeSeriesData("B", numSeries, numPoints),
	}

	evaluator, err := NewFormulaEvaluator("A + B", map[string]bool{"A": false, "B": false})
	require.NoError(b, err)

	b.ResetTimer()
	b.ReportAllocs()

	for i := 0; i < b.N; i++ {
		result, err := evaluator.EvaluateFormula(context.Background(), timeSeriesData)
		if err != nil {
			b.Fatal(err)
		}
		if len(result) != numSeries {
			b.Fatalf("Expected %d result series, got %d", numSeries, len(result))
		}
	}
}

func BenchmarkFormulaEvaluator_5k_Series_300_Points(b *testing.B) {
	const numSeries = 5000
	const numPoints = 300

	timeSeriesData := map[string]*TimeSeriesData{
		"A": createBenchmarkTimeSeriesData("A", numSeries, numPoints),
		"B": createBenchmarkTimeSeriesData("B", numSeries, numPoints),
	}

	evaluator, err := NewFormulaEvaluator("A + B", map[string]bool{"A": false, "B": false})
	require.NoError(b, err)

	b.ResetTimer()
	b.ReportAllocs()

	for i := 0; i < b.N; i++ {
		result, err := evaluator.EvaluateFormula(context.Background(), timeSeriesData)
		if err != nil {
			b.Fatal(err)
		}
		if len(result) != numSeries {
			b.Fatalf("Expected %d result series, got %d", numSeries, len(result))
		}
	}
}

// BenchmarkFormulaEvaluator_Complex_Expression tests more complex math.
func BenchmarkFormulaEvaluator_10k_Series_Complex(b *testing.B) {
	const numSeries = 10000
	const numPoints = 300

	timeSeriesData := map[string]*TimeSeriesData{
		"A": createBenchmarkTimeSeriesData("A", numSeries, numPoints),
		"B": createBenchmarkTimeSeriesData("B", numSeries, numPoints),
	}

	// More complex expression
	evaluator, err := NewFormulaEvaluator("sqrt(A * A + B * B)", map[string]bool{"A": false, "B": false})
	require.NoError(b, err)

	b.ResetTimer()
	b.ReportAllocs()

	for i := 0; i < b.N; i++ {
		result, err := evaluator.EvaluateFormula(context.Background(), timeSeriesData)
		if err != nil {
			b.Fatal(err)
		}
		if len(result) != numSeries {
			b.Fatalf("Expected %d result series, got %d", numSeries, len(result))
		}
	}
}

// BenchmarkFormulaEvaluator_Memory_Reuse tests object pool efficiency.
func BenchmarkFormulaEvaluator_Memory_Reuse(b *testing.B) {
	const numSeries = 1000
	const numPoints = 100

	timeSeriesData := map[string]*TimeSeriesData{
		"A": createBenchmarkTimeSeriesData("A", numSeries, numPoints),
		"B": createBenchmarkTimeSeriesData("B", numSeries, numPoints),
	}

	evaluator, err := NewFormulaEvaluator("A + B", map[string]bool{"A": false, "B": false})
	require.NoError(b, err)

	b.ResetTimer()
	b.ReportAllocs()

	// Run multiple times to test pool reuse
	for i := 0; i < b.N; i++ {
		result, err := evaluator.EvaluateFormula(context.Background(), timeSeriesData)
		if err != nil {
			b.Fatal(err)
		}
		if len(result) == 0 {
			b.Fatal("No results produced")
		}
	}
}

// Benchmark just the lookup building phase.
func BenchmarkFormulaEvaluator_LookupBuilding(b *testing.B) {
	const numSeries = 10000
	const numPoints = 300

	timeSeriesData := map[string]*TimeSeriesData{
		"A": createBenchmarkTimeSeriesData("A", numSeries, numPoints),
		"B": createBenchmarkTimeSeriesData("B", numSeries, numPoints),
	}

	evaluator, err := NewFormulaEvaluator("A + B", map[string]bool{"A": false, "B": false})
	require.NoError(b, err)

	b.ResetTimer()
	b.ReportAllocs()

	for i := 0; i < b.N; i++ {
		// Only benchmark the lookup building phase
		_ = evaluator.buildSeriesLookup(timeSeriesData)
	}
}

// Benchmark just the evaluation phase (excluding lookup building).
func BenchmarkFormulaEvaluator_EvaluationOnly(b *testing.B) {
	const numSeries = 10000
	const numPoints = 300

	timeSeriesData := map[string]*TimeSeriesData{
		"A": createBenchmarkTimeSeriesData("A", numSeries, numPoints),
		"B": createBenchmarkTimeSeriesData("B", numSeries, numPoints),
	}

	evaluator, err := NewFormulaEvaluator("A + B", map[string]bool{"A": false, "B": false})
	require.NoError(b, err)

	// Pre-build lookup once
	lookup := evaluator.buildSeriesLookup(timeSeriesData)
	uniqueLabelSets := evaluator.findUniqueLabelSets(lookup)

	b.ResetTimer()
	b.ReportAllocs()

	for i := 0; i < b.N; i++ {
		// Only benchmark the evaluation phase
		var resultCount int
		for _, labelSet := range uniqueLabelSets {
			series := evaluator.evaluateForLabelSet(labelSet, lookup)
			if series != nil && len(series.Values) > 0 {
				resultCount++
			}
		}
		if resultCount == 0 {
			b.Fatal("No results produced")
		}
	}
}

// BenchmarkFormulaEvaluator_ScalarGroups evaluates A / B on the series of a
// scalar request, which have one point each. The group counts are the ones
// where a scan of all series for each group does not end in a useful time.
func BenchmarkFormulaEvaluator_ScalarGroups(b *testing.B) {
	label := func(name, value string) *Label {
		return &Label{Key: telemetrytypes.TelemetryFieldKey{Name: name}, Value: value}
	}
	series := func(value float64, labels ...*Label) *TimeSeries {
		return &TimeSeries{Labels: labels, Values: []*TimeSeriesValue{{Timestamp: 0, Value: value}}}
	}
	data := func(queryName string, series []*TimeSeries) *TimeSeriesData {
		return &TimeSeriesData{QueryName: queryName, Aggregations: []*AggregationBucket{{Index: 0, Series: series}}}
	}

	// one query grouped by a key with a distinct value in each group, and one total
	groupedAndTotal := func(groups int) map[string]*TimeSeriesData {
		grouped := make([]*TimeSeries, groups)
		for i := range grouped {
			grouped[i] = series(float64(i+1), label("url", fmt.Sprintf("/shop/v2/products/%09d/variations", i)))
		}
		return map[string]*TimeSeriesData{"A": data("A", grouped), "B": data("B", []*TimeSeries{series(1000)})}
	}
	// both queries grouped by the same key, with the same values
	sameKey := func(groups int) map[string]*TimeSeriesData {
		left, right := make([]*TimeSeries, groups), make([]*TimeSeries, groups)
		for i := range left {
			left[i] = series(float64(i+1), label("url", fmt.Sprintf("/shop/v2/products/%09d/variations", i)))
			right[i] = series(float64(i+2), label("url", fmt.Sprintf("/shop/v2/products/%09d/variations", i)))
		}
		return map[string]*TimeSeriesData{"A": data("A", left), "B": data("B", right)}
	}
	// one query where half of the series have one more label, and one total
	mixedKeySets := func(groups int) map[string]*TimeSeriesData {
		mixed := make([]*TimeSeries, groups)
		for i := range mixed {
			if i%2 == 0 {
				mixed[i] = series(float64(i+1), label("svc", fmt.Sprintf("service-%09d", i)))
			} else {
				mixed[i] = series(float64(i+1), label("svc", fmt.Sprintf("service-%09d", i)), label("op", "GET"))
			}
		}
		return map[string]*TimeSeriesData{"A": data("A", mixed), "B": data("B", []*TimeSeries{series(1000)})}
	}

	benchmarks := []struct {
		name   string
		groups int
		input  func(groups int) map[string]*TimeSeriesData
	}{
		{name: "GroupedAndTotal_100k", groups: 100_000, input: groupedAndTotal},
		{name: "GroupedAndTotal_627k", groups: 626_950, input: groupedAndTotal},
		{name: "SameKey_100k", groups: 100_000, input: sameKey},
		{name: "MixedKeySets_100k", groups: 100_000, input: mixedKeySets},
	}

	for _, benchmark := range benchmarks {
		b.Run(benchmark.name, func(b *testing.B) {
			timeSeriesData := benchmark.input(benchmark.groups)
			evaluator, err := NewFormulaEvaluator("A / B", map[string]bool{"A": false, "B": false})
			require.NoError(b, err)

			b.ResetTimer()
			b.ReportAllocs()

			for i := 0; i < b.N; i++ {
				result, err := evaluator.EvaluateFormula(context.Background(), timeSeriesData)
				if err != nil {
					b.Fatal(err)
				}
				if len(result) != benchmark.groups {
					b.Fatalf("Expected %d result series, got %d", benchmark.groups, len(result))
				}
			}
		})
	}
}

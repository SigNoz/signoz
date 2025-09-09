package ruletypes

import (
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	qslabels "github.com/SigNoz/signoz/pkg/query-service/utils/labels"
)

// Example: PercentileThreshold demonstrates how to implement a new threshold type
// This could be used for alerting when a percentile exceeds a certain value
type PercentileThreshold struct {
	name          string
	percentile    float64 // e.g., 95 for P95
	target        float64
	selectedQuery string
}

// NewPercentileThreshold creates a new percentile-based threshold
func NewPercentileThreshold(name string, percentile, target float64, selectedQuery string) *PercentileThreshold {
	return &PercentileThreshold{
		name:          name,
		percentile:    percentile,
		target:        target,
		selectedQuery: selectedQuery,
	}
}

// Name implements RuleThreshold interface
func (p *PercentileThreshold) Name() string {
	return p.name
}

// SelectedQuery implements RuleThreshold interface
func (p *PercentileThreshold) SelectedQuery() string {
	return p.selectedQuery
}

// ShouldAlert implements RuleThreshold interface
// This would calculate the specified percentile and compare against target
func (p *PercentileThreshold) ShouldAlert(series v3.Series) (Sample, bool) {
	var lbls qslabels.Labels
	
	for name, value := range series.Labels {
		lbls = append(lbls, qslabels.Label{Name: name, Value: value})
	}
	lbls = append(lbls, qslabels.Label{Name: LabelThresholdName, Value: p.name})

	if len(series.Points) == 0 {
		return Sample{}, false
	}

	// Simple percentile calculation (in real implementation, you'd use a proper algorithm)
	percentileValue := p.calculatePercentile(series.Points, p.percentile)
	
	if percentileValue > p.target {
		return Sample{
			Point:  Point{V: percentileValue},
			Metric: lbls,
		}, true
	}

	return Sample{}, false
}

// calculatePercentile is a simplified percentile calculation
func (p *PercentileThreshold) calculatePercentile(points []v3.Point, percentile float64) float64 {
	if len(points) == 0 {
		return 0
	}
	
	// Sort values (simplified - in real implementation you'd handle NaN/Inf properly)
	values := make([]float64, 0, len(points))
	for _, point := range points {
		values = append(values, point.Value)
	}
	
	// Simple percentile calculation
	if len(values) == 1 {
		return values[0]
	}
	
	// This is a very basic percentile implementation
	// In practice, you'd use a more sophisticated algorithm
	index := int((percentile / 100.0) * float64(len(values)-1))
	if index >= len(values) {
		index = len(values) - 1
	}
	return values[index]
}

// Example usage demonstrating the new extensibility:
//
// func ExampleNewThresholdType() {
//     // Create a percentile threshold that alerts when P95 > 500ms
//     p95Threshold := NewPercentileThreshold("P95_LATENCY", 95, 500, "A")
//     
//     // Can be used alongside BasicRuleThreshold in the same rule
//     thresholds := []RuleThreshold{
//         NewBasicRuleThreshold("WARNING", &warning, nil, AtleastOnce, ValueIsAbove, "A", "ms", "s"),
//         p95Threshold, // New threshold type!
//     }
//     
//     // Both thresholds work with the same evaluation loop
//     for _, series := range results {
//         for _, threshold := range thresholds {
//             if sample, shouldAlert := threshold.ShouldAlert(series); shouldAlert {
//                 // Handle alert
//             }
//         }
//     }
// }
package ruletypes

import (
	qslabels "github.com/SigNoz/signoz/pkg/query-service/utils/labels"
	"github.com/prometheus/prometheus/promql"
)

// SeriesItem represents a single series item that can provide labels
type SeriesItem interface {
	// GetLabels returns the labels for this series item
	GetLabels() qslabels.Labels
}

// SeriesCollection represents a collection of series that can be filtered
type SeriesCollection interface {
	// Len returns the number of series in the collection
	Len() int

	// GetItem returns the series item at the given index
	GetItem(index int) SeriesItem

	// Filter returns a new filtered collection containing only items at the given indices
	Filter(preservedIndices []int) SeriesCollection
}

// VectorCollection wraps ruletypes.Vector to implement SeriesCollection
type VectorCollection struct {
	vector Vector
}

// NewVectorCollection creates a new VectorCollection from a ruletypes.Vector
func NewVectorCollection(vector Vector) *VectorCollection {
	return &VectorCollection{vector: vector}
}

// Len returns the number of series in the vector
func (vc *VectorCollection) Len() int {
	return len(vc.vector)
}

// GetItem returns the series item at the given index
func (vc *VectorCollection) GetItem(index int) SeriesItem {
	return &VectorItem{sample: vc.vector[index]}
}

// Filter returns a new VectorCollection containing only items at the given indices
func (vc *VectorCollection) Filter(indices []int) SeriesCollection {
	filtered := make(Vector, 0, len(indices))
	for _, idx := range indices {
		if idx >= 0 && idx < len(vc.vector) {
			filtered = append(filtered, vc.vector[idx])
		}
	}
	return NewVectorCollection(filtered)
}

func (vc *VectorCollection) Vector() Vector {
	return vc.vector
}

// VectorItem wraps ruletypes.Sample to implement SeriesItem
type VectorItem struct {
	sample Sample
}

// GetLabels returns the labels from the sample
func (vi *VectorItem) GetLabels() qslabels.Labels {
	return vi.sample.Metric
}

// PromMatrixCollection wraps promql.Matrix to implement SeriesCollection
type PromMatrixCollection struct {
	matrix promql.Matrix
}

// NewPromMatrixCollection creates a new PromMatrixCollection from a promql.Matrix
func NewPromMatrixCollection(matrix promql.Matrix) *PromMatrixCollection {
	return &PromMatrixCollection{matrix: matrix}
}

// Len returns the number of series in the matrix
func (pmc *PromMatrixCollection) Len() int {
	return len(pmc.matrix)
}

// GetItem returns the series item at the given index
func (pmc *PromMatrixCollection) GetItem(index int) SeriesItem {
	return &PromSeriesItem{series: pmc.matrix[index]}
}

// Filter returns a new PromMatrixCollection containing only items at the given indices
func (pmc *PromMatrixCollection) Filter(indices []int) SeriesCollection {
	filtered := make(promql.Matrix, 0, len(indices))
	for _, idx := range indices {
		if idx >= 0 && idx < len(pmc.matrix) {
			filtered = append(filtered, pmc.matrix[idx])
		}
	}
	return NewPromMatrixCollection(filtered)
}

func (pmc *PromMatrixCollection) Matrix() promql.Matrix {
	return pmc.matrix
}

// PromSeriesItem wraps promql.Series to implement SeriesItem
type PromSeriesItem struct {
	series promql.Series
}

// GetLabels returns the labels from the prometheus series
func (psi *PromSeriesItem) GetLabels() qslabels.Labels {
	metricLabels := make(qslabels.Labels, 0, len(psi.series.Metric))
	for _, lbl := range psi.series.Metric {
		metricLabels = append(metricLabels, qslabels.Label{Name: lbl.Name, Value: lbl.Value})
	}
	return metricLabels
}

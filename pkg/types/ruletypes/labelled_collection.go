package ruletypes

import (
	qslabels "github.com/SigNoz/signoz/pkg/query-service/utils/labels"
	"github.com/prometheus/prometheus/promql"
)

// LabelledItem represents an entity that can provide labels
type LabelledItem interface {
	// GetLabels returns the labels for this entity
	GetLabels() qslabels.Labels
}

// LabelledCollection represents a collection of labelled items
// this is used to abstract the underlying collection type
// and provide a unified interface for working with items which have labels
type LabelledCollection interface {
	// Len returns the number of entities in the collection
	Len() int

	// GetItem returns the entity at the given index
	GetItem(index int) LabelledItem

	// Filter returns a new filtered collection containing only items at the given indices
	Filter(preservedIndices []int) LabelledCollection
}

// VectorLabelledCollection wraps ruletypes.Vector to implement LabelledCollection
type VectorLabelledCollection struct {
	vector Vector
}

// NewVectorLabelledCollection creates a new VectorLabelledCollection from a ruletypes.Vector
func NewVectorLabelledCollection(vector Vector) *VectorLabelledCollection {
	return &VectorLabelledCollection{vector: vector}
}

// Len returns the number of entities in the vector
func (vc *VectorLabelledCollection) Len() int {
	return len(vc.vector)
}

// GetItem returns the entity at the given index
func (vc *VectorLabelledCollection) GetItem(index int) LabelledItem {
	return &VectorLabelledItem{sample: vc.vector[index]}
}

// Filter returns a new VectorLabelledCollection containing only items at the given indices
func (vc *VectorLabelledCollection) Filter(indices []int) LabelledCollection {
	filtered := make(Vector, 0, len(indices))
	for _, idx := range indices {
		if idx >= 0 && idx < len(vc.vector) {
			filtered = append(filtered, vc.vector[idx])
		}
	}
	return NewVectorLabelledCollection(filtered)
}

func (vc *VectorLabelledCollection) Vector() Vector {
	return vc.vector
}

// VectorLabelledItem wraps ruletypes.Sample to implement LabelledItem
type VectorLabelledItem struct {
	sample Sample
}

// GetLabels returns the labels from the sample
func (vi *VectorLabelledItem) GetLabels() qslabels.Labels {
	return vi.sample.Metric
}

// PromMatrixLabelledCollection wraps promql.Matrix to implement LabelledCollection
type PromMatrixLabelledCollection struct {
	matrix promql.Matrix
}

// NewPromMatrixLabelledCollection creates a new PromMatrixLabelledCollection from a promql.Matrix
func NewPromMatrixLabelledCollection(matrix promql.Matrix) *PromMatrixLabelledCollection {
	return &PromMatrixLabelledCollection{matrix: matrix}
}

// Len returns the number of entities in the matrix
func (pmc *PromMatrixLabelledCollection) Len() int {
	return len(pmc.matrix)
}

// GetItem returns the entity at the given index
func (pmc *PromMatrixLabelledCollection) GetItem(index int) LabelledItem {
	return &PromSeriesLabelledItem{series: pmc.matrix[index]}
}

// Filter returns a new PromMatrixLabelledCollection containing only items at the given indices
func (pmc *PromMatrixLabelledCollection) Filter(indices []int) LabelledCollection {
	filtered := make(promql.Matrix, 0, len(indices))
	for _, idx := range indices {
		if idx >= 0 && idx < len(pmc.matrix) {
			filtered = append(filtered, pmc.matrix[idx])
		}
	}
	return NewPromMatrixLabelledCollection(filtered)
}

func (pmc *PromMatrixLabelledCollection) Matrix() promql.Matrix {
	return pmc.matrix
}

// PromSeriesLabelledItem wraps promql.Series to implement LabelledItem
type PromSeriesLabelledItem struct {
	series promql.Series
}

// GetLabels returns the labels from the prometheus series
func (psi *PromSeriesLabelledItem) GetLabels() qslabels.Labels {
	metricLabels := make(qslabels.Labels, 0, len(psi.series.Metric))
	for _, lbl := range psi.series.Metric {
		metricLabels = append(metricLabels, qslabels.Label{Name: lbl.Name, Value: lbl.Value})
	}
	return metricLabels
}

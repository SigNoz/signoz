// Package queryfilterextractor provides utilities for extracting metric names
// and grouping keys.
//
// This is useful for metrics discovery, and query analysis.
package queryfilterextractor

import "fmt"

const (
	ExtractorCH     = "qfe_ch"
	ExtractorPromQL = "qfe_promql"
)

type FilterResult struct {
	// MetricNames are the metrics that are being filtered on
	MetricNames []string
	// GroupBy are the group bys that are being used to group the results
	GroupBy []string
}

type FilterExtractor interface {
	Extract(query string) (*FilterResult, error)
}

func NewExtractor(extractorType string) (FilterExtractor, error) {
	switch extractorType {
	case ExtractorCH:
		return NewClickHouseFilterExtractor(), nil
	case ExtractorPromQL:
		return NewPromQLFilterExtractor(), nil
	default:
		return nil, fmt.Errorf("invalid extractor type: %s", extractorType)
	}
}

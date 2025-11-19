// Package queryfilterextractor provides utilities for extracting metric names
// and grouping keys.
//
// This is useful for metrics discovery, and query analysis.
package queryfilterextractor

import "github.com/SigNoz/signoz/pkg/errors"

const (
	ExtractorCH     = "qfe_ch"
	ExtractorPromQL = "qfe_promql"
)

// ColumnInfo represents a column in the query
type ColumnInfo struct {
	Name        string
	Alias       string
	OriginExpr  string
	OriginField string
}

type FilterResult struct {
	// MetricNames are the metrics that are being filtered on
	MetricNames []string
	// GroupByColumns are the columns that are being grouped by
	GroupByColumns []ColumnInfo
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
		return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid extractor type: %s", extractorType)
	}
}

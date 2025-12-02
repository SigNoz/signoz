package queryparser

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/queryparser/queryfilterextractor"
	"github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

type queryParserImpl struct {
	settings factory.ProviderSettings
}

// New creates a new implementation of the QueryParser service.
func New(settings factory.ProviderSettings) QueryParser {
	return &queryParserImpl{
		settings: settings,
	}
}

func (p *queryParserImpl) AnalyzeQueryFilter(ctx context.Context, queryType querybuildertypesv5.QueryType, query string) (*queryfilterextractor.FilterResult, error) {
	var extractorType queryfilterextractor.ExtractorType
	switch queryType {
	case querybuildertypesv5.QueryTypePromQL:
		extractorType = queryfilterextractor.ExtractorTypePromQL
	case querybuildertypesv5.QueryTypeClickHouseSQL:
		extractorType = queryfilterextractor.ExtractorTypeClickHouseSQL
	default:
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported queryType: %s. Supported values are '%s' and '%s'", queryType, querybuildertypesv5.QueryTypePromQL, querybuildertypesv5.QueryTypeClickHouseSQL)
	}

	// Create extractor
	extractor, err := queryfilterextractor.NewExtractor(extractorType)
	if err != nil {
		return nil, err
	}
	return extractor.Extract(query)
}

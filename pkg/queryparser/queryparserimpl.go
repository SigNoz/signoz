package queryparser

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/queryparser/queryfilterextractor"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
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

func (p *queryParserImpl) AnalyzeQueryFilter(ctx context.Context, queryType qbtypes.QueryType, query string) (*queryfilterextractor.FilterResult, error) {
	var extractorType queryfilterextractor.ExtractorType
	switch queryType {
	case qbtypes.QueryTypePromQL:
		extractorType = queryfilterextractor.ExtractorTypePromQL
	case qbtypes.QueryTypeClickHouseSQL:
		extractorType = queryfilterextractor.ExtractorTypeClickHouseSQL
	default:
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported queryType: %s. Supported values are '%s' and '%s'", queryType, qbtypes.QueryTypePromQL, qbtypes.QueryTypeClickHouseSQL)
	}

	// Create extractor
	extractor, err := queryfilterextractor.NewExtractor(extractorType)
	if err != nil {
		return nil, err
	}
	return extractor.Extract(query)
}

func (p *queryParserImpl) AnalyzeCompositeQuery(ctx context.Context, compositeQuery *v3.CompositeQuery) (*queryfilterextractor.FilterResult, error) {
	var result = &queryfilterextractor.FilterResult{
		MetricNames:    []string{},
		GroupByColumns: []queryfilterextractor.ColumnInfo{},
	}

	for _, query := range compositeQuery.Queries {
		switch query.Type {
		case qbtypes.QueryTypeBuilder:
			switch spec := query.Spec.(type) {
			case qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]:
				// extract group by fields
				for _, groupBy := range spec.GroupBy {
					if groupBy.Name != "" {
						result.GroupByColumns = append(result.GroupByColumns, queryfilterextractor.ColumnInfo{Name: groupBy.Name, OriginExpr: groupBy.Name, OriginField: groupBy.Name})
					}
				}
				// extract metric names
				for _, aggregation := range spec.Aggregations {
					if aggregation.MetricName != "" {
						result.MetricNames = append(result.MetricNames, aggregation.MetricName)
					}
				}
			default:
				// TODO: add support for Traces and Logs Aggregation types
				if p.settings.Logger != nil {
					p.settings.Logger.WarnContext(ctx, "unsupported QueryBuilderQuery type: %T", spec)
				}
				continue
			}
		case qbtypes.QueryTypePromQL:
			spec, ok := query.Spec.(qbtypes.PromQuery)
			if !ok || spec.Query == "" {
				continue
			}
			res, err := p.AnalyzeQueryFilter(ctx, qbtypes.QueryTypePromQL, spec.Query)
			if err != nil {
				return nil, err
			}
			result.MetricNames = append(result.MetricNames, res.MetricNames...)
			result.GroupByColumns = append(result.GroupByColumns, res.GroupByColumns...)
		case qbtypes.QueryTypeClickHouseSQL:
			spec, ok := query.Spec.(qbtypes.ClickHouseQuery)
			if !ok || spec.Query == "" {
				continue
			}
			res, err := p.AnalyzeQueryFilter(ctx, qbtypes.QueryTypeClickHouseSQL, spec.Query)
			if err != nil {
				return nil, err
			}
			result.MetricNames = append(result.MetricNames, res.MetricNames...)
			result.GroupByColumns = append(result.GroupByColumns, res.GroupByColumns...)
		default:
			return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported query type: %s", query.Type)
		}
	}

	return result, nil
}

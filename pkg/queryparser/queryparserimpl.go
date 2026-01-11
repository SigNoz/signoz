package queryparser

import (
	"context"

	"strings"

	"github.com/SigNoz/govaluate"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
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

func (p *queryParserImpl) AnalyzeQueryEnvelopes(ctx context.Context, queries []qbtypes.QueryEnvelope) (map[string]*queryfilterextractor.FilterResult, error) {
	results := make(map[string]*queryfilterextractor.FilterResult)

	// formulaQueries store the formula queries in the order they are defined
	formulaQueries := make(map[string]qbtypes.QueryBuilderFormula)

	// First pass: Process non-formula queries
	for _, query := range queries {
		result := &queryfilterextractor.FilterResult{
			MetricNames:    []string{},
			GroupByColumns: []queryfilterextractor.ColumnInfo{},
		}
		var queryName string

		switch query.Type {
		case qbtypes.QueryTypeBuilder:
			switch spec := query.Spec.(type) {
			case qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]:
				queryName = spec.Name
				// extract group by fields
				for _, groupBy := range spec.GroupBy {
					if groupBy.Name != "" {
						result.GroupByColumns = append(result.GroupByColumns, queryfilterextractor.ColumnInfo{Name: groupBy.Name, OriginExpr: groupBy.Name, OriginField: groupBy.Name, Alias: groupBy.Name})
					}
				}
				// extract metric names
				for _, aggregation := range spec.Aggregations {
					if aggregation.MetricName != "" {
						result.MetricNames = append(result.MetricNames, aggregation.MetricName)
					}
				}
			default:
				// TODO(abhishekhugetech): add support for Traces and Logs Aggregation types
				p.settings.Logger.WarnContext(ctx, "unsupported QueryBuilderQuery type: ", spec)
				// Skip result for this query
				continue
			}
		case qbtypes.QueryTypePromQL:
			spec, ok := query.Spec.(qbtypes.PromQuery)
			if !ok || spec.Query == "" {
				// Skip result for this query
				continue
			}
			queryName = spec.Name
			res, err := p.AnalyzeQueryFilter(ctx, qbtypes.QueryTypePromQL, spec.Query)
			if err != nil {
				return nil, err
			}
			result.MetricNames = append(result.MetricNames, res.MetricNames...)
			result.GroupByColumns = append(result.GroupByColumns, res.GroupByColumns...)
		case qbtypes.QueryTypeClickHouseSQL:
			spec, ok := query.Spec.(qbtypes.ClickHouseQuery)
			if !ok || spec.Query == "" {
				// Skip result for this query
				continue
			}
			queryName = spec.Name
			res, err := p.AnalyzeQueryFilter(ctx, qbtypes.QueryTypeClickHouseSQL, spec.Query)
			if err != nil {
				return nil, err
			}
			result.MetricNames = append(result.MetricNames, res.MetricNames...)
			result.GroupByColumns = append(result.GroupByColumns, res.GroupByColumns...)
		case qbtypes.QueryTypeFormula:
			spec, ok := query.Spec.(qbtypes.QueryBuilderFormula)
			if !ok {
				// Skip result for this query
				continue
			}
			formulaQueries[spec.Name] = spec
		default:
			return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported query type: %s", query.Type)
		}

		if queryName != "" {
			results[queryName] = result
		}
	}

	// Second pass: Process formula queries
	for _, query := range formulaQueries {
		result := &queryfilterextractor.FilterResult{
			MetricNames:    []string{},
			GroupByColumns: []queryfilterextractor.ColumnInfo{},
		}

		// Parse the expression to find used queries
		expression, err := govaluate.NewEvaluableExpressionWithFunctions(query.Expression, qbtypes.EvalFuncs())
		if err != nil {
			return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "failed to parse formula expression %s: %v", query.Name, err)
		}

		uniqueMetricNames := make(map[string]bool)
		uniqueGroupByColumns := make(map[string]bool)

		vars := expression.Vars()
		for _, v := range vars {
			// variables can be "A" or "A.0" or "A.alias" as per pkg/types/querybuildertypes/querybuildertypesv5/formula.go
			parts := strings.Split(v, ".")
			if len(parts) > 0 {
				refQueryName := parts[0]
				if refResult, exists := results[refQueryName]; exists {
					for _, metricName := range refResult.MetricNames {
						if !uniqueMetricNames[metricName] {
							uniqueMetricNames[metricName] = true
							result.MetricNames = append(result.MetricNames, metricName)
						}
					}
					for _, groupByColumn := range refResult.GroupByColumns {
						if !uniqueGroupByColumns[groupByColumn.Name] {
							uniqueGroupByColumns[groupByColumn.Name] = true
							result.GroupByColumns = append(result.GroupByColumns, groupByColumn)
						}
					}
				}
			}
		}

		// Add the formula query filter result to the results map
		results[query.Name] = result
	}

	return results, nil
}

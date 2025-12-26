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

// ValidateCompositeQuery validates a composite query by checking all queries in the queries array
func (p *queryParserImpl) ValidateCompositeQuery(ctx context.Context, compositeQuery *v3.CompositeQuery) error {
	if compositeQuery == nil {
		return errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"composite query is required",
		)
	}

	if len(compositeQuery.Queries) == 0 {
		return errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"at least one query is required",
		)
	}

	// Validate each query
	for i, envelope := range compositeQuery.Queries {
		queryId := qbtypes.GetQueryIdentifier(envelope, i)

		switch envelope.Type {
		case qbtypes.QueryTypeBuilder, qbtypes.QueryTypeSubQuery:
			switch spec := envelope.Spec.(type) {
			case qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]:
				if err := spec.Validate(qbtypes.RequestTypeTimeSeries); err != nil {
					return errors.NewInvalidInputf(
						errors.CodeInvalidInput,
						"invalid %s: %s",
						queryId,
						err.Error(),
					)
				}
			case qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]:
				if err := spec.Validate(qbtypes.RequestTypeTimeSeries); err != nil {
					return errors.NewInvalidInputf(
						errors.CodeInvalidInput,
						"invalid %s: %s",
						queryId,
						err.Error(),
					)
				}
			case qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]:
				if err := spec.Validate(qbtypes.RequestTypeTimeSeries); err != nil {
					return errors.NewInvalidInputf(
						errors.CodeInvalidInput,
						"invalid %s: %s",
						queryId,
						err.Error(),
					)
				}
			default:
				return errors.NewInvalidInputf(
					errors.CodeInvalidInput,
					"unknown query spec type for %s",
					queryId,
				)
			}
		case qbtypes.QueryTypePromQL:
			spec, ok := envelope.Spec.(qbtypes.PromQuery)
			if !ok {
				return errors.NewInvalidInputf(
					errors.CodeInvalidInput,
					"invalid spec for %s",
					queryId,
				)
			}
			if spec.Query == "" {
				return errors.NewInvalidInputf(
					errors.CodeInvalidInput,
					"query expression is required for %s",
					queryId,
				)
			}
			if err := validatePromQLQuery(spec.Query); err != nil {
				return err
			}
		case qbtypes.QueryTypeClickHouseSQL:
			spec, ok := envelope.Spec.(qbtypes.ClickHouseQuery)
			if !ok {
				return errors.NewInvalidInputf(
					errors.CodeInvalidInput,
					"invalid spec for %s",
					queryId,
				)
			}
			if spec.Query == "" {
				return errors.NewInvalidInputf(
					errors.CodeInvalidInput,
					"query expression is required for %s",
					queryId,
				)
			}
			if err := validateClickHouseQuery(spec.Query); err != nil {
				return err
			}
		case qbtypes.QueryTypeFormula:
			spec, ok := envelope.Spec.(qbtypes.QueryBuilderFormula)
			if !ok {
				return errors.NewInvalidInputf(
					errors.CodeInvalidInput,
					"invalid spec for %s",
					queryId,
				)
			}
			if err := spec.Validate(); err != nil {
				return err
			}
		case qbtypes.QueryTypeJoin:
			spec, ok := envelope.Spec.(qbtypes.QueryBuilderJoin)
			if !ok {
				return errors.NewInvalidInputf(
					errors.CodeInvalidInput,
					"invalid spec for %s",
					queryId,
				)
			}
			if err := spec.Validate(); err != nil {
				return err
			}
		case qbtypes.QueryTypeTraceOperator:
			spec, ok := envelope.Spec.(qbtypes.QueryBuilderTraceOperator)
			if !ok {
				return errors.NewInvalidInputf(
					errors.CodeInvalidInput,
					"invalid spec for %s",
					queryId,
				)
			}
			err := spec.ValidateTraceOperator(compositeQuery.Queries)
			if err != nil {
				return err
			}
		default:
			return errors.NewInvalidInputf(
				errors.CodeInvalidInput,
				"unknown query type '%s' for %s",
				envelope.Type,
				queryId,
			).WithAdditional(
				"Valid query types are: builder_query, builder_sub_query, builder_formula, builder_join, promql, clickhouse_sql, trace_operator",
			)
		}
	}

	// Check if all queries are disabled
	if allDisabled := checkQueriesDisabled(compositeQuery); allDisabled {
		return errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"all queries are disabled - at least one query must be enabled",
		)
	}

	return nil
}

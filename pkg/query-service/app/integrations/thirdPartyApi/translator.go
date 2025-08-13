package thirdPartyApi

import (
	"net"
	"time"

	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

const (
	urlPathKey    = "http.url"
	serverNameKey = "net.peer.name"

	urlPathKeyNew    = "url.full"
	serverNameKeyNew = "server.address"
)

var defaultStepInterval = 60 * time.Second

func FilterResponse(results []*qbtypes.QueryRangeResponse) []*qbtypes.QueryRangeResponse {
	filteredResults := make([]*qbtypes.QueryRangeResponse, 0, len(results))

	for _, res := range results {
		if res.Data.Results == nil {
			continue
		}

		filteredData := make([]any, 0, len(res.Data.Results))
		for _, result := range res.Data.Results {
			if result == nil {
				filteredData = append(filteredData, result)
				continue
			}

			// Handle different result types
			switch resultData := result.(type) {
			case *qbtypes.TimeSeriesData:
				if resultData.Aggregations != nil {
					for _, agg := range resultData.Aggregations {
						filteredSeries := make([]*qbtypes.TimeSeries, 0, len(agg.Series))
						for _, series := range agg.Series {
							if shouldIncludeSeries(series) {
								filteredSeries = append(filteredSeries, series)
							}
						}
						agg.Series = filteredSeries
					}
				}
			case *qbtypes.RawData:
				filteredRows := make([]*qbtypes.RawRow, 0, len(resultData.Rows))
				for _, row := range resultData.Rows {
					if shouldIncludeRow(row) {
						filteredRows = append(filteredRows, row)
					}
				}
				resultData.Rows = filteredRows
			}

			filteredData = append(filteredData, result)
		}

		res.Data.Results = filteredData
		filteredResults = append(filteredResults, res)
	}

	return filteredResults
}

// shouldIncludeSeries checks if a series should be included based on IP filtering
func shouldIncludeSeries(series *qbtypes.TimeSeries) bool {
	for _, label := range series.Labels {
		if label.Key.Name == serverNameKey {
			if strVal, ok := label.Value.(string); ok {
				if net.ParseIP(strVal) != nil {
					return false // Skip IP addresses
				}
			}
		}
	}
	return true
}

// shouldIncludeRow checks if a row should be included based on IP filtering
func shouldIncludeRow(row *qbtypes.RawRow) bool {
	if row.Data != nil {
		if domainVal, ok := row.Data[serverNameKey]; ok {
			if domainStr, ok := domainVal.(string); ok {
				if net.ParseIP(domainStr) != nil {
					return false // Skip IP addresses
				}
			}
		}
	}
	return true
}

// convertV3FiltersToV5 converts v3 FilterSet to v5 Filter
func convertV3FiltersToV5(v3Filters v3.FilterSet) *qbtypes.Filter {
	if len(v3Filters.Items) == 0 {
		return nil
	}

	// For simplicity, create a basic filter expression
	// In a real implementation, you'd properly convert the filter structure
	return &qbtypes.Filter{
		Expression: "", // TODO: Implement proper conversion
	}
}

// convertV3GroupByToV5 converts v3 AttributeKey slice to v5 GroupByKey slice
func convertV3GroupByToV5(v3GroupBy []v3.AttributeKey) []qbtypes.GroupByKey {
	if len(v3GroupBy) == 0 {
		return nil
	}

	v5GroupBy := make([]qbtypes.GroupByKey, len(v3GroupBy))
	for i, attr := range v3GroupBy {
		v5GroupBy[i] = qbtypes.GroupByKey{
			TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
				Name:          attr.Key,
				FieldDataType: convertV3DataTypeToV5(attr.DataType),
				FieldContext:  convertV3TypeToV5(attr.Type),
				Signal:        telemetrytypes.SignalTraces,
			},
		}
	}

	return v5GroupBy
}

// convertV3DataTypeToV5 converts v3 data type to v5 field data type
func convertV3DataTypeToV5(dataType v3.AttributeKeyDataType) telemetrytypes.FieldDataType {
	switch dataType {
	case v3.AttributeKeyDataTypeString:
		return telemetrytypes.FieldDataTypeString
	case v3.AttributeKeyDataTypeFloat64:
		return telemetrytypes.FieldDataTypeFloat64
	case v3.AttributeKeyDataTypeInt64:
		return telemetrytypes.FieldDataTypeInt64
	case v3.AttributeKeyDataTypeBool:
		return telemetrytypes.FieldDataTypeBool
	default:
		return telemetrytypes.FieldDataTypeString
	}
}

// convertV3TypeToV5 converts v3 attribute type to v5 field context
func convertV3TypeToV5(attrType v3.AttributeKeyType) telemetrytypes.FieldContext {
	switch attrType {
	case v3.AttributeKeyTypeTag:
		return telemetrytypes.FieldContextAttribute
	case v3.AttributeKeyTypeResource:
		return telemetrytypes.FieldContextResource
	default:
		return telemetrytypes.FieldContextAttribute
	}
}

// BuildDomainList creates a v5 query range request for domain listing
func BuildDomainList(thirdPartyApis *ThirdPartyApis) (*qbtypes.QueryRangeRequest, error) {
	additionalFilters := convertV3FiltersToV5(thirdPartyApis.Filters)
	additionalGroupBy := convertV3GroupByToV5(thirdPartyApis.GroupBy)

	// Build the trace aggregation query for endpoints
	endpointsQuery := qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
		Name:         "endpoints",
		Signal:       telemetrytypes.SignalTraces,
		StepInterval: qbtypes.Step{Duration: defaultStepInterval},
		Aggregations: []qbtypes.TraceAggregation{
			{
				Expression: "count_distinct(http.url)",
			},
		},
		Filter: buildBaseFilter(additionalFilters),
		GroupBy: mergeGroupBy([]qbtypes.GroupByKey{
			{
				TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
					Name:          serverNameKey,
					FieldDataType: telemetrytypes.FieldDataTypeString,
					FieldContext:  telemetrytypes.FieldContextAttribute,
					Signal:        telemetrytypes.SignalTraces,
				},
			},
		}, additionalGroupBy),
	}

	// Build the trace aggregation query for last seen
	lastSeenQuery := qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
		Name:         "lastseen",
		Signal:       telemetrytypes.SignalTraces,
		StepInterval: qbtypes.Step{Duration: defaultStepInterval},
		Aggregations: []qbtypes.TraceAggregation{
			{
				Expression: "max(timestamp)",
			},
		},
		Filter: buildBaseFilter(additionalFilters),
		GroupBy: mergeGroupBy([]qbtypes.GroupByKey{
			{
				TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
					Name:          serverNameKey,
					FieldDataType: telemetrytypes.FieldDataTypeString,
					FieldContext:  telemetrytypes.FieldContextAttribute,
					Signal:        telemetrytypes.SignalTraces,
				},
			},
		}, additionalGroupBy),
	}

	// Build the trace aggregation query for RPS
	rpsQuery := qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
		Name:         "rps",
		Signal:       telemetrytypes.SignalTraces,
		StepInterval: qbtypes.Step{Duration: defaultStepInterval},
		Aggregations: []qbtypes.TraceAggregation{
			{
				Expression: "rate()",
			},
		},
		Filter: buildBaseFilter(additionalFilters),
		GroupBy: mergeGroupBy([]qbtypes.GroupByKey{
			{
				TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
					Name:          serverNameKey,
					FieldDataType: telemetrytypes.FieldDataTypeString,
					FieldContext:  telemetrytypes.FieldContextAttribute,
					Signal:        telemetrytypes.SignalTraces,
				},
			},
		}, additionalGroupBy),
	}

	// Build the trace aggregation query for errors
	errorQuery := qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
		Name:         "error",
		Signal:       telemetrytypes.SignalTraces,
		StepInterval: qbtypes.Step{Duration: defaultStepInterval},
		Aggregations: []qbtypes.TraceAggregation{
			{
				Expression: "count()",
			},
		},
		Filter: buildErrorFilter(additionalFilters),
		GroupBy: mergeGroupBy([]qbtypes.GroupByKey{
			{
				TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
					Name:          serverNameKey,
					FieldDataType: telemetrytypes.FieldDataTypeString,
					FieldContext:  telemetrytypes.FieldContextAttribute,
					Signal:        telemetrytypes.SignalTraces,
				},
			},
		}, additionalGroupBy),
	}

	// Build the trace aggregation query for total spans
	totalSpanQuery := qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
		Name:         "total_span",
		Signal:       telemetrytypes.SignalTraces,
		StepInterval: qbtypes.Step{Duration: defaultStepInterval},
		Aggregations: []qbtypes.TraceAggregation{
			{
				Expression: "count()",
			},
		},
		Filter: buildBaseFilter(additionalFilters),
		GroupBy: mergeGroupBy([]qbtypes.GroupByKey{
			{
				TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
					Name:          serverNameKey,
					FieldDataType: telemetrytypes.FieldDataTypeString,
					FieldContext:  telemetrytypes.FieldContextAttribute,
					Signal:        telemetrytypes.SignalTraces,
				},
			},
		}, additionalGroupBy),
	}

	// Build the trace aggregation query for P99 latency
	p99Query := qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
		Name:         "p99",
		Signal:       telemetrytypes.SignalTraces,
		StepInterval: qbtypes.Step{Duration: defaultStepInterval},
		Aggregations: []qbtypes.TraceAggregation{
			{
				Expression: "p99(duration_nano)",
			},
		},
		Filter: buildBaseFilter(additionalFilters),
		GroupBy: mergeGroupBy([]qbtypes.GroupByKey{
			{
				TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
					Name:          serverNameKey,
					FieldDataType: telemetrytypes.FieldDataTypeString,
					FieldContext:  telemetrytypes.FieldContextAttribute,
					Signal:        telemetrytypes.SignalTraces,
				},
			},
		}, additionalGroupBy),
	}

	// Build the formula query for error rate
	errorRateFormula := qbtypes.QueryBuilderFormula{
		Name:       "error_rate",
		Expression: "(error/total_span)*100",
	}

	// Create the composite query
	compositeQuery := qbtypes.CompositeQuery{
		Queries: []qbtypes.QueryEnvelope{
			{
				Type: qbtypes.QueryTypeBuilder,
				Spec: endpointsQuery,
			},
			{
				Type: qbtypes.QueryTypeBuilder,
				Spec: lastSeenQuery,
			},
			{
				Type: qbtypes.QueryTypeBuilder,
				Spec: rpsQuery,
			},
			{
				Type: qbtypes.QueryTypeBuilder,
				Spec: errorQuery,
			},
			{
				Type: qbtypes.QueryTypeBuilder,
				Spec: totalSpanQuery,
			},
			{
				Type: qbtypes.QueryTypeBuilder,
				Spec: p99Query,
			},
			{
				Type: qbtypes.QueryTypeFormula,
				Spec: errorRateFormula,
			},
		},
	}

	queryRangeRequest := &qbtypes.QueryRangeRequest{
		SchemaVersion:  "v5",
		Start:          uint64(thirdPartyApis.Start),
		End:            uint64(thirdPartyApis.End),
		RequestType:    qbtypes.RequestTypeScalar,
		CompositeQuery: compositeQuery,
		FormatOptions: &qbtypes.FormatOptions{
			FormatTableResultForUI: true,
		},
	}

	return queryRangeRequest, nil
}

// BuildDomainInfo creates a v5 query range request for domain information
func BuildDomainInfo(thirdPartyApis *ThirdPartyApis) (*qbtypes.QueryRangeRequest, error) {
	additionalFilters := convertV3FiltersToV5(thirdPartyApis.Filters)
	additionalGroupBy := convertV3GroupByToV5(thirdPartyApis.GroupBy)

	// Build the trace aggregation query for endpoints
	endpointsQuery := qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
		Name:         "endpoints",
		Signal:       telemetrytypes.SignalTraces,
		StepInterval: qbtypes.Step{Duration: defaultStepInterval},
		Aggregations: []qbtypes.TraceAggregation{
			{
				Expression: "rate(http.url)",
			},
		},
		Filter: buildBaseFilter(additionalFilters),
		GroupBy: mergeGroupBy([]qbtypes.GroupByKey{
			{
				TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
					Name:          urlPathKey,
					FieldDataType: telemetrytypes.FieldDataTypeString,
					FieldContext:  telemetrytypes.FieldContextAttribute,
					Signal:        telemetrytypes.SignalTraces,
				},
			},
		}, additionalGroupBy),
	}

	// Build the trace aggregation query for P99 latency
	p99Query := qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
		Name:         "p99",
		Signal:       telemetrytypes.SignalTraces,
		StepInterval: qbtypes.Step{Duration: defaultStepInterval},
		Aggregations: []qbtypes.TraceAggregation{
			{
				Expression: "p99(duration_nano)",
			},
		},
		Filter:  buildBaseFilter(additionalFilters),
		GroupBy: mergeGroupBy([]qbtypes.GroupByKey{}, additionalGroupBy),
	}

	// Build the trace aggregation query for error rate
	errorRateQuery := qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
		Name:         "error_rate",
		Signal:       telemetrytypes.SignalTraces,
		StepInterval: qbtypes.Step{Duration: defaultStepInterval},
		Aggregations: []qbtypes.TraceAggregation{
			{
				Expression: "rate()",
			},
		},
		Filter:  buildBaseFilter(additionalFilters),
		GroupBy: mergeGroupBy([]qbtypes.GroupByKey{}, additionalGroupBy),
	}

	// Build the trace aggregation query for last seen
	lastSeenQuery := qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
		Name:         "lastseen",
		Signal:       telemetrytypes.SignalTraces,
		StepInterval: qbtypes.Step{Duration: defaultStepInterval},
		Aggregations: []qbtypes.TraceAggregation{
			{
				Expression: "max(timestamp)",
			},
		},
		Filter:  buildBaseFilter(additionalFilters),
		GroupBy: mergeGroupBy([]qbtypes.GroupByKey{}, additionalGroupBy),
	}

	// Create the composite query
	compositeQuery := qbtypes.CompositeQuery{
		Queries: []qbtypes.QueryEnvelope{
			{
				Type: qbtypes.QueryTypeBuilder,
				Spec: endpointsQuery,
			},
			{
				Type: qbtypes.QueryTypeBuilder,
				Spec: p99Query,
			},
			{
				Type: qbtypes.QueryTypeBuilder,
				Spec: errorRateQuery,
			},
			{
				Type: qbtypes.QueryTypeBuilder,
				Spec: lastSeenQuery,
			},
		},
	}

	queryRangeRequest := &qbtypes.QueryRangeRequest{
		SchemaVersion:  "v5",
		Start:          uint64(thirdPartyApis.Start),
		End:            uint64(thirdPartyApis.End),
		RequestType:    qbtypes.RequestTypeScalar,
		CompositeQuery: compositeQuery,
		FormatOptions: &qbtypes.FormatOptions{
			FormatTableResultForUI: true,
		},
	}

	return queryRangeRequest, nil
}

// buildBaseFilter creates the base filter for client spans with http.url
func buildBaseFilter(additionalFilters *qbtypes.Filter) *qbtypes.Filter {
	baseExpression := "(http.url EXISTS OR url.full EXISTS) AND kind_string = 'Client'"

	if additionalFilters != nil && additionalFilters.Expression != "" {
		baseExpression = "(" + baseExpression + ") AND (" + additionalFilters.Expression + ")"
	}

	return &qbtypes.Filter{
		Expression: baseExpression,
	}
}

// buildErrorFilter creates the filter for error spans
func buildErrorFilter(additionalFilters *qbtypes.Filter) *qbtypes.Filter {
	errorExpression := "has_error = true AND (http.url EXISTS OR url.full EXISTS) AND kind_string = 'Client'"

	if additionalFilters != nil && additionalFilters.Expression != "" {
		errorExpression = "(" + errorExpression + ") AND (" + additionalFilters.Expression + ")"
	}

	return &qbtypes.Filter{
		Expression: errorExpression,
	}
}

// mergeGroupBy merges base group by keys with additional ones
func mergeGroupBy(baseGroupBy []qbtypes.GroupByKey, additionalGroupBy []qbtypes.GroupByKey) []qbtypes.GroupByKey {
	if len(additionalGroupBy) == 0 {
		return baseGroupBy
	}

	result := make([]qbtypes.GroupByKey, len(baseGroupBy))
	copy(result, baseGroupBy)
	result = append(result, additionalGroupBy...)

	return result
}

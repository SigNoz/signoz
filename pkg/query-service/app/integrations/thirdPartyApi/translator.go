package thirdPartyApi

import (
	"fmt"
	"net"
	"time"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

const (
	urlPathKeyLegacy    = "http.url"
	serverNameKeyLegacy = "net.peer.name"

	urlPathKeyCurrent    = "url.full"
	serverNameKeyCurrent = "server.address"
)

var defaultStepInterval = 60 * time.Second

// SemconvFieldMapping defines the mapping between legacy and current semconv
type SemconvFieldMapping struct {
	LegacyField  string
	CurrentField string
	FieldType    telemetrytypes.FieldDataType
	Context      telemetrytypes.FieldContext
}

var semconvMappings = []SemconvFieldMapping{
	{
		LegacyField:  urlPathKeyLegacy,
		CurrentField: urlPathKeyCurrent,
		FieldType:    telemetrytypes.FieldDataTypeString,
		Context:      telemetrytypes.FieldContextAttribute,
	},
	{
		LegacyField:  serverNameKeyLegacy,
		CurrentField: serverNameKeyCurrent,
		FieldType:    telemetrytypes.FieldDataTypeString,
		Context:      telemetrytypes.FieldContextAttribute,
	},
}

// CreateDualSemconvGroupByKeys creates group by keys supporting both semconv versions
func CreateDualSemconvGroupByKeysServer() []qbtypes.GroupByKey {
	return createDualSemconvGroupBy(semconvMappings[1]) // server name mapping
}

func CreateDualSemconvGroupByKeysUrl() []qbtypes.GroupByKey {
	return createDualSemconvGroupBy(semconvMappings[0]) // url path mapping
}

func createDualSemconvGroupBy(mapping SemconvFieldMapping) []qbtypes.GroupByKey {
	return []qbtypes.GroupByKey{
		{
			TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
				Name:          mapping.CurrentField,
				FieldDataType: mapping.FieldType,
				FieldContext:  mapping.Context,
				Signal:        telemetrytypes.SignalTraces,
			},
		},
		{
			TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
				Name:          mapping.LegacyField,
				FieldDataType: mapping.FieldType,
				FieldContext:  mapping.Context,
				Signal:        telemetrytypes.SignalTraces,
			},
		},
	}
}

func MergeSemconvColumns(result *qbtypes.QueryRangeResponse) *qbtypes.QueryRangeResponse {
	if result == nil || result.Data.Results == nil {
		return result
	}

	for _, res := range result.Data.Results {
		scalarData, ok := res.(*qbtypes.ScalarData)
		if !ok {
			continue
		}

		serverAddrIdx := -1
		netPeerIdx := -1

		for i, col := range scalarData.Columns {
			if col.Name == serverNameKeyCurrent {
				serverAddrIdx = i
			} else if col.Name == serverNameKeyLegacy {
				netPeerIdx = i
			}
		}

		if serverAddrIdx == -1 || netPeerIdx == -1 {
			continue
		}

		var newRows [][]any
		for _, row := range scalarData.Data {
			if len(row) <= serverAddrIdx || len(row) <= netPeerIdx {
				continue
			}

			var serverName any
			if isValidValue(row[serverAddrIdx]) {
				serverName = row[serverAddrIdx]
			} else if isValidValue(row[netPeerIdx]) {
				serverName = row[netPeerIdx]
			}

			if serverName != nil {
				newRow := make([]any, len(row)-1)
				newRow[0] = serverName

				targetIdx := 1
				for i, val := range row {
					if i != netPeerIdx && i != serverAddrIdx {
						if targetIdx < len(newRow) {
							newRow[targetIdx] = val
							targetIdx++
						}
					}
				}
				newRows = append(newRows, newRow)
			}
		}

		newColumns := make([]*qbtypes.ColumnDescriptor, len(scalarData.Columns)-1)
		targetIdx := 0
		for i, col := range scalarData.Columns {
			if i == serverAddrIdx {
				newCol := &qbtypes.ColumnDescriptor{
					TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
						Name:          serverNameKeyLegacy,
						FieldDataType: col.FieldDataType,
						FieldContext:  col.FieldContext,
						Signal:        col.Signal,
					},
					QueryName:        col.QueryName,
					AggregationIndex: col.AggregationIndex,
					Meta:             col.Meta,
					Type:             col.Type,
				}
				newColumns[targetIdx] = newCol
				targetIdx++
			} else if i != netPeerIdx {
				newColumns[targetIdx] = col
				targetIdx++
			}
		}

		scalarData.Columns = newColumns
		scalarData.Data = newRows
	}

	return result
}

func isValidValue(val any) bool {
	if val == nil {
		return false
	}
	if str, ok := val.(string); ok {
		return str != "" && str != "n/a"
	}
	return true
}

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
		if label.Key.Name == serverNameKeyLegacy || label.Key.Name == serverNameKeyCurrent {
			if strVal, ok := label.Value.(string); ok {
				if net.ParseIP(strVal) != nil {
					return false // Skip IP addresses
				}
			}
		}
	}
	return true
}

func shouldIncludeRow(row *qbtypes.RawRow) bool {
	if row.Data != nil {
		for _, key := range []string{serverNameKeyLegacy, serverNameKeyCurrent} {
			if domainVal, ok := row.Data[key]; ok {
				if domainStr, ok := domainVal.(string); ok {
					if net.ParseIP(domainStr) != nil {
						return false // Skip IP addresses
					}
				}
			}
		}
	}
	return true
}

// Utility functions
func mergeGroupBy(baseGroupBy []qbtypes.GroupByKey, additionalGroupBy []qbtypes.GroupByKey) []qbtypes.GroupByKey {
	if len(additionalGroupBy) == 0 {
		return baseGroupBy
	}

	result := make([]qbtypes.GroupByKey, len(baseGroupBy))
	copy(result, baseGroupBy)
	result = append(result, additionalGroupBy...)

	return result
}

// BuildDomainList creates a v5 query range request for domain listing
func BuildDomainList(req *ThirdPartyApiRequest) (*qbtypes.QueryRangeRequest, error) {
	if err := req.Validate(); err != nil {
		return nil, err
	}

	// Build all the required queries
	queries := []qbtypes.QueryEnvelope{
		buildEndpointsQuery(req),
		buildLastSeenQuery(req),
		buildRpsQuery(req),
		buildErrorQuery(req),
		buildTotalSpanQuery(req),
		buildP99Query(req),
		buildErrorRateFormula(),
	}

	return &qbtypes.QueryRangeRequest{
		SchemaVersion: "v5",
		Start:         req.Start,
		End:           req.End,
		RequestType:   qbtypes.RequestTypeScalar,
		CompositeQuery: qbtypes.CompositeQuery{
			Queries: queries,
		},
		FormatOptions: &qbtypes.FormatOptions{
			FormatTableResultForUI: true,
		},
	}, nil
}

// BuildDomainInfo creates a v5 query range request for domain information
func BuildDomainInfo(req *ThirdPartyApiRequest) (*qbtypes.QueryRangeRequest, error) {
	if err := req.Validate(); err != nil {
		return nil, err
	}

	queries := []qbtypes.QueryEnvelope{
		buildEndpointsInfoQuery(req),
		buildP99InfoQuery(req),
		buildErrorRateInfoQuery(req),
		buildLastSeenInfoQuery(req),
	}

	return &qbtypes.QueryRangeRequest{
		SchemaVersion: "v5",
		Start:         req.Start,
		End:           req.End,
		RequestType:   qbtypes.RequestTypeScalar,
		CompositeQuery: qbtypes.CompositeQuery{
			Queries: queries,
		},
		FormatOptions: &qbtypes.FormatOptions{
			FormatTableResultForUI: true,
		},
	}, nil
}

// Query builders for domain list
func buildEndpointsQuery(req *ThirdPartyApiRequest) qbtypes.QueryEnvelope {
	return qbtypes.QueryEnvelope{
		Type: qbtypes.QueryTypeBuilder,
		Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Name:         "endpoints",
			Signal:       telemetrytypes.SignalTraces,
			StepInterval: qbtypes.Step{Duration: defaultStepInterval},
			Aggregations: []qbtypes.TraceAggregation{
				{Expression: "count_distinct(http.url)"},
			},
			Filter:  buildBaseFilter(req.Filter),
			GroupBy: mergeGroupBy(CreateDualSemconvGroupByKeysServer(), req.GroupBy),
		},
	}
}

func buildLastSeenQuery(req *ThirdPartyApiRequest) qbtypes.QueryEnvelope {
	return qbtypes.QueryEnvelope{
		Type: qbtypes.QueryTypeBuilder,
		Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Name:         "lastseen",
			Signal:       telemetrytypes.SignalTraces,
			StepInterval: qbtypes.Step{Duration: defaultStepInterval},
			Aggregations: []qbtypes.TraceAggregation{
				{Expression: "max(timestamp)"},
			},
			Filter:  buildBaseFilter(req.Filter),
			GroupBy: mergeGroupBy(CreateDualSemconvGroupByKeysServer(), req.GroupBy),
		},
	}
}

func buildRpsQuery(req *ThirdPartyApiRequest) qbtypes.QueryEnvelope {
	return qbtypes.QueryEnvelope{
		Type: qbtypes.QueryTypeBuilder,
		Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Name:         "rps",
			Signal:       telemetrytypes.SignalTraces,
			StepInterval: qbtypes.Step{Duration: defaultStepInterval},
			Aggregations: []qbtypes.TraceAggregation{
				{Expression: "rate()"},
			},
			Filter:  buildBaseFilter(req.Filter),
			GroupBy: mergeGroupBy(CreateDualSemconvGroupByKeysServer(), req.GroupBy),
		},
	}
}

func buildErrorQuery(req *ThirdPartyApiRequest) qbtypes.QueryEnvelope {
	return qbtypes.QueryEnvelope{
		Type: qbtypes.QueryTypeBuilder,
		Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Name:         "error",
			Signal:       telemetrytypes.SignalTraces,
			StepInterval: qbtypes.Step{Duration: defaultStepInterval},
			Aggregations: []qbtypes.TraceAggregation{
				{Expression: "count()"},
			},
			Filter:  buildErrorFilter(req.Filter),
			GroupBy: mergeGroupBy(CreateDualSemconvGroupByKeysServer(), req.GroupBy),
		},
	}
}

func buildTotalSpanQuery(req *ThirdPartyApiRequest) qbtypes.QueryEnvelope {
	return qbtypes.QueryEnvelope{
		Type: qbtypes.QueryTypeBuilder,
		Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Name:         "total_span",
			Signal:       telemetrytypes.SignalTraces,
			StepInterval: qbtypes.Step{Duration: defaultStepInterval},
			Aggregations: []qbtypes.TraceAggregation{
				{Expression: "count()"},
			},
			Filter:  buildBaseFilter(req.Filter),
			GroupBy: mergeGroupBy(CreateDualSemconvGroupByKeysServer(), req.GroupBy),
		},
	}
}

func buildP99Query(req *ThirdPartyApiRequest) qbtypes.QueryEnvelope {
	return qbtypes.QueryEnvelope{
		Type: qbtypes.QueryTypeBuilder,
		Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Name:         "p99",
			Signal:       telemetrytypes.SignalTraces,
			StepInterval: qbtypes.Step{Duration: defaultStepInterval},
			Aggregations: []qbtypes.TraceAggregation{
				{Expression: "p99(duration_nano)"},
			},
			Filter:  buildBaseFilter(req.Filter),
			GroupBy: mergeGroupBy(CreateDualSemconvGroupByKeysServer(), req.GroupBy),
		},
	}
}

func buildErrorRateFormula() qbtypes.QueryEnvelope {
	return qbtypes.QueryEnvelope{
		Type: qbtypes.QueryTypeFormula,
		Spec: qbtypes.QueryBuilderFormula{
			Name:       "error_rate",
			Expression: "(error/total_span)*100",
		},
	}
}

// Query builders for domain info
func buildEndpointsInfoQuery(req *ThirdPartyApiRequest) qbtypes.QueryEnvelope {
	return qbtypes.QueryEnvelope{
		Type: qbtypes.QueryTypeBuilder,
		Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Name:         "endpoints",
			Signal:       telemetrytypes.SignalTraces,
			StepInterval: qbtypes.Step{Duration: defaultStepInterval},
			Aggregations: []qbtypes.TraceAggregation{
				{Expression: "rate(http.url)"},
			},
			Filter:  buildBaseFilter(req.Filter),
			GroupBy: mergeGroupBy(CreateDualSemconvGroupByKeysUrl(), req.GroupBy),
		},
	}
}

func buildP99InfoQuery(req *ThirdPartyApiRequest) qbtypes.QueryEnvelope {
	return qbtypes.QueryEnvelope{
		Type: qbtypes.QueryTypeBuilder,
		Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Name:         "p99",
			Signal:       telemetrytypes.SignalTraces,
			StepInterval: qbtypes.Step{Duration: defaultStepInterval},
			Aggregations: []qbtypes.TraceAggregation{
				{Expression: "p99(duration_nano)"},
			},
			Filter:  buildBaseFilter(req.Filter),
			GroupBy: req.GroupBy,
		},
	}
}

func buildErrorRateInfoQuery(req *ThirdPartyApiRequest) qbtypes.QueryEnvelope {
	return qbtypes.QueryEnvelope{
		Type: qbtypes.QueryTypeBuilder,
		Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Name:         "error_rate",
			Signal:       telemetrytypes.SignalTraces,
			StepInterval: qbtypes.Step{Duration: defaultStepInterval},
			Aggregations: []qbtypes.TraceAggregation{
				{Expression: "rate()"},
			},
			Filter:  buildBaseFilter(req.Filter),
			GroupBy: req.GroupBy,
		},
	}
}

func buildLastSeenInfoQuery(req *ThirdPartyApiRequest) qbtypes.QueryEnvelope {
	return qbtypes.QueryEnvelope{
		Type: qbtypes.QueryTypeBuilder,
		Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Name:         "lastseen",
			Signal:       telemetrytypes.SignalTraces,
			StepInterval: qbtypes.Step{Duration: defaultStepInterval},
			Aggregations: []qbtypes.TraceAggregation{
				{Expression: "max(timestamp)"},
			},
			Filter:  buildBaseFilter(req.Filter),
			GroupBy: req.GroupBy,
		},
	}
}

// Filter builders with dual semconv support
func buildBaseFilter(additionalFilter *qbtypes.Filter) *qbtypes.Filter {
	baseExpression := fmt.Sprintf("(%s EXISTS OR %s EXISTS) AND kind_string = 'Client'",
		urlPathKeyLegacy, urlPathKeyCurrent)

	if additionalFilter != nil && additionalFilter.Expression != "" {
		baseExpression = fmt.Sprintf("(%s) AND (%s)", baseExpression, additionalFilter.Expression)
	}

	return &qbtypes.Filter{Expression: baseExpression}
}

func buildErrorFilter(additionalFilter *qbtypes.Filter) *qbtypes.Filter {
	errorExpression := fmt.Sprintf("has_error = true AND (%s EXISTS OR %s EXISTS) AND kind_string = 'Client'",
		urlPathKeyLegacy, urlPathKeyCurrent)

	if additionalFilter != nil && additionalFilter.Expression != "" {
		errorExpression = fmt.Sprintf("(%s) AND (%s)", errorExpression, additionalFilter.Expression)
	}

	return &qbtypes.Filter{Expression: errorExpression}
}

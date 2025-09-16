package thirdpartyapi

import (
	"fmt"
	"github.com/SigNoz/signoz/pkg/types/thirdpartyapitypes"
	"net"
	"regexp"
	"time"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

const (
	urlPathKeyLegacy       = "http.url"
	serverAddressKeyLegacy = "net.peer.name"

	urlPathKey       = "url.full"
	serverAddressKey = "server.address"
)

var defaultStepInterval = 60 * time.Second

type SemconvFieldMapping struct {
	LegacyField  string
	CurrentField string
	FieldType    telemetrytypes.FieldDataType
	Context      telemetrytypes.FieldContext
}

var dualSemconvGroupByKeys = map[string][]qbtypes.GroupByKey{
	"server": {
		{
			TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
				Name:          serverAddressKey,
				FieldDataType: telemetrytypes.FieldDataTypeString,
				FieldContext:  telemetrytypes.FieldContextAttribute,
				Signal:        telemetrytypes.SignalTraces,
			},
		},
		{
			TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
				Name:          serverAddressKeyLegacy,
				FieldDataType: telemetrytypes.FieldDataTypeString,
				FieldContext:  telemetrytypes.FieldContextAttribute,
				Signal:        telemetrytypes.SignalTraces,
			},
		},
	},
	"url": {
		{
			TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
				Name:          urlPathKey,
				FieldDataType: telemetrytypes.FieldDataTypeString,
				FieldContext:  telemetrytypes.FieldContextAttribute,
				Signal:        telemetrytypes.SignalTraces,
			},
		},
		{
			TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
				Name:          urlPathKeyLegacy,
				FieldDataType: telemetrytypes.FieldDataTypeString,
				FieldContext:  telemetrytypes.FieldContextAttribute,
				Signal:        telemetrytypes.SignalTraces,
			},
		},
	},
}

func FilterIntermediateColumns(result *qbtypes.QueryRangeResponse) *qbtypes.QueryRangeResponse {
	if result == nil || result.Data.Results == nil {
		return result
	}

	for _, res := range result.Data.Results {
		scalarData, ok := res.(*qbtypes.ScalarData)
		if !ok {
			continue
		}

		// Filter out columns for intermediate queries used only in formulas
		filteredColumns := make([]*qbtypes.ColumnDescriptor, 0)
		intermediateQueryNames := map[string]bool{
			"error":      true,
			"total_span": true,
		}

		columnIndices := make([]int, 0)
		for i, col := range scalarData.Columns {
			if col.Type == qbtypes.ColumnTypeAggregation && intermediateQueryNames[col.QueryName] {
				// Skip intermediate aggregation columns
				continue
			}
			filteredColumns = append(filteredColumns, col)
			columnIndices = append(columnIndices, i)
		}

		// Filter data rows to match filtered columns
		filteredData := make([][]any, 0, len(scalarData.Data))
		for _, row := range scalarData.Data {
			filteredRow := make([]any, len(columnIndices))
			for newIdx, oldIdx := range columnIndices {
				if oldIdx < len(row) {
					filteredRow[newIdx] = row[oldIdx]
				}
			}
			filteredData = append(filteredData, filteredRow)
		}

		scalarData.Columns = filteredColumns
		scalarData.Data = filteredData
	}

	return result
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

		serverAddressKeyIdx := -1
		serverAddressKeyLegacyIdx := -1

		for i, col := range scalarData.Columns {
			if col.Name == serverAddressKey {
				serverAddressKeyIdx = i
			} else if col.Name == serverAddressKeyLegacy {
				serverAddressKeyLegacyIdx = i
			}
		}

		if serverAddressKeyIdx == -1 || serverAddressKeyLegacyIdx == -1 {
			continue
		}

		var newRows [][]any
		for _, row := range scalarData.Data {
			if len(row) <= serverAddressKeyIdx || len(row) <= serverAddressKeyLegacyIdx {
				continue
			}

			var serverName any
			if isValidValue(row[serverAddressKeyIdx]) {
				serverName = row[serverAddressKeyIdx]
			} else if isValidValue(row[serverAddressKeyLegacyIdx]) {
				serverName = row[serverAddressKeyLegacyIdx]
			}

			if serverName != nil {
				newRow := make([]any, len(row)-1)
				newRow[0] = serverName

				targetIdx := 1
				for i, val := range row {
					if i != serverAddressKeyLegacyIdx && i != serverAddressKeyIdx {
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
			if i == serverAddressKeyIdx {
				newCol := &qbtypes.ColumnDescriptor{
					TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
						Name:          serverAddressKeyLegacy,
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
			} else if i != serverAddressKeyLegacyIdx {
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

func shouldIncludeSeries(series *qbtypes.TimeSeries) bool {
	for _, label := range series.Labels {
		if label.Key.Name == serverAddressKeyLegacy || label.Key.Name == serverAddressKey {
			if strVal, ok := label.Value.(string); ok {
				if net.ParseIP(strVal) != nil {
					return false
				}
			}
		}
	}
	return true
}

func shouldIncludeRow(row *qbtypes.RawRow) bool {
	if row.Data != nil {
		for _, key := range []string{serverAddressKeyLegacy, serverAddressKey} {
			if domainVal, ok := row.Data[key]; ok {
				if domainStr, ok := domainVal.(string); ok {
					if net.ParseIP(domainStr) != nil {
						return false
					}
				}
			}
		}
	}
	return true
}

func containsKindStringOverride(expression string) bool {
	kindStringPattern := regexp.MustCompile(`kind_string\s*[!=<>]+`)
	return kindStringPattern.MatchString(expression)
}

func mergeGroupBy(base, additional []qbtypes.GroupByKey) []qbtypes.GroupByKey {
	return append(base, additional...)
}

func BuildDomainList(req *thirdpartyapitypes.ThirdPartyApiRequest) (*qbtypes.QueryRangeRequest, error) {
	if err := req.Validate(); err != nil {
		return nil, err
	}

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

func BuildDomainInfo(req *thirdpartyapitypes.ThirdPartyApiRequest) (*qbtypes.QueryRangeRequest, error) {
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

func buildEndpointsQuery(req *thirdpartyapitypes.ThirdPartyApiRequest) qbtypes.QueryEnvelope {
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
			GroupBy: mergeGroupBy(dualSemconvGroupByKeys["server"], req.GroupBy),
		},
	}
}

func buildLastSeenQuery(req *thirdpartyapitypes.ThirdPartyApiRequest) qbtypes.QueryEnvelope {
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
			GroupBy: mergeGroupBy(dualSemconvGroupByKeys["server"], req.GroupBy),
		},
	}
}

func buildRpsQuery(req *thirdpartyapitypes.ThirdPartyApiRequest) qbtypes.QueryEnvelope {
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
			GroupBy: mergeGroupBy(dualSemconvGroupByKeys["server"], req.GroupBy),
		},
	}
}

func buildErrorQuery(req *thirdpartyapitypes.ThirdPartyApiRequest) qbtypes.QueryEnvelope {
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
			GroupBy: mergeGroupBy(dualSemconvGroupByKeys["server"], req.GroupBy),
		},
	}
}

func buildTotalSpanQuery(req *thirdpartyapitypes.ThirdPartyApiRequest) qbtypes.QueryEnvelope {
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
			GroupBy: mergeGroupBy(dualSemconvGroupByKeys["server"], req.GroupBy),
		},
	}
}

func buildP99Query(req *thirdpartyapitypes.ThirdPartyApiRequest) qbtypes.QueryEnvelope {
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
			GroupBy: mergeGroupBy(dualSemconvGroupByKeys["server"], req.GroupBy),
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

func buildEndpointsInfoQuery(req *thirdpartyapitypes.ThirdPartyApiRequest) qbtypes.QueryEnvelope {
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
			GroupBy: mergeGroupBy(dualSemconvGroupByKeys["url"], req.GroupBy),
		},
	}
}

func buildP99InfoQuery(req *thirdpartyapitypes.ThirdPartyApiRequest) qbtypes.QueryEnvelope {
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

func buildErrorRateInfoQuery(req *thirdpartyapitypes.ThirdPartyApiRequest) qbtypes.QueryEnvelope {
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

func buildLastSeenInfoQuery(req *thirdpartyapitypes.ThirdPartyApiRequest) qbtypes.QueryEnvelope {
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

func buildBaseFilter(additionalFilter *qbtypes.Filter) *qbtypes.Filter {
	baseExpression := fmt.Sprintf("(%s EXISTS OR %s EXISTS) AND kind_string = 'Client'",
		urlPathKeyLegacy, urlPathKey)

	if additionalFilter != nil && additionalFilter.Expression != "" {
		if containsKindStringOverride(additionalFilter.Expression) {
			return &qbtypes.Filter{Expression: baseExpression}
		}
		baseExpression = fmt.Sprintf("(%s) AND (%s)", baseExpression, additionalFilter.Expression)
	}

	return &qbtypes.Filter{Expression: baseExpression}
}

func buildErrorFilter(additionalFilter *qbtypes.Filter) *qbtypes.Filter {
	errorExpression := fmt.Sprintf("has_error = true AND (%s EXISTS OR %s EXISTS) AND kind_string = 'Client'",
		urlPathKeyLegacy, urlPathKey)

	if additionalFilter != nil && additionalFilter.Expression != "" {
		if containsKindStringOverride(additionalFilter.Expression) {
			return &qbtypes.Filter{Expression: errorExpression}
		}
		errorExpression = fmt.Sprintf("(%s) AND (%s)", errorExpression, additionalFilter.Expression)
	}

	return &qbtypes.Filter{Expression: errorExpression}
}

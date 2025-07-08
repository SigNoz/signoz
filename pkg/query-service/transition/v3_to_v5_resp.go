package transition

import (
	"encoding/json"
	"fmt"
	"sort"
	"strings"

	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	v5 "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

func ConvertV3ResponseToV5(v3Response *v3.QueryRangeResponse, requestType v5.RequestType) (*v5.QueryRangeResponse, error) {
	if v3Response == nil {
		return nil, fmt.Errorf("v3 response is nil")
	}

	v5Response := &v5.QueryRangeResponse{
		Type: requestType,
	}

	switch requestType {
	case v5.RequestTypeTimeSeries:
		data, err := convertToTimeSeriesData(v3Response.Result)
		if err != nil {
			return nil, err
		}
		v5Response.Data = data

	case v5.RequestTypeScalar:
		data, err := convertToScalarData(v3Response.Result)
		if err != nil {
			return nil, err
		}
		v5Response.Data = data

	case v5.RequestTypeRaw:
		data, err := convertToRawData(v3Response.Result)
		if err != nil {
			return nil, err
		}
		v5Response.Data = data

	default:
		return nil, fmt.Errorf("unsupported request type: %v", requestType)
	}

	return v5Response, nil
}

func convertToTimeSeriesData(v3Results []*v3.Result) ([]*v5.TimeSeriesData, error) {
	v5Data := []*v5.TimeSeriesData{}

	for _, result := range v3Results {
		if result == nil {
			continue
		}

		tsData := &v5.TimeSeriesData{
			QueryName:    result.QueryName,
			Aggregations: []*v5.AggregationBucket{},
		}

		if len(result.Series) > 0 {
			bucket := &v5.AggregationBucket{
				Index:  0,
				Alias:  "",
				Series: convertSeries(result.Series),
			}
			tsData.Aggregations = append(tsData.Aggregations, bucket)
		}

		v5Data = append(v5Data, tsData)
	}

	return v5Data, nil
}

func convertSeries(v3Series []*v3.Series) []*v5.TimeSeries {
	v5Series := []*v5.TimeSeries{}

	for _, series := range v3Series {
		if series == nil {
			continue
		}

		v5TimeSeries := &v5.TimeSeries{
			Labels: convertLabels(series.Labels),
			Values: convertPoints(series.Points),
		}

		v5Series = append(v5Series, v5TimeSeries)
	}

	return v5Series
}

func convertLabels(v3Labels map[string]string) []*v5.Label {
	v5Labels := []*v5.Label{}

	keys := make([]string, 0, len(v3Labels))
	for k := range v3Labels {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	for _, key := range keys {
		v5Labels = append(v5Labels, &v5.Label{
			Key: telemetrytypes.TelemetryFieldKey{
				Name: key,
			},
			Value: v3Labels[key],
		})
	}

	return v5Labels
}

func convertPoints(v3Points []v3.Point) []*v5.TimeSeriesValue {
	v5Values := []*v5.TimeSeriesValue{}

	for _, point := range v3Points {
		v5Values = append(v5Values, &v5.TimeSeriesValue{
			Timestamp: point.Timestamp,
			Value:     point.Value,
		})
	}

	return v5Values
}

func convertToScalarData(v3Results []*v3.Result) (*v5.ScalarData, error) {
	scalarData := &v5.ScalarData{
		Columns: []*v5.ColumnDescriptor{},
		Data:    [][]any{},
	}

	for _, result := range v3Results {
		if result == nil || result.Table == nil {
			continue
		}

		for _, col := range result.Table.Columns {
			columnType := v5.ColumnTypeGroup
			if col.IsValueColumn {
				columnType = v5.ColumnTypeAggregation
			}

			scalarData.Columns = append(scalarData.Columns, &v5.ColumnDescriptor{
				TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
					Name: col.Name,
				},
				QueryName:        col.QueryName,
				AggregationIndex: 0,
				Type:             columnType,
			})
		}

		for _, row := range result.Table.Rows {
			rowData := []any{}
			for _, col := range result.Table.Columns {
				if val, ok := row.Data[col.Name]; ok {
					rowData = append(rowData, val)
				} else {
					rowData = append(rowData, nil)
				}
			}
			scalarData.Data = append(scalarData.Data, rowData)
		}
	}

	return scalarData, nil
}

func convertToRawData(v3Results []*v3.Result) ([]*v5.RawData, error) {
	v5Data := []*v5.RawData{}

	for _, result := range v3Results {
		if result == nil {
			continue
		}

		rawData := &v5.RawData{
			QueryName:  result.QueryName,
			NextCursor: "",
			Rows:       []*v5.RawRow{},
		}

		for _, row := range result.List {
			if row == nil {
				continue
			}

			dataMap := make(map[string]*any)
			for k, v := range row.Data {
				val := v
				dataMap[k] = &val
			}

			rawData.Rows = append(rawData.Rows, &v5.RawRow{
				Timestamp: row.Timestamp,
				Data:      dataMap,
			})
		}

		v5Data = append(v5Data, rawData)
	}

	return v5Data, nil
}

func LogV5Response(response *v5.QueryRangeResponse, logger func(string)) {
	if response == nil {
		logger("Response: nil")
		return
	}

	logger(fmt.Sprintf("[%s] Meta{rows:%d bytes:%d ms:%d}",
		response.Type, response.Meta.RowsScanned, response.Meta.BytesScanned, response.Meta.DurationMS))

	switch response.Type {
	case v5.RequestTypeTimeSeries:
		logTimeSeriesDataCompact(response.Data, logger)
	case v5.RequestTypeScalar:
		logScalarDataCompact(response.Data, logger)
	case v5.RequestTypeRaw:
		logRawDataCompact(response.Data, logger)
	default:
		logger(fmt.Sprintf("Unknown response type: %v", response.Type))
	}
}

func logTimeSeriesDataCompact(data any, logger func(string)) {
	tsData, ok := data.([]*v5.TimeSeriesData)
	if !ok {
		logger("ERROR: Failed to cast data to TimeSeriesData")
		return
	}

	sort.Slice(tsData, func(i, j int) bool {
		return tsData[i].QueryName < tsData[j].QueryName
	})

	for _, ts := range tsData {
		allSeries := flattenSeries(ts.Aggregations)

		sort.Slice(allSeries, func(i, j int) bool {
			return createLabelSignature(allSeries[i].Labels) < createLabelSignature(allSeries[j].Labels)
		})

		for _, series := range allSeries {
			labels := []string{}
			for _, label := range series.Labels {
				labels = append(labels, fmt.Sprintf("%s:%v", label.Key.Name, label.Value))
			}
			labelStr := strings.Join(labels, ",")

			values := make([]*v5.TimeSeriesValue, len(series.Values))
			copy(values, series.Values)
			sort.Slice(values, func(i, j int) bool {
				return values[i].Timestamp < values[j].Timestamp
			})

			valueStrs := []string{}
			for _, val := range values {
				relTime := val.Timestamp
				if len(values) > 0 && values[0].Timestamp > 0 {
					relTime = (val.Timestamp - values[0].Timestamp) / 1000 // Convert to seconds
				}
				valueStrs = append(valueStrs, fmt.Sprintf("%d:%.2f", relTime, val.Value))
			}

			logger(fmt.Sprintf("%s {%s} [%s]", ts.QueryName, labelStr, strings.Join(valueStrs, " ")))
		}
	}
}

func createLabelSignature(labels []*v5.Label) string {
	parts := []string{}
	for _, label := range labels {
		parts = append(parts, fmt.Sprintf("%s=%v", label.Key.Name, label.Value))
	}
	sort.Strings(parts)
	return strings.Join(parts, ",")
}

func logScalarDataCompact(data any, logger func(string)) {
	scalar, ok := data.(*v5.ScalarData)
	if !ok {
		logger("ERROR: Failed to cast data to ScalarData")
		return
	}

	colNames := []string{}
	for _, col := range scalar.Columns {
		colNames = append(colNames, col.Name)
	}

	logger(fmt.Sprintf("SCALAR [%s]", strings.Join(colNames, "|")))

	for i, row := range scalar.Data {
		rowVals := []string{}
		for _, val := range row {
			rowVals = append(rowVals, fmt.Sprintf("%v", val))
		}
		logger(fmt.Sprintf("  %d: [%s]", i, strings.Join(rowVals, "|")))
	}
}

func flattenSeries(buckets []*v5.AggregationBucket) []*v5.TimeSeries {
	var allSeries []*v5.TimeSeries
	for _, bucket := range buckets {
		allSeries = append(allSeries, bucket.Series...)
	}
	return allSeries
}

func logRawDataCompact(data any, logger func(string)) {
	rawData, ok := data.([]*v5.RawData)
	if !ok {
		logger("ERROR: Failed to cast data to RawData")
		return
	}

	sort.Slice(rawData, func(i, j int) bool {
		return rawData[i].QueryName < rawData[j].QueryName
	})

	for _, rd := range rawData {
		logger(fmt.Sprintf("RAW %s (rows:%d cursor:%s)", rd.QueryName, len(rd.Rows), rd.NextCursor))

		rows := make([]*v5.RawRow, len(rd.Rows))
		copy(rows, rd.Rows)
		sort.Slice(rows, func(i, j int) bool {
			return rows[i].Timestamp.Before(rows[j].Timestamp)
		})

		allFields := make(map[string]bool)
		for _, row := range rows {
			for k := range row.Data {
				allFields[k] = true
			}
		}

		fieldNames := []string{}
		for k := range allFields {
			fieldNames = append(fieldNames, k)
		}
		sort.Strings(fieldNames)

		logger(fmt.Sprintf("  Fields: [%s]", strings.Join(fieldNames, "|")))

		for i, row := range rows {
			vals := []string{}
			for _, field := range fieldNames {
				if val, exists := row.Data[field]; exists && val != nil {
					vals = append(vals, fmt.Sprintf("%v", *val))
				} else {
					vals = append(vals, "-")
				}
			}
			tsStr := row.Timestamp.Format("15:04:05")
			logger(fmt.Sprintf("  %d@%s: [%s]", i, tsStr, strings.Join(vals, "|")))
		}
	}
}

func LogV5ResponseJSON(response *v5.QueryRangeResponse, logger func(string)) {
	sortedResponse := sortV5ResponseForLogging(response)

	jsonBytes, err := json.MarshalIndent(sortedResponse, "", "  ")
	if err != nil {
		logger(fmt.Sprintf("ERROR: Failed to marshal response: %v", err))
		return
	}

	logger(string(jsonBytes))
}

func sortV5ResponseForLogging(response *v5.QueryRangeResponse) *v5.QueryRangeResponse {
	if response == nil {
		return nil
	}

	responseCopy := &v5.QueryRangeResponse{
		Type: response.Type,
		Meta: response.Meta,
	}

	switch response.Type {
	case v5.RequestTypeTimeSeries:
		if tsData, ok := response.Data.([]*v5.TimeSeriesData); ok {
			sortedData := make([]*v5.TimeSeriesData, len(tsData))
			for i, ts := range tsData {
				sortedData[i] = &v5.TimeSeriesData{
					QueryName:    ts.QueryName,
					Aggregations: make([]*v5.AggregationBucket, len(ts.Aggregations)),
				}

				for j, bucket := range ts.Aggregations {
					sortedBucket := &v5.AggregationBucket{
						Index:  bucket.Index,
						Alias:  bucket.Alias,
						Series: make([]*v5.TimeSeries, len(bucket.Series)),
					}

					for k, series := range bucket.Series {
						sortedSeries := &v5.TimeSeries{
							Labels: series.Labels,
							Values: make([]*v5.TimeSeriesValue, len(series.Values)),
						}
						copy(sortedSeries.Values, series.Values)

						sort.Slice(sortedSeries.Values, func(i, j int) bool {
							return sortedSeries.Values[i].Timestamp < sortedSeries.Values[j].Timestamp
						})

						sortedBucket.Series[k] = sortedSeries
					}

					sort.Slice(sortedBucket.Series, func(i, j int) bool {
						return createLabelSignature(sortedBucket.Series[i].Labels) <
							createLabelSignature(sortedBucket.Series[j].Labels)
					})

					sortedData[i].Aggregations[j] = sortedBucket
				}
			}

			sort.Slice(sortedData, func(i, j int) bool {
				return sortedData[i].QueryName < sortedData[j].QueryName
			})

			responseCopy.Data = sortedData
		}
	default:
		responseCopy.Data = response.Data
	}

	return responseCopy
}

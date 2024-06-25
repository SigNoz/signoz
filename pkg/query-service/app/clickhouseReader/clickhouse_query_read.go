package clickhouseReader

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"reflect"
	"sort"
	"strings"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/utils"
	"go.uber.org/zap"
)

func readRowForMultiSeries(vars []interface{}, columnNames []string) ([]string, map[string]string, []map[string]string, []v3.NumberColumn) {
	// Each row will have a value and a timestamp, and an optional list of label values
	// example: {Timestamp: ..., Value: ...}
	// The timestamp may also not present in some cases where the time series is reduced to single value
	var valueCols []v3.NumberColumn

	// groupBy is a container to hold label values for the current point
	// example: ["frontend", "/fetch"]
	var groupBy []string

	var groupAttributesArray []map[string]string
	// groupAttributes is a container to hold the key-value pairs for the current
	// metric point.
	// example: {"serviceName": "frontend", "operation": "/fetch"}
	groupAttributes := make(map[string]string)

	var ts int64

	for idx, v := range vars {
		colName := columnNames[idx]
		switch v := v.(type) {
		case *string:
			// special case for returning all labels in metrics datasource
			if colName == "fullLabels" {
				var metric map[string]string
				err := json.Unmarshal([]byte(*v), &metric)
				if err != nil {
					zap.L().Error("unexpected error encountered", zap.Error(err))
				}
				for key, val := range metric {
					groupBy = append(groupBy, val)
					if _, ok := groupAttributes[key]; !ok {
						groupAttributesArray = append(groupAttributesArray, map[string]string{key: val})
					}
					groupAttributes[key] = val
				}
			} else {
				groupBy = append(groupBy, *v)
				if _, ok := groupAttributes[colName]; !ok {
					groupAttributesArray = append(groupAttributesArray, map[string]string{colName: *v})
				}
				groupAttributes[colName] = *v
			}
		case *time.Time:
			ts = v.UnixMilli()
		case *float64, *float32:
			valueCols = append(valueCols, v3.NumberColumn{
				Name:  colName,
				Value: float64(reflect.ValueOf(v).Elem().Float()),
			})
		case *uint, *uint8, *uint64, *uint16, *uint32:
			valueCols = append(valueCols, v3.NumberColumn{
				Name:  colName,
				Value: float64(reflect.ValueOf(v).Elem().Uint()),
			})

		case *int, *int8, *int16, *int32, *int64:
			valueCols = append(valueCols, v3.NumberColumn{
				Name:  colName,
				Value: float64(reflect.ValueOf(v).Elem().Int()),
			})
		case *bool:
			groupBy = append(groupBy, fmt.Sprintf("%v", *v))
			if _, ok := groupAttributes[colName]; !ok {
				groupAttributesArray = append(groupAttributesArray, map[string]string{colName: fmt.Sprintf("%v", *v)})
			}
			groupAttributes[colName] = fmt.Sprintf("%v", *v)

		default:
			zap.L().Error("unsupported var type found in query builder query result", zap.Any("v", v), zap.String("colName", colName))
		}
	}
	for idx := range valueCols {
		valueCols[idx].Timestamp = ts
	}
	return groupBy, groupAttributes, groupAttributesArray, valueCols
}

func readRowsForResult(rows driver.Rows, vars []interface{}, columnNames []string) ([]*v3.Series, error) {
	// when groupBy is applied, each combination of cartesian product
	// of attribute values is a separate series. Each item in seriesToPoints
	// represent a unique series where the key is sorted attribute values joined
	// by "," and the value is the list of points for that series

	// For instance, group by (serviceName, operation)
	// with two services and three operations in each will result in (maximum of) 6 series
	// ("frontend", "order") x ("/fetch", "/fetch/{Id}", "/order")
	//
	// ("frontend", "/fetch")
	// ("frontend", "/fetch/{Id}")
	// ("frontend", "/order")
	// ("order", "/fetch")
	// ("order", "/fetch/{Id}")
	// ("order", "/order")
	seriesToPoints := make(map[string]map[string][]v3.NumberColumn)
	var keys []string
	// seriesToAttrs is a mapping of key to a map of attribute key to attribute value
	// for each series. This is used to populate the series' attributes
	// For instance, for the above example, the seriesToAttrs will be
	// {
	//   "frontend,/fetch": {"serviceName": "frontend", "operation": "/fetch"},
	//   "frontend,/fetch/{Id}": {"serviceName": "frontend", "operation": "/fetch/{Id}"},
	//   "frontend,/order": {"serviceName": "frontend", "operation": "/order"},
	//   "order,/fetch": {"serviceName": "order", "operation": "/fetch"},
	//   "order,/fetch/{Id}": {"serviceName": "order", "operation": "/fetch/{Id}"},
	//   "order,/order": {"serviceName": "order", "operation": "/order"},
	// }
	seriesToAttrs := make(map[string]map[string]string)
	labelsArray := make(map[string][]map[string]string)
	for rows.Next() {
		if err := rows.Scan(vars...); err != nil {
			fmt.Println("err", err)
			return nil, err
		}
		groupBy, groupAttributes, groupAttributesArray, valCols := readRowForMultiSeries(vars, columnNames)

		sort.Strings(groupBy)
		key := strings.Join(groupBy, "")
		if _, exists := seriesToAttrs[key]; !exists {
			keys = append(keys, key)
		}
		seriesToAttrs[key] = groupAttributes
		labelsArray[key] = groupAttributesArray
		if _, ok := seriesToPoints[key]; !ok {
			seriesToPoints[key] = make(map[string][]v3.NumberColumn)
		}
		for idx := range valCols {
			valCol := valCols[idx]
			if !math.IsNaN(valCol.Value) && !math.IsInf(valCol.Value, 0) {
				seriesToPoints[key][valCol.Name] = append(seriesToPoints[key][valCol.Name], valCol)
			}
		}
	}

	var seriesList []*v3.Series
	for _, key := range keys {
		cols := seriesToPoints[key]
		for name, valCols := range cols {
			series := v3.Series{Title: name, Labels: seriesToAttrs[key], LabelsArray: labelsArray[key]}
			points := make([]v3.Point, 0)
			for _, valCol := range valCols {
				points = append(points, v3.Point{Timestamp: valCol.Timestamp, Value: valCol.Value})
			}
			series.Points = points
			seriesList = append(seriesList, &series)
		}
	}
	return seriesList, getPersonalisedError(rows.Err())
}

// GetClickHouseResult runs the query and returns list of time series
func (r *ClickHouseReader) GetClickHouseResult(ctx context.Context, query string) ([]*v3.Series, error) {

	ctxArgs := map[string]interface{}{"query": query}
	for k, v := range logCommentKVs(ctx) {
		ctxArgs[k] = v
	}

	defer utils.Elapsed("GetClickHouseResult", ctxArgs)()

	rows, err := r.db.Query(ctx, query)

	if err != nil {
		zap.L().Error("error while reading time series result", zap.Error(err))
		return nil, err
	}
	defer rows.Close()

	var (
		columnTypes = rows.ColumnTypes()
		columnNames = rows.Columns()
		vars        = make([]interface{}, len(columnTypes))
	)

	for i := range columnTypes {
		vars[i] = reflect.New(columnTypes[i].ScanType()).Interface()
	}

	return readRowsForResult(rows, vars, columnNames)
}

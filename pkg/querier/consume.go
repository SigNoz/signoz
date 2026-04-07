package querier

import (
	"fmt"
	"math"
	"reflect"
	"regexp"
	"slices"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

var (
	aggRe = regexp.MustCompile(`^__result_(\d+)$`)
	// legacyReservedColumnTargetAliases identifies result value from a user
	// written clickhouse query. The column alias indcate which value is
	// to be considered as final result (or target).
	legacyReservedColumnTargetAliases = []string{"__result", "__value", "result", "res", "value"}
)

// consume reads every row and shapes it into the payload expected for the
// given request type.
//
// * Time-series - *qbtypes.TimeSeriesData
// * Scalar      - *qbtypes.ScalarData
// * Raw         - *qbtypes.RawData
// * Distribution- *qbtypes.DistributionData.
func consume(rows driver.Rows, kind qbtypes.RequestType, queryWindow *qbtypes.TimeRange, step qbtypes.Step, queryName string) (any, error) {
	var (
		payload any
		err     error
	)

	switch kind {
	case qbtypes.RequestTypeTimeSeries:
		payload, err = readAsTimeSeries(rows, queryWindow, step, queryName)
	case qbtypes.RequestTypeScalar:
		payload, err = readAsScalar(rows, queryName)
	case qbtypes.RequestTypeRaw, qbtypes.RequestTypeTrace, qbtypes.RequestTypeRawStream:
		payload, err = readAsRaw(rows, queryName)
		// TODO: add support for other request types
	}

	return payload, err
}

func readAsTimeSeries(rows driver.Rows, queryWindow *qbtypes.TimeRange, step qbtypes.Step, queryName string) (*qbtypes.TimeSeriesData, error) {
	colTypes := rows.ColumnTypes()
	colNames := rows.Columns()

	slots := make([]any, len(colTypes))
	numericColsCount := 0
	for i, ct := range colTypes {
		slots[i] = reflect.New(ct.ScanType()).Interface()
		if numericKind(ct.ScanType().Kind()) {
			numericColsCount++
		}
	}

	type sKey struct {
		agg int
		key string // deterministic join of label values
	}
	seriesMap := map[sKey]*qbtypes.TimeSeries{}

	stepMs := uint64(step.Milliseconds())

	// Helper function to check if a timestamp represents a partial value
	isPartialValue := func(timestamp int64) bool {
		if stepMs == 0 || queryWindow == nil {
			return false
		}

		timestampMs := uint64(timestamp)

		// For the first interval, check if query start is misaligned
		// The first complete interval starts at the first timestamp >= queryWindow.From that is aligned to step
		firstCompleteInterval := queryWindow.From
		if queryWindow.From%stepMs != 0 {
			// Round up to next step boundary
			firstCompleteInterval = ((queryWindow.From / stepMs) + 1) * stepMs
		}

		// If timestamp is before the first complete interval, it's partial
		if timestampMs < firstCompleteInterval {
			return true
		}

		// For the last interval, check if it would extend beyond query end
		if timestampMs+stepMs > queryWindow.To {
			return queryWindow.To%stepMs != 0
		}

		return false
	}

	// Pre-allocate for labels based on column count
	lblValsCapacity := len(colNames) - 1 // -1 for timestamp
	if lblValsCapacity < 0 {
		lblValsCapacity = 0
	}

	for rows.Next() {
		if err := rows.Scan(slots...); err != nil {
			return nil, err
		}

		var (
			ts            int64
			lblVals       = make([]string, 0, lblValsCapacity)
			lblObjs       = make([]*qbtypes.Label, 0, lblValsCapacity)
			aggValues     = map[int]float64{} // all __result_N in this row
			fallbackValue float64             // value when NO __result_N columns exist
			fallbackSeen  bool
		)

		for idx, ptr := range slots {
			key := telemetrytypes.GetFieldKeyFromCanonicalName(colNames[idx])
			// Remove the data type and field context to make it generic
			key = telemetrytypes.TelemetryFieldKey{Name: key.Name}

			switch v := ptr.(type) {
			case *time.Time:
				ts = v.UnixMilli()

			case *float64, *float32, *int64, *int32, *uint64, *uint32:
				val := numericAsFloat(reflect.ValueOf(ptr).Elem().Interface())
				if m := aggRe.FindStringSubmatch(key.Name); m != nil {
					id, _ := strconv.Atoi(m[1])
					aggValues[id] = val
				} else if numericColsCount == 1 { // classic single-value query
					fallbackValue = val
					fallbackSeen = true
				} else if slices.Contains(legacyReservedColumnTargetAliases, key.Name) {
					fallbackValue = val
					fallbackSeen = true
				} else {
					// numeric label
					lblVals = append(lblVals, fmt.Sprint(val))
					lblObjs = append(lblObjs, &qbtypes.Label{
						Key:   key,
						Value: val,
					})
				}

			case **float64, **float32, **int64, **int32, **uint64, **uint32:
				tempVal := reflect.ValueOf(ptr)
				if tempVal.IsValid() && !tempVal.IsNil() && !tempVal.Elem().IsNil() {
					val := numericAsFloat(tempVal.Elem().Elem().Interface())
					if m := aggRe.FindStringSubmatch(key.Name); m != nil {
						id, _ := strconv.Atoi(m[1])
						aggValues[id] = val
					} else if numericColsCount == 1 { // classic single-value query
						fallbackValue = val
						fallbackSeen = true
					} else if slices.Contains(legacyReservedColumnTargetAliases, key.Name) {
						fallbackValue = val
						fallbackSeen = true
					} else {
						// numeric label
						lblVals = append(lblVals, fmt.Sprint(val))
						lblObjs = append(lblObjs, &qbtypes.Label{
							Key:   key,
							Value: val,
						})
					}
				}

			case *string:
				lblVals = append(lblVals, *v)
				lblObjs = append(lblObjs, &qbtypes.Label{
					Key:   key,
					Value: *v,
				})

			case **string:
				val := *v
				if val == nil {
					var empty string
					val = &empty
				}
				lblVals = append(lblVals, *val)
				lblObjs = append(lblObjs, &qbtypes.Label{
					Key:   key,
					Value: *val,
				})

			default:
				continue
			}
		}

		// Edge-case: no __result_N columns, but a single numeric column present
		if len(aggValues) == 0 && fallbackSeen {
			aggValues[0] = fallbackValue
		}

		if ts == 0 || len(aggValues) == 0 {
			continue // nothing useful
		}

		sort.Strings(lblVals)
		labelsKey := strings.Join(lblVals, ",")

		// one point per aggregation in this row
		for aggIdx, val := range aggValues {
			if math.IsNaN(val) || math.IsInf(val, 0) {
				continue
			}

			key := sKey{agg: aggIdx, key: labelsKey}

			series, ok := seriesMap[key]
			if !ok {
				series = &qbtypes.TimeSeries{Labels: lblObjs}
				seriesMap[key] = series
			}
			series.Values = append(series.Values, &qbtypes.TimeSeriesValue{
				Timestamp: ts,
				Value:     val,
				Partial:   isPartialValue(ts),
			})
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	maxAgg := -1
	for k := range seriesMap {
		if k.agg > maxAgg {
			maxAgg = k.agg
		}
	}
	if maxAgg < 0 {
		return &qbtypes.TimeSeriesData{
			QueryName: queryName,
		}, nil
	}

	buckets := make([]*qbtypes.AggregationBucket, maxAgg+1)
	for i := range buckets {
		buckets[i] = &qbtypes.AggregationBucket{
			Index: i,
			Alias: "__result_" + strconv.Itoa(i),
		}
	}
	for k, s := range seriesMap {
		buckets[k.agg].Series = append(buckets[k.agg].Series, s)
	}

	var nonEmpty []*qbtypes.AggregationBucket
	for _, b := range buckets {
		if len(b.Series) > 0 {
			nonEmpty = append(nonEmpty, b)
		}
	}

	return &qbtypes.TimeSeriesData{
		QueryName:    queryName,
		Aggregations: nonEmpty,
	}, nil
}

func numericKind(k reflect.Kind) bool {
	switch k {
	case reflect.Float32, reflect.Float64,
		reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64,
		reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
		return true
	default:
		return false
	}
}

func readAsScalar(rows driver.Rows, queryName string) (*qbtypes.ScalarData, error) {
	colNames := rows.Columns()
	colTypes := rows.ColumnTypes()

	cd := make([]*qbtypes.ColumnDescriptor, len(colNames))

	var aggIndex int64
	for i, name := range colNames {
		key := telemetrytypes.GetFieldKeyFromCanonicalName(name)
		// Remove the data type and field context to make it generic
		key = telemetrytypes.TelemetryFieldKey{Name: key.Name}

		colType := qbtypes.ColumnTypeGroup
		if aggRe.MatchString(key.Name) {
			colType = qbtypes.ColumnTypeAggregation
		}
		cd[i] = &qbtypes.ColumnDescriptor{
			TelemetryFieldKey: key,
			QueryName:         queryName,
			AggregationIndex:  aggIndex,
			Type:              colType,
		}
		if colType == qbtypes.ColumnTypeAggregation {
			aggIndex++
		}
	}

	// Pre-allocate scan slots once
	scan := make([]any, len(colTypes))
	for i := range scan {
		scan[i] = reflect.New(colTypes[i].ScanType()).Interface()
	}

	var data [][]any

	for rows.Next() {
		if err := rows.Scan(scan...); err != nil {
			return nil, err
		}

		// 2. deref each slot into the output row
		row := make([]any, len(scan))
		for i, cell := range scan {
			row[i] = derefValue(cell)
		}
		data = append(data, row)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return &qbtypes.ScalarData{
		QueryName: queryName,
		Columns:   cd,
		Data:      data,
	}, nil
}

func derefValue(v any) any {
	if v == nil {
		return nil
	}

	val := reflect.ValueOf(v)

	for val.Kind() == reflect.Ptr {
		if val.IsNil() {
			return nil
		}
		val = val.Elem()
	}

	return val.Interface()
}

func readAsRaw(rows driver.Rows, queryName string) (*qbtypes.RawData, error) {
	colNames := rows.Columns()
	colTypes := rows.ColumnTypes()
	colCnt := len(colNames)

	// Compute output names with collision detection — if two columns resolve to
	// the same simple name, the later one falls back to key.Text().
	seen := make(map[string]bool, colCnt)
	outputNames := make([]string, colCnt)
	for i, colName := range colNames {
		key := telemetrytypes.GetFieldKeyFromCanonicalName(colName)
		name := key.Name
		if seen[name] {
			name = key.Text()
		}
		seen[name] = true
		outputNames[i] = name
	}

	// Detect which column carries the row timestamp.
	// Prefer the canonical timestamp field; fall back to legacy columns.
	tsIdx := -1
	for i, colName := range colNames {
		if colName == "log;timestamp;number" || colName == "span;timestamp;number" {
			tsIdx = i
			break
		}
	}
	if tsIdx == -1 {
		for i, colName := range colNames {
			if colName == "timestamp" || colName == "timestamp_datetime" {
				tsIdx = i
				break
			}
		}
	}

	// Pre-compute per-column JSON flags.
	isJSON := make([]bool, colCnt)
	for i, colType := range colTypes {
		dbt := strings.ToUpper(colType.DatabaseTypeName())
		// Since the driver fails to decode JSON/Dynamic into native Go values, we read it as raw bytes
		// TODO: check in future if fixed in the driver
		isJSON[i] = strings.HasPrefix(dbt, "JSON")
	}

	scan := make([]any, colCnt)
	var outRows []*qbtypes.RawRow

	for rows.Next() {
		// Allocate fresh scan targets each row so the driver does not overwrite
		// values from the previous row.
		for i, colType := range colTypes {
			if isJSON[i] {
				var v []byte
				scan[i] = &v
			} else {
				scan[i] = reflect.New(colType.ScanType()).Interface()
			}
		}

		if err := rows.Scan(scan...); err != nil {
			return nil, err
		}

		rr := qbtypes.RawRow{
			Data: make(map[string]any, colCnt),
		}

		for i, cellPtr := range scan {
			if isJSON[i] {
				b := *cellPtr.(*[]byte)
				rr.Data[outputNames[i]] = string(b)
				continue
			}

			val := reflect.ValueOf(cellPtr).Elem().Interface()

			if i == tsIdx {
				switch tv := val.(type) {
				case time.Time:
					rr.Timestamp = tv
				case uint64:
					rr.Timestamp = time.Unix(0, int64(tv))
				case int64:
					rr.Timestamp = time.Unix(0, tv)
				}
			}

			rr.Data[outputNames[i]] = val
		}

		outRows = append(outRows, &rr)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return &qbtypes.RawData{
		QueryName: queryName,
		Rows:      outRows,
	}, nil
}

// numericAsFloat converts numeric types to float64 efficiently.
func numericAsFloat(v any) float64 {
	switch x := v.(type) {
	case float64:
		return x
	case int64:
		return float64(x)
	case float32:
		return float64(x)
	case int32:
		return float64(x)
	case uint64:
		return float64(x)
	case uint32:
		return float64(x)
	case int:
		return float64(x)
	case uint:
		return float64(x)
	case int16:
		return float64(x)
	case int8:
		return float64(x)
	case uint16:
		return float64(x)
	case uint8:
		return float64(x)
	default:
		return math.NaN()
	}
}

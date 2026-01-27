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
	"github.com/bytedance/sonic"
)

var (
	aggRe = regexp.MustCompile(`^__result_(\d+)$`)
	// legacyReservedColumnTargetAliases identifies result value from a user
	// written clickhouse query. The column alias indcate which value is
	// to be considered as final result (or target)
	legacyReservedColumnTargetAliases = []string{"__result", "__value", "result", "res", "value"}
)

// consume reads every row and shapes it into the payload expected for the
// given request type.
//
// * Time-series - *qbtypes.TimeSeriesData
// * Scalar      - *qbtypes.ScalarData
// * Raw         - *qbtypes.RawData
// * Distribution- *qbtypes.DistributionData
func consume(rows driver.Rows, kind qbtypes.RequestType, queryWindow *qbtypes.TimeRange, step qbtypes.Step, queryName string, bucketCount int) (any, error) {
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
	case qbtypes.RequestTypeDistribution:
		payload, err = readAsDistribution(rows, queryName, bucketCount)
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

	stepMs := uint64(step.Duration.Milliseconds())

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
			name := colNames[idx]

			switch v := ptr.(type) {
			case *time.Time:
				ts = v.UnixMilli()

			case *float64, *float32, *int64, *int32, *uint64, *uint32:
				val := numericAsFloat(reflect.ValueOf(ptr).Elem().Interface())
				if m := aggRe.FindStringSubmatch(name); m != nil {
					id, _ := strconv.Atoi(m[1])
					aggValues[id] = val
				} else if numericColsCount == 1 { // classic single-value query
					fallbackValue = val
					fallbackSeen = true
				} else if slices.Contains(legacyReservedColumnTargetAliases, name) {
					fallbackValue = val
					fallbackSeen = true
				} else {
					// numeric label
					lblVals = append(lblVals, fmt.Sprint(val))
					lblObjs = append(lblObjs, &qbtypes.Label{
						Key:   telemetrytypes.TelemetryFieldKey{Name: name},
						Value: val,
					})
				}

			case **float64, **float32, **int64, **int32, **uint64, **uint32:
				tempVal := reflect.ValueOf(ptr)
				if tempVal.IsValid() && !tempVal.IsNil() && !tempVal.Elem().IsNil() {
					val := numericAsFloat(tempVal.Elem().Elem().Interface())
					if m := aggRe.FindStringSubmatch(name); m != nil {
						id, _ := strconv.Atoi(m[1])
						aggValues[id] = val
					} else if numericColsCount == 1 { // classic single-value query
						fallbackValue = val
						fallbackSeen = true
					} else if slices.Contains(legacyReservedColumnTargetAliases, name) {
						fallbackValue = val
						fallbackSeen = true
					} else {
						// numeric label
						lblVals = append(lblVals, fmt.Sprint(val))
						lblObjs = append(lblObjs, &qbtypes.Label{
							Key:   telemetrytypes.TelemetryFieldKey{Name: name},
							Value: val,
						})
					}
				}

			case *string:
				lblVals = append(lblVals, *v)
				lblObjs = append(lblObjs, &qbtypes.Label{
					Key:   telemetrytypes.TelemetryFieldKey{Name: name},
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
					Key:   telemetrytypes.TelemetryFieldKey{Name: name},
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
		colType := qbtypes.ColumnTypeGroup
		if aggRe.MatchString(name) {
			colType = qbtypes.ColumnTypeAggregation
		}
		cd[i] = &qbtypes.ColumnDescriptor{
			TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: name},
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

	// Helper that decides scan target per column based on DB type
	makeScanTarget := func(i int) any {
		dbt := strings.ToUpper(colTypes[i].DatabaseTypeName())
		if strings.HasPrefix(dbt, "JSON") {
			// Since the driver fails to decode JSON/Dynamic into native Go values, we read it as raw bytes
			// TODO: check in future if fixed in the driver
			var v []byte
			return &v
		}
		return reflect.New(colTypes[i].ScanType()).Interface()
	}

	// Build a template slice of correctly-typed pointers once
	scanTpl := make([]any, colCnt)
	for i := range colTypes {
		scanTpl[i] = makeScanTarget(i)
	}

	var outRows []*qbtypes.RawRow

	for rows.Next() {
		// fresh copy of the scan slice (otherwise the driver reuses pointers)
		scan := make([]any, colCnt)
		for i := range scanTpl {
			scan[i] = makeScanTarget(i)
		}

		if err := rows.Scan(scan...); err != nil {
			return nil, err
		}

		rr := qbtypes.RawRow{
			Data: make(map[string]any, colCnt),
		}

		for i, cellPtr := range scan {
			name := colNames[i]

			// de-reference the typed pointer to any
			val := reflect.ValueOf(cellPtr).Elem().Interface()

			// Post-process JSON columns: normalize into structured values
			if strings.HasPrefix(strings.ToUpper(colTypes[i].DatabaseTypeName()), "JSON") {
				switch x := val.(type) {
				case []byte:
					if len(x) > 0 {
						var v any
						if err := sonic.Unmarshal(x, &v); err == nil {
							val = v
						}
					}
				default:
					// already a structured type (map[string]any, []any, etc.)
				}
			}

			// special-case: timestamp column
			if name == "timestamp" || name == "timestamp_datetime" {
				switch t := val.(type) {
				case time.Time:
					rr.Timestamp = t
				case uint64: // epoch-ns stored as integer
					rr.Timestamp = time.Unix(0, int64(t))
				case int64:
					rr.Timestamp = time.Unix(0, t)
				default:
					// leave zero time if unrecognised
				}
			}

			rr.Data[name] = val
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

func readAsDistribution(rows driver.Rows, queryName string, bucketCount int) (any, error) {
	colNames := rows.Columns()
	colTypes := rows.ColumnTypes()

	resultCols := make(map[int]int)

	for i, name := range colNames {
		if m := aggRe.FindStringSubmatch(name); m != nil {
			id, _ := strconv.Atoi(m[1])
			resultCols[id] = i
		}
	}

	scan := make([]any, len(colNames))
	for i := range scan {
		st := colTypes[i].ScanType()
		if st == nil {
			var v any
			scan[i] = &v
		} else {
			scan[i] = reflect.New(st).Interface()
		}
	}

	type minMax struct {
		min, max float64
	}
	bucketsByIndex := make(map[int]map[float64]float64)
	globalMinMax := make(map[int]*minMax)

	for rows.Next() {
		if err := rows.Scan(scan...); err != nil {
			return nil, err
		}

		for resultID, colIdx := range resultCols {
			histData := derefValue(scan[colIdx])
			vHist := reflect.ValueOf(histData)

			if vHist.Kind() == reflect.Slice {
				if vHist.Len() == 0 {
					bucketsByIndex[resultID] = make(map[float64]float64)
					continue
				}

				bucketMap := make(map[float64]float64)

				for i := 0; i < vHist.Len(); i++ {
					b := vHist.Index(i).Interface()
					vBin := reflect.ValueOf(b)

					if vBin.Kind() == reflect.Slice && vBin.Len() >= 3 {
						lower := numericAsFloat(vBin.Index(0).Interface())
						upper := numericAsFloat(vBin.Index(1).Interface())
						count := numericAsFloat(vBin.Index(2).Interface())

						if !math.IsNaN(upper) && !math.IsInf(upper, 0) &&
							!math.IsNaN(count) && !math.IsInf(count, 0) {
							bucketMap[upper] = count

							// Track global min/max
							if globalMinMax[resultID] == nil {
								globalMinMax[resultID] = &minMax{min: math.MaxFloat64, max: -math.MaxFloat64}
							}
							if !math.IsNaN(lower) && !math.IsInf(lower, 0) {
								if lower < globalMinMax[resultID].min {
									globalMinMax[resultID].min = lower
								}
							}
							if upper > globalMinMax[resultID].max {
								globalMinMax[resultID].max = upper
							}
						}
					}
				}

				if len(bucketMap) > 0 {
					bucketsByIndex[resultID] = bucketMap
				}
			}
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Create fixed bucket bounds for each result ID
	bucketBounds := make(map[int][]float64)
	for aggIdx, mm := range globalMinMax {
		if mm.min <= mm.max {
			numBins := bucketCount
			binWidth := (mm.max - mm.min) / float64(numBins)
			bounds := make([]float64, numBins+1)
			for i := 0; i <= numBins; i++ {
				bounds[i] = mm.min + float64(i)*binWidth
			}
			bucketBounds[aggIdx] = bounds
		}
	}

	// Map bins to fixed bins
	fixedBucketsByIndex := make(map[int][]*qbtypes.DistributionBucket)
	for resultID, buckets := range bucketsByIndex {
		binBounds := bucketBounds[resultID]
		if len(binBounds) == 0 {
			continue
		}

		numBins := len(binBounds) - 1
		fixedBuckets := make([]*qbtypes.DistributionBucket, numBins)

		// Initialize fixed buckets
		for i := 0; i < numBins; i++ {
			fixedBuckets[i] = &qbtypes.DistributionBucket{
				LowerBound: binBounds[i],
				UpperBound: binBounds[i+1],
				Count:      0,
			}
		}

		// Map buckets to fixed buckets using upper bound
		for upper, count := range buckets {
			assigned := false
			for i := range numBins {
				if upper > binBounds[i] && upper <= binBounds[i+1] {
					fixedBuckets[i].Count += count
					assigned = true
					break
				}
			}

			// Edge case: upper bound exceeds all bins
			if !assigned && upper > binBounds[numBins] {
				fixedBuckets[numBins-1].Count += count
			}
		}

		fixedBucketsByIndex[resultID] = fixedBuckets
	}

	resultIDs := make([]int, 0, len(fixedBucketsByIndex))
	for k := range fixedBucketsByIndex {
		resultIDs = append(resultIDs, k)
	}
	sort.Ints(resultIDs)

	var aggregations []*qbtypes.DistributionAggregation
	for _, id := range resultIDs {
		aggregations = append(aggregations, &qbtypes.DistributionAggregation{
			Index:   id,
			Alias:   fmt.Sprintf("__result_%d", id),
			Buckets: fixedBucketsByIndex[id],
		})
	}

	return &qbtypes.DistributionData{
		QueryName:    queryName,
		Aggregations: aggregations,
	}, nil
}

// numericAsFloat converts numeric types to float64 efficiently
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

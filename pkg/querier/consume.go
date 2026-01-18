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

type heatmapPoint struct {
	timestamp int64
	bucketEnd float64
	value     float64
}

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
	case qbtypes.RequestTypeHeatmap:
		payload, err = readAsHeatmap(rows, queryName, bucketCount)
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

func readAsHeatmap(rows driver.Rows, queryName string, bucketCount int) (*qbtypes.HeatmapData, error) {
	colTypes := rows.ColumnTypes()
	useArrayParser := false
	for _, ct := range colTypes {
		if ct.Name() == "__result_0" {
			if strings.HasPrefix(ct.DatabaseTypeName(), "Array") {
				useArrayParser = true
				break
			}
		}
	}

	if useArrayParser {
		return readAsHeatmapFromArray(rows, queryName, bucketCount)
	}

	return readAsHeatmapFromRows(rows, queryName, bucketCount)
}

func readAsHeatmapFromRows(rows driver.Rows, queryName string, bucketCount int) (*qbtypes.HeatmapData, error) {
	colNames := rows.Columns()
	colTypes := rows.ColumnTypes()

	type colIndices struct {
		ts, end, start, val int
	}
	cols := colIndices{ts: -1, end: -1, start: -1, val: -1}
	for i, name := range colNames {
		switch name {
		case "ts":
			cols.ts = i
		case "le", "bucket_end":
			cols.end = i
		case "bucket_start":
			cols.start = i
		case "count", "value":
			cols.val = i
		}
	}

	scan := make([]any, len(colNames))
	for i := range scan {
		scan[i] = reflect.New(colTypes[i].ScanType()).Interface()
	}

	heatmapPoints := make([]heatmapPoint, 0, 128)
	uniqueTs := make(map[int64]bool, 64)
	uniqueEnd := make(map[float64]bool, 32)
	startByEnd := make(map[float64]float64, 32)

	for rows.Next() {
		if err := rows.Scan(scan...); err != nil {
			return nil, err
		}

		var ts int64
		var bucketEnd float64
		var bucketStart float64
		var value float64
		var endFound, valueFound, startFound bool

		if cols.ts >= 0 {
			if val := derefValue(scan[cols.ts]); val != nil {
				if t, ok := val.(time.Time); ok {
					ts = t.UnixMilli()
				} else if t, ok := val.(uint64); ok {
					ts = int64(t) * 1000
				}
			}
		}
		if cols.end >= 0 {
			if val := derefValue(scan[cols.end]); val != nil {
				if s, ok := val.(string); ok {
					if s == "+Inf" {
						bucketEnd = math.Inf(1)
						endFound = true
					} else {
						f, err := strconv.ParseFloat(s, 64)
						if err == nil {
							bucketEnd = f
							endFound = true
						}
					}
				} else {
					bucketEnd = numericAsFloat(val)
					if !math.IsNaN(bucketEnd) {
						endFound = true
					}
				}
			}
		}
		if cols.start >= 0 {
			if val := derefValue(scan[cols.start]); val != nil {
				bucketStart = numericAsFloat(val)
				if !math.IsNaN(bucketStart) {
					startFound = true
				}
			}
		}
		if cols.val >= 0 {
			if val := derefValue(scan[cols.val]); val != nil {
				value = numericAsFloat(val)
				valueFound = true
			}
		}

		if endFound && valueFound {
			if math.IsNaN(bucketEnd) || math.IsInf(bucketEnd, 0) || math.IsNaN(value) || math.IsInf(value, 0) {
				continue
			}
			if startFound {
				if math.IsNaN(bucketStart) || math.IsInf(bucketStart, 0) {
					continue
				}
				if _, exists := startByEnd[bucketEnd]; !exists {
					startByEnd[bucketEnd] = bucketStart
				}
			}

			heatmapPoints = append(heatmapPoints, heatmapPoint{
				timestamp: ts,
				bucketEnd: bucketEnd,
				value:     value,
			})
			uniqueTs[ts] = true
			uniqueEnd[bucketEnd] = true
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return buildHeatmapData(heatmapPoints, uniqueTs, uniqueEnd, startByEnd, bucketCount, queryName)
}

func readAsHeatmapFromArray(rows driver.Rows, queryName string, bucketCount int) (*qbtypes.HeatmapData, error) {
	colNames := rows.Columns()
	colTypes := rows.ColumnTypes()

	var tsIdx, resultIdx int = -1, -1
	for i, name := range colNames {
		switch name {
		case "ts":
			tsIdx = i
		case "__result_0":
			resultIdx = i
		}
	}

	scan := make([]any, len(colNames))
	for i := range scan {
		scan[i] = reflect.New(colTypes[i].ScanType()).Interface()
	}

	heatmapPoints := make([]heatmapPoint, 0, 100)
	uniqueTs := make(map[int64]bool, 64)
	uniqueEnd := make(map[float64]bool, 32)
	startByEnd := make(map[float64]float64, 32)

	for rows.Next() {
		if err := rows.Scan(scan...); err != nil {
			return nil, err
		}

		var ts int64
		var histData any

		if tsIdx >= 0 {
			if val := derefValue(scan[tsIdx]); val != nil {
				if t, ok := val.(time.Time); ok {
					ts = t.UnixMilli()
				} else if t, ok := val.(uint64); ok {
					ts = int64(t) * 1000
				}
			}
		}

		if resultIdx >= 0 {
			histData = derefValue(scan[resultIdx])
		}

		vHist := reflect.ValueOf(histData)
		if vHist.Kind() == reflect.Slice {
			for i := 0; i < vHist.Len(); i++ {
				b := vHist.Index(i).Interface()

				vBin := reflect.ValueOf(b)
				if vBin.Kind() == reflect.Slice && vBin.Len() >= 3 {
					lower := numericAsFloat(vBin.Index(0).Interface())
					upper := numericAsFloat(vBin.Index(1).Interface())
					count := numericAsFloat(vBin.Index(2).Interface())

					if math.IsNaN(upper) || math.IsInf(upper, 0) || math.IsNaN(count) || math.IsInf(count, 0) {
						continue
					}
					if math.IsNaN(lower) {
						continue
					}

					heatmapPoints = append(heatmapPoints, heatmapPoint{
						timestamp: ts,
						bucketEnd: upper,
						value:     count,
					})
					uniqueTs[ts] = true
					uniqueEnd[upper] = true

					if _, exists := startByEnd[upper]; !exists {
						startByEnd[upper] = lower
					}
				}
			}
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return buildHeatmapData(heatmapPoints, uniqueTs, uniqueEnd, startByEnd, bucketCount, queryName)
}

func buildHeatmapData(points []heatmapPoint, uniqueTs map[int64]bool, uniqueEnd map[float64]bool, startByEnd map[float64]float64, bucketCount int, queryName string) (*qbtypes.HeatmapData, error) {
	sortedTs := make([]int64, 0, len(uniqueTs))
	for t := range uniqueTs {
		sortedTs = append(sortedTs, t)
	}
	slices.Sort(sortedTs)

	sortedEnds := make([]float64, 0, len(uniqueEnd))
	for end := range uniqueEnd {
		sortedEnds = append(sortedEnds, end)
	}
	sort.Float64s(sortedEnds)

	bucketStarts := make([]float64, len(sortedEnds))
	for i := range sortedEnds {
		if i == 0 {
			if start, ok := startByEnd[sortedEnds[i]]; ok {
				bucketStarts[i] = start
			} else {
				bucketStarts[i] = 0
			}
		} else {
			bucketStarts[i] = sortedEnds[i-1]
		}
	}

	counts := make([][]float64, len(sortedTs))
	for i := range counts {
		counts[i] = make([]float64, len(sortedEnds))
	}

	tsIdx := make(map[int64]int, len(sortedTs))
	for i, t := range sortedTs {
		tsIdx[t] = i
	}
	endIdx := make(map[float64]int, len(sortedEnds))
	for i, l := range sortedEnds {
		endIdx[l] = i
	}

	for _, p := range points {
		if tI, ok := tsIdx[p.timestamp]; ok {
			if lI, ok := endIdx[p.bucketEnd]; ok {
				counts[tI][lI] = p.value
			}
		}
	}

	if bucketCount > 0 && len(sortedEnds) > bucketCount {
		sortedEnds, bucketStarts, counts = mergeBuckets(sortedEnds, bucketStarts, counts, bucketCount)
	}

	return &qbtypes.HeatmapData{
		QueryName:    queryName,
		BucketBounds: sortedEnds,
		BucketStarts: bucketStarts,
		BucketCount:  bucketCount,
		Timestamps:   sortedTs,
		Counts:       counts,
	}, nil
}

// mergeBuckets merges excess buckets to match the requested bucket count
func mergeBuckets(bucketEnds []float64, bucketStarts []float64, counts [][]float64, targetCount int) ([]float64, []float64, [][]float64) {
	if len(bucketEnds) <= targetCount {
		return bucketEnds, bucketStarts, counts
	}

	mergeFactor := float64(len(bucketEnds)) / float64(targetCount)

	mergedEnds := make([]float64, 0, targetCount)
	mergedStarts := make([]float64, 0, targetCount)
	mergedCounts := make([][]float64, len(counts))
	for i := range mergedCounts {
		mergedCounts[i] = make([]float64, 0, targetCount)
	}

	for targetIdx := 0; targetIdx < targetCount; targetIdx++ {
		startIdx := int(float64(targetIdx) * mergeFactor)
		endIdx := int(float64(targetIdx+1) * mergeFactor)
		if targetIdx == targetCount-1 {
			endIdx = len(bucketEnds)
		}

		if startIdx >= len(bucketEnds) {
			break
		}
		if endIdx > len(bucketEnds) {
			endIdx = len(bucketEnds)
		}

		var start float64
		if targetIdx == 0 {
			start = bucketStarts[startIdx]
		} else {
			start = mergedEnds[targetIdx-1]
		}
		end := bucketEnds[endIdx-1]

		mergedStarts = append(mergedStarts, start)
		mergedEnds = append(mergedEnds, end)

		for rowIdx := range counts {
			sum := 0.0
			for bucketIdx := startIdx; bucketIdx < endIdx; bucketIdx++ {
				sum += counts[rowIdx][bucketIdx]
			}
			mergedCounts[rowIdx] = append(mergedCounts[rowIdx], sum)
		}
	}

	return mergedEnds, mergedStarts, mergedCounts
}

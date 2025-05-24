package querier

import (
	"fmt"
	"math"
	"reflect"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// stats returned to the caller so that ExecStats can be filled.
type chQueryStats struct {
	Rows  int64
	Bytes int64
}

// consume reads every row and shapes it into the payload expected for the
// given request type.
//
// * Time-series → []*qbtypes.TimeSeriesData
// * Scalar      → float64
// * Raw         → [][]any (each inner slice is a row)
// * Distribution→ []Bucket     (struct{Lower,Upper,Count float64})
//
// It also extracts `RowsRead` and `BytesRead` from the ClickHouse driver so the
// caller can set ExecStats.RowsScanned / BytesScanned.
func consume(rows driver.Rows, kind qbtypes.RequestType) (any, chQueryStats, error) {
	var (
		payload any
		stats   chQueryStats
		err     error
	)

	switch kind {
	case qbtypes.RequestTypeTimeSeries:
		payload, err = readAsTimeSeries(rows)

	case qbtypes.RequestTypeScalar:
		payload, err = readAsScalar(rows)

	case qbtypes.RequestTypeRaw:
		payload, err = readAsRaw(rows)

	}

	return payload, stats, err
}

func readAsTimeSeries(rows driver.Rows) ([]*qbtypes.TimeSeriesData, error) {

	colTypes := rows.ColumnTypes()
	colNames := rows.Columns()

	vars := make([]any, len(colTypes))
	countOfNumericColumns := 0

	for i, ct := range colTypes {
		vars[i] = reflect.New(ct.ScanType()).Interface()
		if numericKind(ct.ScanType().Kind()) {
			countOfNumericColumns++
		}
	}

	type seriesKey struct {
		agg int
		key string // deterministic join of label values
	}

	seriesMap := map[seriesKey]*qbtypes.TimeSeries{}
	aggAliasRe := regexp.MustCompile(`^__result_(\d+)$`)

	for rows.Next() {
		if err := rows.Scan(vars...); err != nil {
			return nil, err
		}

		var (
			lblVals []string
			lblObjs []*qbtypes.Label
			tsVal   qbtypes.TimeSeriesValue
			aggIdx  = -1
		)

		for idx, ptr := range vars {
			name := colNames[idx]
			switch v := ptr.(type) {

			case *time.Time:
				tsVal.Timestamp = v.UnixMilli()

			/* ── Numbers (aggregation or grouping) ─────────────────── */
			case *float64, *float32, *int64, *int32, *uint64, *uint32:
				val := numericAsFloat(reflect.ValueOf(ptr).Elem().Interface())
				if m := aggAliasRe.FindStringSubmatch(name); m != nil {
					// aggregation column – its index is m[1]
					n, _ := strconv.Atoi(m[1])
					aggIdx = n
					tsVal.Value = val
				} else if countOfNumericColumns == 1 { // single numeric column -> treat as value as well
					aggIdx = 0
					tsVal.Value = val
				} else {
					// numeric label (rare but legal)
					lblVals = append(lblVals, fmt.Sprint(val))
					lblObjs = append(lblObjs, &qbtypes.Label{
						Key:   telemetrytypes.TelemetryFieldKey{Name: name},
						Value: val,
					})
				}
			case *string:
				lblVals = append(lblVals, *v)
				lblObjs = append(lblObjs, &qbtypes.Label{
					Key:   telemetrytypes.TelemetryFieldKey{Name: name},
					Value: *v,
				})
			default:
				continue
			}
		}

		if aggIdx < 0 || math.IsNaN(tsVal.Value) || math.IsInf(tsVal.Value, 0) {
			continue // nothing usable in this row
		}

		sort.Strings(lblVals)
		sKey := seriesKey{agg: aggIdx, key: strings.Join(lblVals, ",")}

		series, ok := seriesMap[sKey]
		if !ok {
			series = &qbtypes.TimeSeries{Labels: lblObjs}
			seriesMap[sKey] = series
		}
		series.Values = append(series.Values, &tsVal)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	// gather the distinct aggregation indexes we have
	var maxAgg int
	for k := range seriesMap {
		if k.agg > maxAgg {
			maxAgg = k.agg
		}
	}

	buckets := make([]*qbtypes.AggregationBucket, maxAgg+1)
	for i := range buckets {
		buckets[i] = &qbtypes.AggregationBucket{Index: i, Alias: "__result_" + strconv.Itoa(i)}
	}

	for k, s := range seriesMap {
		buckets[k.agg].Series = append(buckets[k.agg].Series, s)
	}

	var aggBuckets []*qbtypes.AggregationBucket
	for _, b := range buckets {
		if len(b.Series) > 0 {
			aggBuckets = append(aggBuckets, b)
		}
	}

	return []*qbtypes.TimeSeriesData{{
		Aggregations: aggBuckets,
	}}, nil
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

func readAsScalar(rows driver.Rows) (*qbtypes.ScalarData, error) {

	colNames := rows.Columns()
	colTypes := rows.ColumnTypes()

	/* ------------------------------------------------------------------
	   0.  Build ColumnDescriptor list
	------------------------------------------------------------------ */
	cd := make([]*qbtypes.ColumnDescriptor, len(colNames))
	aggRe := regexp.MustCompile(`^__result_(\d+)$`)

	for i, name := range colNames {
		colType := qbtypes.ColumnTypeGroup
		if aggRe.MatchString(name) {
			colType = qbtypes.ColumnTypeAggregation
		}

		cd[i] = &qbtypes.ColumnDescriptor{
			TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: name},
			AggregationIndex:  int64(i),
			Type:              colType,
		}
	}

	var data [][]*any

	for rows.Next() {
		// prepare scan slots
		scan := make([]interface{}, len(colTypes))
		for i := range scan {
			scan[i] = new(interface{})
		}
		if err := rows.Scan(scan...); err != nil {
			return nil, err
		}

		row := make([]*any, len(scan))
		for i, cell := range scan {
			val := *(cell.(*interface{})) // de-pointer
			row[i] = &val                 // store pointer so JSON “null” is possible
		}
		data = append(data, row)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return &qbtypes.ScalarData{
		Columns: cd,
		Data:    data,
	}, nil
}

func readAsRaw(rows driver.Rows) ([][]any, error) {
	colCnt := len(rows.Columns())
	var out [][]any

	for rows.Next() {
		rowVals := make([]interface{}, colCnt)
		for i := range rowVals {
			rowVals[i] = new(interface{})
		}
		if err := rows.Scan(rowVals...); err != nil {
			return nil, err
		}

		flattened := make([]any, colCnt)
		for i, v := range rowVals {
			flattened[i] = *(v.(*interface{}))
		}
		out = append(out, flattened)
	}
	return out, rows.Err()
}

func numericAsFloat(v interface{}) float64 {
	switch x := v.(type) {
	case float64:
		return x
	case float32:
		return float64(x)
	case int64:
		return float64(x)
	case int32:
		return float64(x)
	case int16:
		return float64(x)
	case int8:
		return float64(x)
	case int:
		return float64(x)
	case uint64:
		return float64(x)
	case uint32:
		return float64(x)
	case uint16:
		return float64(x)
	case uint8:
		return float64(x)
	case uint:
		return float64(x)
	default:
		return math.NaN()
	}
}

package querier

import (
	"encoding/json"
	"fmt"
	"math"
	"reflect"
	"regexp"
	"slices"
	"strconv"
	"strings"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2/lib/chcol"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/spantypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrystoretypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

var (
	aggRe = regexp.MustCompile(`^__result_(\d+)$`)
	// keyAliasRe matches the traces statement builder's positional column-alias prefix
	// `__SELECT_KEY_<n>_` / `__GROUP_BY_KEY_<n>_`, which disambiguates select/group-by
	// aliases from real table columns in the generated SQL. It is stripped here so the
	// original field name surfaces as the label / column / raw-data key.
	keyAliasRe = regexp.MustCompile(`^__(?:SELECT|GROUP_BY)_KEY_\d+_`)
	// legacyReservedColumnTargetAliases identifies result value from a user
	// written clickhouse query. The column alias indcate which value is
	// to be considered as final result (or target).
	legacyReservedColumnTargetAliases = []string{"__result", "__value", "result", "res", "value"}
)

// stripKeyAlias removes the __SELECT_KEY_<n>_ / __GROUP_BY_KEY_<n>_ prefix from a result
// column name, recovering the field name; unprefixed names are returned unchanged.
func stripKeyAlias(name string) string {
	return keyAliasRe.ReplaceAllString(name, "")
}

// unwrapVariant returns the concrete value inside the chcol.Variant envelope the driver scans a
// Dynamic column — a JSON path such as body_v2.level — into.
func unwrapVariant(val any) any {
	if v, ok := val.(chcol.Variant); ok {
		return v.Any()
	}
	return val
}

// labelValue renders a group-by value the payload cannot carry as a scalar — a JSON column, or a
// Dynamic one — as a stable string, so that rows differing only in that value land in different
// series. JSON goes through encoding/json for its sorted map keys: ClickHouse groups documents by
// structure, so two rows it considers equal have to produce the same label.
func labelValue(val any) string {
	val = unwrapVariant(val)
	if val == nil {
		return ""
	}
	if v, ok := val.(telemetrystoretypes.JSONValue); ok {
		if raw, err := json.Marshal(v); err == nil {
			return string(raw)
		}
	}
	return fmt.Sprint(val)
}

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

// labelPair is a label held in per-row scratch, so that rows landing in an existing series do not
// allocate label objects only to drop them. It keeps the value unboxed — an any field would put
// every label of every row on the heap — and boxes once, for the row that creates the series.
type labelPair struct {
	name    string
	display string // the form the series key is built from
	num     float64
	class   tsColumnClass
}

func materialiseLabels(pairs []labelPair) []*qbtypes.Label {
	labels := make([]*qbtypes.Label, len(pairs))
	for i, pair := range pairs {
		var value any = pair.display
		switch pair.class {
		case tsColumnNumeric:
			value = pair.num
		case tsColumnBool:
			value = pair.num != 0
		}
		labels[i] = &qbtypes.Label{
			Key:   telemetrytypes.TelemetryFieldKey{Name: pair.name},
			Value: value,
		}
	}
	return labels
}

// The *FromSlot helpers skip the reflection in derefValue for the types that actually turn up;
// anything else still goes through it, so a missing width is slower, never dropped.
func numericFromSlot(ptr any) (float64, bool) {
	switch v := ptr.(type) {
	case *float64:
		return *v, true
	case *uint64:
		return float64(*v), true
	case *int64:
		return float64(*v), true
	case *uint32:
		return float64(*v), true
	case *int32:
		return float64(*v), true
	case *float32:
		return float64(*v), true
	case *uint8:
		return float64(*v), true
	case *int8:
		return float64(*v), true
	}
	val := derefValue(ptr)
	if val == nil {
		return 0, false
	}
	return numericAsFloat(val), true
}

func boolFromSlot(ptr any) bool {
	if flag, ok := ptr.(*bool); ok {
		return *flag
	}
	flag, _ := derefValue(ptr).(bool)
	return flag
}

func stringFromSlot(ptr any) string {
	switch v := ptr.(type) {
	case *string:
		return *v
	case **string:
		if *v == nil {
			return ""
		}
		return **v
	}
	str, _ := derefValue(ptr).(string)
	return str
}

// maxAggregationIndex bounds the __result_<n> indices honored as aggregations; anything past it
// is read as a plain numeric column.
const maxAggregationIndex = 1000

type tsColumnClass uint8

const (
	tsColumnSkip tsColumnClass = iota
	tsColumnTimestamp
	tsColumnNumeric
	tsColumnBool
	tsColumnString
	tsColumnDocument // a JSON or Dynamic column, rendered as a label
)

// tsColumn is what a result column contributes to every row of a time series. The class and the
// role are the same for all of them, so they are worked out once instead of per cell.
type tsColumn struct {
	name          string
	class         tsColumnClass
	aggIdx        int // -1 unless the column is aliased as an aggregation
	isTargetAlias bool
}

func planColumns(colNames []string, colTypes []driver.ColumnType) []tsColumn {
	plan := make([]tsColumn, len(colTypes))
	for i, colType := range colTypes {
		name := stripKeyAlias(colNames[i])
		col := tsColumn{
			name:          name,
			aggIdx:        -1,
			isTargetAlias: slices.Contains(legacyReservedColumnTargetAliases, name),
		}
		// A raw ClickHouse query writes its own aliases, and aggValues and the result buckets are
		// sized from this index — an unchecked __result_<n> is an allocation of the user's choosing.
		if m := aggRe.FindStringSubmatch(name); m != nil {
			if idx, err := strconv.Atoi(m[1]); err == nil && idx < maxAggregationIndex {
				col.aggIdx = idx
			}
		}

		typ := baseType(colType.ScanType())
		switch {
		case typ == timeType:
			col.class = tsColumnTimestamp
		case typ == jsonValueType, typ == variantType:
			col.class = tsColumnDocument
		case isNumericKind(typ):
			col.class = tsColumnNumeric
		case typ.Kind() == reflect.Bool:
			col.class = tsColumnBool
		case typ.Kind() == reflect.String:
			col.class = tsColumnString
		}
		plan[i] = col
	}
	return plan
}

func readAsTimeSeries(rows driver.Rows, queryWindow *qbtypes.TimeRange, step qbtypes.Step, queryName string) (*qbtypes.TimeSeriesData, error) {
	colTypes := rows.ColumnTypes()
	colNames := rows.Columns()

	plan := planColumns(colNames, colTypes)
	slots := make([]any, len(colTypes))
	numericColsCount := 0
	for i, ct := range colTypes {
		slots[i] = reflect.New(ct.ScanType()).Interface()
		if isNumericKind(ct.ScanType()) {
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

	// Every row writes into the same scratch: the label objects are materialised only for the row
	// that creates a series, and aggregation slots are indexed by the alias instead of hashed.
	aggCount := 1
	for _, col := range plan {
		if col.aggIdx >= aggCount {
			aggCount = col.aggIdx + 1
		}
	}
	var (
		aggValues = make([]float64, aggCount)
		aggSeen   = make([]bool, aggCount)
		lblVals   = make([]string, 0, lblValsCapacity)
		lblPairs  = make([]labelPair, 0, lblValsCapacity)
	)

	for rows.Next() {
		if err := rows.Scan(slots...); err != nil {
			return nil, err
		}

		clear(aggSeen)
		lblVals = lblVals[:0]
		lblPairs = lblPairs[:0]

		var (
			ts            int64
			anyAgg        bool
			fallbackValue float64 // value when NO __result_N columns exist
			fallbackSeen  bool
		)

		for idx, ptr := range slots {
			col := plan[idx]

			switch col.class {
			case tsColumnTimestamp:
				if t, ok := ptr.(*time.Time); ok {
					ts = t.UnixMilli()
				} else if t, ok := derefValue(ptr).(time.Time); ok {
					ts = t.UnixMilli()
				}

			case tsColumnNumeric:
				num, ok := numericFromSlot(ptr)
				if !ok { // a NULL number is neither a value nor a label
					continue
				}
				switch {
				case col.aggIdx >= 0:
					aggValues[col.aggIdx] = num
					aggSeen[col.aggIdx] = true
					anyAgg = true
				case numericColsCount == 1, col.isTargetAlias: // classic single-value query
					fallbackValue = num
					fallbackSeen = true
				default:
					display := strconv.FormatFloat(num, 'g', -1, 64)
					lblVals = append(lblVals, display)
					lblPairs = append(lblPairs, labelPair{
						name:    col.name,
						display: display,
						num:     num,
						class:   tsColumnNumeric,
					})
				}

			case tsColumnBool:
				flag := boolFromSlot(ptr)
				switch {
				case col.aggIdx >= 0:
					aggValues[col.aggIdx] = boolAsFloat(flag)
					aggSeen[col.aggIdx] = true
					anyAgg = true
				case col.isTargetAlias:
					fallbackValue = boolAsFloat(flag)
					fallbackSeen = true
				default:
					display := strconv.FormatBool(flag)
					lblVals = append(lblVals, display)
					lblPairs = append(lblPairs, labelPair{
						name:    col.name,
						display: display,
						num:     boolAsFloat(flag),
						class:   tsColumnBool,
					})
				}

			case tsColumnString:
				label := stringFromSlot(ptr) // a NULL string labels the series with the empty string
				lblVals = append(lblVals, label)
				lblPairs = append(lblPairs, labelPair{name: col.name, display: label, class: tsColumnString})

			case tsColumnDocument:
				label := labelValue(derefValue(ptr))
				lblVals = append(lblVals, label)
				lblPairs = append(lblPairs, labelPair{name: col.name, display: label, class: tsColumnDocument})
			}
		}

		// Edge-case: no __result_N columns, but a single numeric column present
		if !anyAgg && fallbackSeen {
			aggValues[0] = fallbackValue
			aggSeen[0] = true
			anyAgg = true
		}

		if ts == 0 || !anyAgg {
			continue // nothing useful
		}

		slices.Sort(lblVals)
		labelsKey := strings.Join(lblVals, ",")

		// one point per aggregation in this row
		for aggIdx, val := range aggValues {
			if !aggSeen[aggIdx] || math.IsNaN(val) || math.IsInf(val, 0) {
				continue
			}

			key := sKey{agg: aggIdx, key: labelsKey}

			series, ok := seriesMap[key]
			if !ok {
				series = &qbtypes.TimeSeries{Labels: materialiseLabels(lblPairs)}
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

var (
	timeType      = reflect.TypeFor[time.Time]()
	jsonValueType = reflect.TypeFor[telemetrystoretypes.JSONValue]()
	variantType   = reflect.TypeFor[chcol.Variant]()
)

// baseType unwraps pointer levels, so that a Nullable column is classified like the column it wraps.
func baseType(t reflect.Type) reflect.Type {
	for t.Kind() == reflect.Pointer {
		t = t.Elem()
	}
	return t
}

func isNumericKind(t reflect.Type) bool {
	if t == nil {
		return false
	}
	for t.Kind() == reflect.Pointer || t.Kind() == reflect.UnsafePointer {
		t = t.Elem()
	}
	switch t.Kind() {
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
		name = stripKeyAlias(name)
		colType := qbtypes.ColumnTypeGroup
		// Builder queries aliases aggregation columns as __result_N (always numeric) and wraps group-by keys with toString (always string);
		// Raw ClickHouse queries may use any aliases.
		// Handling Builder queries, If name like __result_N -> aggregation, otherwise group-by column
		// Handling Raw ClickHouse queries, If type is numeric -> aggregation, otherwise group-by column
		// NOTE: For clickhouse queries, its wrong to assume that numeric columns are always aggregations, user might be grouping by on integer status_code.
		// However, we are fine with this for now. If need arises, simplest way would be to solve this on the frontend side by asking user a mapping of column names to column types.
		if aggRe.MatchString(name) || isNumericKind(colTypes[i].ScanType()) {
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
			row[i] = unwrapVariant(derefValue(cell))
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

	for val.Kind() == reflect.Pointer {
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

	var outRows []*qbtypes.RawRow

	for rows.Next() {
		// fresh copy of the scan slice (otherwise the driver reuses pointers)
		scan := make([]any, colCnt)
		for i := range colTypes {
			scan[i] = reflect.New(colTypes[i].ScanType()).Interface()
		}

		if err := rows.Scan(scan...); err != nil {
			return nil, err
		}

		rr := qbtypes.RawRow{
			Data: make(map[string]any, colCnt),
		}

		for i, cellPtr := range scan {
			name := stripKeyAlias(colNames[i])

			// de-reference the typed pointer to any
			val := unwrapVariant(reflect.ValueOf(cellPtr).Elem().Interface())

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

// mergeSpanAttributeColumns merges (attributes_string, attributes_number, attributes_bool, resources_string) into
// unified "attributes" and "resource" keys, and parses the stringified `events`
// and `links` columns into structured slices. Raw DB columns are removed.
func mergeSpanAttributeColumns(data map[string]any) {
	attrStr, hasStr := data["attributes_string"]
	attrNum, hasNum := data["attributes_number"]
	attrBool, hasBool := data["attributes_bool"]
	// todo(nitya): move to resource json
	resStr, hasRes := data["resources_string"]
	if hasStr || hasNum || hasBool || hasRes {
		attributes := make(map[string]any)
		if m, ok := attrStr.(map[string]string); ok {
			for k, v := range m {
				attributes[k] = v
			}
		}
		if m, ok := attrNum.(map[string]float64); ok {
			for k, v := range m {
				attributes[k] = v
			}
		}
		if m, ok := attrBool.(map[string]bool); ok {
			for k, v := range m {
				attributes[k] = v
			}
		}
		delete(data, "attributes_string")
		delete(data, "attributes_number")
		delete(data, "attributes_bool")
		data["attributes"] = attributes

		resource := map[string]string{}
		if m, ok := resStr.(map[string]string); ok {
			resource = m
		}
		data["resource"] = resource
		delete(data, "resources_string")
	}

	if raw, ok := data["events"]; ok {
		data["events"] = spantypes.ParseEvents(raw)
	}
	if raw, ok := data["links"]; ok {
		data["links"] = spantypes.ParseLinks(raw)
	}
}

func boolAsFloat(v bool) float64 {
	if v {
		return 1
	}
	return 0
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

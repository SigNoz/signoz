package querier

import (
	"context"
	"encoding/base64"
	"fmt"
	"log/slog"
	"strconv"
	"strings"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrytraces"
	"github.com/SigNoz/signoz/pkg/types/ctxtypes"
	"github.com/SigNoz/signoz/pkg/types/instrumentationtypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

const traceOutsideRangeWarn = "Query %s references a trace_id that exists between %s and %s (UTC) but lies outside the selected time range; adjust the time range to see results"

type builderQuery[T any] struct {
	logger         *slog.Logger
	telemetryStore telemetrystore.TelemetryStore
	stmtBuilder    qbtypes.StatementBuilder[T]
	spec           qbtypes.QueryBuilderQuery[T]
	variables      map[string]qbtypes.VariableItem

	fromMS uint64
	toMS   uint64
	kind   qbtypes.RequestType

	builderConfig builderConfig
}

var _ qbtypes.Query = (*builderQuery[any])(nil)
var _ qbtypes.StatementProvider = (*builderQuery[any])(nil)

type builderConfig struct {
	logTraceIDWindowPaddingMS uint64
}

func newBuilderQuery[T any](
	logger *slog.Logger,
	telemetryStore telemetrystore.TelemetryStore,
	stmtBuilder qbtypes.StatementBuilder[T],
	spec qbtypes.QueryBuilderQuery[T],
	tr qbtypes.TimeRange,
	kind qbtypes.RequestType,
	variables map[string]qbtypes.VariableItem,
	cfg builderConfig,
) *builderQuery[T] {
	return &builderQuery[T]{
		logger:         logger,
		telemetryStore: telemetryStore,
		stmtBuilder:    stmtBuilder,
		spec:           spec,
		variables:      variables,
		fromMS:         tr.From,
		toMS:           tr.To,
		kind:           kind,
		builderConfig:  cfg,
	}
}

func (q *builderQuery[T]) Fingerprint() string {

	if (q.spec.Signal == telemetrytypes.SignalTraces ||
		q.spec.Signal == telemetrytypes.SignalLogs) && q.kind != qbtypes.RequestTypeTimeSeries {
		// No caching for non-timeseries queries
		return ""
	}

	// Create a deterministic fingerprint for builder queries
	// This needs to include all fields that affect the query results
	parts := []string{"builder"}

	// Add signal type
	parts = append(parts, fmt.Sprintf("signal=%s", q.spec.Signal.StringValue()))

	// Add source type
	parts = append(parts, fmt.Sprintf("source=%s", q.spec.Source.StringValue()))

	// Add step interval if present
	parts = append(parts, fmt.Sprintf("step=%s", q.spec.StepInterval.String()))

	// Add aggregations (convert to string representation)
	if len(q.spec.Aggregations) > 0 {
		aggParts := []string{}
		for _, agg := range q.spec.Aggregations {
			switch a := any(agg).(type) {
			case qbtypes.TraceAggregation:
				aggParts = append(aggParts, a.Expression)
			case qbtypes.LogAggregation:
				aggParts = append(aggParts, a.Expression)
			case qbtypes.MetricAggregation:
				var spaceAggParamStr string
				if a.ComparisonSpaceAggregationParam != nil {
					spaceAggParamStr = a.ComparisonSpaceAggregationParam.StringValue()
				}
				part := fmt.Sprintf("%s:%s:%s:%s:%s",
					a.MetricName,
					a.Temporality.StringValue(),
					a.TimeAggregation.StringValue(),
					a.SpaceAggregation.StringValue(),
					spaceAggParamStr,
				)
				if a.Reduced {
					oneDay := uint64(24 * time.Hour.Milliseconds())
					route := "reduced"
					if q.toMS-q.fromMS < oneDay && q.fromMS >= uint64(time.Now().UnixMilli())-oneDay {
						route = "buffer"
					}
					part += ":" + route
				}
				aggParts = append(aggParts, part)
			}
		}
		parts = append(parts, fmt.Sprintf("aggs=[%s]", strings.Join(aggParts, ",")))
	}

	// Add filter if present
	if q.spec.Filter != nil && q.spec.Filter.Expression != "" {
		parts = append(parts, fmt.Sprintf("filter=%s", q.spec.Filter.Expression))

		for name, item := range q.variables {
			if strings.Contains(q.spec.Filter.Expression, "$"+name) {
				parts = append(parts, fmt.Sprintf("%s=%s", name, fmt.Sprint(item.Value)))
			}
		}
	}

	// Add group by keys
	if len(q.spec.GroupBy) > 0 {
		groupByParts := []string{}
		for _, gb := range q.spec.GroupBy {
			groupByParts = append(groupByParts, fingerprintGroupByKey(gb))
		}
		parts = append(parts, fmt.Sprintf("groupby=[%s]", strings.Join(groupByParts, ",")))
	}

	// Add order by
	if len(q.spec.Order) > 0 {
		orderParts := []string{}
		for _, o := range q.spec.Order {
			orderParts = append(orderParts, fingerprintOrderBy(o))
		}
		parts = append(parts, fmt.Sprintf("order=[%s]", strings.Join(orderParts, ",")))
	}

	// Add limit and offset
	if q.spec.Limit > 0 {
		parts = append(parts, fmt.Sprintf("limit=%d", q.spec.Limit))
	}
	if q.spec.Offset > 0 {
		parts = append(parts, fmt.Sprintf("offset=%d", q.spec.Offset))
	}

	// Add having clause
	if q.spec.Having != nil && q.spec.Having.Expression != "" {
		parts = append(parts, fmt.Sprintf("having=%s", q.spec.Having.Expression))
	}

	if q.spec.ShiftBy != 0 {
		parts = append(parts, fmt.Sprintf("shiftby=%d", q.spec.ShiftBy))
	}

	return strings.Join(parts, "&")
}

func fingerprintGroupByKey(gb qbtypes.GroupByKey) string {
	return fingerprintFieldKey(gb.TelemetryFieldKey)
}

func fingerprintOrderBy(o qbtypes.OrderBy) string {
	return fmt.Sprintf("%s:%s", fingerprintFieldKey(o.Key.TelemetryFieldKey), o.Direction.StringValue())
}

func fingerprintFieldKey(key telemetrytypes.TelemetryFieldKey) string {
	// Include the essential fields that identify a field key
	return fmt.Sprintf("%s-%s-%s-%s",
		key.Name,
		key.FieldDataType.StringValue(),
		key.FieldContext.StringValue(),
		key.Signal.StringValue())
}

func (q *builderQuery[T]) Window() (uint64, uint64) {
	return q.fromMS, q.toMS
}

// must be a single query, ordered by timestamp (logs need an id tie-break).
func (q *builderQuery[T]) isWindowList() bool {
	if len(q.spec.Order) == 0 {
		return false
	}

	// first ORDER BY must be `timestamp`
	if q.spec.Order[0].Key.Name != "timestamp" {
		return false
	}

	if q.spec.Signal == telemetrytypes.SignalLogs {
		// logs require timestamp,id with identical direction
		if len(q.spec.Order) != 2 || q.spec.Order[1].Key.Name != "id" ||
			q.spec.Order[1].Direction != q.spec.Order[0].Direction {
			return false
		}
	}
	return true
}

// Statement renders the SQL without executing it, for the preview path.
func (q *builderQuery[T]) Statement(ctx context.Context) (*qbtypes.Statement, error) {
	return q.stmtBuilder.Build(ctx, q.fromMS, q.toMS, q.kind, q.spec, q.variables)
}

func (q *builderQuery[T]) Execute(ctx context.Context) (*qbtypes.Result, error) {

	// can we do window based pagination?
	if q.kind == qbtypes.RequestTypeRaw && q.isWindowList() {
		return q.executeWindowList(ctx)
	}

	fromMS, toMS := q.fromMS, q.toMS
	if q.spec.Signal == telemetrytypes.SignalTraces || q.spec.Signal == telemetrytypes.SignalLogs {
		var overlap bool
		var warning string
		fromMS, toMS, overlap, warning = q.narrowWindowByTraceID(ctx, fromMS, toMS)
		if !overlap {
			res := emptyResultFor(q.kind, q.spec.Name)
			if warning != "" {
				res.Warnings = []string{warning}
			}
			return res, nil
		}
	}

	stmt, err := q.stmtBuilder.Build(ctx, fromMS, toMS, q.kind, q.spec, q.variables)
	if err != nil {
		return nil, err
	}

	// Execute the query with proper context for partial value detection
	result, err := q.executeWithContext(ctx, stmt.Query, stmt.Args)
	if err != nil {
		return nil, err
	}

	result.Warnings = stmt.Warnings
	result.WarningsDocURL = stmt.WarningsDocURL
	return result, nil
}

// narrowWindowByTraceID inspects the filter for trace_id predicates and clamps
// [fromMS,toMS] to the time range stored in signoz_traces.distributed_trace_summary.
// Returns the (possibly narrowed) window, overlap=false when the trace lies
// completely outside the query window (callers should short-circuit), and a
// warning string the caller should attach to the empty result when the trace
// exists but is outside the selected window.
//
// When the trace_id is not present in trace_summary the behaviour differs by
// signal:
//   - traces: trace_summary is derived from the spans table, so a missing row
//     means no spans exist for that trace_id; we short-circuit to empty.
//   - logs: logs can carry a trace_id even when traces are not ingested at all
//     (e.g. traces disabled). We must not short-circuit; instead leave the
//     window untouched and let the query run.
func (q *builderQuery[T]) narrowWindowByTraceID(ctx context.Context, fromMS, toMS uint64) (uint64, uint64, bool, string) {
	if q.spec.Filter == nil || q.spec.Filter.Expression == "" {
		return fromMS, toMS, true, ""
	}

	traceIDs, found := telemetrytraces.ExtractTraceIDsFromFilter(q.spec.Filter.Expression)
	if !found || len(traceIDs) == 0 {
		return fromMS, toMS, true, ""
	}

	finder := telemetrytraces.NewTraceTimeRangeFinder(q.telemetryStore)
	traceStart, traceEnd, exists, err := finder.GetTraceTimeRangeMulti(ctx, traceIDs)
	if err != nil {
		return fromMS, toMS, true, ""
	}
	if !exists {
		if q.spec.Signal == telemetrytypes.SignalTraces {
			q.logger.DebugContext(ctx, "trace_id not found in trace_summary; short-circuiting traces query to empty",
				slog.Any("trace_ids", traceIDs))
			return fromMS, toMS, false, ""
		}
		q.logger.DebugContext(ctx, "trace_id not found in trace_summary; leaving time range untouched for logs",
			slog.Any("trace_ids", traceIDs))
		return fromMS, toMS, true, ""
	}

	traceStartMS := uint64(traceStart) / 1_000_000
	traceEndMS := uint64(traceEnd) / 1_000_000
	if traceStartMS == 0 || traceEndMS == 0 {
		return fromMS, toMS, true, ""
	}

	// Logs can be flushed slightly after the span ends. The trace
	// time range comes from the spans table, so for logs we widen it by the
	// configured padding before clamping. Keep the actual recorded bounds for
	// the user-facing warning so it reports where the trace truly lies, not the
	// padded range.
	actualStartMS, actualEndMS := traceStartMS, traceEndMS
	if q.spec.Signal == telemetrytypes.SignalLogs {
		traceStartMS -= q.builderConfig.logTraceIDWindowPaddingMS
		traceEndMS += q.builderConfig.logTraceIDWindowPaddingMS
	}

	if traceStartMS > toMS || traceEndMS < fromMS {
		traceStartUTC := time.UnixMilli(int64(actualStartMS)).UTC().Format(time.RFC3339)
		traceEndUTC := time.UnixMilli(int64(actualEndMS)).UTC().Format(time.RFC3339)
		return fromMS, toMS, false, fmt.Sprintf(traceOutsideRangeWarn, q.spec.Name, traceStartUTC, traceEndUTC)
	}
	if traceStartMS > fromMS {
		fromMS = traceStartMS
	}
	if traceEndMS < toMS {
		toMS = traceEndMS
	}
	q.logger.DebugContext(ctx, "optimized time range using trace_id lookup",
		slog.String("signal", q.spec.Signal.StringValue()),
		slog.Any("trace_ids", traceIDs),
		slog.Uint64("start", fromMS),
		slog.Uint64("end", toMS))
	return fromMS, toMS, true, ""
}

// emptyResultFor returns an empty result payload appropriate for the given kind.
func emptyResultFor(kind qbtypes.RequestType, queryName string) *qbtypes.Result {
	var value any
	switch kind {
	case qbtypes.RequestTypeTimeSeries:
		value = &qbtypes.TimeSeriesData{QueryName: queryName}
	case qbtypes.RequestTypeScalar:
		value = &qbtypes.ScalarData{QueryName: queryName}
	default:
		value = &qbtypes.RawData{QueryName: queryName}
	}
	return &qbtypes.Result{
		Type:  kind,
		Value: value,
	}
}

// executeWithContext executes the query with query window and step context for partial value detection.
func (q *builderQuery[T]) executeWithContext(ctx context.Context, query string, args []any) (*qbtypes.Result, error) {
	ctx = ctxtypes.NewContextWithCommentVals(ctx, map[string]string{
		instrumentationtypes.TelemetrySignal: q.spec.Signal.StringValue(),
		instrumentationtypes.QueryDuration:   instrumentationtypes.DurationBucket(q.fromMS, q.toMS),
	})

	totalRows := uint64(0)
	totalBytes := uint64(0)
	elapsed := time.Duration(0)

	ctx = clickhouse.Context(ctx, clickhouse.WithProgress(func(p *clickhouse.Progress) {
		totalRows += p.Rows
		totalBytes += p.Bytes
		elapsed += p.Elapsed
	}))

	rows, err := q.telemetryStore.ClickhouseDB().Query(ctx, query, args...)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			return nil, errors.Newf(errors.TypeTimeout, errors.CodeTimeout, "Query timed out").
				WithAdditional("Try refining your search by adding relevant resource attributes filtering")
		}

		if !errors.Is(err, context.Canceled) {
			return nil, errors.Newf(
				errors.TypeInternal,
				errors.CodeInternal,
				"Something went wrong on our end. It's not you, it's us. Our team is notified about it. Reach out to support if issue persists.",
			)
		}

		return nil, err
	}
	defer rows.Close()

	// Pass query window and step for partial value detection
	queryWindow := &qbtypes.TimeRange{From: q.fromMS, To: q.toMS}

	kind := q.kind
	// all metric queries are time series then reduced if required
	if q.spec.Signal == telemetrytypes.SignalMetrics {
		kind = qbtypes.RequestTypeTimeSeries
	}

	payload, err := consume(rows, kind, queryWindow, q.spec.StepInterval, q.spec.Name)
	if err != nil {
		return nil, err
	}

	// TODO: This should move to readAsRaw function in consume.go but for now we are keeping it here since it's only relevant for traces
	if q.spec.Signal == telemetrytypes.SignalTraces {
		if raw, ok := payload.(*qbtypes.RawData); ok {
			for _, rr := range raw.Rows {
				mergeSpanAttributeColumns(rr.Data)
			}
		}
	}

	return &qbtypes.Result{
		Type:  q.kind,
		Value: payload,
		Stats: qbtypes.ExecStats{
			RowsScanned:  totalRows,
			BytesScanned: totalBytes,
			DurationMS:   uint64(elapsed.Milliseconds()),
		},
	}, nil
}

func (q *builderQuery[T]) executeWindowList(ctx context.Context) (*qbtypes.Result, error) {
	isAsc := len(q.spec.Order) > 0 &&
		strings.ToLower(string(q.spec.Order[0].Direction.StringValue())) == "asc"

	fromMS, toMS := q.fromMS, q.toMS

	// Adjust [fromMS,toMS] window if a cursor was supplied
	if cur := strings.TrimSpace(q.spec.Cursor); cur != "" {
		if ts, err := decodeCursor(cur); err == nil {
			if isAsc {
				if uint64(ts) >= fromMS {
					fromMS = uint64(ts + 1)
				}
			} else { // DESC
				if uint64(ts) <= toMS {
					toMS = uint64(ts - 1)
				}
			}
		}
	}

	reqLimit := q.spec.Limit
	if reqLimit == 0 {
		reqLimit = 10_000 // sane upper-bound default
	}
	offsetLeft := q.spec.Offset
	need := reqLimit + offsetLeft // rows to fetch from ClickHouse

	var rows []*qbtypes.RawRow

	totalRows := uint64(0)
	totalBytes := uint64(0)
	start := time.Now()

	// Check if filter contains trace_id(s) and optimize time range if needed.
	// Applies to both traces (the listing this branch was built for) and logs
	// (which carry trace_id and benefit from the same clamp before bucketing).
	if q.spec.Signal == telemetrytypes.SignalTraces || q.spec.Signal == telemetrytypes.SignalLogs {
		var overlap bool
		var warning string
		fromMS, toMS, overlap, warning = q.narrowWindowByTraceID(ctx, fromMS, toMS)
		if !overlap {
			res := &qbtypes.Result{
				Type: qbtypes.RequestTypeRaw,
				Value: &qbtypes.RawData{
					QueryName: q.spec.Name,
				},
				Stats: qbtypes.ExecStats{
					DurationMS: uint64(time.Since(start).Milliseconds()),
				},
			}
			if warning != "" {
				res.Warnings = []string{warning}
			}
			return res, nil
		}
	}

	// Get buckets and reverse them for ascending order
	buckets := makeBuckets(fromMS, toMS)
	if isAsc {
		// Reverse the buckets for ascending order
		for i, j := 0, len(buckets)-1; i < j; i, j = i+1, j-1 {
			buckets[i], buckets[j] = buckets[j], buckets[i]
		}
	}

	var warnings []string
	var warningsDocURL string

	for _, r := range buckets {
		q.spec.Offset = 0
		q.spec.Limit = need

		stmt, err := q.stmtBuilder.Build(ctx, r.fromNS/1e6, r.toNS/1e6, q.kind, q.spec, q.variables)
		if err != nil {
			return nil, err
		}
		warnings = stmt.Warnings
		warningsDocURL = stmt.WarningsDocURL
		// Execute with proper context for partial value detection
		res, err := q.executeWithContext(ctx, stmt.Query, stmt.Args)
		if err != nil {
			return nil, err
		}
		totalRows += res.Stats.RowsScanned
		totalBytes += res.Stats.BytesScanned

		rawRows := res.Value.(*qbtypes.RawData).Rows
		need -= len(rawRows)

		for _, rr := range rawRows {
			if offsetLeft > 0 { // client-requested initial offset
				offsetLeft--
				continue
			}
			rows = append(rows, rr)
			if len(rows) >= reqLimit { // page filled
				break
			}
		}
		if len(rows) >= reqLimit {
			break
		}
	}

	nextCursor := ""
	if len(rows) == reqLimit {
		lastTS := rows[len(rows)-1].Timestamp.UnixMilli()
		nextCursor = encodeCursor(lastTS)
	}

	return &qbtypes.Result{
		Type: qbtypes.RequestTypeRaw,
		Value: &qbtypes.RawData{
			QueryName:  q.spec.Name,
			Rows:       rows,
			NextCursor: nextCursor,
		},
		Warnings:       warnings,
		WarningsDocURL: warningsDocURL,
		Stats: qbtypes.ExecStats{
			RowsScanned:  totalRows,
			BytesScanned: totalBytes,
			DurationMS:   uint64(time.Since(start).Milliseconds()),
		},
	}, nil
}

func encodeCursor(tsMilli int64) string {
	return base64.StdEncoding.EncodeToString([]byte(strconv.FormatInt(tsMilli, 10)))
}

func decodeCursor(cur string) (int64, error) {
	b, err := base64.StdEncoding.DecodeString(cur)
	if err != nil {
		return 0, err
	}
	return strconv.ParseInt(string(b), 10, 64)
}

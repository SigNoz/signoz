package querier

import (
	"context"
	"encoding/base64"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

type builderQuery[T any] struct {
	telemetryStore telemetrystore.TelemetryStore
	stmtBuilder    qbtypes.StatementBuilder[T]
	spec           qbtypes.QueryBuilderQuery[T]
	variables      map[string]qbtypes.VariableItem

	fromMS uint64
	toMS   uint64
	kind   qbtypes.RequestType
}

var _ qbtypes.Query = (*builderQuery[any])(nil)

func newBuilderQuery[T any](
	telemetryStore telemetrystore.TelemetryStore,
	stmtBuilder qbtypes.StatementBuilder[T],
	spec qbtypes.QueryBuilderQuery[T],
	tr qbtypes.TimeRange,
	kind qbtypes.RequestType,
	variables map[string]qbtypes.VariableItem,
) *builderQuery[T] {
	return &builderQuery[T]{
		telemetryStore: telemetryStore,
		stmtBuilder:    stmtBuilder,
		spec:           spec,
		variables:      variables,
		fromMS:         tr.From,
		toMS:           tr.To,
		kind:           kind,
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
				aggParts = append(aggParts, fmt.Sprintf("%s:%s:%s:%s",
					a.MetricName,
					a.Temporality.StringValue(),
					a.TimeAggregation.StringValue(),
					a.SpaceAggregation.StringValue(),
				))
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

func (q *builderQuery[T]) Execute(ctx context.Context) (*qbtypes.Result, error) {

	// can we do window based pagination?
	if q.kind == qbtypes.RequestTypeRaw && q.isWindowList() {
		return q.executeWindowList(ctx)
	}

	stmt, err := q.stmtBuilder.Build(ctx, q.fromMS, q.toMS, q.kind, q.spec, q.variables)
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

// executeWithContext executes the query with query window and step context for partial value detection
func (q *builderQuery[T]) executeWithContext(ctx context.Context, query string, args []any) (*qbtypes.Result, error) {
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

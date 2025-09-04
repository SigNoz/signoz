package querier

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

type traceOperatorQuery struct {
	telemetryStore telemetrystore.TelemetryStore
	stmtBuilder    qbtypes.TraceOperatorStatementBuilder
	spec           qbtypes.QueryBuilderTraceOperator
	compositeQuery *qbtypes.CompositeQuery
	fromMS         uint64
	toMS           uint64
	kind           qbtypes.RequestType
}

var _ qbtypes.Query = (*traceOperatorQuery)(nil)

func (q *traceOperatorQuery) Fingerprint() string {

	if q.kind == qbtypes.RequestTypeRaw {
		return ""
	}

	parts := []string{"trace_operator"}

	parts = append(parts, fmt.Sprintf("expr=%s", q.spec.Expression))

	if err := q.spec.ParseExpression(); err != nil {
		return ""
	}

	referencedQueries := q.spec.CollectReferencedQueries(q.spec.ParsedExpression)

	queryFingerprints := make(map[string]string)

	if q.compositeQuery != nil {
		for _, query := range q.compositeQuery.Queries {
			if query.Type == qbtypes.QueryTypeBuilder {
				switch spec := query.Spec.(type) {
				case qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]:
					if contains(referencedQueries, spec.Name) {
						// Create a temporary builder query to get its fingerprint
						timeRange := qbtypes.TimeRange{From: q.fromMS, To: q.toMS}
						tempQuery := newBuilderQuery(q.telemetryStore, nil, spec, timeRange, q.kind, nil)
						fingerprint := tempQuery.Fingerprint()
						if fingerprint != "" {
							queryFingerprints[spec.Name] = fingerprint
						} else {
							// If any referenced query has no fingerprint, disable caching
							return ""
						}
					}
				}
			}
		}
	}

	// Add referenced query fingerprints in sorted order for consistency
	if len(queryFingerprints) > 0 {
		var sortedNames []string
		for name := range queryFingerprints {
			sortedNames = append(sortedNames, name)
		}
		sort.Strings(sortedNames)

		for _, name := range sortedNames {
			parts = append(parts, fmt.Sprintf("ref_%s=%s", name, queryFingerprints[name]))
		}
	}

	// Add time range since it affects the query results
	parts = append(parts, fmt.Sprintf("from=%d", q.fromMS))
	parts = append(parts, fmt.Sprintf("to=%d", q.toMS))

	// Add returnSpansFrom if specified
	if q.spec.ReturnSpansFrom != "" {
		parts = append(parts, fmt.Sprintf("return=%s", q.spec.ReturnSpansFrom))
	}

	// Add step interval if present
	parts = append(parts, fmt.Sprintf("step=%s", q.spec.StepInterval.String()))

	// Add filter if present
	if q.spec.Filter != nil && q.spec.Filter.Expression != "" {
		parts = append(parts, fmt.Sprintf("filter=%s", q.spec.Filter.Expression))
	}

	// Add aggregations
	if len(q.spec.Aggregations) > 0 {
		aggParts := []string{}
		for _, agg := range q.spec.Aggregations {
			aggParts = append(aggParts, agg.Expression)
		}
		parts = append(parts, fmt.Sprintf("aggs=[%s]", strings.Join(aggParts, ",")))
	}

	// Add group by
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

	// Add limit
	if q.spec.Limit > 0 {
		parts = append(parts, fmt.Sprintf("limit=%d", q.spec.Limit))
	}

	return strings.Join(parts, "&")
}

func (q *traceOperatorQuery) Window() (uint64, uint64) {
	return q.fromMS, q.toMS
}

func (q *traceOperatorQuery) Execute(ctx context.Context) (*qbtypes.Result, error) {
	stmt, err := q.stmtBuilder.Build(
		ctx,
		q.fromMS,
		q.toMS,
		q.kind,
		q.spec,
		q.compositeQuery,
	)
	if err != nil {
		return nil, err
	}

	// Execute the query with proper context
	result, err := q.executeWithContext(ctx, stmt.Query, stmt.Args)
	if err != nil {
		return nil, err
	}
	result.Warnings = stmt.Warnings
	return result, nil
}

func (q *traceOperatorQuery) executeWithContext(ctx context.Context, query string, args []any) (*qbtypes.Result, error) {
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
		return nil, err
	}
	defer rows.Close()

	// Pass query window and step for partial value detection
	queryWindow := &qbtypes.TimeRange{From: q.fromMS, To: q.toMS}

	// Use the consume function like builderQuery does
	payload, err := consume(rows, q.kind, queryWindow, q.spec.StepInterval, q.spec.Name)
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

// contains checks if a slice contains a specific string
func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

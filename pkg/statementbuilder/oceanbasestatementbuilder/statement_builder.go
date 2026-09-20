// Package oceanbasestatementbuilder implements the SQL dialect injected into
// SigNoz's existing querier. It does not execute queries or shape API responses.
package oceanbasestatementbuilder

import (
	"context"
	"fmt"
	"math"
	"regexp"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	schema "github.com/SigNoz/signoz/pkg/telemetryschema/oceanbasetelemetryschema"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/huandu/go-sqlbuilder"
)

type Builder[T any] struct {
	config telemetrystore.OceanBaseConfig
}

func New[T any](config telemetrystore.OceanBaseConfig) *Builder[T] {
	return &Builder[T]{config: config}
}

func (b *Builder[T]) Build(ctx context.Context, orgID valuer.UUID, start, end uint64, kind qbtypes.RequestType, query qbtypes.QueryBuilderQuery[T], variables map[string]qbtypes.VariableItem) (*qbtypes.Statement, error) {
	if orgID.IsZero() {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "organization is required")
	}
	if start >= end || end > math.MaxInt64/1000000 || end-start > uint64(b.config.MaxQueryRange.Milliseconds()) {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid or excessive OceanBase query time range")
	}
	if query.Source != telemetrytypes.SourceUnspecified {
		return nil, telemetrystore.Unsupported("query source " + query.Source.StringValue())
	}
	if query.LimitBy != nil || query.Having != nil || len(query.SecondaryAggregations) != 0 {
		return nil, telemetrystore.Unsupported("limitBy, having or secondary aggregations")
	}
	if kind != qbtypes.RequestTypeRaw && kind != qbtypes.RequestTypeRawStream && kind != qbtypes.RequestTypeScalar && kind != qbtypes.RequestTypeTimeSeries {
		return nil, telemetrystore.Unsupported("request type " + kind.StringValue())
	}
	if query.Offset < 0 {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "offset must not be negative")
	}
	table, err := schema.Table(b.config.TablePrefix, query.Signal)
	if err != nil {
		return nil, err
	}
	sb := sqlbuilder.NewSelectBuilder()
	sb.SetFlavor(sqlbuilder.MySQL)
	sb.From(table)
	sb.Where(sb.E("org_id", orgID.StringValue()), sb.GE("timestamp", start*1000000), sb.L("timestamp", end*1000000))
	stmt := &qbtypes.Statement{}
	if query.Filter != nil && strings.TrimSpace(query.Filter.Expression) != "" {
		where, err := querybuilder.PrepareWhereClause(query.Filter.Expression, querybuilder.FilterExprVisitorOpts{
			Context: ctx, Builder: sb, Storage: schema.ConditionBuilder{Signal: query.Signal}, Variables: variables,
			Query: qbtypes.QueryInfo{Signal: query.Signal, StartNs: start * 1000000, EndNs: end * 1000000},
		})
		if err != nil {
			return nil, err
		}
		if where.IsEmpty() {
			return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "OceanBase filter produced no predicate")
		}
		sb.AddWhereClause(where.WhereClause)
		stmt.Warnings, stmt.WarningsDocURL = where.Warnings, where.WarningsDocURL
	}
	limit := query.Limit
	if limit <= 0 {
		limit = 100
	}
	if limit > b.config.MaxResultRows {
		limit = b.config.MaxResultRows
	}
	var selects, groups []string
	if kind == qbtypes.RequestTypeRaw || kind == qbtypes.RequestTypeRawStream {
		fields := query.SelectFields
		if len(fields) == 0 {
			fields = defaultFields(query.Signal)
		}
		selects = append(selects, "timestamp")
		for i, key := range fields {
			if key.Name == "timestamp" {
				continue
			}
			field, err := schema.Field(query.Signal, key)
			if err != nil {
				return nil, err
			}
			switch key.Name {
			case "attributes", "resource", "resource_attributes", "scope_attributes":
				field = "JSON_EXTRACT(" + field + ", '$')"
			}
			selects = append(selects, field+" AS "+schema.Alias(fmt.Sprintf("__SELECT_KEY_%d_%s", i, key.Name)))
		}
		if len(query.Order) == 0 {
			sb.OrderBy("timestamp DESC")
		}
		for _, order := range query.Order {
			field, err := schema.Field(query.Signal, order.Key.TelemetryFieldKey)
			if err != nil {
				return nil, err
			}
			direction := strings.ToUpper(order.Direction.StringValue())
			if direction != "ASC" && direction != "DESC" {
				return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid sort direction")
			}
			sb.OrderBy(field + " " + direction)
		}
		sb.Limit(limit).Offset(query.Offset)
	} else {
		if len(query.Aggregations) == 0 {
			return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "aggregation is required")
		}
		if query.Signal == telemetrytypes.SignalMetrics {
			return b.buildMetrics(ctx, sb, stmt, kind, query, limit)
		}
		if kind == qbtypes.RequestTypeTimeSeries {
			step := query.StepInterval.Milliseconds()
			if step <= 0 {
				return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "stepInterval must be positive")
			}
			// Use UTC datetime arithmetic, independent of the SQL session timezone.
			selects = append(selects, fmt.Sprintf("CAST(TIMESTAMPADD(MICROSECOND, (timestamp DIV %d) * %d, CAST('1970-01-01 00:00:00' AS DATETIME(6))) AS DATETIME(6)) AS ts", step*1000000, step*1000))
			groups = append(groups, "ts")
			sb.OrderBy("ts ASC")
			limit = b.config.MaxResultRows + 1
		}
		for i, group := range query.GroupBy {
			field, err := schema.Field(query.Signal, group.TelemetryFieldKey)
			if err != nil {
				return nil, err
			}
			alias := schema.Alias(fmt.Sprintf("__GROUP_BY_KEY_%d_%s", i, group.Name))
			selects = append(selects, "CAST("+field+" AS CHAR) AS "+alias)
			groups = append(groups, alias)
		}
		for i, aggregation := range query.Aggregations {
			var expression string
			switch agg := any(aggregation).(type) {
			case qbtypes.TraceAggregation:
				expression = agg.Expression
			case qbtypes.LogAggregation:
				expression = agg.Expression
			default:
				return nil, telemetrystore.Unsupported("aggregation type")
			}
			expr, err := aggregate(query.Signal, expression)
			if err != nil {
				return nil, err
			}
			selects = append(selects, expr+fmt.Sprintf(" AS __result_%d", i))
		}
		if len(query.Order) != 0 {
			return nil, telemetrystore.Unsupported("aggregate ordering")
		}
		if len(groups) != 0 {
			sb.GroupBy(groups...)
		}
		sb.Limit(limit)
	}
	sb.Select(selects...)
	stmt.Query, stmt.Args = sb.Build()
	return stmt, nil
}

var aggregationPattern = regexp.MustCompile(`(?i)^\s*(count|count_distinct|countdistinct|sum|avg|min|max)\s*\(\s*([a-z_][a-z0-9_.:/-]*)?\s*\)\s*$`)

func aggregate(signal telemetrytypes.Signal, expression string) (string, error) {
	match := aggregationPattern.FindStringSubmatch(expression)
	if match == nil {
		return "", telemetrystore.Unsupported("aggregation " + expression)
	}
	op := strings.ToUpper(match[1])
	if op == "COUNT" && match[2] == "" {
		return "COUNT(*)", nil
	}
	if match[2] == "" {
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "aggregation requires a field")
	}
	field, err := schema.Field(signal, telemetrytypes.GetFieldKeyFromKeyText(match[2]))
	if err != nil {
		return "", err
	}
	if op == "COUNT_DISTINCT" || op == "COUNTDISTINCT" {
		return "COUNT(DISTINCT " + field + ")", nil
	}
	if op != "COUNT" {
		field = schema.Numeric(field)
	}
	return op + "(" + field + ")", nil
}

func defaultFields(signal telemetrytypes.Signal) []telemetrytypes.TelemetryFieldKey {
	names := []string{"space_id", "user_id", "agent_product", "session_id", "service.name", "attributes", "resource"}
	switch signal {
	case telemetrytypes.SignalTraces:
		names = append(names, "trace_id", "span_id", "parent_span_id", "name", "duration_nano", "status_code", "events", "links")
	case telemetrytypes.SignalLogs:
		names = append(names, "id", "trace_id", "span_id", "body", "severity_text", "event_name")
	case telemetrytypes.SignalMetrics:
		names = append(names, "metric_name", "metric_type", "value", "unit")
	}
	fields := make([]telemetrytypes.TelemetryFieldKey, 0, len(names))
	for _, name := range names {
		fields = append(fields, telemetrytypes.TelemetryFieldKey{Name: name, Signal: signal})
	}
	return fields
}

type UnsupportedBuilder[T any] struct{ Feature string }

func (b UnsupportedBuilder[T]) Build(context.Context, valuer.UUID, uint64, uint64, qbtypes.RequestType, qbtypes.QueryBuilderQuery[T], map[string]qbtypes.VariableItem) (*qbtypes.Statement, error) {
	return nil, telemetrystore.Unsupported(b.Feature)
}

type UnsupportedTraceOperator struct{}

func (UnsupportedTraceOperator) Build(context.Context, valuer.UUID, uint64, uint64, qbtypes.RequestType, qbtypes.QueryBuilderTraceOperator, *qbtypes.CompositeQuery) (*qbtypes.Statement, error) {
	return nil, telemetrystore.Unsupported("trace operators")
}

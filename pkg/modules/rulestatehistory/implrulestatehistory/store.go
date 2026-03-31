package implrulestatehistory

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/rulestatehistorytypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	sqlbuilder "github.com/huandu/go-sqlbuilder"
)

const (
	signozHistoryDBName       = "signoz_analytics"
	ruleStateHistoryTableName = "distributed_rule_state_history_v0"
)

type store struct {
	telemetryStore         telemetrystore.TelemetryStore
	telemetryMetadataStore telemetrytypes.MetadataStore
	fieldMapper            qbtypes.FieldMapper
	conditionBuilder       qbtypes.ConditionBuilder
	logger                 *slog.Logger
}

func NewStore(telemetryStore telemetrystore.TelemetryStore, telemetryMetadataStore telemetrytypes.MetadataStore, logger *slog.Logger) rulestatehistorytypes.Store {
	fm := newFieldMapper()
	return &store{
		telemetryStore:         telemetryStore,
		telemetryMetadataStore: telemetryMetadataStore,
		fieldMapper:            fm,
		conditionBuilder:       newConditionBuilder(fm),
		logger:                 logger,
	}
}

func (s *store) AddRuleStateHistory(ctx context.Context, entries []rulestatehistorytypes.RuleStateHistory) error {
	ib := sqlbuilder.NewInsertBuilder()
	ib.InsertInto(historyTable())
	ib.Cols(
		"rule_id",
		"rule_name",
		"overall_state",
		"overall_state_changed",
		"state",
		"state_changed",
		"unix_milli",
		"labels",
		"fingerprint",
		"value",
	)
	insertQuery, _ := ib.BuildWithFlavor(sqlbuilder.ClickHouse)

	statement, err := s.telemetryStore.ClickhouseDB().PrepareBatch(
		ctx,
		insertQuery,
	)
	if err != nil {
		return err
	}
	defer statement.Abort() //nolint:errcheck

	for _, history := range entries {
		if err = statement.Append(
			history.RuleID,
			history.RuleName,
			history.OverallState,
			history.OverallStateChanged,
			history.State,
			history.StateChanged,
			history.UnixMilli,
			history.Labels,
			history.Fingerprint,
			history.Value,
		); err != nil {
			return err
		}
	}
	return statement.Send()
}

func (s *store) GetLastSavedRuleStateHistory(ctx context.Context, ruleID string) ([]rulestatehistorytypes.RuleStateHistory, error) {
	sb := sqlbuilder.NewSelectBuilder()
	sb.Select("*")
	sb.From(historyTable())
	sb.Where(sb.E("rule_id", ruleID))
	sb.Where(sb.E("state_changed", true))
	sb.OrderBy("unix_milli DESC")
	sb.SQL("LIMIT 1 BY fingerprint")

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	history := make([]rulestatehistorytypes.RuleStateHistory, 0)
	if err := s.telemetryStore.ClickhouseDB().Select(ctx, &history, query, args...); err != nil {
		return nil, err
	}
	return history, nil
}

func (s *store) ReadRuleStateHistoryByRuleID(ctx context.Context, ruleID string, query *rulestatehistorytypes.Query) ([]rulestatehistorytypes.RuleStateHistory, uint64, error) {
	sb := sqlbuilder.NewSelectBuilder()
	sb.Select(
		"rule_id",
		"rule_name",
		"overall_state",
		"overall_state_changed",
		"state",
		"state_changed",
		"unix_milli",
		"labels",
		"fingerprint",
		"value",
	)
	sb.From(historyTable())
	s.applyBaseHistoryFilters(sb, ruleID, query)

	whereClause, err := s.buildFilterClause(ctx, query.FilterExpression, query.Start, query.End)
	if err != nil {
		return nil, 0, err
	}
	if whereClause != nil {
		sb.AddWhereClause(sqlbuilder.CopyWhereClause(whereClause))
	}

	sb.OrderBy(fmt.Sprintf("unix_milli %s", strings.ToUpper(query.Order.StringValue())))
	sb.Limit(int(query.Limit))
	sb.Offset(int(query.Offset))

	selectQuery, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	history := []rulestatehistorytypes.RuleStateHistory{}
	if err := s.telemetryStore.ClickhouseDB().Select(ctx, &history, selectQuery, args...); err != nil {
		return nil, 0, err
	}

	countSB := sqlbuilder.NewSelectBuilder()
	countSB.Select("count(*)")
	countSB.From(historyTable())
	s.applyBaseHistoryFilters(countSB, ruleID, query)
	if whereClause != nil {
		countSB.AddWhereClause(sqlbuilder.CopyWhereClause(whereClause))
	}

	var total uint64
	countQuery, countArgs := countSB.BuildWithFlavor(sqlbuilder.ClickHouse)
	if err := s.telemetryStore.ClickhouseDB().QueryRow(ctx, countQuery, countArgs...).Scan(&total); err != nil {
		return nil, 0, err
	}

	return history, total, nil
}

func (s *store) ReadRuleStateHistoryFilterKeysByRuleID(ctx context.Context, ruleID string, query *rulestatehistorytypes.Query, search string, limit int64) (*telemetrytypes.GettableFieldKeys, error) {
	if limit <= 0 {
		limit = 50
	}

	sb := sqlbuilder.NewSelectBuilder()
	keyExpr := "arrayJoin(JSONExtractKeys(labels))"
	sb.Select(fmt.Sprintf("DISTINCT %s AS key", keyExpr))
	sb.From(historyTable())
	s.applyBaseHistoryFilters(sb, ruleID, query)
	sb.Where(fmt.Sprintf("%s != ''", keyExpr))

	search = strings.TrimSpace(search)
	if search != "" {
		sb.Where(fmt.Sprintf("positionCaseInsensitiveUTF8(%s, %s) > 0", keyExpr, sb.Var(search)))
	}

	whereClause, err := s.buildFilterClause(ctx, query.FilterExpression, query.Start, query.End)
	if err != nil {
		return nil, err
	}
	if whereClause != nil {
		sb.AddWhereClause(sqlbuilder.CopyWhereClause(whereClause))
	}

	sb.OrderBy("key ASC")
	sb.Limit(int(limit + 1))
	selectQuery, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	rows, err := s.telemetryStore.ClickhouseDB().Query(ctx, selectQuery, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	keys := make([]string, 0, limit+1)
	for rows.Next() {
		var key string
		if err := rows.Scan(&key); err != nil {
			return nil, err
		}
		key = strings.TrimSpace(key)
		if key != "" {
			keys = append(keys, key)
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	complete := true
	if int64(len(keys)) > limit {
		keys = keys[:int(limit)]
		complete = false
	}

	keysMap := make(map[string][]*telemetrytypes.TelemetryFieldKey, len(keys))
	for _, key := range keys {
		fieldKey := &telemetrytypes.TelemetryFieldKey{
			Name:          key,
			FieldDataType: telemetrytypes.FieldDataTypeString,
		}
		keysMap[key] = []*telemetrytypes.TelemetryFieldKey{fieldKey}
	}

	return &telemetrytypes.GettableFieldKeys{
		Keys:     keysMap,
		Complete: complete,
	}, nil
}

func (s *store) ReadRuleStateHistoryFilterValuesByRuleID(ctx context.Context, ruleID string, key string, query *rulestatehistorytypes.Query, search string, limit int64) (*telemetrytypes.GettableFieldValues, error) {
	if limit <= 0 {
		limit = 50
	}

	sb := sqlbuilder.NewSelectBuilder()
	valExpr := fmt.Sprintf("JSONExtractString(labels, %s)", sb.Var(key))
	sb.Select(fmt.Sprintf("DISTINCT %s AS val", valExpr))
	sb.From(historyTable())
	s.applyBaseHistoryFilters(sb, ruleID, query)
	sb.Where(fmt.Sprintf("JSONHas(labels, %s)", sb.Var(key)))
	sb.Where(fmt.Sprintf("%s != ''", valExpr))

	search = strings.TrimSpace(search)
	if search != "" {
		sb.Where(fmt.Sprintf("positionCaseInsensitiveUTF8(%s, %s) > 0", valExpr, sb.Var(search)))
	}

	whereClause, err := s.buildFilterClause(ctx, query.FilterExpression, query.Start, query.End)
	if err != nil {
		return nil, err
	}
	if whereClause != nil {
		sb.AddWhereClause(sqlbuilder.CopyWhereClause(whereClause))
	}

	sb.OrderBy("val ASC")
	sb.Limit(int(limit + 1))
	selectQuery, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	rows, err := s.telemetryStore.ClickhouseDB().Query(ctx, selectQuery, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	values := make([]string, 0, limit+1)
	for rows.Next() {
		var value string
		if err := rows.Scan(&value); err != nil {
			return nil, err
		}
		value = strings.TrimSpace(value)
		if value != "" {
			values = append(values, value)
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	complete := true
	if int64(len(values)) > limit {
		values = values[:int(limit)]
		complete = false
	}

	return &telemetrytypes.GettableFieldValues{
		Values: &telemetrytypes.TelemetryFieldValues{
			StringValues: values,
		},
		Complete: complete,
	}, nil
}

func (s *store) ReadRuleStateHistoryTopContributorsByRuleID(ctx context.Context, ruleID string, query *rulestatehistorytypes.Query) ([]rulestatehistorytypes.RuleStateHistoryContributor, error) {
	sb := sqlbuilder.NewSelectBuilder()
	sb.Select(
		"fingerprint",
		"argMax(labels, unix_milli) AS labels",
		"count(*) AS count",
	)
	sb.From(historyTable())
	sb.Where(sb.E("rule_id", ruleID))
	sb.Where(sb.E("state_changed", true))
	sb.Where(sb.E("state", rulestatehistorytypes.StateFiring.StringValue()))
	sb.Where(sb.GE("unix_milli", query.Start))
	sb.Where(sb.LT("unix_milli", query.End))

	whereClause, err := s.buildFilterClause(ctx, query.FilterExpression, query.Start, query.End)
	if err != nil {
		return nil, err
	}
	if whereClause != nil {
		sb.AddWhereClause(sqlbuilder.CopyWhereClause(whereClause))
	}

	sb.GroupBy("fingerprint")
	sb.Having("labels != '{}'")
	sb.OrderBy("count DESC")
	selectQuery, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	contributors := []rulestatehistorytypes.RuleStateHistoryContributor{}
	if err := s.telemetryStore.ClickhouseDB().Select(ctx, &contributors, selectQuery, args...); err != nil {
		return nil, err
	}
	return contributors, nil
}

func (s *store) GetOverallStateTransitions(ctx context.Context, ruleID string, query *rulestatehistorytypes.Query) ([]rulestatehistorytypes.GettableRuleStateWindow, error) {
	innerSB := sqlbuilder.NewSelectBuilder()

	eventsSubquery := fmt.Sprintf(
		`SELECT %s AS ts, if(count(*) = 0, %s, argMax(overall_state, unix_milli)) AS state
FROM %s
WHERE rule_id = %s
  AND unix_milli <= %s
UNION ALL
SELECT unix_milli AS ts, anyLast(overall_state) AS state
FROM %s
WHERE rule_id = %s
  AND overall_state_changed = true
  AND unix_milli > %s
  AND unix_milli < %s
GROUP BY unix_milli`,
		innerSB.Var(query.Start),
		innerSB.Var(rulestatehistorytypes.StateInactive.StringValue()),
		historyTable(),
		innerSB.Var(ruleID),
		innerSB.Var(query.Start),
		historyTable(),
		innerSB.Var(ruleID),
		innerSB.Var(query.Start),
		innerSB.Var(query.End),
	)

	innerSB.Select(
		"state",
		"ts AS start",
		fmt.Sprintf(
			"ifNull(leadInFrame(toNullable(ts), 1) OVER (ORDER BY ts ASC ROWS BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING), %s) AS end",
			innerSB.Var(query.End),
		),
	)
	innerSB.From(fmt.Sprintf("(%s) AS events", eventsSubquery))
	innerSB.OrderBy("start ASC")
	innerQuery, args := innerSB.BuildWithFlavor(sqlbuilder.ClickHouse)

	outerSB := sqlbuilder.NewSelectBuilder()
	outerSB.Select("state", "start", "end")
	outerSB.From(fmt.Sprintf("(%s) AS windows", innerQuery))
	outerSB.Where("start < end")
	selectQuery, outerArgs := outerSB.BuildWithFlavor(sqlbuilder.ClickHouse)
	args = append(args, outerArgs...)

	windows := []rulestatehistorytypes.GettableRuleStateWindow{}
	if err := s.telemetryStore.ClickhouseDB().Select(ctx, &windows, selectQuery, args...); err != nil {
		return nil, err
	}

	return windows, nil
}

func (s *store) GetAvgResolutionTime(ctx context.Context, ruleID string, query *rulestatehistorytypes.Query) (float64, error) {
	cte := s.buildMatchedEventsCTE(ruleID, query)
	sb := cte.Select("ifNull(toFloat64(avg(resolution_time - firing_time)) / 1000, 0) AS avg_resolution_time")
	sb.From("matched_events")
	selectQuery, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	var avg float64
	if err := s.telemetryStore.ClickhouseDB().QueryRow(ctx, selectQuery, args...).Scan(&avg); err != nil {
		return 0, err
	}
	return avg, nil
}

func (s *store) GetAvgResolutionTimeByInterval(ctx context.Context, ruleID string, query *rulestatehistorytypes.Query) (*qbtypes.TimeSeries, error) {
	step := minStepSeconds(query.Start, query.End)
	cte := s.buildMatchedEventsCTE(ruleID, query)
	sb := cte.Select(
		fmt.Sprintf("toFloat64(avg(resolution_time - firing_time)) / 1000 AS value, toStartOfInterval(toDateTime(intDiv(firing_time, 1000)), INTERVAL %d SECOND) AS ts", step),
	)
	sb.From("matched_events")
	sb.GroupBy("ts")
	sb.OrderBy("ts ASC")
	selectQuery, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	return s.querySeries(ctx, selectQuery, args...)
}

func (s *store) GetTotalTriggers(ctx context.Context, ruleID string, query *rulestatehistorytypes.Query) (uint64, error) {
	sb := sqlbuilder.NewSelectBuilder()
	sb.Select("count(*)")
	sb.From(historyTable())
	sb.Where(sb.E("rule_id", ruleID))
	sb.Where(sb.E("state_changed", true))
	sb.Where(sb.E("state", rulestatehistorytypes.StateFiring.StringValue()))
	sb.Where(sb.GE("unix_milli", query.Start))
	sb.Where(sb.LT("unix_milli", query.End))
	selectQuery, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	var total uint64
	if err := s.telemetryStore.ClickhouseDB().QueryRow(ctx, selectQuery, args...).Scan(&total); err != nil {
		return 0, err
	}
	return total, nil
}

func (s *store) GetTriggersByInterval(ctx context.Context, ruleID string, query *rulestatehistorytypes.Query) (*qbtypes.TimeSeries, error) {
	step := minStepSeconds(query.Start, query.End)
	sb := sqlbuilder.NewSelectBuilder()
	sb.Select(
		fmt.Sprintf("toFloat64(count(*)) AS value, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), INTERVAL %d SECOND) AS ts", step),
	)
	sb.From(historyTable())
	sb.Where(sb.E("rule_id", ruleID))
	sb.Where(sb.E("state_changed", true))
	sb.Where(sb.E("state", rulestatehistorytypes.StateFiring.StringValue()))
	sb.Where(sb.GE("unix_milli", query.Start))
	sb.Where(sb.LT("unix_milli", query.End))
	sb.GroupBy("ts")
	sb.OrderBy("ts ASC")
	selectQuery, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	return s.querySeries(ctx, selectQuery, args...)
}

func (s *store) querySeries(ctx context.Context, selectQuery string, args ...any) (*qbtypes.TimeSeries, error) {
	rows, err := s.telemetryStore.ClickhouseDB().Query(ctx, selectQuery, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	series := &qbtypes.TimeSeries{
		Labels: []*qbtypes.Label{},
		Values: []*qbtypes.TimeSeriesValue{},
	}

	for rows.Next() {
		var value float64
		var ts time.Time
		if err := rows.Scan(&value, &ts); err != nil {
			return nil, err
		}
		series.Values = append(series.Values, &qbtypes.TimeSeriesValue{
			Timestamp: ts.UnixMilli(),
			Value:     value,
		})
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return series, nil
}

func (s *store) buildFilterClause(ctx context.Context, filter qbtypes.Filter, startMillis, endMillis int64) (*sqlbuilder.WhereClause, error) {
	expression := strings.TrimSpace(filter.Expression)
	if expression == "" {
		return nil, nil //nolint:nilnil
	}

	selectors := querybuilder.QueryStringToKeysSelectors(expression)
	for i := range selectors {
		selectors[i].SelectorMatchType = telemetrytypes.FieldSelectorMatchTypeExact
	}

	fieldKeys, _, err := s.telemetryMetadataStore.GetKeysMulti(ctx, selectors)
	if err != nil || len(fieldKeys) == 0 {
		fieldKeys = map[string][]*telemetrytypes.TelemetryFieldKey{}
		for _, sel := range selectors {
			fieldKeys[sel.Name] = []*telemetrytypes.TelemetryFieldKey{{
				Name:          sel.Name,
				Signal:        sel.Signal,
				FieldContext:  sel.FieldContext,
				FieldDataType: sel.FieldDataType,
			}}
		}
	}

	opts := querybuilder.FilterExprVisitorOpts{
		Logger:           s.logger,
		FieldMapper:      s.fieldMapper,
		ConditionBuilder: s.conditionBuilder,
		FieldKeys:        fieldKeys,
		FullTextColumn:   &telemetrytypes.TelemetryFieldKey{Name: "labels", FieldContext: telemetrytypes.FieldContextAttribute},
	}

	opts.StartNs = querybuilder.ToNanoSecs(uint64(startMillis))
	opts.EndNs = querybuilder.ToNanoSecs(uint64(endMillis))
	prepared, err := querybuilder.PrepareWhereClause(expression, opts)
	if err != nil {
		return nil, err
	}
	if prepared == nil || prepared.WhereClause == nil {
		return nil, nil //nolint:nilnil
	}
	return prepared.WhereClause, nil
}

func (s *store) applyBaseHistoryFilters(sb *sqlbuilder.SelectBuilder, ruleID string, query *rulestatehistorytypes.Query) {
	sb.Where(sb.E("rule_id", ruleID))
	sb.Where(sb.GE("unix_milli", query.Start))
	sb.Where(sb.LT("unix_milli", query.End))
	if !query.State.IsZero() {
		sb.Where(sb.E("state", query.State.StringValue()))
	}
}

func (s *store) buildMatchedEventsCTE(ruleID string, query *rulestatehistorytypes.Query) *sqlbuilder.CTEBuilder {
	firingSB := sqlbuilder.NewSelectBuilder()
	firingSB.Select("rule_id", "unix_milli AS firing_time")
	firingSB.From(historyTable())
	firingSB.Where(firingSB.E("overall_state", rulestatehistorytypes.StateFiring.StringValue()))
	firingSB.Where(firingSB.E("overall_state_changed", true))
	firingSB.Where(firingSB.E("rule_id", ruleID))
	firingSB.Where(firingSB.GE("unix_milli", query.Start))
	firingSB.Where(firingSB.LT("unix_milli", query.End))

	resolutionSB := sqlbuilder.NewSelectBuilder()
	resolutionSB.Select("rule_id", "unix_milli AS resolution_time")
	resolutionSB.From(historyTable())
	resolutionSB.Where(resolutionSB.E("overall_state", rulestatehistorytypes.StateInactive.StringValue()))
	resolutionSB.Where(resolutionSB.E("overall_state_changed", true))
	resolutionSB.Where(resolutionSB.E("rule_id", ruleID))
	resolutionSB.Where(resolutionSB.GE("unix_milli", query.Start))
	resolutionSB.Where(resolutionSB.LT("unix_milli", query.End))

	matchedSB := sqlbuilder.NewSelectBuilder()
	matchedSB.Select("f.rule_id", "f.firing_time", "min(r.resolution_time) AS resolution_time")
	matchedSB.From("firing_events f")
	matchedSB.JoinWithOption(sqlbuilder.LeftJoin, "resolution_events r", "f.rule_id = r.rule_id")
	matchedSB.Where("r.resolution_time > f.firing_time")
	matchedSB.GroupBy("f.rule_id", "f.firing_time")

	return sqlbuilder.With(
		sqlbuilder.CTEQuery("firing_events").As(firingSB),
		sqlbuilder.CTEQuery("resolution_events").As(resolutionSB),
		sqlbuilder.CTEQuery("matched_events").As(matchedSB),
	)
}

func historyTable() string {
	return fmt.Sprintf("%s.%s", signozHistoryDBName, ruleStateHistoryTableName)
}

func minStepSeconds(start, end int64) int64 {
	if end <= start {
		return 60
	}
	rangeSeconds := (end - start) / 1000
	if rangeSeconds <= 0 {
		return 60
	}
	step := rangeSeconds / 120
	return max(step, int64(60))
}

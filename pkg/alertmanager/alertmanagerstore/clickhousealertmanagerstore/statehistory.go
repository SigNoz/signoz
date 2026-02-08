package clickhousealertmanagerstore

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

const (
	signozHistoryDBName       = "signoz_analytics"
	ruleStateHistoryTableName = "distributed_rule_state_history_v2"

	maxPointsInTimeSeries = 300
)

type stateHistoryStore struct {
	conn clickhouse.Conn
}

func NewStateHistoryStore(conn clickhouse.Conn) alertmanagertypes.StateHistoryStore {
	return &stateHistoryStore{conn: conn}
}

func (s *stateHistoryStore) WriteRuleStateHistory(ctx context.Context, entries []alertmanagertypes.RuleStateHistory) error {
	if len(entries) == 0 {
		return nil
	}

	statement, err := s.conn.PrepareBatch(ctx, fmt.Sprintf(
		"INSERT INTO %s.%s (org_id, rule_id, rule_name, overall_state, overall_state_changed, state, state_changed, unix_milli, labels, fingerprint, value) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)",
		signozHistoryDBName, ruleStateHistoryTableName))
	if err != nil {
		return err
	}
	defer statement.Abort()

	for _, h := range entries {
		if err := statement.Append(
			h.OrgID,
			h.RuleID, h.RuleName,
			h.OverallState, h.OverallStateChanged,
			h.State, h.StateChanged,
			h.UnixMilli, h.Labels,
			h.Fingerprint, h.Value,
		); err != nil {
			return err
		}
	}

	return statement.Send()
}

func (s *stateHistoryStore) GetLastSavedRuleStateHistory(ctx context.Context, ruleID string) ([]alertmanagertypes.RuleStateHistory, error) {
	query := fmt.Sprintf(
		"SELECT org_id, rule_id, rule_name, overall_state, overall_state_changed, state, state_changed, unix_milli, labels, fingerprint, value FROM %s.%s WHERE rule_id = '%s' AND state_changed = true ORDER BY unix_milli DESC LIMIT 1 BY fingerprint",
		signozHistoryDBName, ruleStateHistoryTableName, ruleID)

	rows, err := s.conn.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []alertmanagertypes.RuleStateHistory
	for rows.Next() {
		var h alertmanagertypes.RuleStateHistory
		if err := rows.Scan(
			&h.OrgID,
			&h.RuleID, &h.RuleName,
			&h.OverallState, &h.OverallStateChanged,
			&h.State, &h.StateChanged,
			&h.UnixMilli, &h.Labels,
			&h.Fingerprint, &h.Value,
		); err != nil {
			return nil, err
		}
		results = append(results, h)
	}

	return results, rows.Err()
}

func (s *stateHistoryStore) GetRuleStateHistoryTimeline(
	ctx context.Context, orgID string, ruleID string, params *alertmanagertypes.QueryRuleStateHistory,
) (*alertmanagertypes.RuleStateTimeline, error) {
	var conditions []string

	conditions = append(conditions, fmt.Sprintf("org_id = '%s'", orgID))
	conditions = append(conditions, fmt.Sprintf("rule_id = '%s'", ruleID))
	conditions = append(conditions, fmt.Sprintf("unix_milli >= %d AND unix_milli < %d", params.Start, params.End))

	if params.State.StringValue() != "" {
		conditions = append(conditions, fmt.Sprintf("state = '%s'", params.State.StringValue()))
	}

	whereClause := strings.Join(conditions, " AND ")

	// Main query — paginated results.
	query := fmt.Sprintf(
		"SELECT org_id, rule_id, rule_name, overall_state, overall_state_changed, state, state_changed, unix_milli, labels, fingerprint, value FROM %s.%s WHERE %s ORDER BY unix_milli %s LIMIT %d OFFSET %d",
		signozHistoryDBName, ruleStateHistoryTableName, whereClause, params.Order.StringValue(), params.Limit, params.Offset)

	rows, err := s.conn.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []alertmanagertypes.RuleStateHistory
	for rows.Next() {
		var h alertmanagertypes.RuleStateHistory
		if err := rows.Scan(
			&h.OrgID,
			&h.RuleID, &h.RuleName,
			&h.OverallState, &h.OverallStateChanged,
			&h.State, &h.StateChanged,
			&h.UnixMilli, &h.Labels,
			&h.Fingerprint, &h.Value,
		); err != nil {
			return nil, err
		}
		items = append(items, h)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Count query.
	var total uint64
	countQuery := fmt.Sprintf("SELECT count(*) FROM %s.%s WHERE %s",
		signozHistoryDBName, ruleStateHistoryTableName, whereClause)
	if err := s.conn.QueryRow(ctx, countQuery).Scan(&total); err != nil {
		return nil, err
	}

	// Labels query — distinct labels for the rule.
	labelsQuery := fmt.Sprintf("SELECT DISTINCT labels FROM %s.%s WHERE org_id = '%s' AND rule_id = '%s'",
		signozHistoryDBName, ruleStateHistoryTableName, orgID, ruleID)
	labelRows, err := s.conn.Query(ctx, labelsQuery)
	if err != nil {
		return nil, err
	}
	defer labelRows.Close()

	labelsMap := make(map[string][]string)
	for labelRows.Next() {
		var rawLabel string
		if err := labelRows.Scan(&rawLabel); err != nil {
			return nil, err
		}
		label := map[string]string{}
		if err := json.Unmarshal([]byte(rawLabel), &label); err != nil {
			continue
		}
		for k, v := range label {
			labelsMap[k] = append(labelsMap[k], v)
		}
	}

	if items == nil {
		items = []alertmanagertypes.RuleStateHistory{}
	}

	return &alertmanagertypes.RuleStateTimeline{
		Items:  items,
		Total:  total,
		Labels: labelsMap,
	}, nil
}

func (s *stateHistoryStore) GetRuleStateHistoryTopContributors(
	ctx context.Context, orgID string, ruleID string, params *alertmanagertypes.QueryRuleStateHistory,
) ([]alertmanagertypes.RuleStateHistoryContributor, error) {
	query := fmt.Sprintf(`SELECT
		fingerprint,
		any(labels) as labels,
		count(*) as count
	FROM %s.%s
	WHERE org_id = '%s' AND rule_id = '%s' AND (state_changed = true) AND (state = 'firing') AND unix_milli >= %d AND unix_milli <= %d
	GROUP BY fingerprint
	HAVING labels != '{}'
	ORDER BY count DESC`,
		signozHistoryDBName, ruleStateHistoryTableName, orgID, ruleID, params.Start, params.End)

	rows, err := s.conn.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var contributors []alertmanagertypes.RuleStateHistoryContributor
	for rows.Next() {
		var c alertmanagertypes.RuleStateHistoryContributor
		if err := rows.Scan(&c.Fingerprint, &c.Labels, &c.Count); err != nil {
			return nil, err
		}
		contributors = append(contributors, c)
	}

	if contributors == nil {
		contributors = []alertmanagertypes.RuleStateHistoryContributor{}
	}

	return contributors, rows.Err()
}

func (s *stateHistoryStore) GetOverallStateTransitions(
	ctx context.Context, orgID string, ruleID string, params *alertmanagertypes.QueryRuleStateHistory,
) ([]alertmanagertypes.RuleStateTransition, error) {
	tmpl := `WITH firing_events AS (
    SELECT
        rule_id,
        state,
        unix_milli AS firing_time
    FROM %s.%s
    WHERE overall_state = 'firing'
      AND overall_state_changed = true
      AND org_id = '%s'
      AND rule_id = '%s'
      AND unix_milli >= %d AND unix_milli <= %d
),
resolution_events AS (
    SELECT
        rule_id,
        state,
        unix_milli AS resolution_time
    FROM %s.%s
    WHERE overall_state = 'inactive'
      AND overall_state_changed = true
      AND org_id = '%s'
      AND rule_id = '%s'
      AND unix_milli >= %d AND unix_milli <= %d
),
matched_events AS (
    SELECT
        f.rule_id,
        f.state,
        f.firing_time,
        MIN(r.resolution_time) AS resolution_time
    FROM firing_events f
    LEFT JOIN resolution_events r
        ON f.rule_id = r.rule_id
    WHERE r.resolution_time > f.firing_time
    GROUP BY f.rule_id, f.state, f.firing_time
)
SELECT *
FROM matched_events
ORDER BY firing_time ASC;`

	query := fmt.Sprintf(tmpl,
		signozHistoryDBName, ruleStateHistoryTableName, orgID, ruleID, params.Start, params.End,
		signozHistoryDBName, ruleStateHistoryTableName, orgID, ruleID, params.Start, params.End)

	type transition struct {
		RuleID         string `ch:"rule_id"`
		State          string `ch:"state"`
		FiringTime     int64  `ch:"firing_time"`
		ResolutionTime int64  `ch:"resolution_time"`
	}

	rows, err := s.conn.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var transitions []transition
	for rows.Next() {
		var t transition
		if err := rows.Scan(&t.RuleID, &t.State, &t.FiringTime, &t.ResolutionTime); err != nil {
			return nil, err
		}
		transitions = append(transitions, t)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	var stateItems []alertmanagertypes.RuleStateTransition

	for idx, item := range transitions {
		stateItems = append(stateItems, alertmanagertypes.RuleStateTransition{
			State: alertmanagertypes.AlertState{String: valuer.NewString(item.State)},
			Start: item.FiringTime,
			End:   item.ResolutionTime,
		})
		if idx < len(transitions)-1 {
			nextStart := transitions[idx+1].FiringTime
			if nextStart > item.ResolutionTime {
				stateItems = append(stateItems, alertmanagertypes.RuleStateTransition{
					State: alertmanagertypes.AlertStateInactive,
					Start: item.ResolutionTime,
					End:   nextStart,
				})
			}
		}
	}

	// Fetch the most recent state to fill in edges.
	var lastStateStr string
	stateQuery := fmt.Sprintf(
		"SELECT state FROM %s.%s WHERE org_id = '%s' AND rule_id = '%s' AND unix_milli <= %d ORDER BY unix_milli DESC LIMIT 1",
		signozHistoryDBName, ruleStateHistoryTableName, orgID, ruleID, params.End)
	if err := s.conn.QueryRow(ctx, stateQuery).Scan(&lastStateStr); err != nil {
		lastStateStr = "inactive"
	}

	if len(transitions) == 0 {
		stateItems = append(stateItems, alertmanagertypes.RuleStateTransition{
			State: alertmanagertypes.AlertState{String: valuer.NewString(lastStateStr)},
			Start: params.Start,
			End:   params.End,
		})
	} else {
		if lastStateStr == "inactive" {
			stateItems = append(stateItems, alertmanagertypes.RuleStateTransition{
				State: alertmanagertypes.AlertStateInactive,
				Start: transitions[len(transitions)-1].ResolutionTime,
				End:   params.End,
			})
		} else {
			// Find the most recent firing event.
			var firingTime int64
			firingQuery := fmt.Sprintf(
				"SELECT unix_milli FROM %s.%s WHERE org_id = '%s' AND rule_id = '%s' AND overall_state_changed = true AND overall_state = 'firing' AND unix_milli <= %d ORDER BY unix_milli DESC LIMIT 1",
				signozHistoryDBName, ruleStateHistoryTableName, orgID, ruleID, params.End)
			if err := s.conn.QueryRow(ctx, firingQuery).Scan(&firingTime); err != nil {
				firingTime = transitions[len(transitions)-1].ResolutionTime
			}
			stateItems = append(stateItems, alertmanagertypes.RuleStateTransition{
				State: alertmanagertypes.AlertStateInactive,
				Start: transitions[len(transitions)-1].ResolutionTime,
				End:   firingTime,
			})
			stateItems = append(stateItems, alertmanagertypes.RuleStateTransition{
				State: alertmanagertypes.AlertStateFiring,
				Start: firingTime,
				End:   params.End,
			})
		}
	}

	return stateItems, nil
}

func (s *stateHistoryStore) GetTotalTriggers(
	ctx context.Context, orgID string, ruleID string, params *alertmanagertypes.QueryRuleStateHistory,
) (uint64, error) {
	query := fmt.Sprintf(
		"SELECT count(*) FROM %s.%s WHERE org_id = '%s' AND rule_id = '%s' AND (state_changed = true) AND (state = 'firing') AND unix_milli >= %d AND unix_milli <= %d",
		signozHistoryDBName, ruleStateHistoryTableName, orgID, ruleID, params.Start, params.End)

	var total uint64
	if err := s.conn.QueryRow(ctx, query).Scan(&total); err != nil {
		return 0, err
	}
	return total, nil
}

func (s *stateHistoryStore) GetTriggersByInterval(
	ctx context.Context, orgID string, ruleID string, params *alertmanagertypes.QueryRuleStateHistory,
) (*alertmanagertypes.Series, error) {
	step := minAllowedStepInterval(params.Start, params.End)

	query := fmt.Sprintf(
		"SELECT count(*), toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), INTERVAL %d SECOND) as ts FROM %s.%s WHERE org_id = '%s' AND rule_id = '%s' AND (state_changed = true) AND (state = 'firing') AND unix_milli >= %d AND unix_milli <= %d GROUP BY ts ORDER BY ts ASC",
		step, signozHistoryDBName, ruleStateHistoryTableName, orgID, ruleID, params.Start, params.End)

	return s.queryTimeSeries(ctx, query)
}

func (s *stateHistoryStore) GetAvgResolutionTime(
	ctx context.Context, orgID string, ruleID string, params *alertmanagertypes.QueryRuleStateHistory,
) (float64, error) {
	tmpl := `
WITH firing_events AS (
    SELECT
        rule_id,
        state,
        unix_milli AS firing_time
    FROM %s.%s
    WHERE overall_state = 'firing'
      AND overall_state_changed = true
      AND org_id = '%s'
      AND rule_id = '%s'
      AND unix_milli >= %d AND unix_milli <= %d
),
resolution_events AS (
    SELECT
        rule_id,
        state,
        unix_milli AS resolution_time
    FROM %s.%s
    WHERE overall_state = 'inactive'
      AND overall_state_changed = true
      AND org_id = '%s'
      AND rule_id = '%s'
      AND unix_milli >= %d AND unix_milli <= %d
),
matched_events AS (
    SELECT
        f.rule_id,
        f.state,
        f.firing_time,
        MIN(r.resolution_time) AS resolution_time
    FROM firing_events f
    LEFT JOIN resolution_events r
        ON f.rule_id = r.rule_id
    WHERE r.resolution_time > f.firing_time
    GROUP BY f.rule_id, f.state, f.firing_time
)
SELECT AVG(resolution_time - firing_time) / 1000 AS avg_resolution_time
FROM matched_events;`

	query := fmt.Sprintf(tmpl,
		signozHistoryDBName, ruleStateHistoryTableName, orgID, ruleID, params.Start, params.End,
		signozHistoryDBName, ruleStateHistoryTableName, orgID, ruleID, params.Start, params.End)

	var avgResolutionTime float64
	if err := s.conn.QueryRow(ctx, query).Scan(&avgResolutionTime); err != nil {
		return 0, err
	}
	return avgResolutionTime, nil
}

func (s *stateHistoryStore) GetAvgResolutionTimeByInterval(
	ctx context.Context, orgID string, ruleID string, params *alertmanagertypes.QueryRuleStateHistory,
) (*alertmanagertypes.Series, error) {
	step := minAllowedStepInterval(params.Start, params.End)

	tmpl := `
WITH firing_events AS (
    SELECT
        rule_id,
        state,
        unix_milli AS firing_time
    FROM %s.%s
    WHERE overall_state = 'firing'
      AND overall_state_changed = true
      AND org_id = '%s'
      AND rule_id = '%s'
      AND unix_milli >= %d AND unix_milli <= %d
),
resolution_events AS (
    SELECT
        rule_id,
        state,
        unix_milli AS resolution_time
    FROM %s.%s
    WHERE overall_state = 'inactive'
      AND overall_state_changed = true
      AND org_id = '%s'
      AND rule_id = '%s'
      AND unix_milli >= %d AND unix_milli <= %d
),
matched_events AS (
    SELECT
        f.rule_id,
        f.state,
        f.firing_time,
        MIN(r.resolution_time) AS resolution_time
    FROM firing_events f
    LEFT JOIN resolution_events r
        ON f.rule_id = r.rule_id
    WHERE r.resolution_time > f.firing_time
    GROUP BY f.rule_id, f.state, f.firing_time
)
SELECT toStartOfInterval(toDateTime(firing_time / 1000), INTERVAL %d SECOND) AS ts, AVG(resolution_time - firing_time) / 1000 AS avg_resolution_time
FROM matched_events
GROUP BY ts
ORDER BY ts ASC;`

	query := fmt.Sprintf(tmpl,
		signozHistoryDBName, ruleStateHistoryTableName, orgID, ruleID, params.Start, params.End,
		signozHistoryDBName, ruleStateHistoryTableName, orgID, ruleID, params.Start, params.End, step)

	return s.queryTimeSeries(ctx, query)
}

func (s *stateHistoryStore) queryTimeSeries(ctx context.Context, query string) (*alertmanagertypes.Series, error) {
	rows, err := s.conn.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	series := &alertmanagertypes.Series{
		Labels: map[string]string{},
	}
	for rows.Next() {
		var value float64
		var ts interface{}
		if err := rows.Scan(&value, &ts); err != nil {
			return nil, err
		}
		// The timestamp may come back as time.Time from ClickHouse.
		var timestamp int64
		switch v := ts.(type) {
		case int64:
			timestamp = v
		default:
			// Try time.Time
			if t, ok := ts.(interface{ UnixMilli() int64 }); ok {
				timestamp = t.UnixMilli()
			}
		}
		series.Points = append(series.Points, alertmanagertypes.Point{
			Timestamp: timestamp,
			Value:     value,
		})
	}

	if len(series.Points) == 0 {
		return nil, nil
	}

	return series, rows.Err()
}

func minAllowedStepInterval(start, end int64) int64 {
	step := (end - start) / maxPointsInTimeSeries / 1000
	if step < 60 {
		return 60
	}
	return step - step%60
}

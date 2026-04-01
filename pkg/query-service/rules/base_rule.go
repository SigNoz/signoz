package rules

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/modules/rulestatehistory"
	"github.com/SigNoz/signoz/pkg/queryparser"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/rulestatehistorytypes"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// BaseRule contains common fields and methods for all rule types
type BaseRule struct {
	id             string
	name           string
	orgID          valuer.UUID
	source         string
	handledRestart bool

	// Type of the rule
	typ ruletypes.AlertType

	ruleCondition *ruletypes.RuleCondition

	Threshold ruletypes.RuleThreshold
	// evalWindow is the time window used for evaluating the rule
	// i.e. each time we lookback from the current time, we look at data for the last
	// evalWindow duration
	evalWindow valuer.TextDuration
	// holdDuration is the duration for which the alert waits before firing
	holdDuration valuer.TextDuration

	// evalDelay is the delay in evaluation of the rule
	// this is useful in cases where the data is not available immediately
	evalDelay valuer.TextDuration

	// holds the static set of labels and annotations for the rule
	// these are the same for all alerts created for this rule
	labels      ruletypes.Labels
	annotations ruletypes.Labels
	// preferredChannels is the list of channels to send the alert to
	// if the rule is triggered
	preferredChannels []string
	mtx               sync.Mutex
	// the time it took to evaluate the rule (most recent evaluation)
	evaluationDuration time.Duration
	// the timestamp of the last evaluation
	evaluationTimestamp time.Time

	health    ruletypes.RuleHealth
	lastError error
	Active    map[uint64]*ruletypes.Alert

	// lastTimestampWithDatapoints is the timestamp of the last datapoint we
	// observed for this rule.
	// This is used for missing data alerts.
	lastTimestampWithDatapoints time.Time

	logger *slog.Logger

	// sendUnmatched sends observed metric values even if they don't match the
	// rule condition. This is useful in testing the rule.
	sendUnmatched bool

	// sendAlways will send alert irrespective of resendDelay or other params
	sendAlways bool

	sqlstore sqlstore.SQLStore

	metadataStore telemetrytypes.MetadataStore

	evaluation ruletypes.Evaluation

	// newGroupEvalDelay is the grace period for new alert groups
	newGroupEvalDelay valuer.TextDuration

	ruleStateHistoryModule rulestatehistory.Module

	queryParser queryparser.QueryParser
}

type RuleOption func(*BaseRule)

func WithSendAlways() RuleOption {
	return func(r *BaseRule) {
		r.sendAlways = true
	}
}

func WithSendUnmatched() RuleOption {
	return func(r *BaseRule) {
		r.sendUnmatched = true
	}
}

func WithEvalDelay(dur valuer.TextDuration) RuleOption {
	return func(r *BaseRule) {
		r.evalDelay = dur
	}
}

func WithLogger(logger *slog.Logger) RuleOption {
	return func(r *BaseRule) {
		r.logger = logger
	}
}

func WithSQLStore(sqlstore sqlstore.SQLStore) RuleOption {
	return func(r *BaseRule) {
		r.sqlstore = sqlstore
	}
}

func WithQueryParser(queryParser queryparser.QueryParser) RuleOption {
	return func(r *BaseRule) {
		r.queryParser = queryParser
	}
}

func WithMetadataStore(metadataStore telemetrytypes.MetadataStore) RuleOption {
	return func(r *BaseRule) {
		r.metadataStore = metadataStore
	}
}

func WithRuleStateHistoryModule(module rulestatehistory.Module) RuleOption {
	return func(r *BaseRule) {
		r.ruleStateHistoryModule = module
	}
}

func NewBaseRule(id string, orgID valuer.UUID, p *ruletypes.PostableRule, opts ...RuleOption) (*BaseRule, error) {
	if p.RuleCondition == nil || !p.RuleCondition.IsValid() {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid rule condition")
	}
	threshold, err := p.RuleCondition.Thresholds.GetRuleThreshold()
	if err != nil {
		return nil, err
	}
	evaluation, err := p.Evaluation.GetEvaluation()
	if err != nil {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "failed to get evaluation: %v", err)
	}

	baseRule := &BaseRule{
		id:                id,
		orgID:             orgID,
		name:              p.AlertName,
		source:            p.Source,
		typ:               p.AlertType,
		ruleCondition:     p.RuleCondition,
		evalWindow:        p.EvalWindow,
		labels:            ruletypes.FromMap(p.Labels),
		annotations:       ruletypes.FromMap(p.Annotations),
		preferredChannels: p.PreferredChannels,
		health:            ruletypes.HealthUnknown,
		Active:            map[uint64]*ruletypes.Alert{},
		Threshold:         threshold,
		evaluation:        evaluation,
	}

	// Store newGroupEvalDelay and groupBy keys from NotificationSettings
	if p.NotificationSettings != nil {
		baseRule.newGroupEvalDelay = p.NotificationSettings.NewGroupEvalDelay
	}

	if baseRule.evalWindow.IsZero() {
		baseRule.evalWindow = valuer.MustParseTextDuration("5m")
	}

	for _, opt := range opts {
		opt(baseRule)
	}

	return baseRule, nil
}

func (r *BaseRule) currentAlerts() []*ruletypes.Alert {
	r.mtx.Lock()
	defer r.mtx.Unlock()

	alerts := make([]*ruletypes.Alert, 0, len(r.Active))
	for _, a := range r.Active {
		anew := *a
		alerts = append(alerts, &anew)
	}
	return alerts
}

// ShouldSendUnmatched returns true if the rule should send unmatched samples
// during alert evaluation, even if they don't match the rule condition.
// This is useful in testing the rule.
func (r *BaseRule) ShouldSendUnmatched() bool {
	return r.sendUnmatched
}

// ActiveAlertsLabelFP returns a map of active alert labels fingerprint and
// the fingerprint is computed using the QueryResultLables.Hash() method.
// We use the QueryResultLables instead of labels as these labels are raw labels
// that we get from the sample.
// This is useful in cases where we want to check if an alert is still active
// based on the labels we have.
func (r *BaseRule) ActiveAlertsLabelFP() map[uint64]struct{} {
	r.mtx.Lock()
	defer r.mtx.Unlock()

	activeAlerts := make(map[uint64]struct{}, len(r.Active))
	for _, alert := range r.Active {
		if alert == nil || alert.QueryResultLabels == nil {
			continue
		}
		activeAlerts[alert.QueryResultLabels.Hash()] = struct{}{}
	}
	return activeAlerts
}

func (r *BaseRule) EvalDelay() valuer.TextDuration {
	return r.evalDelay
}

func (r *BaseRule) EvalWindow() valuer.TextDuration {
	return r.evalWindow
}

func (r *BaseRule) HoldDuration() valuer.TextDuration {
	return r.holdDuration
}

func (r *BaseRule) ID() string                          { return r.id }
func (r *BaseRule) OrgID() valuer.UUID                  { return r.orgID }
func (r *BaseRule) Name() string                        { return r.name }
func (r *BaseRule) Condition() *ruletypes.RuleCondition { return r.ruleCondition }
func (r *BaseRule) Labels() ruletypes.Labels            { return r.labels }
func (r *BaseRule) Annotations() ruletypes.Labels       { return r.annotations }
func (r *BaseRule) PreferredChannels() []string         { return r.preferredChannels }

func (r *BaseRule) GeneratorURL() string {
	return ruletypes.PrepareRuleGeneratorURL(r.ID(), r.source)
}

func (r *BaseRule) SelectedQuery(ctx context.Context) string {
	if r.ruleCondition.SelectedQuery != "" {
		return r.ruleCondition.SelectedQuery
	}
	r.logger.WarnContext(ctx, "missing selected query", slog.String("rule.id", r.ID()))
	return r.ruleCondition.SelectedQueryName()
}

func (r *BaseRule) Unit() string {
	return r.ruleCondition.CompositeQuery.Unit
}

func (r *BaseRule) Timestamps(ts time.Time) (time.Time, time.Time) {
	st, en := r.evaluation.NextWindowFor(ts)
	start := st.UnixMilli()
	end := en.UnixMilli()

	if r.evalDelay.IsPositive() {
		start = start - r.evalDelay.Milliseconds()
		end = end - r.evalDelay.Milliseconds()
	}
	// round to minute otherwise we could potentially miss data
	start = start - (start % (60 * 1000))
	end = end - (end % (60 * 1000))

	return time.UnixMilli(start), time.UnixMilli(end)
}

func (r *BaseRule) SetLastError(err error) {
	r.mtx.Lock()
	defer r.mtx.Unlock()
	r.lastError = err
}

func (r *BaseRule) LastError() error {
	r.mtx.Lock()
	defer r.mtx.Unlock()
	return r.lastError
}

func (r *BaseRule) SetHealth(health ruletypes.RuleHealth) {
	r.mtx.Lock()
	defer r.mtx.Unlock()
	r.health = health
}

func (r *BaseRule) Health() ruletypes.RuleHealth {
	r.mtx.Lock()
	defer r.mtx.Unlock()
	return r.health
}

func (r *BaseRule) SetEvaluationDuration(dur time.Duration) {
	r.mtx.Lock()
	defer r.mtx.Unlock()
	r.evaluationDuration = dur
}

func (r *BaseRule) GetEvaluationDuration() time.Duration {
	r.mtx.Lock()
	defer r.mtx.Unlock()
	return r.evaluationDuration
}

func (r *BaseRule) SetEvaluationTimestamp(ts time.Time) {
	r.mtx.Lock()
	defer r.mtx.Unlock()
	r.evaluationTimestamp = ts
}

func (r *BaseRule) GetEvaluationTimestamp() time.Time {
	r.mtx.Lock()
	defer r.mtx.Unlock()
	return r.evaluationTimestamp
}

func (r *BaseRule) State() ruletypes.AlertState {
	maxState := ruletypes.StateInactive
	for _, a := range r.Active {
		if a.State.Severity() > maxState.Severity() {
			maxState = a.State
		}
	}
	return maxState
}

func (r *BaseRule) ActiveAlerts() []*ruletypes.Alert {
	var res []*ruletypes.Alert
	for _, a := range r.currentAlerts() {
		if a.ResolvedAt.IsZero() {
			res = append(res, a)
		}
	}
	return res
}

func (r *BaseRule) SendAlerts(ctx context.Context, ts time.Time, resendDelay time.Duration, interval time.Duration, notifyFunc NotifyFunc) {
	var orgID string
	err := r.
		sqlstore.
		BunDB().
		NewSelect().
		Table("organizations").
		ColumnExpr("id").
		Limit(1).
		Scan(ctx, &orgID)
	if err != nil {
		r.logger.ErrorContext(ctx, "failed to get org ids", errors.Attr(err))
		return
	}

	alerts := []*ruletypes.Alert{}
	r.ForEachActiveAlert(func(alert *ruletypes.Alert) {
		if alert.NeedsSending(ts, resendDelay) {
			alert.LastSentAt = ts
			delta := resendDelay
			if interval > resendDelay {
				delta = interval
			}
			alert.ValidUntil = ts.Add(4 * delta)
			anew := *alert
			alerts = append(alerts, &anew)
		}
	})
	notifyFunc(ctx, orgID, "", alerts...)
}

func (r *BaseRule) ForEachActiveAlert(f func(*ruletypes.Alert)) {
	r.mtx.Lock()
	defer r.mtx.Unlock()

	for _, a := range r.Active {
		f(a)
	}
}

func (r *BaseRule) RecordRuleStateHistory(ctx context.Context, prevState, currentState ruletypes.AlertState, itemsToAdd []rulestatehistorytypes.RuleStateHistory) error {
	if r.ruleStateHistoryModule == nil {
		return nil
	}

	if err := r.ruleStateHistoryModule.RecordRuleStateHistory(ctx, r.ID(), r.handledRestart, itemsToAdd); err != nil {
		r.logger.ErrorContext(ctx, "error while recording rule state history", slog.String("rule.id", r.ID()), errors.Attr(err), slog.Any("items_to_add", itemsToAdd))
		return err
	}
	r.handledRestart = true

	return nil
}

// ShouldSkipNewGroups returns true if new group filtering should be applied
func (r *BaseRule) ShouldSkipNewGroups() bool {
	return r.newGroupEvalDelay.IsPositive()
}

// isFilterNewSeriesSupported checks if the query is supported for new series filtering
func (r *BaseRule) isFilterNewSeriesSupported() bool {
	if r.ruleCondition.CompositeQuery.QueryType == ruletypes.QueryTypeBuilder {
		for _, query := range r.ruleCondition.CompositeQuery.Queries {
			if query.Type != qbtypes.QueryTypeBuilder {
				continue
			}
			switch query.Spec.(type) {
			// query spec is for Logs or Traces, return with blank metric names and group by fields
			case qbtypes.QueryBuilderQuery[qbtypes.LogAggregation], qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]:
				return false
			}
		}
	}
	return true
}

// extractMetricAndGroupBys extracts metric names and groupBy keys from the rule's query.
// Returns a map where key is the metric name and value is the list of groupBy keys associated with it.
// TODO: implement caching for query parsing results to avoid re-parsing the query + cache invalidation
func (r *BaseRule) extractMetricAndGroupBys(ctx context.Context) (map[string][]string, error) {
	metricToGroupedFields := make(map[string][]string)

	// check to avoid processing the query for Logs and Traces
	// as excluding new series is not supported for Logs and Traces for now
	if !r.isFilterNewSeriesSupported() {
		return metricToGroupedFields, nil
	}

	results, err := r.queryParser.AnalyzeQueryEnvelopes(ctx, r.ruleCondition.CompositeQuery.Queries)
	if err != nil {
		return nil, err
	}

	// temp map to avoid duplicates group by fields for the same metric
	// map[metricName]map[groupKey]struct{}
	tempMap := make(map[string]map[string]struct{})

	// Aggregate results from all queries
	for _, result := range results {
		if len(result.MetricNames) == 0 {
			continue
		}
		// Collect unique groupBy columns for this query result
		uniqueGroups := make(map[string]struct{})
		for _, col := range result.GroupByColumns {
			uniqueGroups[col.GroupName()] = struct{}{}
		}
		// walk through the metric names and group by fields for this query result and add them to the temp map
		for _, metricName := range result.MetricNames {
			if _, ok := tempMap[metricName]; !ok {
				tempMap[metricName] = make(map[string]struct{})
			}
			for groupKey := range uniqueGroups {
				tempMap[metricName][groupKey] = struct{}{}
			}
		}
	}

	// Convert to final map
	for metricName, groups := range tempMap {
		for groupKey := range groups {
			metricToGroupedFields[metricName] = append(metricToGroupedFields[metricName], groupKey)
		}
	}

	return metricToGroupedFields, nil
}

// FilterNewSeries filters out items that are too new based on metadata first_seen timestamps.
// Returns the filtered series (old ones) excluding new series that are still within the grace period.
func (r *BaseRule) FilterNewSeries(ctx context.Context, ts time.Time, series []*qbtypes.TimeSeries) ([]*qbtypes.TimeSeries, error) {
	// Extract metric names and groupBy keys
	metricToGroupedFields, err := r.extractMetricAndGroupBys(ctx)
	if err != nil {
		return nil, err
	}

	if len(metricToGroupedFields) == 0 {
		// No metrics or groupBy keys, nothing to filter (non-ideal case, return all series)
		return series, nil
	}

	// Build lookup keys from series which will be used to query metadata from CH
	lookupKeys := make([]telemetrytypes.MetricMetadataLookupKey, 0)
	seriesIdxToLookupKeys := make(map[int][]telemetrytypes.MetricMetadataLookupKey) // series index -> lookup keys

	for i := 0; i < len(series); i++ {

		valueForKey := func(key string) (string, bool) {
			for _, item := range series[i].Labels {
				if item.Key.Name == key {
					return fmt.Sprint(item.Value), true
				}
			}
			return "", false
		}

		// Collect groupBy attribute-value pairs for this series
		seriesKeys := make([]telemetrytypes.MetricMetadataLookupKey, 0)

		for metricName, groupedFields := range metricToGroupedFields {
			for _, groupByKey := range groupedFields {
				if attrValue, ok := valueForKey(groupByKey); ok {
					lookupKey := telemetrytypes.MetricMetadataLookupKey{
						MetricName:     metricName,
						AttributeName:  groupByKey,
						AttributeValue: attrValue,
					}
					lookupKeys = append(lookupKeys, lookupKey)
					seriesKeys = append(seriesKeys, lookupKey)
				}
			}
		}

		if len(seriesKeys) > 0 {
			seriesIdxToLookupKeys[i] = seriesKeys
		}
	}

	if len(lookupKeys) == 0 {
		// No lookup keys to query, return all series
		// this can happen when the series has no labels at all
		// in that case, we include all series as we don't know if it is new or old series
		return series, nil
	}

	// unique lookup keys
	uniqueLookupKeysMap := make(map[telemetrytypes.MetricMetadataLookupKey]struct{})
	uniqueLookupKeys := make([]telemetrytypes.MetricMetadataLookupKey, 0)
	for _, key := range lookupKeys {
		if _, ok := uniqueLookupKeysMap[key]; !ok {
			uniqueLookupKeysMap[key] = struct{}{}
			uniqueLookupKeys = append(uniqueLookupKeys, key)
		}
	}
	// Query metadata for first_seen timestamps
	firstSeenMap, err := r.metadataStore.GetFirstSeenFromMetricMetadata(ctx, uniqueLookupKeys)
	if err != nil {
		return nil, err
	}

	// Filter series based on first_seen + delay
	filteredSeries := make([]*qbtypes.TimeSeries, 0, len(series))
	evalTimeMs := ts.UnixMilli()
	newGroupEvalDelayMs := r.newGroupEvalDelay.Milliseconds()

	for i := 0; i < len(series); i++ {
		seriesKeys, ok := seriesIdxToLookupKeys[i]
		if !ok {
			// No matching labels used in groupBy from this series, include it
			// as we can't decide if it is new or old series
			filteredSeries = append(filteredSeries, series[i])
			continue
		}

		// Find the maximum first_seen across all groupBy attributes for this series
		// if the latest is old enough we're good, if latest is new we need to skip it
		maxFirstSeen := int64(0)
		// metadataFound tracks if we have metadata for any of the lookup keys
		metadataFound := false

		for _, lookupKey := range seriesKeys {
			if firstSeen, exists := firstSeenMap[lookupKey]; exists {
				metadataFound = true
				if firstSeen > maxFirstSeen {
					maxFirstSeen = firstSeen
				}
			}
		}

		// if we don't have metadata for any of the lookup keys, we can't decide if it is new or old series
		// in that case, we include it
		if !metadataFound {
			filteredSeries = append(filteredSeries, series[i])
			continue
		}

		// Check if first_seen + delay has passed
		if maxFirstSeen+newGroupEvalDelayMs > evalTimeMs {
			// Still within grace period, skip this series
			r.logger.InfoContext(ctx, "skipping new series", slog.String("rule.id", r.ID()), slog.Int("series.index", i), slog.Int64("series.max_first_seen", maxFirstSeen), slog.Int64("eval.time_ms", evalTimeMs), slog.Int64("eval.delay_ms", newGroupEvalDelayMs), slog.Any("series.labels", series[i].Labels))
			continue
		}

		// Old enough, include this series
		filteredSeries = append(filteredSeries, series[i])
	}

	skippedCount := len(series) - len(filteredSeries)
	if skippedCount > 0 {
		r.logger.InfoContext(ctx, "filtered new series", slog.String("rule.id", r.ID()), slog.Int("series.skipped_count", skippedCount), slog.Int("series.total_count", len(series)), slog.Int64("eval.delay_ms", newGroupEvalDelayMs))
	}

	return filteredSeries, nil
}

// HandleMissingDataAlert handles missing data alert logic by tracking the last timestamp
// with data points and checking if a missing data alert should be sent based on the
// [ruletypes.RuleCondition.AlertOnAbsent] and [ruletypes.RuleCondition.AbsentFor] conditions.
//
// Returns a pointer to the missing data alert if conditions are met, nil otherwise.
func (r *BaseRule) HandleMissingDataAlert(ctx context.Context, ts time.Time, hasData bool) *ruletypes.Sample {
	// Track the last timestamp with data points for missing data alerts
	if hasData {
		r.lastTimestampWithDatapoints = ts
	}

	if !r.ruleCondition.AlertOnAbsent || ts.Before(r.lastTimestampWithDatapoints.Add(time.Duration(r.ruleCondition.AbsentFor)*time.Minute)) {
		return nil
	}

	r.logger.InfoContext(ctx, "no data found for rule condition", slog.String("rule.id", r.ID()))
	lbls := ruletypes.NewBuilder()
	if !r.lastTimestampWithDatapoints.IsZero() {
		lbls.Set(ruletypes.LabelLastSeen, r.lastTimestampWithDatapoints.Format(ruletypes.AlertTimeFormat))
	}
	return &ruletypes.Sample{Metric: lbls.Labels(), IsMissing: true}
}

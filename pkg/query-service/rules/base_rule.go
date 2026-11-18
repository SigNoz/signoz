package rules

import (
	"context"
	"fmt"
	"log/slog"
	"net/url"
	"sync"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/modules/rulestatehistory"
	"github.com/SigNoz/signoz/pkg/queryparser"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
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
	externalURL    *url.URL
	handledRestart bool

	// Type of the rule
	typ ruletypes.AlertType

	ruleCondition *ruletypes.RuleCondition

	Threshold ruletypes.RuleThreshold
	// holdDuration is the duration for which the alert waits before firing
	holdDuration valuer.TextDuration

	// evalDelay is the delay in evaluation of the rule
	// this is useful in cases where the data is not available immediately
	evalDelay valuer.TextDuration

	// holds the static set of labels and annotations for the rule
	// these are the same for all alerts created for this rule
	labels      ruletypes.Labels
	annotations ruletypes.Labels
	mtx         sync.Mutex
	// the time it took to evaluate the rule (most recent evaluation)
	evaluationDuration time.Duration
	// the timestamp of the last evaluation
	evaluationTimestamp time.Time

	health    ruletypes.RuleHealth
	lastError error
	Active    map[uint64]*ruletypes.Alert

	// restoredHistory exists only between Restore and the next evaluation. Restore fills it
	// with the last history row that recorded each alert as firing before this process
	// started, keyed by query-result fingerprint; that evaluation adopts the rows whose
	// alerts are back, resolves the rest, and leaves it nil. It is never the rule's running
	// history, which is written through RecordRuleStateHistory and not read back.
	restoredHistory map[uint64]rulestatehistorytypes.RuleStateHistory

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

	// loadLastSeenSeries is how Restore reads the data the nodata seed takes the last-seen
	// time from; each rule type sets its own right after construction.
	loadLastSeenSeries LoadLastSeenSeries
}

type RuleOption func(*BaseRule)

// LoadLastSeenSeries returns the series of the rule's selected query over the lookback
// that ends at the evaluation time ts.
type LoadLastSeenSeries func(ctx context.Context, ts time.Time, lookback time.Duration) ([]*qbtypes.TimeSeries, error)

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
		r.logger = logger.With(slog.String("rule.id", r.id))
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

func NewBaseRule(
	id string,
	orgID valuer.UUID,
	p *ruletypes.PostableRule,
	externalURL *url.URL,
	opts ...RuleOption,
) (*BaseRule, error) {
	threshold, err := p.RuleCondition.Thresholds.GetRuleThreshold()
	if err != nil {
		return nil, err
	}
	if err := threshold.Validate(); err != nil {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid rule threshold spec: %v", err)
	}
	evaluation, err := p.Evaluation.GetEvaluation()
	if err != nil {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "failed to get evaluation: %v", err)
	}

	baseRule := &BaseRule{
		id:            id,
		orgID:         orgID,
		externalURL:   externalURL,
		name:          p.AlertName.StringValue(),
		typ:           p.AlertType,
		ruleCondition: p.RuleCondition,
		labels:        ruletypes.FromMap(p.Labels),
		annotations:   ruletypes.FromMap(p.Annotations),
		health:        ruletypes.HealthUnknown,
		Active:        map[uint64]*ruletypes.Alert{},
		Threshold:     threshold,
		evaluation:    evaluation,
	}

	// Store newGroupEvalDelay and groupBy keys from NotificationSettings
	if p.NotificationSettings != nil {
		baseRule.newGroupEvalDelay = p.NotificationSettings.NewGroupEvalDelay
	}

	for _, opt := range opts {
		opt(baseRule)
	}

	return baseRule, nil
}

func (r *BaseRule) SetLoadLastSeenSeries(load LoadLastSeenSeries) {
	r.loadLastSeenSeries = load
}

// Restore rebuilds what the previous process held: the alerts the rule state history last
// recorded as firing, for the next evaluation to adopt, and the last time the query had
// data, which the nodata alert waits on.
func (r *BaseRule) Restore(ctx context.Context, ts time.Time) error {
	if err := r.restoreHistory(ctx); err != nil {
		return err
	}
	if !r.ruleCondition.AlertOnAbsent || r.loadLastSeenSeries == nil {
		return nil
	}
	series, err := r.loadLastSeenSeries(ctx, ts, time.Duration(r.ruleCondition.AbsentFor)*time.Minute)
	if err != nil {
		return err
	}
	r.seedLastSeen(series)
	return nil
}

// restoreHistory picks up the alerts the rule state history last recorded as firing. A
// restore that succeeds only after earlier evaluations leaves the alerts those evaluations
// already track alone.
func (r *BaseRule) restoreHistory(ctx context.Context) error {
	if r.ruleStateHistoryModule == nil || r.handledRestart {
		return nil
	}
	lastSaved, err := r.ruleStateHistoryModule.GetLastSavedRuleStateHistory(ctx, r.ID())
	if err != nil {
		return err
	}

	r.mtx.Lock()
	defer r.mtx.Unlock()
	tracked := make(map[uint64]struct{}, len(r.Active))
	for _, alert := range r.Active {
		if alert != nil && alert.QueryResultLabels != nil {
			tracked[alert.QueryResultLabels.Hash()] = struct{}{}
		}
	}
	r.restoredHistory = make(map[uint64]rulestatehistorytypes.RuleStateHistory)
	for _, item := range lastSaved {
		if _, ok := tracked[item.Fingerprint]; ok {
			continue
		}
		if item.State == ruletypes.StateFiring || item.State == ruletypes.StateNoData || item.State == ruletypes.StateRecovering {
			r.restoredHistory[item.Fingerprint] = item
		}
	}
	r.handledRestart = true
	return nil
}

// MergeAlerts folds this evaluation's alerts into Active and returns the history rows the
// restore leaves behind: every restored row no alert picked up belongs to an alert that
// stopped firing while the previous process was down, recorded as resolved at ts.
func (r *BaseRule) MergeAlerts(ts time.Time, alerts map[uint64]*ruletypes.Alert, receivers map[string][]string) []rulestatehistorytypes.RuleStateHistory {
	for h, a := range alerts {
		// Check whether we already have alerting state for the identifying label set.
		// Update the last value and annotations if so, create a new alert entry otherwise.
		if alert, ok := r.Active[h]; ok && alert.State != ruletypes.StateInactive {
			alert.Value = a.Value
			alert.Annotations = a.Annotations
			// Update the recovering and missing state of existing alert
			alert.IsRecovering = a.IsRecovering
			alert.Missing = a.Missing
			if v, ok := alert.Labels.Map()[ruletypes.LabelThresholdName]; ok {
				alert.Receivers = receivers[v]
			}
			continue
		}

		// when the restored history holds a firing row for these labels, the new alert
		// starts from that row's state and fired-at time instead of pending; a nodata row
		// starts it firing, the sample already marks the alert missing.
		fingerprint := a.QueryResultLabels.Hash()
		if item, ok := r.restoredHistory[fingerprint]; ok {
			delete(r.restoredHistory, fingerprint)
			a.State = item.State
			if item.State == ruletypes.StateNoData {
				a.State = ruletypes.StateFiring
			}
			a.ActiveAt = time.UnixMilli(item.UnixMilli)
			a.FiredAt = a.ActiveAt
		}
		r.Active[h] = a
	}

	// Rows no alert picked up stopped firing while the previous process was down.
	resolved := make([]rulestatehistorytypes.RuleStateHistory, 0, len(r.restoredHistory))
	for _, item := range r.restoredHistory {
		item.State = ruletypes.StateInactive
		item.StateChanged = true
		item.UnixMilli = ts.UnixMilli()
		resolved = append(resolved, item)
	}
	r.restoredHistory = nil
	return resolved
}

// seedLastSeen takes the latest point of series spanning the nodata lookback as the last
// time the query had data, so a restart does not fire the nodata alert on its first evaluation.
func (r *BaseRule) seedLastSeen(series []*qbtypes.TimeSeries) {
	for _, s := range series {
		if len(s.Values) == 0 {
			continue
		}
		if lastPoint := time.UnixMilli(s.Values[len(s.Values)-1].Timestamp); lastPoint.After(r.lastTimestampWithDatapoints) {
			r.lastTimestampWithDatapoints = lastPoint
		}
	}
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

	activeAlerts := make(map[uint64]struct{}, len(r.Active)+len(r.restoredHistory))
	for _, alert := range r.Active {
		if alert == nil || alert.QueryResultLabels == nil {
			continue
		}
		activeAlerts[alert.QueryResultLabels.Hash()] = struct{}{}
	}
	for fingerprint := range r.restoredHistory {
		activeAlerts[fingerprint] = struct{}{}
	}
	return activeAlerts
}

func (r *BaseRule) EvalDelay() valuer.TextDuration {
	return r.evalDelay
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

func (r *BaseRule) GeneratorURL() string {
	params := url.Values{}
	params.Set("ruleId", r.id)
	return r.ExternalURL("alerts/overview", params)
}

// ExpandAnnotations runs expand over the rule's annotations, leaving private
// ones as they are. Those carry templates the notifier expands against its own
// data model, and the ruler's expander rewrites every $-ref into a label
// lookup, which blanks the ones that are not labels.
func (r *BaseRule) ExpandAnnotations(expand func(string) string) ruletypes.Labels {
	annotations := make(ruletypes.Labels, 0, len(r.annotations.Map()))
	for name, value := range r.annotations.Map() {
		if alertmanagertypes.IsPrivateAnnotation(name) {
			annotations = append(annotations, ruletypes.Label{Name: name, Value: value})
			continue
		}

		annotations = append(annotations, ruletypes.Label{Name: name, Value: expand(value)})
	}

	return annotations
}

func (r *BaseRule) ExternalURL(path string, params url.Values) string {
	u := r.externalURL.JoinPath(path)
	if len(params) > 0 {
		u.RawQuery = params.Encode()
	}
	return u.String()
}

func (r *BaseRule) SelectedQuery(ctx context.Context) string {
	if r.ruleCondition.SelectedQuery != "" {
		return r.ruleCondition.SelectedQuery
	}
	r.logger.WarnContext(ctx, "missing selected query")
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
	// Counting restored alerts makes the first evaluation after a restart compare its
	// overall state against the one recorded before the restart.
	for _, item := range r.restoredHistory {
		state := item.State
		if state == ruletypes.StateNoData {
			state = ruletypes.StateFiring
		}
		if state.Severity() > maxState.Severity() {
			maxState = state
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
	notifyFunc(ctx, orgID, alerts...)
}

func (r *BaseRule) ForEachActiveAlert(f func(*ruletypes.Alert)) {
	r.mtx.Lock()
	defer r.mtx.Unlock()

	for _, a := range r.Active {
		f(a)
	}
}

func (r *BaseRule) RecordRuleStateHistory(ctx context.Context, itemsToAdd []rulestatehistorytypes.RuleStateHistory) error {
	if r.ruleStateHistoryModule == nil {
		return nil
	}

	if err := r.ruleStateHistoryModule.RecordRuleStateHistory(ctx, itemsToAdd); err != nil {
		r.logger.ErrorContext(ctx, "error while recording rule state history", errors.Attr(err), slog.Any("items_to_add", itemsToAdd))
		return err
	}

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
			if query.Type != qbtypes.QueryTypeBuilder && query.Type != qbtypes.QueryTypeBuilderAI {
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
			r.logger.InfoContext(
				ctx, "skipping new series",
				slog.Int("series.index", i), slog.Int64("series.max_first_seen", maxFirstSeen),
				slog.Int64("eval.time_ms", evalTimeMs), slog.Int64("eval.delay_ms", newGroupEvalDelayMs),
				slog.Any("series.labels", series[i].Labels),
			)
			continue
		}

		// Old enough, include this series
		filteredSeries = append(filteredSeries, series[i])
	}

	skippedCount := len(series) - len(filteredSeries)
	if skippedCount > 0 {
		r.logger.InfoContext(
			ctx, "filtered new series",
			slog.Int("series.skipped_count", skippedCount), slog.Int("series.total_count", len(series)),
			slog.Int64("eval.delay_ms", newGroupEvalDelayMs),
		)
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

	r.logger.InfoContext(ctx, "no data found for rule condition")
	lbls := ruletypes.NewBuilder()
	if !r.lastTimestampWithDatapoints.IsZero() {
		lbls.Set(ruletypes.LabelLastSeen, r.lastTimestampWithDatapoints.Format(ruletypes.AlertTimeFormat))
	}
	return &ruletypes.Sample{Metric: lbls.Labels(), IsMissing: true}
}

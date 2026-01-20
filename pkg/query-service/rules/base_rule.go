package rules

import (
	"context"
	"fmt"
	"log/slog"
	"net/url"
	"sync"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/query-service/interfaces"
	"github.com/SigNoz/signoz/pkg/query-service/model"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	qslabels "github.com/SigNoz/signoz/pkg/query-service/utils/labels"
	"github.com/SigNoz/signoz/pkg/queryparser"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	ruletypes "github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"go.uber.org/zap"
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
	// i.e each time we lookback from the current time, we look at data for the last
	// evalWindow duration
	evalWindow time.Duration
	// holdDuration is the duration for which the alert waits before firing
	holdDuration time.Duration

	// evalDelay is the delay in evaluation of the rule
	// this is useful in cases where the data is not available immediately
	evalDelay time.Duration

	// holds the static set of labels and annotations for the rule
	// these are the same for all alerts created for this rule
	labels      qslabels.BaseLabels
	annotations qslabels.BaseLabels
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

	// lastTimestampWithDatapoints is the timestamp of the last datapoint we observed
	// for this rule
	// this is used for missing data alerts
	lastTimestampWithDatapoints time.Time

	reader interfaces.Reader

	logger *slog.Logger

	// sendUnmatched sends observed metric values
	// even if they dont match the rule condition. this is
	// useful in testing the rule
	sendUnmatched bool

	// sendAlways will send alert irresepective of resendDelay
	// or other params
	sendAlways bool

	// TemporalityMap is a map of metric name to temporality
	// to avoid fetching temporality for the same metric multiple times
	// querying the v4 table on low cardinal temporality column
	// should be fast but we can still avoid the query if we have the data in memory
	TemporalityMap map[string]map[v3.Temporality]bool

	sqlstore sqlstore.SQLStore

	metadataStore telemetrytypes.MetadataStore

	evaluation ruletypes.Evaluation

	// newGroupEvalDelay is the grace period for new alert groups
	newGroupEvalDelay *time.Duration

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

func WithEvalDelay(dur time.Duration) RuleOption {
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

func NewBaseRule(id string, orgID valuer.UUID, p *ruletypes.PostableRule, reader interfaces.Reader, opts ...RuleOption) (*BaseRule, error) {
	if p.RuleCondition == nil || !p.RuleCondition.IsValid() {
		return nil, fmt.Errorf("invalid rule condition")
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
		evalWindow:        time.Duration(p.EvalWindow),
		labels:            qslabels.FromMap(p.Labels),
		annotations:       qslabels.FromMap(p.Annotations),
		preferredChannels: p.PreferredChannels,
		health:            ruletypes.HealthUnknown,
		Active:            map[uint64]*ruletypes.Alert{},
		reader:            reader,
		TemporalityMap:    make(map[string]map[v3.Temporality]bool),
		Threshold:         threshold,
		evaluation:        evaluation,
	}

	// Store newGroupEvalDelay and groupBy keys from NotificationSettings
	if p.NotificationSettings != nil && p.NotificationSettings.NewGroupEvalDelay != nil {
		newGroupEvalDelay := time.Duration(*p.NotificationSettings.NewGroupEvalDelay)
		baseRule.newGroupEvalDelay = &newGroupEvalDelay
	}

	if baseRule.evalWindow == 0 {
		baseRule.evalWindow = 5 * time.Minute
	}

	for _, opt := range opts {
		opt(baseRule)
	}

	return baseRule, nil
}

func (r *BaseRule) matchType() ruletypes.MatchType {
	if r.ruleCondition == nil {
		return ruletypes.AtleastOnce
	}
	return r.ruleCondition.MatchType
}

func (r *BaseRule) compareOp() ruletypes.CompareOp {
	if r.ruleCondition == nil {
		return ruletypes.ValueIsEq
	}
	return r.ruleCondition.CompareOp
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
		if alert == nil || alert.QueryResultLables == nil {
			continue
		}
		activeAlerts[alert.QueryResultLables.Hash()] = struct{}{}
	}
	return activeAlerts
}

func (r *BaseRule) EvalDelay() time.Duration {
	return r.evalDelay
}

func (r *BaseRule) EvalWindow() time.Duration {
	return r.evalWindow
}

func (r *BaseRule) HoldDuration() time.Duration {
	return r.holdDuration
}

func (r *ThresholdRule) hostFromSource() string {
	parsedUrl, err := url.Parse(r.source)
	if err != nil {
		return ""
	}
	if parsedUrl.Port() != "" {
		return fmt.Sprintf("%s://%s:%s", parsedUrl.Scheme, parsedUrl.Hostname(), parsedUrl.Port())
	}
	return fmt.Sprintf("%s://%s", parsedUrl.Scheme, parsedUrl.Hostname())
}

func (r *BaseRule) ID() string                          { return r.id }
func (r *BaseRule) OrgID() valuer.UUID                  { return r.orgID }
func (r *BaseRule) Name() string                        { return r.name }
func (r *BaseRule) Condition() *ruletypes.RuleCondition { return r.ruleCondition }
func (r *BaseRule) Labels() qslabels.BaseLabels         { return r.labels }
func (r *BaseRule) Annotations() qslabels.BaseLabels    { return r.annotations }
func (r *BaseRule) PreferredChannels() []string         { return r.preferredChannels }

func (r *BaseRule) GeneratorURL() string {
	return ruletypes.PrepareRuleGeneratorURL(r.ID(), r.source)
}

func (r *BaseRule) Unit() string {
	if r.ruleCondition != nil && r.ruleCondition.CompositeQuery != nil {
		return r.ruleCondition.CompositeQuery.Unit
	}
	return ""
}

func (r *BaseRule) Timestamps(ts time.Time) (time.Time, time.Time) {

	st, en := r.evaluation.NextWindowFor(ts)
	start := st.UnixMilli()
	end := en.UnixMilli()

	if r.evalDelay > 0 {
		start = start - int64(r.evalDelay.Milliseconds())
		end = end - int64(r.evalDelay.Milliseconds())
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

func (r *BaseRule) State() model.AlertState {
	maxState := model.StateInactive
	for _, a := range r.Active {
		if a.State > maxState {
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
		r.logger.ErrorContext(ctx, "failed to get org ids", "error", err)
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

func (r *BaseRule) RecordRuleStateHistory(ctx context.Context, prevState, currentState model.AlertState, itemsToAdd []model.RuleStateHistory) error {
	zap.L().Debug("recording rule state history", zap.String("ruleid", r.ID()), zap.Any("prevState", prevState), zap.Any("currentState", currentState), zap.Any("itemsToAdd", itemsToAdd))
	revisedItemsToAdd := map[uint64]model.RuleStateHistory{}

	lastSavedState, err := r.reader.GetLastSavedRuleStateHistory(ctx, r.ID())
	if err != nil {
		return err
	}
	// if the query-service has been restarted, or the rule has been modified (which re-initializes the rule),
	// the state would reset so we need to add the corresponding state changes to previously saved states
	if !r.handledRestart && len(lastSavedState) > 0 {
		zap.L().Debug("handling restart", zap.String("ruleid", r.ID()), zap.Any("lastSavedState", lastSavedState))
		l := map[uint64]model.RuleStateHistory{}
		for _, item := range itemsToAdd {
			l[item.Fingerprint] = item
		}

		shouldSkip := map[uint64]bool{}

		for _, item := range lastSavedState {
			// for the last saved item with fingerprint, check if there is a corresponding entry in the current state
			currentState, ok := l[item.Fingerprint]
			if !ok {
				// there was a state change in the past, but not in the current state
				// if the state was firing, then we should add a resolved state change
				if item.State == model.StateFiring || item.State == model.StateNoData {
					item.State = model.StateInactive
					item.StateChanged = true
					item.UnixMilli = time.Now().UnixMilli()
					revisedItemsToAdd[item.Fingerprint] = item
				}
				// there is nothing to do if the prev state was normal
			} else {
				if item.State != currentState.State {
					item.State = currentState.State
					item.StateChanged = true
					item.UnixMilli = time.Now().UnixMilli()
					revisedItemsToAdd[item.Fingerprint] = item
				}
			}
			// do not add this item to revisedItemsToAdd as it is already processed
			shouldSkip[item.Fingerprint] = true
		}
		zap.L().Debug("after lastSavedState loop", zap.String("ruleid", r.ID()), zap.Any("revisedItemsToAdd", revisedItemsToAdd))

		// if there are any new state changes that were not saved, add them to the revised items
		for _, item := range itemsToAdd {
			if _, ok := revisedItemsToAdd[item.Fingerprint]; !ok && !shouldSkip[item.Fingerprint] {
				revisedItemsToAdd[item.Fingerprint] = item
			}
		}
		zap.L().Debug("after itemsToAdd loop", zap.String("ruleid", r.ID()), zap.Any("revisedItemsToAdd", revisedItemsToAdd))

		newState := model.StateInactive
		for _, item := range revisedItemsToAdd {
			if item.State == model.StateFiring || item.State == model.StateNoData {
				newState = model.StateFiring
				break
			}
		}
		zap.L().Debug("newState", zap.String("ruleid", r.ID()), zap.Any("newState", newState))

		// if there is a change in the overall state, update the overall state
		if lastSavedState[0].OverallState != newState {
			for fingerprint, item := range revisedItemsToAdd {
				item.OverallState = newState
				item.OverallStateChanged = true
				revisedItemsToAdd[fingerprint] = item
			}
		}
		zap.L().Debug("revisedItemsToAdd after newState", zap.String("ruleid", r.ID()), zap.Any("revisedItemsToAdd", revisedItemsToAdd))

	} else {
		for _, item := range itemsToAdd {
			revisedItemsToAdd[item.Fingerprint] = item
		}
	}

	if len(revisedItemsToAdd) > 0 && r.reader != nil {
		zap.L().Debug("writing rule state history", zap.String("ruleid", r.ID()), zap.Any("revisedItemsToAdd", revisedItemsToAdd))

		entries := make([]model.RuleStateHistory, 0, len(revisedItemsToAdd))
		for _, item := range revisedItemsToAdd {
			entries = append(entries, item)
		}
		err := r.reader.AddRuleStateHistory(ctx, entries)
		if err != nil {
			zap.L().Error("error while inserting rule state history", zap.Error(err), zap.Any("itemsToAdd", itemsToAdd))
		}
	}
	r.handledRestart = true

	return nil
}

func (r *BaseRule) PopulateTemporality(ctx context.Context, orgID valuer.UUID, qp *v3.QueryRangeParamsV3) error {

	missingTemporality := make([]string, 0)
	metricNameToTemporality := make(map[string]map[v3.Temporality]bool)
	if qp.CompositeQuery != nil && len(qp.CompositeQuery.BuilderQueries) > 0 {
		for _, query := range qp.CompositeQuery.BuilderQueries {
			// if there is no temporality specified in the query but we have it in the map
			// then use the value from the map
			if query.Temporality == "" && r.TemporalityMap[query.AggregateAttribute.Key] != nil {
				// We prefer delta if it is available
				if r.TemporalityMap[query.AggregateAttribute.Key][v3.Delta] {
					query.Temporality = v3.Delta
				} else if r.TemporalityMap[query.AggregateAttribute.Key][v3.Cumulative] {
					query.Temporality = v3.Cumulative
				} else {
					query.Temporality = v3.Unspecified
				}
			}
			// we don't have temporality for this metric
			if query.DataSource == v3.DataSourceMetrics && query.Temporality == "" {
				missingTemporality = append(missingTemporality, query.AggregateAttribute.Key)
			}
			if _, ok := metricNameToTemporality[query.AggregateAttribute.Key]; !ok {
				metricNameToTemporality[query.AggregateAttribute.Key] = make(map[v3.Temporality]bool)
			}
		}
	}

	var nameToTemporality map[string]map[v3.Temporality]bool
	var err error

	if len(missingTemporality) > 0 {
		nameToTemporality, err = r.reader.FetchTemporality(ctx, orgID, missingTemporality)
		if err != nil {
			return err
		}
	}

	if qp.CompositeQuery != nil && len(qp.CompositeQuery.BuilderQueries) > 0 {
		for name := range qp.CompositeQuery.BuilderQueries {
			query := qp.CompositeQuery.BuilderQueries[name]
			if query.DataSource == v3.DataSourceMetrics && query.Temporality == "" {
				if nameToTemporality[query.AggregateAttribute.Key][v3.Delta] {
					query.Temporality = v3.Delta
				} else if nameToTemporality[query.AggregateAttribute.Key][v3.Cumulative] {
					query.Temporality = v3.Cumulative
				} else {
					query.Temporality = v3.Unspecified
				}
				r.TemporalityMap[query.AggregateAttribute.Key] = nameToTemporality[query.AggregateAttribute.Key]
			}
		}
	}
	return nil
}

// ShouldSkipNewGroups returns true if new group filtering should be applied
func (r *BaseRule) ShouldSkipNewGroups() bool {
	return r.newGroupEvalDelay != nil && *r.newGroupEvalDelay > 0
}

// isFilterNewSeriesSupported checks if the query is supported for new series filtering
func (r *BaseRule) isFilterNewSeriesSupported() bool {
	if r.ruleCondition.CompositeQuery.QueryType == v3.QueryTypeBuilder {
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
func (r *BaseRule) FilterNewSeries(ctx context.Context, ts time.Time, series []*v3.Series) ([]*v3.Series, error) {
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
		metricLabelMap := series[i].Labels

		// Collect groupBy attribute-value pairs for this series
		seriesKeys := make([]telemetrytypes.MetricMetadataLookupKey, 0)

		for metricName, groupedFields := range metricToGroupedFields {
			for _, groupByKey := range groupedFields {
				if attrValue, ok := metricLabelMap[groupByKey]; ok {
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
	filteredSeries := make([]*v3.Series, 0, len(series))
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
			r.logger.InfoContext(ctx, "Skipping new series", "rule_name", r.Name(), "series_idx", i, "max_first_seen", maxFirstSeen, "eval_time_ms", evalTimeMs, "delay_ms", newGroupEvalDelayMs, "labels", series[i].Labels)
			continue
		}

		// Old enough, include this series
		filteredSeries = append(filteredSeries, series[i])
	}

	skippedCount := len(series) - len(filteredSeries)
	if skippedCount > 0 {
		r.logger.InfoContext(ctx, "Filtered new series", "rule_name", r.Name(), "skipped_count", skippedCount, "total_count", len(series), "delay_ms", newGroupEvalDelayMs)
	}

	return filteredSeries, nil
}

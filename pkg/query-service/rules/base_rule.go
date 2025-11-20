package rules

import (
	"context"
	"fmt"
	"log/slog"
	"net/url"
	"sync"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/parser/queryfilterextractor"
	"github.com/SigNoz/signoz/pkg/query-service/app/clickhouseReader"
	"github.com/SigNoz/signoz/pkg/query-service/interfaces"
	"github.com/SigNoz/signoz/pkg/query-service/model"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	qslabels "github.com/SigNoz/signoz/pkg/query-service/utils/labels"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	ruletypes "github.com/SigNoz/signoz/pkg/types/ruletypes"
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

	evaluation ruletypes.Evaluation

	// newGroupEvalDelay is the grace period for new alert groups
	newGroupEvalDelay *time.Duration
	// cachedMetricAndGroupedFileds caches the extracted metric names and groupBy keys
	cachedMetricAndGroupedFileds struct {
		metricNames   []string
		groupedFields []string
		initialized   bool
	}
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

// ExtractMetricAndGroupBys extracts metric names and groupBy keys from the rule's query.
// Results are cached after first extraction.
func (r *BaseRule) ExtractMetricAndGroupBys(ctx context.Context) ([]string, []string, error) {
	// Return cached result if available
	if r.cachedMetricAndGroupedFileds.initialized {
		return r.cachedMetricAndGroupedFileds.metricNames, r.cachedMetricAndGroupedFileds.groupedFields, nil
	}
	// return error if rule condition or composite query is nil
	if r.ruleCondition == nil || r.ruleCondition.CompositeQuery == nil {
		return nil, nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "rule condition or composite query is nil")
	}

	var metricNames []string
	var groupedFields []string

	compositeQuery := r.ruleCondition.CompositeQuery

	for _, query := range compositeQuery.Queries {
		switch query.Type {
		case qbtypes.QueryTypeBuilder:
			switch spec := query.Spec.(type) {
			case qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]:
				// extract group by fields
				for _, groupBy := range spec.GroupBy {
					if groupBy.Name != "" {
						groupedFields = append(groupedFields, groupBy.Name)
					}
				}
				// extract metric names
				for _, aggregation := range spec.Aggregations {
					if aggregation.MetricName != "" {
						metricNames = append(metricNames, aggregation.MetricName)
					}
				}
			default:
				// TODO: add support for Traces and Logs Aggregation types
				if r.logger != nil {
					r.logger.WarnContext(ctx, "unsupported QueryBuilderQuery type: %T", spec)
				}
				continue
			}
		case qbtypes.QueryTypePromQL:
			spec, ok := query.Spec.(qbtypes.PromQuery)
			if !ok || spec.Query == "" {
				continue
			}
			// use queryfilterextractor to extract metric names and group by fields
			extractor, extractErr := queryfilterextractor.NewExtractor(queryfilterextractor.ExtractorPromQL)
			if extractErr != nil {
				return nil, nil, errors.Newf(errors.TypeInternal, errors.CodeInternal, "error while creating PromQL extractor: %s", extractErr.Error())
			}
			result, extractErr := extractor.Extract(spec.Query)
			if extractErr != nil {
				return nil, nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "error while extracting metric names and group by fields: %s", extractErr.Error())
			}
			metricNames = append(metricNames, result.MetricNames...)
			for _, col := range result.GroupByColumns {
				groupedFields = append(groupedFields, col.OriginField)
			}
		case qbtypes.QueryTypeClickHouseSQL:
			spec, ok := query.Spec.(qbtypes.ClickHouseQuery)
			if !ok || spec.Query == "" {
				continue
			}
			// use queryfilterextractor to extract metric names and group by fields
			extractor, extractErr := queryfilterextractor.NewExtractor(queryfilterextractor.ExtractorCH)
			if extractErr != nil {
				return nil, nil, errors.Newf(errors.TypeInternal, errors.CodeInternal, "error while creating ClickHouse extractor: %s", extractErr.Error())
			}
			result, extractErr := extractor.Extract(spec.Query)
			if extractErr != nil {
				return nil, nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "error while extracting metric names and group by fields: %s", extractErr.Error())
			}
			metricNames = append(metricNames, result.MetricNames...)
			for _, col := range result.GroupByColumns {
				groupedFields = append(groupedFields, col.OriginField)
			}
		default:
			return nil, nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "unsupported query type: %s", query.Type)
		}
	}

	// Cache the result
	r.cachedMetricAndGroupedFileds = struct {
		metricNames   []string
		groupedFields []string
		initialized   bool
	}{metricNames, groupedFields, true}

	return metricNames, groupedFields, nil
}

// FilterNewSeries filters out series that are too new based on metadata first_seen timestamps.
// Returns the filtered series and the number of series that were skipped.
func (r *BaseRule) FilterNewSeries(ctx context.Context, ts time.Time, series ruletypes.SeriesCollection) (ruletypes.SeriesCollection, int, error) {
	// Extract metric names and groupBy keys
	metricNames, groupedFields, err := r.ExtractMetricAndGroupBys(ctx)
	if err != nil {
		// log error but continue with original series
		if r.logger != nil {
			r.logger.WarnContext(ctx, "Failed to extract metric and groupBy keys, skipping new group filter", "error", err, "rule_name", r.Name())
		}
		return series, 0, nil
	}

	if len(metricNames) == 0 || len(groupedFields) == 0 {
		// No metrics or groupBy keys, nothing to filter
		return series, 0, nil
	}

	// Build lookup keys from series
	lookupKeys := make([]model.MetricMetadataLookupKey, 0)
	seriesToKeys := make(map[int][]string) // series index -> lookup key strings

	for i := 0; i < series.Len(); i++ {
		labels := series.GetItem(i).GetLabels()
		metricLabelMap := make(map[string]string)
		for _, lbl := range labels {
			metricLabelMap[lbl.Name] = lbl.Value
		}

		// Collect groupBy attribute-value pairs for this series
		seriesKeys := make([]string, 0)

		for _, metricName := range metricNames {
			for _, groupByKey := range groupedFields {
				if attrValue, ok := metricLabelMap[groupByKey]; ok {
					lookupKey := model.MetricMetadataLookupKey{
						MetricName:     metricName,
						AttributeName:  groupByKey,
						AttributeValue: attrValue,
					}
					lookupKeys = append(lookupKeys, lookupKey)
					keyStr := fmt.Sprintf("%s|%s|%s", metricName, groupByKey, attrValue)
					seriesKeys = append(seriesKeys, keyStr)
				}
			}
		}

		if len(seriesKeys) > 0 {
			seriesToKeys[i] = seriesKeys
		}
	}

	if len(lookupKeys) == 0 {
		// No lookup keys to query, return original series
		return series, 0, nil
	}

	// Query metadata for first_seen timestamps
	firstSeenMap, err := r.getMetadataFirstSeen(ctx, lookupKeys)
	if err != nil {
		// log error but continue with original series
		if r.logger != nil {
			r.logger.WarnContext(ctx, "Failed to query metadata for first_seen, skipping new group filter", "error", err, "rule_name", r.Name())
		}
		return series, 0, nil
	}

	// Filter series based on first_seen + delay
	filteredIndices := make([]int, 0)
	skippedCount := 0
	evalTimeMs := ts.UnixMilli()
	newGroupEvalDelayMs := r.newGroupEvalDelay.Milliseconds()

	for i := 0; i < series.Len(); i++ {
		keys, ok := seriesToKeys[i]
		if !ok {
			// No groupBy keys for this series, include it
			filteredIndices = append(filteredIndices, i)
			continue
		}

		// Find the maximum first_seen across all groupBy attributes for this series
		maxFirstSeen := int64(0)
		foundAny := false
		for _, keyStr := range keys {
			if firstSeen, exists := firstSeenMap[keyStr]; exists {
				foundAny = true
				if firstSeen > maxFirstSeen {
					maxFirstSeen = firstSeen
				}
			}
		}

		if !foundAny {
			// No metadata found - treat as new, skip it
			skippedCount++
			continue
		}

		// Check if first_seen + delay has passed
		if maxFirstSeen+newGroupEvalDelayMs > evalTimeMs {
			// Still within grace period, skip this series
			skippedCount++
			continue
		}

		// Old enough, include it
		filteredIndices = append(filteredIndices, i)
	}

	if r.logger != nil && skippedCount > 0 {
		r.logger.InfoContext(ctx, "Filtered new series", "rule_name", r.Name(), "skipped_count", skippedCount, "total_count", series.Len(), "delay_ms", newGroupEvalDelayMs)
	}

	return series.Filter(filteredIndices), skippedCount, nil
}

// getMetadataFirstSeen is a helper that accesses ClickHouseReader through type assertion
func (r *BaseRule) getMetadataFirstSeen(ctx context.Context, lookupKeys []model.MetricMetadataLookupKey) (map[string]int64, error) {
	// Use type assertion to access ClickHouseReader methods
	// The reader interface is typically implemented by ClickHouseReader
	if chReader, ok := r.reader.(*clickhouseReader.ClickHouseReader); ok {
		return chReader.GetMetadataFirstSeen(ctx, lookupKeys)
	}

	// If type assertion fails, return error (fail-open behavior handled by caller)
	return nil, fmt.Errorf("reader does not implement ClickHouseReader, cannot query metadata")
}

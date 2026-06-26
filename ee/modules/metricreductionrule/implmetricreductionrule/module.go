package implmetricreductionrule

import (
	"context"
	"log/slog"
	"sort"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/licensing"
	"github.com/SigNoz/signoz/pkg/modules/dashboard"
	"github.com/SigNoz/signoz/pkg/modules/metricreductionrule"
	"github.com/SigNoz/signoz/pkg/queryparser"
	"github.com/SigNoz/signoz/pkg/ruler/rulestore/sqlrulestore"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/featuretypes"
	"github.com/SigNoz/signoz/pkg/types/metricreductionruletypes"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	"github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

const (
	// effectiveFromMargin delays effective_from so the collector picks up the synced rule before it
	// goes live; it must be >= the collector's rule-refresh interval (see signoz-otel-collector#839).
	effectiveFromMargin    = 5 * time.Minute
	defaultPreviewLookback = 24 * time.Hour

	pricePerMillionSamplesUSD = 0.1
	monthDuration             = 30 * 24 * time.Hour
)

type module struct {
	store         metricreductionruletypes.Store
	ch            *clickhouse
	dashboard     dashboard.Module
	ruleStore     ruletypes.RuleStore
	licensing     licensing.Licensing
	flagger       flagger.Flagger
	metadataStore telemetrytypes.MetadataStore
	logger        *slog.Logger
}

func NewModule(sqlStore sqlstore.SQLStore, telemetryStore telemetrystore.TelemetryStore, dashboardModule dashboard.Module, queryParser queryparser.QueryParser, licensing licensing.Licensing, flagger flagger.Flagger, metadataStore telemetrytypes.MetadataStore, providerSettings factory.ProviderSettings, threads int) metricreductionrule.Module {
	scoped := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/ee/modules/metricreductionrule/implmetricreductionrule")
	return &module{
		store:         NewStore(sqlStore),
		ch:            newClickhouse(telemetryStore, threads),
		dashboard:     dashboardModule,
		ruleStore:     sqlrulestore.NewRuleStore(sqlStore, queryParser, providerSettings),
		licensing:     licensing,
		flagger:       flagger,
		metadataStore: metadataStore,
		logger:        scoped.Logger(),
	}
}

func (m *module) checkAccess(ctx context.Context, orgID valuer.UUID) error {
	if !m.flagger.BooleanOrEmpty(ctx, flagger.FeatureEnableMetricsReduction, featuretypes.NewFlaggerEvaluationContext(orgID)) {
		return errors.Newf(errors.TypeUnsupported, metricreductionruletypes.ErrCodeMetricReductionRuleUnsupported, "metric volume control is not enabled")
	}
	if _, err := m.licensing.GetActive(ctx, orgID); err != nil {
		return errors.New(errors.TypeLicenseUnavailable, errors.CodeLicenseUnavailable, "metric volume control requires a valid license").WithAdditional(err.Error())
	}
	return nil
}

func (m *module) List(ctx context.Context, orgID valuer.UUID, params *metricreductionruletypes.ListReductionRulesParams) (*metricreductionruletypes.GettableReductionRules, error) {
	if err := m.checkAccess(ctx, orgID); err != nil {
		return nil, err
	}
	if err := params.Validate(); err != nil {
		return nil, err
	}

	now := time.Now()
	startMs := now.Add(-defaultPreviewLookback).UnixMilli()
	endMs := now.UnixMilli()

	switch params.OrderBy {
	case metricreductionruletypes.OrderByMetricName, metricreductionruletypes.OrderByLastUpdated:
		return m.listSortedByColumn(ctx, orgID, params, startMs, endMs)
	default:
		return m.listSortedByVolume(ctx, orgID, params, startMs, endMs)
	}
}

func (m *module) listSortedByColumn(ctx context.Context, orgID valuer.UUID, params *metricreductionruletypes.ListReductionRulesParams, startMs, endMs int64) (*metricreductionruletypes.GettableReductionRules, error) {
	domainRules, total, err := m.store.List(ctx, orgID, params)
	if err != nil {
		return nil, err
	}

	metricNames := make([]string, len(domainRules))
	effectiveFrom := make(map[string]int64, len(domainRules))
	for i, rule := range domainRules {
		metricNames[i] = rule.MetricName
		effectiveFrom[rule.MetricName] = rule.EffectiveFrom.UnixMilli()
	}
	volumes, err := m.ch.VolumeByMetric(ctx, metricNames, effectiveFrom, startMs, endMs)
	if err != nil {
		return nil, err
	}

	rules := make([]metricreductionruletypes.GettableReductionRule, 0, len(domainRules))
	for _, rule := range domainRules {
		rules = append(rules, withVolume(toGettableReductionRule(rule), volumes[rule.MetricName]))
	}

	return &metricreductionruletypes.GettableReductionRules{Rules: rules, Total: total}, nil
}

func (m *module) listSortedByVolume(ctx context.Context, orgID valuer.UUID, params *metricreductionruletypes.ListReductionRulesParams, startMs, endMs int64) (*metricreductionruletypes.GettableReductionRules, error) {
	allRules, total, err := m.store.List(ctx, orgID, &metricreductionruletypes.ListReductionRulesParams{Search: params.Search, MetricName: params.MetricName})
	if err != nil {
		return nil, err
	}
	if total == 0 {
		return &metricreductionruletypes.GettableReductionRules{Rules: []metricreductionruletypes.GettableReductionRule{}, Total: 0}, nil
	}

	metricNames := make([]string, len(allRules))
	effectiveFrom := make(map[string]int64, len(allRules))
	ruleByMetric := make(map[string]*metricreductionruletypes.ReductionRule, len(allRules))
	for i, rule := range allRules {
		metricNames[i] = rule.MetricName
		effectiveFrom[rule.MetricName] = rule.EffectiveFrom.UnixMilli()
		ruleByMetric[rule.MetricName] = rule
	}

	ranked, err := m.ch.RankByVolume(ctx, metricNames, effectiveFrom, params.OrderBy, params.Order, startMs, endMs, params.Offset, params.Limit)
	if err != nil {
		return nil, err
	}

	rules := make([]metricreductionruletypes.GettableReductionRule, 0, len(ranked))
	for _, row := range ranked {
		rule, ok := ruleByMetric[row.MetricName]
		if !ok {
			continue
		}
		rules = append(rules, withVolume(toGettableReductionRule(rule), row))
	}

	return &metricreductionruletypes.GettableReductionRules{Rules: rules, Total: total}, nil
}

func (m *module) Create(ctx context.Context, orgID valuer.UUID, userEmail string, req *metricreductionruletypes.PostableReductionRule) (*metricreductionruletypes.GettableReductionRule, error) {
	if err := m.checkAccess(ctx, orgID); err != nil {
		return nil, err
	}
	if err := req.Validate(); err != nil {
		return nil, err
	}
	if err := m.validateMetricForReduction(ctx, orgID, req.MetricName); err != nil {
		return nil, err
	}
	now := time.Now()
	rule := metricreductionruletypes.NewReductionRule(orgID, req.MetricName, req.MatchType, req.Labels, now.Add(effectiveFromMargin), userEmail)

	if err := m.store.RunInTx(ctx, func(ctx context.Context) error {
		if err := m.store.Create(ctx, rule); err != nil {
			return err
		}
		return m.ch.Sync(ctx, rule.MetricName, rule.Labels, rule.MatchType.StringValue(), rule.EffectiveFrom.UnixMilli(), false, rule.UpdatedAt)
	}); err != nil {
		return nil, err
	}

	gettable := toGettableReductionRule(rule)
	return &gettable, nil
}

func (m *module) GetByID(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*metricreductionruletypes.GettableReductionRule, error) {
	if err := m.checkAccess(ctx, orgID); err != nil {
		return nil, err
	}
	rule, err := m.store.GetByID(ctx, orgID, id)
	if err != nil {
		return nil, err
	}
	gettable := toGettableReductionRule(rule)
	return &gettable, nil
}

func (m *module) UpdateByID(ctx context.Context, orgID valuer.UUID, userEmail string, id valuer.UUID, req *metricreductionruletypes.UpdatableReductionRule) (*metricreductionruletypes.GettableReductionRule, error) {
	if err := m.checkAccess(ctx, orgID); err != nil {
		return nil, err
	}
	existing, err := m.store.GetByID(ctx, orgID, id)
	if err != nil {
		return nil, err
	}
	if err := req.Validate(); err != nil {
		return nil, err
	}

	now := time.Now()
	existing.MatchType = req.MatchType
	existing.Labels = metricreductionruletypes.LabelList(req.Labels)
	existing.EffectiveFrom = now.Add(effectiveFromMargin)
	existing.UpdatedAt = now
	existing.UpdatedBy = userEmail

	if err := m.store.RunInTx(ctx, func(ctx context.Context) error {
		if err := m.store.Upsert(ctx, existing); err != nil {
			return err
		}
		return m.ch.Sync(ctx, existing.MetricName, existing.Labels, existing.MatchType.StringValue(), existing.EffectiveFrom.UnixMilli(), false, existing.UpdatedAt)
	}); err != nil {
		return nil, err
	}

	gettable := toGettableReductionRule(existing)
	return &gettable, nil
}

func (m *module) DeleteByID(ctx context.Context, orgID valuer.UUID, id valuer.UUID) error {
	if err := m.checkAccess(ctx, orgID); err != nil {
		return err
	}
	rule, err := m.store.GetByID(ctx, orgID, id)
	if err != nil {
		return err
	}

	now := time.Now()
	effectiveFromMs := now.Add(effectiveFromMargin).UnixMilli()
	return m.store.RunInTx(ctx, func(ctx context.Context) error {
		if err := m.store.DeleteByID(ctx, orgID, id); err != nil {
			return err
		}
		return m.ch.Sync(ctx, rule.MetricName, []string{}, metricreductionruletypes.MatchTypeDrop.StringValue(), effectiveFromMs, true, now)
	})
}

func (m *module) Preview(ctx context.Context, orgID valuer.UUID, req *metricreductionruletypes.PostableReductionRulePreview) (*metricreductionruletypes.GettableReductionRulePreview, error) {
	if err := m.checkAccess(ctx, orgID); err != nil {
		return nil, err
	}
	if err := req.Validate(); err != nil {
		return nil, err
	}
	if err := m.validateMetricForReduction(ctx, orgID, req.MetricName); err != nil {
		return nil, err
	}
	lookback := time.Duration(req.LookbackMs) * time.Millisecond
	if lookback <= 0 {
		lookback = defaultPreviewLookback
	}
	now := time.Now()
	startMs := now.Add(-lookback).UnixMilli()
	endMs := now.UnixMilli()
	current, reduced, reductionPercent, dropped, err := m.estimateVolume(ctx, req.MetricName, req.MatchType, req.Labels, startMs, endMs)
	if err != nil {
		return nil, err
	}

	// Baseline is what the metric keeps today (its current rule, or raw if none) so the preview reads
	// as current -> proposed.
	currentReduced := current
	if existing, gerr := m.store.Get(ctx, orgID, req.MetricName); gerr == nil {
		if _, existingReduced, _, _, eerr := m.estimateVolume(ctx, req.MetricName, existing.MatchType, existing.Labels, startMs, endMs); eerr == nil {
			currentReduced = existingReduced
		}
	}

	return &metricreductionruletypes.GettableReductionRulePreview{
		IngestedSeries:        current,
		CurrentRetainedSeries: currentReduced,
		RetainedSeries:        reduced,
		ReductionPercent:      reductionPercent,
		DroppedLabels:         dropped,
		AffectedAssets:        m.relatedAssetImpact(ctx, orgID, req.MetricName, dropped),
		EffectiveFrom:         now.Add(effectiveFromMargin),
	}, nil
}

func (m *module) Stats(ctx context.Context, orgID valuer.UUID) (*metricreductionruletypes.GettableReductionRuleStats, error) {
	if err := m.checkAccess(ctx, orgID); err != nil {
		return nil, err
	}

	now := time.Now()
	startMs := now.Add(-defaultPreviewLookback).UnixMilli()
	endMs := now.UnixMilli()

	allRules, total, err := m.store.List(ctx, orgID, &metricreductionruletypes.ListReductionRulesParams{})
	if err != nil {
		return nil, err
	}
	if total == 0 {
		return &metricreductionruletypes.GettableReductionRuleStats{}, nil
	}

	metricNames := make([]string, len(allRules))
	effectiveFrom := make(map[string]int64, len(allRules))
	for i, rule := range allRules {
		metricNames[i] = rule.MetricName
		effectiveFrom[rule.MetricName] = rule.EffectiveFrom.UnixMilli()
	}

	volumes, err := m.ch.VolumeByMetric(ctx, metricNames, effectiveFrom, startMs, endMs)
	if err != nil {
		return nil, err
	}
	var ingestedSeries, retainedSeries uint64
	reducedMetricNames := make([]string, 0, len(volumes))
	reducedEffectiveFrom := make(map[string]int64, len(volumes))
	for name, volume := range volumes {
		ingestedSeries += volume.Ingested
		retained := effectiveRetained(volume.Ingested, volume.Reduced)
		retainedSeries += retained
		if retained < volume.Ingested {
			reducedMetricNames = append(reducedMetricNames, name)
			reducedEffectiveFrom[name] = effectiveFrom[name]
		}
	}

	ingestedSamples, reducedSamples, err := m.ch.SampleVolume(ctx, reducedMetricNames, reducedEffectiveFrom, startMs, endMs)
	if err != nil {
		return nil, err
	}

	return &metricreductionruletypes.GettableReductionRuleStats{
		IngestedSeries:             ingestedSeries,
		RetainedSeries:             retainedSeries,
		EstimatedMonthlySavingsUsd: monthlySavingsUSD(ingestedSamples, reducedSamples, startMs, endMs),
	}, nil
}

// monthlySavingsUSD extrapolates the windowed sample reduction to a monthly figure at the per-sample
// list price. Ingested is gated to effective_from upstream, so pre-activation hours don't inflate it.
func monthlySavingsUSD(ingestedSamples, reducedSamples uint64, startMs, endMs int64) float64 {
	if reducedSamples >= ingestedSamples || endMs <= startMs {
		return 0
	}
	savedSamples := float64(ingestedSamples - reducedSamples)
	monthlySamples := savedSamples * float64(monthDuration.Milliseconds()) / float64(endMs-startMs)
	return monthlySamples / 1_000_000 * pricePerMillionSamplesUSD
}

func (m *module) Timeseries(ctx context.Context, orgID valuer.UUID) (*querybuildertypesv5.QueryRangeResponse, error) {
	if err := m.checkAccess(ctx, orgID); err != nil {
		return nil, err
	}

	now := time.Now()
	startMs := now.Add(-defaultPreviewLookback).UnixMilli()
	endMs := now.UnixMilli()

	allRules, _, err := m.store.List(ctx, orgID, &metricreductionruletypes.ListReductionRulesParams{})
	if err != nil {
		return nil, err
	}
	metricNames := make([]string, len(allRules))
	effectiveFrom := make(map[string]int64, len(allRules))
	for i, rule := range allRules {
		metricNames[i] = rule.MetricName
		effectiveFrom[rule.MetricName] = rule.EffectiveFrom.UnixMilli()
	}

	volumes, err := m.ch.VolumeByMetric(ctx, metricNames, effectiveFrom, startMs, endMs)
	if err != nil {
		return nil, err
	}
	reducedNames := make([]string, 0, len(volumes))
	for name, volume := range volumes {
		if effectiveRetained(volume.Ingested, volume.Reduced) < volume.Ingested {
			reducedNames = append(reducedNames, name)
		}
	}

	points, err := m.ch.SeriesTimeseries(ctx, metricNames, reducedNames, effectiveFrom, startMs, endMs)
	if err != nil {
		return nil, err
	}

	return buildVolumeTimeseries(points), nil
}

func buildVolumeTimeseries(points []volumePoint) *querybuildertypesv5.QueryRangeResponse {
	ingested := make([]*querybuildertypesv5.TimeSeriesValue, 0, len(points))
	reduced := make([]*querybuildertypesv5.TimeSeriesValue, 0, len(points))
	for _, point := range points {
		ingested = append(ingested, &querybuildertypesv5.TimeSeriesValue{Timestamp: point.TimestampMs, Value: float64(point.Ingested)})
		reduced = append(reduced, &querybuildertypesv5.TimeSeriesValue{Timestamp: point.TimestampMs, Value: float64(point.Reduced)})
	}

	return &querybuildertypesv5.QueryRangeResponse{
		Type: querybuildertypesv5.RequestTypeTimeSeries,
		Data: querybuildertypesv5.QueryData{
			Results: []any{
				&querybuildertypesv5.TimeSeriesData{
					QueryName: "reduction_volume",
					Aggregations: []*querybuildertypesv5.AggregationBucket{
						{
							Series: []*querybuildertypesv5.TimeSeries{
								{Labels: []*querybuildertypesv5.Label{{Key: telemetrytypes.TelemetryFieldKey{Name: "series"}, Value: "ingested"}}, Values: ingested},
								{Labels: []*querybuildertypesv5.Label{{Key: telemetrytypes.TelemetryFieldKey{Name: "series"}, Value: "retained"}}, Values: reduced},
							},
						},
					},
				},
			},
		},
	}
}

func (m *module) validateMetricForReduction(ctx context.Context, orgID valuer.UUID, metricName string) error {
	lastSeen, err := m.metadataStore.FetchLastSeenInfoMulti(ctx, metricName)
	if err != nil {
		return err
	}
	if lastSeen[metricName] == 0 {
		return errors.NewNotFoundf(errors.CodeNotFound, "metric not found: %q", metricName)
	}

	now := time.Now()
	startTs := uint64(now.Add(-defaultPreviewLookback).UnixMilli())
	endTs := uint64(now.UnixMilli())
	_, types, _, err := m.metadataStore.FetchTemporalityAndTypeMulti(ctx, orgID, startTs, endTs, metricName)
	if err != nil {
		return err
	}
	if types[metricName] == metrictypes.ExpHistogramType {
		return errors.Newf(errors.TypeInvalidInput, metricreductionruletypes.ErrCodeMetricReductionRuleUnsupportedMetricType,
			"exponential histogram metrics cannot be reduced in v1")
	}
	return nil
}

func (m *module) relatedAssetImpact(ctx context.Context, orgID valuer.UUID, metricName string, dropped []string) []metricreductionruletypes.AffectedAsset {
	affected := make([]metricreductionruletypes.AffectedAsset, 0)
	droppedSet := make(map[string]struct{}, len(dropped))
	for _, label := range dropped {
		droppedSet[label] = struct{}{}
	}

	if dashboards, err := m.dashboard.GetByMetricNames(ctx, orgID, []string{metricName}); err != nil {
		m.logger.WarnContext(ctx, "failed to fetch related dashboards for reduction preview", slog.String("metric_name", metricName), errors.Attr(err))
	} else {
		for _, item := range dashboards[metricName] {
			usedLabels := append(splitCSV(item["group_by"]), splitCSV(item["filter_by"])...)
			affected = append(affected, metricreductionruletypes.AffectedAsset{
				Type:           metricreductionruletypes.AssetTypeDashboard,
				ID:             item["dashboard_id"],
				Name:           item["dashboard_name"],
				Widget:         &metricreductionruletypes.AffectedWidget{ID: item["widget_id"], Name: item["widget_name"]},
				ImpactedLabels: intersectLabels(usedLabels, droppedSet),
			})
		}
	}

	if alerts, err := m.ruleStore.GetStoredRulesByMetricName(ctx, orgID.String(), metricName); err != nil {
		m.logger.WarnContext(ctx, "failed to fetch related alerts for reduction preview", slog.String("metric_name", metricName), errors.Attr(err))
	} else {
		for _, a := range alerts {
			affected = append(affected, metricreductionruletypes.AffectedAsset{
				Type: metricreductionruletypes.AssetTypeAlert,
				ID:   a.AlertID,
				Name: a.AlertName,
			})
		}
	}

	return affected
}

func toGettableReductionRule(rule *metricreductionruletypes.ReductionRule) metricreductionruletypes.GettableReductionRule {
	return metricreductionruletypes.GettableReductionRule{
		Identifiable:  rule.Identifiable,
		TimeAuditable: rule.TimeAuditable,
		UserAuditable: rule.UserAuditable,
		MetricName:    rule.MetricName,
		MatchType:     rule.MatchType,
		Labels:        rule.Labels,
		EffectiveFrom: rule.EffectiveFrom,
		Active:        !rule.EffectiveFrom.After(time.Now()),
	}
}

func effectiveRetained(ingested, reduced uint64) uint64 {
	if reduced == 0 || reduced > ingested {
		return ingested
	}
	return reduced
}

func withVolume(rule metricreductionruletypes.GettableReductionRule, volume volumeRow) metricreductionruletypes.GettableReductionRule {
	rule.IngestedSeries = volume.Ingested
	rule.RetainedSeries = effectiveRetained(volume.Ingested, volume.Reduced)
	if volume.Ingested > 0 {
		rule.ReductionPercent = (1 - float64(rule.RetainedSeries)/float64(volume.Ingested)) * 100
	}
	return rule
}

func intersectLabels(keys []string, droppedSet map[string]struct{}) []string {
	seen := make(map[string]struct{})
	var out []string
	for _, key := range keys {
		if _, ok := droppedSet[key]; !ok {
			continue
		}
		if _, dup := seen[key]; dup {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, key)
	}
	return out
}

func splitCSV(s string) []string {
	if s == "" {
		return nil
	}
	return strings.Split(s, ",")
}

func resolveDroppedKept(matchType metricreductionruletypes.MatchType, ruleLabels, keys []string) (dropped, kept []string) {
	ruleSet := make(map[string]struct{}, len(ruleLabels))
	for _, l := range ruleLabels {
		ruleSet[l] = struct{}{}
	}

	for _, k := range keys {
		if metricreductionruletypes.IsProtectedLabel(k) {
			kept = append(kept, k)
			continue
		}
		_, listed := ruleSet[k]
		drop := listed
		if matchType == metricreductionruletypes.MatchTypeKeep {
			drop = !listed
		}
		if drop {
			dropped = append(dropped, k)
		} else {
			kept = append(kept, k)
		}
	}

	sort.Strings(dropped)
	sort.Strings(kept)
	return dropped, kept
}

func (m *module) estimateVolume(ctx context.Context, metricName string, matchType metricreductionruletypes.MatchType, labels []string, startMs, endMs int64) (current uint64, reduced uint64, reductionPercent float64, dropped []string, err error) {
	keys, err := m.ch.AttributeKeys(ctx, metricName, startMs, endMs)
	if err != nil {
		return 0, 0, 0, nil, err
	}
	dropped, kept := resolveDroppedKept(matchType, labels, keys)

	current, reduced, err = m.ch.EstimateCardinality(ctx, metricName, kept, startMs, endMs)
	if err != nil {
		return 0, 0, 0, nil, err
	}
	if current > 0 && reduced <= current {
		reductionPercent = (1 - float64(reduced)/float64(current)) * 100
	}
	return current, reduced, reductionPercent, dropped, nil
}

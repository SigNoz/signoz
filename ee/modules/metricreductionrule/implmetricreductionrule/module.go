package implmetricreductionrule

import (
	"context"
	"log/slog"
	"sort"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/licensing"
	"github.com/SigNoz/signoz/pkg/modules/dashboard"
	"github.com/SigNoz/signoz/pkg/modules/metricreductionrule"
	"github.com/SigNoz/signoz/pkg/queryparser"
	"github.com/SigNoz/signoz/pkg/ruler/rulestore/sqlrulestore"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/metricreductionruletypes"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

const (
	effectiveFromMargin    = 5 * time.Minute
	defaultPreviewLookback = 24 * time.Hour
)

var protectedLabels = map[string]struct{}{
	"le":                     {},
	"quantile":               {},
	"__name__":               {},
	"__temporality__":        {},
	"deployment.environment": {},
}

func isProtected(label string) bool {
	_, ok := protectedLabels[label]
	return ok
}

type module struct {
	store     metricreductionruletypes.Store
	ch        *clickhouse
	dashboard dashboard.Module
	ruleStore ruletypes.RuleStore
	licensing licensing.Licensing
	logger    *slog.Logger
}

func NewModule(sqlStore sqlstore.SQLStore, telemetryStore telemetrystore.TelemetryStore, dashboardModule dashboard.Module, queryParser queryparser.QueryParser, licensing licensing.Licensing, providerSettings factory.ProviderSettings, threads int) metricreductionrule.Module {
	scoped := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/ee/modules/metricreductionrule/implmetricreductionrule")
	return &module{
		store:     NewStore(sqlStore),
		ch:        newClickhouse(telemetryStore, threads),
		dashboard: dashboardModule,
		ruleStore: sqlrulestore.NewRuleStore(sqlStore, queryParser, providerSettings),
		licensing: licensing,
		logger:    scoped.Logger(),
	}
}

func (m *module) checkLicense(ctx context.Context, orgID valuer.UUID) error {
	if _, err := m.licensing.GetActive(ctx, orgID); err != nil {
		return errors.New(errors.TypeLicenseUnavailable, errors.CodeLicenseUnavailable, "metric volume control requires a valid license").WithAdditional(err.Error())
	}
	return nil
}

func (m *module) List(ctx context.Context, orgID valuer.UUID, params *metricreductionruletypes.ListReductionRulesParams) (*metricreductionruletypes.GettableReductionRules, error) {
	if err := m.checkLicense(ctx, orgID); err != nil {
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
	for i, rule := range domainRules {
		metricNames[i] = rule.MetricName
	}
	volumes, err := m.ch.VolumeByMetric(ctx, metricNames, startMs, endMs)
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
	allRules, total, err := m.store.List(ctx, orgID, &metricreductionruletypes.ListReductionRulesParams{})
	if err != nil {
		return nil, err
	}
	if total == 0 {
		return &metricreductionruletypes.GettableReductionRules{Rules: []metricreductionruletypes.GettableReductionRule{}, Total: 0}, nil
	}

	metricNames := make([]string, len(allRules))
	ruleByMetric := make(map[string]*metricreductionruletypes.StorableReductionRule, len(allRules))
	for i, rule := range allRules {
		metricNames[i] = rule.MetricName
		ruleByMetric[rule.MetricName] = rule
	}

	ranked, err := m.ch.RankByVolume(ctx, metricNames, params.OrderBy, params.Order, startMs, endMs, params.Offset, params.Limit)
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

func (m *module) Get(ctx context.Context, orgID valuer.UUID, metricName string) (*metricreductionruletypes.GettableReductionRule, error) {
	if err := m.checkLicense(ctx, orgID); err != nil {
		return nil, err
	}
	if metricName == "" {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "metricName is required")
	}

	rule, err := m.store.Get(ctx, orgID, metricName)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	current, reduced, reductionPercent, _, err := m.estimateVolume(ctx, rule.MetricName, rule.MatchType, rule.Labels, now.Add(-defaultPreviewLookback).UnixMilli(), now.UnixMilli())
	if err != nil {
		return nil, err
	}
	gettable := toGettableReductionRule(rule)
	gettable.IngestedSeries = current
	gettable.ReducedSeries = reduced
	gettable.ReductionPercent = reductionPercent
	return &gettable, nil
}

func (m *module) Upsert(ctx context.Context, orgID valuer.UUID, userEmail string, req *metricreductionruletypes.PostableReductionRule) (*metricreductionruletypes.GettableReductionRule, error) {
	if err := m.checkLicense(ctx, orgID); err != nil {
		return nil, err
	}
	if err := req.Validate(); err != nil {
		return nil, err
	}
	if err := m.validateMetricForReduction(ctx, req.MetricName); err != nil {
		return nil, err
	}

	if req.MatchType == metricreductionruletypes.MatchTypeDrop {
		for _, label := range req.Labels {
			if isProtected(label) {
				return nil, errors.Newf(errors.TypeInvalidInput, metricreductionruletypes.ErrCodeMetricReductionRuleProtectedLabel,
					"label %q is protected and cannot be dropped", label)
			}
		}
	}

	now := time.Now()
	rule := metricreductionruletypes.NewReductionRule(orgID, req.MetricName, req.MatchType, req.Labels, now.Add(effectiveFromMargin), userEmail)

	if err := m.store.RunInTx(ctx, func(ctx context.Context) error {
		if err := m.store.Upsert(ctx, rule); err != nil {
			return err
		}
		return m.ch.Sync(ctx, rule.MetricName, rule.Labels, rule.MatchType.StringValue(), rule.EffectiveFrom.UnixMilli(), false, rule.UpdatedAt)
	}); err != nil {
		return nil, err
	}

	gettable := toGettableReductionRule(rule)
	return &gettable, nil
}

func (m *module) Delete(ctx context.Context, orgID valuer.UUID, metricName string) error {
	if err := m.checkLicense(ctx, orgID); err != nil {
		return err
	}
	if metricName == "" {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "metricName is required")
	}

	now := time.Now()
	effectiveFromMs := now.Add(effectiveFromMargin).UnixMilli()
	return m.store.RunInTx(ctx, func(ctx context.Context) error {
		if err := m.store.Delete(ctx, orgID, metricName); err != nil {
			return err
		}
		return m.ch.Sync(ctx, metricName, []string{}, metricreductionruletypes.MatchTypeDrop.StringValue(), effectiveFromMs, true, now)
	})
}

func (m *module) Preview(ctx context.Context, orgID valuer.UUID, req *metricreductionruletypes.PostableReductionRulePreview) (*metricreductionruletypes.GettableReductionRulePreview, error) {
	if err := m.checkLicense(ctx, orgID); err != nil {
		return nil, err
	}
	if err := req.Validate(); err != nil {
		return nil, err
	}
	if err := m.validateMetricForReduction(ctx, req.MetricName); err != nil {
		return nil, err
	}

	lookback := time.Duration(req.LookbackMs) * time.Millisecond
	if lookback <= 0 {
		lookback = defaultPreviewLookback
	}
	now := time.Now()
	current, reduced, reductionPercent, dropped, err := m.estimateVolume(ctx, req.MetricName, req.MatchType, req.Labels, now.Add(-lookback).UnixMilli(), now.UnixMilli())
	if err != nil {
		return nil, err
	}

	return &metricreductionruletypes.GettableReductionRulePreview{
		IngestedSeries:   current,
		ReducedSeries:    reduced,
		ReductionPercent: reductionPercent,
		DroppedLabels:    dropped,
		AffectedAssets:   m.relatedAssetImpact(ctx, orgID, req.MetricName, dropped),
		EffectiveFrom:    now.Add(effectiveFromMargin),
	}, nil
}

func (m *module) validateMetricForReduction(ctx context.Context, metricName string) error {
	exists, err := m.ch.MetricExists(ctx, metricName)
	if err != nil {
		return err
	}
	if !exists {
		return errors.NewNotFoundf(errors.CodeNotFound, "metric not found: %q", metricName)
	}

	isExpHist, err := m.ch.IsExponentialHistogram(ctx, metricName)
	if err != nil {
		return err
	}
	if isExpHist {
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
			var groupBy []string
			if gb := item["group_by"]; gb != "" {
				groupBy = strings.Split(gb, ",")
			}
			affected = append(affected, metricreductionruletypes.AffectedAsset{
				Type:           metricreductionruletypes.AssetTypeDashboard,
				ID:             item["dashboard_id"],
				Name:           item["dashboard_name"],
				Widget:         item["widget_name"],
				ImpactedLabels: intersectLabels(groupBy, droppedSet),
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

func toGettableReductionRule(rule *metricreductionruletypes.StorableReductionRule) metricreductionruletypes.GettableReductionRule {
	return metricreductionruletypes.GettableReductionRule{
		MetricName:    rule.MetricName,
		MatchType:     rule.MatchType,
		Labels:        rule.Labels,
		EffectiveFrom: rule.EffectiveFrom,
		UpdatedAt:     rule.UpdatedAt,
		UpdatedBy:     rule.UpdatedBy,
		Active:        !rule.EffectiveFrom.After(time.Now()),
	}
}

func withVolume(rule metricreductionruletypes.GettableReductionRule, volume volumeRow) metricreductionruletypes.GettableReductionRule {
	rule.IngestedSeries = volume.Ingested
	rule.ReducedSeries = volume.Reduced
	if volume.Ingested > 0 && volume.Reduced <= volume.Ingested {
		rule.ReductionPercent = (1 - float64(volume.Reduced)/float64(volume.Ingested)) * 100
	}
	return rule
}

func intersectLabels(keys []string, droppedSet map[string]struct{}) []string {
	var out []string
	for _, key := range keys {
		if _, ok := droppedSet[key]; ok {
			out = append(out, key)
		}
	}
	return out
}

func resolveDroppedKept(matchType metricreductionruletypes.MatchType, ruleLabels, keys []string) (dropped, kept []string) {
	ruleSet := make(map[string]struct{}, len(ruleLabels))
	for _, l := range ruleLabels {
		ruleSet[l] = struct{}{}
	}

	for _, k := range keys {
		if isProtected(k) {
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

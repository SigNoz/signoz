package httpmeterreporter

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/licensing"
	"github.com/SigNoz/signoz/pkg/metercollector"
	"github.com/SigNoz/signoz/pkg/meterreporter"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/featuretypes"
	"github.com/SigNoz/signoz/pkg/types/licensetypes"
	"github.com/SigNoz/signoz/pkg/types/zeustypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/SigNoz/signoz/pkg/zeus"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/metric"
	"go.opentelemetry.io/otel/trace"
)

var _ factory.ServiceWithHealthy = (*Provider)(nil)

type Provider struct {
	settings         factory.ScopedProviderSettings
	config           meterreporter.Config
	collectorsByName map[zeustypes.MeterName]metercollector.MeterCollector
	flagger          flagger.Flagger
	licensing        licensing.Licensing
	orgGetter        organization.Getter
	zeus             zeus.Zeus
	healthyC         chan struct{}
	stopC            chan struct{}
	metrics          *reporterMetrics
}

func NewFactory(collectorFactories factory.NamedMap[factory.ProviderFactory[metercollector.MeterCollector, metercollector.Config]], collectorConfigs []metercollector.Config, flagger flagger.Flagger, licensing licensing.Licensing, orgGetter organization.Getter, zeus zeus.Zeus) factory.ProviderFactory[meterreporter.Reporter, meterreporter.Config] {
	return factory.NewProviderFactory(factory.MustNewName("http"), func(ctx context.Context, providerSettings factory.ProviderSettings, config meterreporter.Config) (meterreporter.Reporter, error) {
		return newProvider(ctx, providerSettings, config, collectorFactories, collectorConfigs, flagger, licensing, orgGetter, zeus)
	},
	)
}

func newProvider(
	ctx context.Context,
	providerSettings factory.ProviderSettings,
	config meterreporter.Config,
	collectorFactories factory.NamedMap[factory.ProviderFactory[metercollector.MeterCollector, metercollector.Config]],
	collectorConfigs []metercollector.Config,
	flagger flagger.Flagger,
	licensing licensing.Licensing,
	orgGetter organization.Getter,
	zeus zeus.Zeus,
) (*Provider, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/ee/meterreporter/httpmeterreporter")

	collectorsByName := map[zeustypes.MeterName]metercollector.MeterCollector{}
	for _, collectorConfig := range collectorConfigs {
		collector, err := factory.NewProviderFromNamedMap(ctx, providerSettings, collectorConfig, collectorFactories, collectorConfig.Provider)
		if err != nil {
			return nil, err
		}
		if _, exists := collectorsByName[collector.Name()]; exists {
			return nil, errors.Newf(errors.TypeAlreadyExists, errors.CodeAlreadyExists, "duplicate meter collector %q", collector.Name())
		}
		collectorsByName[collector.Name()] = collector
	}

	metrics, err := newReporterMetrics(settings.Meter())
	if err != nil {
		return nil, err
	}

	return &Provider{
		settings:         settings,
		config:           config,
		collectorsByName: collectorsByName,
		flagger:          flagger,
		licensing:        licensing,
		orgGetter:        orgGetter,
		zeus:             zeus,
		healthyC:         make(chan struct{}),
		stopC:            make(chan struct{}),
		metrics:          metrics,
	}, nil
}

func (provider *Provider) Start(ctx context.Context) error {
	close(provider.healthyC)

	provider.collect(ctx)

	ticker := time.NewTicker(provider.config.Interval)
	defer ticker.Stop()

	for {
		select {
		case <-provider.stopC:
			return nil
		case <-ticker.C:
			provider.collect(ctx)
		}
	}
}

func (provider *Provider) collect(ctx context.Context) {
	ctx, span := provider.settings.Tracer().Start(ctx, "meterreporter.Collect", trace.WithAttributes(attribute.String("meterreporter.provider", "http")))
	defer span.End()

	orgs, err := provider.orgGetter.ListByOwnedKeyRange(ctx)
	if err != nil {
		span.RecordError(err)
		provider.settings.Logger().ErrorContext(ctx, "failed to get orgs data", errors.Attr(err))
		return
	}

	for _, org := range orgs {
		evalCtx := featuretypes.NewFlaggerEvaluationContext(org.ID)
		if !provider.flagger.BooleanOrEmpty(ctx, flagger.FeatureUseMeterReporter, evalCtx) {
			provider.settings.Logger().DebugContext(ctx, "meter reporter disabled for org, skipping reporting", slog.String("org_id", org.ID.StringValue()))
			continue
		}

		license, err := provider.licensing.GetActive(ctx, org.ID)
		if err != nil {
			if errors.Ast(err, errors.TypeNotFound) {
				provider.settings.Logger().DebugContext(ctx, "no active license found for org, skipping reporting", slog.String("org_id", org.ID.StringValue()))
				continue
			}

			span.RecordError(err)
			provider.settings.Logger().ErrorContext(ctx, "failed to fetch active license for org", errors.Attr(err), slog.String("org_id", org.ID.StringValue()))
			return
		}

		if err := provider.collectOrg(ctx, org, license); err != nil {
			span.RecordError(err)
			provider.settings.Logger().ErrorContext(ctx, "failed to collect meters", errors.Attr(err), slog.String("org_id", org.ID.StringValue()))
		}
	}
}

func (provider *Provider) Stop(ctx context.Context) error {
	close(provider.stopC)
	return nil
}

func (provider *Provider) Healthy() <-chan struct{} {
	return provider.healthyC
}

func (provider *Provider) collectOrg(ctx context.Context, org *types.Organization, license *licensetypes.License) error {
	now := time.Now().UTC()
	// Use one timestamp so a tick cannot straddle midnight.
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)

	if provider.config.Backfill {
		checkpointsByMeter, err := provider.checkpoints(ctx, license.Key)
		if err != nil {
			return err
		}

		nextByCollector := provider.nextDays(license, todayStart, checkpointsByMeter)

		start, end, ok := backfillRange(nextByCollector, todayStart)
		if ok {
			for day := start; !day.After(end); day = day.AddDate(0, 0, 1) {
				eligible := eligibleCollectors(provider.collectorsByName, nextByCollector, day)
				if len(eligible) == 0 {
					continue
				}

				window, err := zeustypes.NewMeterWindow(day.UnixMilli(), day.AddDate(0, 0, 1).UnixMilli(), true)
				if err != nil {
					return err
				}

				if err := provider.report(ctx, org.ID, license, window, eligible); err != nil {
					provider.settings.Logger().WarnContext(ctx, "failed to backfill for day", errors.Attr(err), slog.String("date", day.Format("2006-01-02")))
					return err
				}
			}
		}
	}

	// Today's partial window: every collector is always eligible (next <= today).
	if now.UnixMilli() > todayStart.UnixMilli() {
		todayWindow, err := zeustypes.NewMeterWindow(todayStart.UnixMilli(), now.UnixMilli(), false)
		if err != nil {
			return err
		}

		return provider.report(ctx, org.ID, license, todayWindow, provider.collectorsByName)
	}

	return nil
}

func (provider *Provider) checkpoints(ctx context.Context, licenseKey string) (map[string]time.Time, error) {
	list, err := provider.zeus.ListMeterCheckpoints(ctx, licenseKey)
	if err != nil {
		provider.metrics.checkpoints.Add(ctx, 1, metric.WithAttributes(errors.TypeAttr(err)))
		return nil, err
	}

	provider.metrics.checkpoints.Add(ctx, 1)

	checkpointsByMeter := make(map[string]time.Time, len(list))
	for _, checkpoint := range list {
		checkpointsByMeter[checkpoint.Name] = checkpoint.StartDate.UTC()
	}

	return checkpointsByMeter, nil
}

func (provider *Provider) nextDays(license *licensetypes.License, todayStart time.Time, checkpointsByMeter map[string]time.Time) map[zeustypes.MeterName]time.Time {
	nextByCollector := make(map[zeustypes.MeterName]time.Time, len(provider.collectorsByName))
	licenseCreatedAt := license.CreatedAt.UTC()
	licenseCreatedAtDay := time.Date(licenseCreatedAt.Year(), licenseCreatedAt.Month(), licenseCreatedAt.Day(), 0, 0, 0, 0, time.UTC)

	for _, collector := range provider.collectorsByName {
		checkpoint, hasCheckpoint := checkpointsByMeter[collector.Name().String()]
		nextByCollector[collector.Name()] = nextReportableDay(licenseCreatedAtDay, todayStart, checkpoint, hasCheckpoint)
	}

	return nextByCollector
}

func nextReportableDay(licenseCreatedAtDay time.Time, todayStart time.Time, checkpoint time.Time, hasCheckpoint bool) time.Time {
	next := licenseCreatedAtDay
	if next.IsZero() {
		next = todayStart
	}

	if hasCheckpoint {
		checkpointNext := checkpoint.AddDate(0, 0, 1)
		if checkpointNext.After(next) {
			next = checkpointNext
		}
	}

	return next
}

func (provider *Provider) report(ctx context.Context, orgID valuer.UUID, license *licensetypes.License, window zeustypes.MeterWindow, collectors map[zeustypes.MeterName]metercollector.MeterCollector) error {
	date := time.UnixMilli(window.StartUnixMilli).UTC().Format("2006-01-02")

	meters := make([]zeustypes.Meter, 0, len(collectors))
	for _, collector := range collectors {
		meterAttr := attribute.String("signoz.meter.name", collector.Name().String())
		collectedReadings, err := collector.Collect(ctx, orgID, license, window)
		if err != nil {
			provider.metrics.collections.Add(ctx, 1, metric.WithAttributes(meterAttr, errors.TypeAttr(err)))
			continue
		}

		provider.metrics.collections.Add(ctx, 1, metric.WithAttributes(meterAttr))
		meters = append(meters, collectedReadings...)
	}

	if len(meters) == 0 {
		return nil
	}

	idempotencyKey := fmt.Sprintf("meterreporter:%s", date)

	body, err := json.Marshal(meters)
	if err != nil {
		provider.metrics.reports.Add(ctx, 1, metric.WithAttributes(errors.TypeAttr(err)))
		return err
	}

	if err := provider.zeus.PutMetersV3(ctx, license.Key, idempotencyKey, body); err != nil {
		provider.metrics.reports.Add(ctx, 1, metric.WithAttributes(errors.TypeAttr(err)))
		return err
	}

	provider.metrics.reports.Add(ctx, 1)
	provider.metrics.meters.Add(ctx, int64(len(meters)))
	return nil
}

// backfillRange returns the inclusive sealed-day range ending at yesterday.
func backfillRange(nextByCollector map[zeustypes.MeterName]time.Time, todayStart time.Time) (start, end time.Time, ok bool) {
	yesterday := todayStart.AddDate(0, 0, -1)

	for _, next := range nextByCollector {
		if !next.Before(todayStart) {
			continue
		}
		if start.IsZero() || next.Before(start) {
			start = next
		}
	}

	if start.IsZero() || start.After(yesterday) {
		return time.Time{}, time.Time{}, false
	}

	return start, yesterday, true
}

func eligibleCollectors(collectors map[zeustypes.MeterName]metercollector.MeterCollector, nextByCollector map[zeustypes.MeterName]time.Time, day time.Time) map[zeustypes.MeterName]metercollector.MeterCollector {
	eligible := make(map[zeustypes.MeterName]metercollector.MeterCollector, len(collectors))
	for name, collector := range collectors {
		if !nextByCollector[name].After(day) {
			eligible[name] = collector
		}
	}

	return eligible
}

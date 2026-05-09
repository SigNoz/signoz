package httpmeterreporter

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"sort"
	"sync"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/licensing"
	"github.com/SigNoz/signoz/pkg/metercollector"
	"github.com/SigNoz/signoz/pkg/meterreporter"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/telemetrymeter"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/zeustypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/SigNoz/signoz/pkg/zeus"
	"github.com/huandu/go-sqlbuilder"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/metric"
	"go.opentelemetry.io/otel/trace"
)

var _ factory.ServiceWithHealthy = (*Provider)(nil)

var errCodeReportFailed = errors.MustNewCode("meterreporter_report_failed")

const (
	phaseSealed = "sealed"
	phaseToday  = "today"

	attrPhase                 = "phase"
	attrResult                = "result"
	attrMeterReporterProvider = "meterreporter.provider"
	attrOrgID                 = "meterreporter.org_id"
	attrOrgCount              = "meterreporter.org_count"
	attrMeter                 = "meterreporter.meter"
	attrDate                  = "meterreporter.date"
	attrReadings              = "meterreporter.readings"
	attrReadingsCollected     = "meterreporter.readings_collected"
	attrReadingsDropped       = "meterreporter.readings_dropped"
	attrWindowStartUnixMilli  = "meterreporter.window_start_unix_milli"
	attrWindowEndUnixMilli    = "meterreporter.window_end_unix_milli"
	attrWindowCompleted       = "meterreporter.window_completed"
	attrCatchupStart          = "meterreporter.catchup_start"
	attrCatchupEnd            = "meterreporter.catchup_end"
	attrDurationMs            = "meterreporter.duration_ms"
	attrIdempotencyKey        = "meterreporter.idempotency_key"

	resultSuccess = "success"
	resultFailure = "failure"

	providerName = "http"
)

// Provider collects registered meters and ships them to Zeus.
type Provider struct {
	settings   factory.ScopedProviderSettings
	config     meterreporter.Config
	collectors []metercollector.MeterCollector

	licensing      licensing.Licensing
	telemetryStore telemetrystore.TelemetryStore
	orgGetter      organization.Getter
	zeus           zeus.Zeus

	healthyC     chan struct{}
	stopC        chan struct{}
	goroutinesWg sync.WaitGroup
	metrics      *reporterMetrics
}

// NewFactory registers the HTTP meter reporter.
func NewFactory(
	collectors map[zeustypes.MeterName]metercollector.MeterCollector,
	licensing licensing.Licensing,
	telemetryStore telemetrystore.TelemetryStore,
	orgGetter organization.Getter,
	zeus zeus.Zeus,
) factory.ProviderFactory[meterreporter.Reporter, meterreporter.Config] {
	return factory.NewProviderFactory(
		factory.MustNewName(providerName),
		func(ctx context.Context, providerSettings factory.ProviderSettings, config meterreporter.Config) (meterreporter.Reporter, error) {
			return newProvider(ctx, providerSettings, config, collectors, licensing, telemetryStore, orgGetter, zeus)
		},
	)
}

func newProvider(
	_ context.Context,
	providerSettings factory.ProviderSettings,
	config meterreporter.Config,
	collectors map[zeustypes.MeterName]metercollector.MeterCollector,
	licensing licensing.Licensing,
	telemetryStore telemetrystore.TelemetryStore,
	orgGetter organization.Getter,
	zeus zeus.Zeus,
) (*Provider, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/ee/meterreporter/httpmeterreporter")

	metrics, err := newReporterMetrics(settings.Meter())
	if err != nil {
		return nil, err
	}

	orderedCollectors, err := validateCollectors(collectors)
	if err != nil {
		return nil, err
	}

	return &Provider{
		settings:       settings,
		config:         config,
		collectors:     orderedCollectors,
		licensing:      licensing,
		telemetryStore: telemetryStore,
		orgGetter:      orgGetter,
		zeus:           zeus,
		healthyC:       make(chan struct{}),
		stopC:          make(chan struct{}),
		metrics:        metrics,
	}, nil
}

func validateCollectors(collectors map[zeustypes.MeterName]metercollector.MeterCollector) ([]metercollector.MeterCollector, error) {
	ordered := make([]metercollector.MeterCollector, 0, len(collectors))
	for name, collector := range collectors {
		if name.IsZero() {
			return nil, errors.New(errors.TypeInvalidInput, meterreporter.ErrCodeInvalidInput, "empty meter name in collector registry")
		}
		if collector == nil {
			return nil, errors.Newf(errors.TypeInvalidInput, meterreporter.ErrCodeInvalidInput, "nil collector for meter %q", name.String())
		}
		if collector.Name() != name {
			return nil, errors.Newf(errors.TypeInvalidInput, meterreporter.ErrCodeInvalidInput, "registry key %q does not match collector.Name() %q", name.String(), collector.Name().String())
		}
		if collector.Unit().IsZero() {
			return nil, errors.Newf(errors.TypeInvalidInput, meterreporter.ErrCodeInvalidInput, "meter %q has empty unit", name.String())
		}
		if collector.Aggregation().IsZero() {
			return nil, errors.Newf(errors.TypeInvalidInput, meterreporter.ErrCodeInvalidInput, "meter %q has empty aggregation", name.String())
		}
		ordered = append(ordered, collector)
	}

	sort.Slice(ordered, func(i, j int) bool {
		return ordered[i].Name().String() < ordered[j].Name().String()
	})

	return ordered, nil
}

// Start runs an immediate tick, then repeats on Config.Interval.
func (provider *Provider) Start(ctx context.Context) error {
	close(provider.healthyC)

	provider.settings.Logger().InfoContext(ctx, "meter reporter started",
		slog.Duration("interval", provider.config.Interval),
		slog.Duration("timeout", provider.config.Timeout),
		slog.Int("catchup_max_days_per_tick", provider.config.CatchupMaxDaysPerTick),
		slog.Int("meters", len(provider.collectors)),
	)

	provider.goroutinesWg.Add(1)
	go func() {
		defer provider.goroutinesWg.Done()

		provider.runTick(ctx)

		ticker := time.NewTicker(provider.config.Interval)
		defer ticker.Stop()

		for {
			select {
			case <-provider.stopC:
				return
			case <-ticker.C:
				provider.runTick(ctx)
			}
		}
	}()

	provider.goroutinesWg.Wait()
	return nil
}

// Stop signals the tick loop and waits for any in-flight tick.
func (provider *Provider) Stop(ctx context.Context) error {
	<-provider.healthyC
	provider.settings.Logger().InfoContext(ctx, "meter reporter stopping")
	select {
	case <-provider.stopC:
		// already closed
	default:
		close(provider.stopC)
	}
	provider.goroutinesWg.Wait()
	provider.settings.Logger().InfoContext(ctx, "meter reporter stopped")
	return nil
}

func (provider *Provider) Healthy() <-chan struct{} {
	return provider.healthyC
}

// runTick executes one collect-and-ship cycle under Config.Timeout.
func (provider *Provider) runTick(parentCtx context.Context) {
	tickStart := time.Now()
	ctx, span := provider.settings.Tracer().Start(parentCtx, "meterreporter.Tick", trace.WithAttributes(
		attribute.String(attrMeterReporterProvider, providerName),
		attribute.Int("meterreporter.meters", len(provider.collectors)),
		attribute.Int("meterreporter.catchup_max_days_per_tick", provider.config.CatchupMaxDaysPerTick),
	))
	defer span.End()

	provider.metrics.ticks.Add(ctx, 1)

	ctx, cancel := context.WithTimeout(ctx, provider.config.Timeout)
	defer cancel()

	provider.settings.Logger().DebugContext(ctx, "meter reporter tick started",
		slog.Duration("timeout", provider.config.Timeout),
		slog.Int("meters", len(provider.collectors)),
	)

	if err := provider.tick(ctx); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		span.SetAttributes(
			attribute.String(attrResult, resultFailure),
			attribute.Int64(attrDurationMs, time.Since(tickStart).Milliseconds()),
		)
		provider.settings.Logger().ErrorContext(ctx, "meter reporter tick failed",
			errors.Attr(err),
			slog.Duration("timeout", provider.config.Timeout),
			slog.Duration("duration", time.Since(tickStart)),
		)
		return
	}

	span.SetAttributes(
		attribute.String(attrResult, resultSuccess),
		attribute.Int64(attrDurationMs, time.Since(tickStart).Milliseconds()),
	)
	provider.settings.Logger().DebugContext(ctx, "meter reporter tick completed", slog.Duration("duration", time.Since(tickStart)))
}

// tick processes sealed catchup days, then today's partial window.
func (provider *Provider) tick(ctx context.Context) error {
	now := time.Now().UTC()
	// Use one timestamp so a tick cannot straddle midnight.
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	yesterday := todayStart.AddDate(0, 0, -1)

	orgs, err := provider.orgGetter.ListByOwnedKeyRange(ctx)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errCodeReportFailed, "failed to list organizations")
	}
	trace.SpanFromContext(ctx).SetAttributes(attribute.Int(attrOrgCount, len(orgs)))
	if len(orgs) == 0 {
		provider.settings.Logger().InfoContext(ctx, "skipping meter reporter tick; no organizations found")
		return nil
	}
	org := orgs[0]
	if len(orgs) > 1 {
		// signoz_meter samples have no org marker.
		provider.settings.Logger().WarnContext(ctx, "multiple orgs on a single instance; reporting only the first",
			slog.Int("org_count", len(orgs)),
			slog.String("selected_org_id", org.ID.StringValue()),
		)
	}
	trace.SpanFromContext(ctx).SetAttributes(attribute.String(attrOrgID, org.ID.StringValue()))

	license, err := provider.licensing.GetActive(ctx, org.ID)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errCodeReportFailed, "failed to fetch active license for org %q", org.ID.StringValue())
	}
	if license == nil || license.Key == "" {
		provider.settings.Logger().WarnContext(ctx, "skipping tick, nil/empty license for org", slog.String("org_id", org.ID.StringValue()))
		return nil
	}

	checkpoints, err := provider.zeus.ListMeterCheckpoints(ctx, license.Key)
	if err != nil {
		provider.metrics.checkpointErrors.Add(ctx, 1)
		provider.settings.Logger().ErrorContext(ctx, "skipping tick: meter checkpoints call failed", errors.Attr(err))
		return nil
	}
	checkpointsByMeter := make(map[string]time.Time, len(checkpoints))
	for _, checkpoint := range checkpoints {
		checkpointsByMeter[checkpoint.Name] = checkpoint.StartDate.UTC()
	}

	floor := provider.dataFloor(ctx, todayStart)
	catchupStart := provider.catchupStart(floor, todayStart, checkpointsByMeter)
	end := catchupStart.AddDate(0, 0, provider.config.CatchupMaxDaysPerTick-1)
	if end.After(yesterday) {
		end = yesterday
	}
	trace.SpanFromContext(ctx).SetAttributes(
		attribute.String(attrCatchupStart, catchupStart.Format("2006-01-02")),
		attribute.String(attrCatchupEnd, end.Format("2006-01-02")),
	)
	provider.settings.Logger().DebugContext(ctx, "meter reporter catchup window selected",
		slog.String("org_id", org.ID.StringValue()),
		slog.Time("data_floor", floor),
		slog.Time("catchup_start", catchupStart),
		slog.Time("catchup_end", end),
		slog.Int("catchup_max_days_per_tick", provider.config.CatchupMaxDaysPerTick),
	)
	for day := catchupStart; !day.After(end); day = day.AddDate(0, 0, 1) {
		window, err := zeustypes.NewMeterWindow(day.UnixMilli(), day.AddDate(0, 0, 1).UnixMilli(), true)
		if err != nil {
			return errors.Wrapf(err, errors.TypeInternal, errCodeReportFailed, "build sealed meter window")
		}
		err = provider.runPhase(ctx, org.ID, license.Key, window, checkpointsByMeter)
		result := resultSuccess
		if err != nil {
			result = resultFailure
		}
		provider.metrics.catchupDaysProcessed.Add(ctx, 1, metric.WithAttributes(attribute.String(attrResult, result)))
		if err != nil {
			provider.settings.Logger().WarnContext(ctx, "stopping sealed catchup after failed day",
				errors.Attr(err),
				slog.String("date", day.Format("2006-01-02")),
			)
			break
		}
	}

	// Today's partial window runs every tick.
	if now.UnixMilli() > todayStart.UnixMilli() {
		todayWindow, err := zeustypes.NewMeterWindow(todayStart.UnixMilli(), now.UnixMilli(), false)
		if err != nil {
			return errors.Wrapf(err, errors.TypeInternal, errCodeReportFailed, "build current-day meter window")
		}
		_ = provider.runPhase(ctx, org.ID, license.Key, todayWindow, checkpointsByMeter)
	}

	return nil
}

// runPhase collects all meters for one window and ships the batch.
func (provider *Provider) runPhase(ctx context.Context, orgID valuer.UUID, licenseKey string, window zeustypes.MeterWindow, checkpointsByMeter map[string]time.Time) error {
	phaseLabel := phaseToday
	if window.IsCompleted {
		phaseLabel = phaseSealed
	}
	phaseAttr := metric.WithAttributes(attribute.String(attrPhase, phaseLabel))
	date := time.UnixMilli(window.StartUnixMilli).UTC().Format("2006-01-02")
	phaseStart := time.Now()
	ctx, span := provider.settings.Tracer().Start(ctx, "meterreporter.RunPhase", trace.WithAttributes(
		attribute.String(attrPhase, phaseLabel),
		attribute.String(attrOrgID, orgID.StringValue()),
		attribute.String(attrDate, date),
		attribute.Int64(attrWindowStartUnixMilli, window.StartUnixMilli),
		attribute.Int64(attrWindowEndUnixMilli, window.EndUnixMilli),
		attribute.Bool(attrWindowCompleted, window.IsCompleted),
	))
	defer span.End()

	provider.settings.Logger().DebugContext(ctx, "meter reporter phase started",
		slog.String("org_id", orgID.StringValue()),
		slog.String("phase", phaseLabel),
		slog.String("date", date),
		slog.Int64("start_unix_milli", window.StartUnixMilli),
		slog.Int64("end_unix_milli", window.EndUnixMilli),
		slog.Int("meters", len(provider.collectors)),
	)

	collectStart := time.Now()
	readings := make([]zeustypes.Meter, 0, len(provider.collectors))
	for _, collector := range provider.collectors {
		meterName := collector.Name().String()
		collectStart := time.Now()
		collectCtx, collectSpan := provider.settings.Tracer().Start(ctx, "meterreporter.CollectMeter", trace.WithAttributes(
			attribute.String(attrPhase, phaseLabel),
			attribute.String(attrOrgID, orgID.StringValue()),
			attribute.String(attrMeter, meterName),
			attribute.String(attrDate, date),
			attribute.Int64(attrWindowStartUnixMilli, window.StartUnixMilli),
			attribute.Int64(attrWindowEndUnixMilli, window.EndUnixMilli),
			attribute.Bool(attrWindowCompleted, window.IsCompleted),
		))
		collectedReadings, err := collector.Collect(collectCtx, orgID, window)
		if err != nil {
			collectSpan.RecordError(err)
			collectSpan.SetStatus(codes.Error, err.Error())
			collectSpan.SetAttributes(
				attribute.String(attrResult, resultFailure),
				attribute.Int64(attrDurationMs, time.Since(collectStart).Milliseconds()),
			)
			collectSpan.End()
			provider.metrics.collectErrors.Add(ctx, 1, phaseAttr)
			provider.settings.Logger().ErrorContext(ctx, "meter collection failed",
				errors.Attr(err),
				slog.String("meter", meterName),
				slog.String("org_id", orgID.StringValue()),
				slog.String("phase", phaseLabel),
				slog.String("date", date),
				slog.Duration("duration", time.Since(collectStart)),
			)
			continue
		}
		collectSpan.SetAttributes(
			attribute.String(attrResult, resultSuccess),
			attribute.Int(attrReadings, len(collectedReadings)),
			attribute.Int64(attrDurationMs, time.Since(collectStart).Milliseconds()),
		)
		collectSpan.End()
		provider.settings.Logger().DebugContext(ctx, "meter collection completed",
			slog.String("meter", meterName),
			slog.String("org_id", orgID.StringValue()),
			slog.String("phase", phaseLabel),
			slog.String("date", date),
			slog.Int("readings", len(collectedReadings)),
			slog.Duration("duration", time.Since(collectStart)),
		)
		readings = append(readings, collectedReadings...)
	}
	collectDuration := time.Since(collectStart)
	provider.metrics.collectDuration.Add(ctx, collectDuration.Seconds(), phaseAttr)
	provider.metrics.collectOperations.Add(ctx, 1, phaseAttr)
	span.SetAttributes(attribute.Int(attrReadingsCollected, len(readings)))

	if window.IsCompleted {
		beforeDrop := len(readings)
		readings = dropCheckpointed(readings, time.UnixMilli(window.StartUnixMilli).UTC(), checkpointsByMeter)
		dropped := beforeDrop - len(readings)
		span.SetAttributes(attribute.Int(attrReadingsDropped, dropped))
		if dropped > 0 {
			provider.settings.Logger().DebugContext(ctx, "dropped checkpointed meter readings",
				slog.String("org_id", orgID.StringValue()),
				slog.String("phase", phaseLabel),
				slog.String("date", date),
				slog.Int("dropped", dropped),
				slog.Int("remaining", len(readings)),
			)
		}
	}
	if len(readings) == 0 {
		span.SetAttributes(
			attribute.String(attrResult, resultSuccess),
			attribute.Int(attrReadings, 0),
			attribute.Int64(attrDurationMs, time.Since(phaseStart).Milliseconds()),
		)
		provider.settings.Logger().DebugContext(ctx, "meter reporter phase produced no readings",
			slog.String("org_id", orgID.StringValue()),
			slog.String("phase", phaseLabel),
			slog.String("date", date),
			slog.Duration("collect_duration", collectDuration),
			slog.Duration("duration", time.Since(phaseStart)),
		)
		return nil
	}

	shipStart := time.Now()
	err := provider.shipReadings(ctx, licenseKey, date, readings)
	shipDuration := time.Since(shipStart)
	provider.metrics.shipDuration.Add(ctx, shipDuration.Seconds(), phaseAttr)
	provider.metrics.shipOperations.Add(ctx, 1, phaseAttr)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		span.SetAttributes(attribute.String(attrResult, resultFailure))
		provider.metrics.postErrors.Add(ctx, 1, phaseAttr)
		provider.settings.Logger().ErrorContext(ctx, "failed to ship meter readings",
			errors.Attr(err),
			slog.String("phase", phaseLabel),
			slog.String("date", date),
			slog.Int("readings", len(readings)),
			slog.Duration("ship_duration", shipDuration),
		)
		return err
	}
	provider.metrics.readingsEmitted.Add(ctx, int64(len(readings)), phaseAttr)
	span.SetAttributes(
		attribute.String(attrResult, resultSuccess),
		attribute.Int(attrReadings, len(readings)),
		attribute.Int64(attrDurationMs, time.Since(phaseStart).Milliseconds()),
	)
	provider.settings.Logger().InfoContext(ctx, "meter reporter phase shipped",
		slog.String("org_id", orgID.StringValue()),
		slog.String("phase", phaseLabel),
		slog.String("date", date),
		slog.Int("readings", len(readings)),
		slog.Duration("collect_duration", collectDuration),
		slog.Duration("ship_duration", shipDuration),
		slog.Duration("duration", time.Since(phaseStart)),
	)
	return nil
}

// dropCheckpointed removes readings already covered by meter checkpoints.
func dropCheckpointed(readings []zeustypes.Meter, windowDay time.Time, checkpointsByMeter map[string]time.Time) []zeustypes.Meter {
	if len(checkpointsByMeter) == 0 {
		return readings
	}
	kept := readings[:0]
	for _, reading := range readings {
		checkpoint, ok := checkpointsByMeter[reading.MeterName]
		if !ok || checkpoint.Before(windowDay) {
			kept = append(kept, reading)
		}
	}
	return kept
}

// catchupStart returns the earliest UTC day that still needs sealed reporting.
func (provider *Provider) catchupStart(floor time.Time, todayStart time.Time, checkpointsByMeter map[string]time.Time) time.Time {
	catchupStart := todayStart

	for _, collector := range provider.collectors {
		next := floor
		if checkpoint, ok := checkpointsByMeter[collector.Name().String()]; ok {
			next = checkpoint.AddDate(0, 0, 1)
			if next.Before(floor) {
				next = floor
			}
		}
		if next.Before(catchupStart) {
			catchupStart = next
		}
	}

	yesterday := todayStart.AddDate(0, 0, -1)
	if catchupStart.After(yesterday) {
		catchupStart = yesterday
	}

	return catchupStart
}

// dataFloor returns the earliest signoz_meter sample day, or today on failure.
func (provider *Provider) dataFloor(ctx context.Context, todayStart time.Time) time.Time {
	ctx, span := provider.settings.Tracer().Start(ctx, "meterreporter.DataFloor")
	defer span.End()

	if provider.telemetryStore == nil {
		span.SetAttributes(attribute.String(attrResult, resultSuccess))
		return todayStart
	}

	sb := sqlbuilder.NewSelectBuilder()
	sb.Select("ifNull(min(unix_milli), 0)")
	sb.From(telemetrymeter.DBName + "." + telemetrymeter.SamplesTableName)
	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	var minMs int64
	if err := provider.telemetryStore.ClickhouseDB().QueryRow(ctx, query, args...).Scan(&minMs); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		span.SetAttributes(attribute.String(attrResult, resultFailure))
		provider.settings.Logger().WarnContext(ctx, "failed to read data floor; falling back to latest sealed day", errors.Attr(err))
		return todayStart
	}
	if minMs == 0 {
		span.SetAttributes(
			attribute.String(attrResult, resultSuccess),
			attribute.Int64("meterreporter.data_floor_unix_milli", 0),
		)
		return todayStart
	}

	minDay := time.UnixMilli(minMs).UTC()
	floor := time.Date(minDay.Year(), minDay.Month(), minDay.Day(), 0, 0, 0, 0, time.UTC)
	span.SetAttributes(
		attribute.String(attrResult, resultSuccess),
		attribute.Int64("meterreporter.data_floor_unix_milli", floor.UnixMilli()),
	)
	provider.settings.Logger().DebugContext(ctx, "meter reporter data floor loaded", slog.Time("data_floor", floor))
	return floor
}

// shipReadings sends one day's meter batch to Zeus.
func (provider *Provider) shipReadings(ctx context.Context, licenseKey string, date string, readings []zeustypes.Meter) error {
	idempotencyKey := fmt.Sprintf("meter-cron:%s", date)
	ctx, span := provider.settings.Tracer().Start(ctx, "meterreporter.ShipReadings", trace.WithAttributes(
		attribute.String(attrDate, date),
		attribute.Int(attrReadings, len(readings)),
		attribute.String(attrIdempotencyKey, idempotencyKey),
	))
	defer span.End()

	provider.settings.Logger().InfoContext(ctx, "shipping meter readings",
		slog.String("date", date),
		slog.Int("readings", len(readings)),
		slog.String("idempotency_key", idempotencyKey),
	)

	for _, reading := range readings {
		provider.settings.Logger().InfoContext(ctx, "shipping meter reading",
			slog.String("meter", reading.MeterName),
			slog.Int64("value", reading.Value),
			slog.String("unit", reading.Unit.StringValue()),
			slog.String("aggregation", reading.Aggregation.StringValue()),
			slog.Int64("start_unix_milli", reading.StartUnixMilli),
			slog.Int64("end_unix_milli", reading.EndUnixMilli),
			slog.Bool("is_completed", reading.IsCompleted),
			slog.Any("dimensions", reading.Dimensions),
			slog.String("idempotency_key", idempotencyKey),
		)
	}

	body, err := json.Marshal(readings)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errCodeReportFailed, "marshal meter readings for %s", date)
	}
	if err := provider.zeus.PutMetersV3(ctx, licenseKey, idempotencyKey, body); err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errCodeReportFailed, "ship meter readings for %s", date)
	}

	span.SetAttributes(attribute.String(attrResult, resultSuccess))
	return nil
}

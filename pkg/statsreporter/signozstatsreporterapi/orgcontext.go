package signozstatsreporterapi

import (
	"context"
	"strings"
	"time"

	"golang.org/x/sync/errgroup"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/statsreporter"
	"github.com/SigNoz/signoz/pkg/statsreporter/telemetrystatscollector"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/types/emptystatetypes"
	"github.com/SigNoz/signoz/pkg/types/licensetypes"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/types/savedviewtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// orgContext computes the org context signals served by the handler.
type orgContext struct {
	telemetryStore telemetrystore.TelemetryStore
	collectors     statsreporter.OrgContextCollectors
}

func newOrgContext(telemetryStore telemetrystore.TelemetryStore, collectors statsreporter.OrgContextCollectors) *orgContext {
	return &orgContext{
		telemetryStore: telemetryStore,
		collectors:     collectors,
	}
}

func (c *orgContext) Get(ctx context.Context, orgID valuer.UUID) (*emptystatetypes.OrgContext, error) {
	var logsLastIngestedAt *time.Time
	var tracesLastIngestedAt *time.Time
	var metricsLastIngestedAt *time.Time
	var alertsCount int
	var dashboardsCount int
	var savedViewsCount int
	licenseStatus := emptystatetypes.LicenseStatusUnknown

	g, gCtx := errgroup.WithContext(ctx)

	g.Go(func() error {
		lastIngestedAt, err := telemetrystatscollector.LastObservedLogs(gCtx, c.telemetryStore)
		if err != nil {
			return err
		}

		logsLastIngestedAt = lastIngestedAt
		return nil
	})

	g.Go(func() error {
		lastIngestedAt, err := telemetrystatscollector.LastObservedTraces(gCtx, c.telemetryStore)
		if err != nil {
			return err
		}

		tracesLastIngestedAt = lastIngestedAt
		return nil
	})

	g.Go(func() error {
		lastIngestedAt, err := telemetrystatscollector.LastObservedMetrics(gCtx, c.telemetryStore)
		if err != nil {
			return err
		}

		metricsLastIngestedAt = lastIngestedAt
		return nil
	})

	g.Go(func() error {
		var err error
		alertsCount, err = c.getCollectedCount(gCtx, c.collectors.Rules, ruletypes.StatKeyRuleCount, orgID)
		if err != nil {
			return err
		}

		return nil
	})

	g.Go(func() error {
		var err error
		dashboardsCount, err = c.getCollectedCount(gCtx, c.collectors.Dashboards, dashboardtypes.StatKeyDashboardCount, orgID)
		if err != nil {
			return err
		}

		return nil
	})

	g.Go(func() error {
		var err error
		savedViewsCount, err = c.getCollectedCount(gCtx, c.collectors.SavedViews, savedviewtypes.StatKeySavedViewCount, orgID)
		if err != nil {
			return err
		}

		return nil
	})

	g.Go(func() error {
		licenseStatus = c.getLicenseStatus(gCtx, orgID)
		return nil
	})

	if err := g.Wait(); err != nil {
		return nil, err
	}

	lastIngestedAt := emptystatetypes.LastIngestedAt{
		Logs:    logsLastIngestedAt,
		Traces:  tracesLastIngestedAt,
		Metrics: metricsLastIngestedAt,
	}

	return &emptystatetypes.OrgContext{
		HasIngestedData: lastIngestedAt.Logs != nil || lastIngestedAt.Traces != nil || lastIngestedAt.Metrics != nil,
		LastIngestedAt:  lastIngestedAt,
		AlertsCount:     alertsCount,
		DashboardsCount: dashboardsCount,
		SavedViewsCount: savedViewsCount,
		LicenseStatus:   licenseStatus,
	}, nil
}

func (c *orgContext) getCollectedCount(ctx context.Context, collector statsreporter.StatsCollector, key string, orgID valuer.UUID) (int, error) {
	if collector == nil {
		return 0, errors.NewInternalf(errors.CodeInternal, "collector for %q is not configured", key)
	}

	stats, err := collector.Collect(ctx, orgID)
	if err != nil {
		return 0, errors.WrapInternalf(err, errors.CodeInternal, "failed to collect %q", key)
	}

	count, ok := stats[key].(int64)
	if !ok {
		return 0, errors.NewInternalf(errors.CodeInternal, "stat %q is missing from collector output", key)
	}

	return int(count), nil
}

// License stats degrade to UNKNOWN: community wires nooplicensing (empty stats)
// and a licensing outage must not fail the endpoint.
func (c *orgContext) getLicenseStatus(ctx context.Context, orgID valuer.UUID) emptystatetypes.LicenseStatus {
	if c.collectors.Licensing == nil {
		return emptystatetypes.LicenseStatusUnknown
	}

	stats, err := c.collectors.Licensing.Collect(ctx, orgID)
	if err != nil {
		return emptystatetypes.LicenseStatusUnknown
	}

	return licenseStatusFromStats(stats)
}

func licenseStatusFromStats(stats map[string]any) emptystatetypes.LicenseStatus {
	state, ok := stats[licensetypes.StatKeyLicenseStateName].(string)
	if !ok || strings.TrimSpace(state) == "" {
		return emptystatetypes.LicenseStatusUnknown
	}

	// Verbatim passthrough: trimming above is only for blank detection.
	return emptystatetypes.LicenseStatus(state)
}

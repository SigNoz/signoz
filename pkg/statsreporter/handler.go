package statsreporter

import (
	"context"
	"net/http"
	"strings"
	"time"

	"golang.org/x/sync/errgroup"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/types/emptystatetypes"
	"github.com/SigNoz/signoz/pkg/types/licensetypes"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/types/savedviewtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Handler interface {
	GetOrgContext(rw http.ResponseWriter, req *http.Request)
}

// OrgContextCollectors are the collectors the org context signals are sourced from.
type OrgContextCollectors struct {
	Rules      StatsCollector
	Dashboards StatsCollector
	SavedViews StatsCollector
	Licensing  StatsCollector
}

type handler struct {
	telemetryStore telemetrystore.TelemetryStore
	collectors     OrgContextCollectors
}

func NewHandler(telemetryStore telemetrystore.TelemetryStore, collectors OrgContextCollectors) Handler {
	return &handler{
		telemetryStore: telemetryStore,
		collectors:     collectors,
	}
}

func (h *handler) GetOrgContext(rw http.ResponseWriter, req *http.Request) {
	claims, err := authtypes.ClaimsFromContext(req.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgContext, err := h.getOrgContext(req.Context(), valuer.MustNewUUID(claims.OrgID))
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, orgContext)
}

func (h *handler) getOrgContext(ctx context.Context, orgID valuer.UUID) (*emptystatetypes.OrgContext, error) {
	now := time.Now()

	var logsLastIngestedAt *time.Time
	var tracesLastIngestedAt *time.Time
	var metricsLastIngestedAt *time.Time
	var hasInfraMetrics bool
	var alertsCount int
	var dashboardsCount int
	var savedViewsCount int
	licenseStatus := emptystatetypes.LicenseStatusUnknown

	g, gCtx := errgroup.WithContext(ctx)

	g.Go(func() error {
		lastIngestedAt, err := lastObservedLogs(gCtx, h.telemetryStore)
		if err != nil {
			return err
		}

		logsLastIngestedAt = lastIngestedAt
		return nil
	})

	g.Go(func() error {
		lastIngestedAt, err := lastObservedTraces(gCtx, h.telemetryStore)
		if err != nil {
			return err
		}

		tracesLastIngestedAt = lastIngestedAt
		return nil
	})

	g.Go(func() error {
		lastIngestedAt, err := lastObservedMetrics(gCtx, h.telemetryStore)
		if err != nil {
			return err
		}

		metricsLastIngestedAt = lastIngestedAt
		return nil
	})

	g.Go(func() error {
		var err error
		hasInfraMetrics, err = h.getHasInfraMetrics(gCtx, now)
		if err != nil {
			return err
		}

		return nil
	})

	g.Go(func() error {
		var err error
		alertsCount, err = h.getCollectedCount(gCtx, h.collectors.Rules, ruletypes.StatKeyRuleCount, orgID)
		if err != nil {
			return err
		}

		return nil
	})

	g.Go(func() error {
		var err error
		dashboardsCount, err = h.getCollectedCount(gCtx, h.collectors.Dashboards, dashboardtypes.StatKeyDashboardCount, orgID)
		if err != nil {
			return err
		}

		return nil
	})

	g.Go(func() error {
		var err error
		savedViewsCount, err = h.getCollectedCount(gCtx, h.collectors.SavedViews, savedviewtypes.StatKeySavedViewCount, orgID)
		if err != nil {
			return err
		}

		return nil
	})

	g.Go(func() error {
		licenseStatus = h.getLicenseStatus(gCtx, orgID)
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
		HasInfraMetrics: hasInfraMetrics,
		AlertsCount:     alertsCount,
		DashboardsCount: dashboardsCount,
		SavedViewsCount: savedViewsCount,
		LicenseStatus:   licenseStatus,
	}, nil
}

func (h *handler) getCollectedCount(ctx context.Context, collector StatsCollector, key string, orgID valuer.UUID) (int, error) {
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
func (h *handler) getLicenseStatus(ctx context.Context, orgID valuer.UUID) emptystatetypes.LicenseStatus {
	if h.collectors.Licensing == nil {
		return emptystatetypes.LicenseStatusUnknown
	}

	stats, err := h.collectors.Licensing.Collect(ctx, orgID)
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

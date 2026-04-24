package alertmanagerserver

import (
	"context"
	"log/slog"
	"sync"
	"time"

	"github.com/prometheus/alertmanager/types"
	"github.com/prometheus/common/model"

	ruletypes "github.com/SigNoz/signoz/pkg/types/ruletypes"
)

// MaintenanceMuter implements types.Muter for SigNoz maintenance windows.
// It suppresses alerts whose ruleId label matches an active maintenance schedule.
// Results are cached for cacheTTL to avoid a DB query on every per-alert check.
type MaintenanceMuter struct {
	maintenanceStore ruletypes.MaintenanceStore
	orgID            string
	logger           *slog.Logger

	mu          sync.RWMutex
	cached      []*ruletypes.PlannedMaintenance
	cacheExpiry time.Time
}

const maintenanceCacheTTL = 30 * time.Second

func NewMaintenanceMuter(store ruletypes.MaintenanceStore, orgID string, logger *slog.Logger) *MaintenanceMuter {
	return &MaintenanceMuter{
		maintenanceStore: store,
		orgID:            orgID,
		logger:           logger,
	}
}

func (m *MaintenanceMuter) Mutes(ctx context.Context, lset model.LabelSet) bool {
	ruleID := string(lset[model.LabelName(ruletypes.AlertRuleIDLabel)])
	if ruleID == "" {
		return false
	}
	now := time.Now()
	for _, mw := range m.getMaintenances(ctx) {
		if mw.ShouldSkip(ruleID, now) {
			return true
		}
	}
	return false
}

func (m *MaintenanceMuter) getMaintenances(ctx context.Context) []*ruletypes.PlannedMaintenance {
	m.mu.RLock()
	if time.Now().Before(m.cacheExpiry) {
		cached := m.cached
		m.mu.RUnlock()
		return cached
	}
	m.mu.RUnlock()

	m.mu.Lock()
	defer m.mu.Unlock()
	// Double-check after acquiring write lock.
	if time.Now().Before(m.cacheExpiry) {
		return m.cached
	}
	mws, err := m.maintenanceStore.ListPlannedMaintenance(ctx, m.orgID)
	if err != nil {
		m.logger.ErrorContext(ctx, "failed to list planned maintenance windows; alerts will not be suppressed", slog.String("org_id", m.orgID))
		return m.cached // return stale cache on error; fail open
	}
	m.cached = mws
	m.cacheExpiry = time.Now().Add(maintenanceCacheTTL)
	return m.cached
}

// maintenanceMuteStage wraps MaintenanceMuter as a notify.Stage.
// We implement the stage directly rather than using notify.NewMuteStage to avoid
// a dependency on the unexported *notify.Metrics field of PipelineBuilder.
type maintenanceMuteStage struct {
	muter *MaintenanceMuter
}

func (s *maintenanceMuteStage) Exec(ctx context.Context, _ *slog.Logger, alerts ...*types.Alert) (context.Context, []*types.Alert, error) {
	filtered := make([]*types.Alert, 0, len(alerts))
	for _, a := range alerts {
		if !s.muter.Mutes(ctx, a.Labels) {
			filtered = append(filtered, a)
		}
	}
	return ctx, filtered, nil
}

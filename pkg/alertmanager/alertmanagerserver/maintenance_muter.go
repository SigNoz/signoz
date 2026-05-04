package alertmanagerserver

import (
	"context"
	"log/slog"
	"sync"
	"time"

	"github.com/prometheus/common/model"

	"github.com/SigNoz/signoz/pkg/types/ruletypes"
)

// MaintenanceMuter implements types.Muter for maintenance windows.
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
	ruleID := string(lset[ruletypes.AlertRuleIDLabel])
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

// MutedBy returns the IDs of all active maintenance windows currently
// suppressing the alert identified by lset. It is used to populate the
// `mutedBy` field on the v2 API alert response so that maintenance-suppressed
// alerts surface as `state=suppressed` in GetAlerts responses.
func (m *MaintenanceMuter) MutedBy(ctx context.Context, lset model.LabelSet) []string {
	ruleID := string(lset[ruletypes.AlertRuleIDLabel])
	if ruleID == "" {
		return nil
	}
	var ids []string
	now := time.Now()
	for _, mw := range m.getMaintenances(ctx) {
		if mw.ShouldSkip(ruleID, now) {
			ids = append(ids, mw.ID.String())
		}
	}
	return ids
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
		return m.cached // return stale (potentially empty) cache on error
	}
	m.cached = mws
	m.cacheExpiry = time.Now().Add(maintenanceCacheTTL)
	return m.cached
}

package alertmanagerserver

import (
	"context"
	"log/slog"
	"sync"
	"time"

	"github.com/expr-lang/expr"
	"github.com/prometheus/common/model"

	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
)

// MaintenanceMuter implements types.Muter for maintenance windows.
// It suppresses alerts whose ruleId label matches an active maintenance schedule.
// Results are cached for cacheTTL to avoid a DB query on every per-alert check.
type MaintenanceMuter struct {
	maintenanceStore alertmanagertypes.MaintenanceStore
	orgID            string
	logger           *slog.Logger

	mu          sync.RWMutex
	cached      []*alertmanagertypes.PlannedMaintenance
	cacheExpiry time.Time
}

const maintenanceCacheTTL = 30 * time.Second

func NewMaintenanceMuter(store alertmanagertypes.MaintenanceStore, orgID string, logger *slog.Logger) *MaintenanceMuter {
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
		if !mw.ShouldSkip(ruleID, now) {
			continue
		}
		if mw.LabelExpression != "" {
			if !evaluateLabelExpression(ctx, mw.LabelExpression, lset, m.logger) {
				continue
			}
		}
		return true
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
		if mw.LabelExpression != "" {
			if !evaluateLabelExpression(ctx, mw.LabelExpression, lset, m.logger) {
				continue
			}
		}
	}
	return ids
}

// evaluateLabelExpression compiles and runs a boolean expression against the alert's
// label set. Returns false on any error (safety-first: don't suppress on bad expressions).
func evaluateLabelExpression(ctx context.Context, expression string, lset model.LabelSet, logger *slog.Logger) bool {
	env := make(map[string]interface{}, len(lset))
	for k, v := range lset {
		env[string(k)] = string(v)
	}

	program, err := expr.Compile(expression, expr.Env(env), expr.AllowUndefinedVariables())
	if err != nil {
		logger.WarnContext(ctx, "maintenance label expression compile error; passing alert through",
			slog.String("expr", expression),
			slog.String("err", err.Error()),
		)
		return false
	}

	output, err := expr.Run(program, env)
	if err != nil {
		logger.WarnContext(ctx, "maintenance label expression run error; passing alert through",
			slog.String("expr", expression),
			slog.String("err", err.Error()),
		)
		return false
	}

	result, ok := output.(bool)
	if !ok {
		logger.WarnContext(ctx, "maintenance label expression did not return bool; passing alert through",
			slog.String("expr", expression),
		)
		return false
	}
	return result
}

func (m *MaintenanceMuter) getMaintenances(ctx context.Context) []*alertmanagertypes.PlannedMaintenance {
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

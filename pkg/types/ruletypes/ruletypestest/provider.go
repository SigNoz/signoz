package ruletypestest

import (
	"context"

	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var _ ruletypes.RuleStore = (*NoOpRuleStore)(nil)

// NoOpRuleStore is a mock implementation of RuleStore that does nothing
type NoOpRuleStore struct{}

func NewNoOpRuleStore() *NoOpRuleStore {
	return &NoOpRuleStore{}
}

func (NoOpRuleStore) CreateRule(context.Context, *ruletypes.Rule, func(context.Context, valuer.UUID) error) (valuer.UUID, error) {
	return valuer.GenerateUUID(), nil
}
func (NoOpRuleStore) EditRule(context.Context, *ruletypes.Rule, func(context.Context) error) error {
	return nil
}
func (NoOpRuleStore) DeleteRule(context.Context, valuer.UUID, func(context.Context) error) error {
	return nil
}
func (NoOpRuleStore) GetStoredRules(context.Context, string) ([]*ruletypes.Rule, error) {
	return []*ruletypes.Rule{}, nil
}
func (NoOpRuleStore) GetStoredRule(context.Context, valuer.UUID) (*ruletypes.Rule, error) {
	return &ruletypes.Rule{}, nil
}

var _ ruletypes.MaintenanceStore = (*NoOpMaintenanceStore)(nil)

// NoOpMaintenanceStore is a mock implementation of MaintenanceStore that does nothing
type NoOpMaintenanceStore struct{}

func NewNoOpMaintenanceStore() *NoOpMaintenanceStore {
	return &NoOpMaintenanceStore{}
}

func (NoOpMaintenanceStore) CreatePlannedMaintenance(context.Context, ruletypes.GettablePlannedMaintenance) (valuer.UUID, error) {
	return valuer.GenerateUUID(), nil
}
func (NoOpMaintenanceStore) DeletePlannedMaintenance(context.Context, valuer.UUID) error { return nil }
func (NoOpMaintenanceStore) GetPlannedMaintenanceByID(context.Context, valuer.UUID) (*ruletypes.GettablePlannedMaintenance, error) {
	return &ruletypes.GettablePlannedMaintenance{}, nil
}
func (NoOpMaintenanceStore) EditPlannedMaintenance(context.Context, ruletypes.GettablePlannedMaintenance, valuer.UUID) error {
	return nil
}
func (NoOpMaintenanceStore) GetAllPlannedMaintenance(context.Context, string) ([]*ruletypes.GettablePlannedMaintenance, error) {
	return []*ruletypes.GettablePlannedMaintenance{}, nil
}

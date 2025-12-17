package ruletypes

import (
	"context"

	"github.com/SigNoz/signoz/pkg/valuer"
)

// NoOpRuleStore is a mock implementation of RuleStore that does nothing
type NoOpRuleStore struct{}

func NewNoOpRuleStore() *NoOpRuleStore {
	return &NoOpRuleStore{}
}

func (NoOpRuleStore) CreateRule(context.Context, *Rule, func(context.Context, valuer.UUID) error) (valuer.UUID, error) {
	return valuer.GenerateUUID(), nil
}
func (NoOpRuleStore) EditRule(context.Context, *Rule, func(context.Context) error) error {
	return nil
}
func (NoOpRuleStore) DeleteRule(context.Context, valuer.UUID, func(context.Context) error) error {
	return nil
}
func (NoOpRuleStore) GetStoredRules(context.Context, string) ([]*Rule, error) {
	return []*Rule{}, nil
}
func (NoOpRuleStore) GetStoredRule(context.Context, valuer.UUID) (*Rule, error) {
	return &Rule{}, nil
}

// NoOpMaintenanceStore is a mock implementation of MaintenanceStore that does nothing
type NoOpMaintenanceStore struct{}

func NewNoOpMaintenanceStore() *NoOpMaintenanceStore {
	return &NoOpMaintenanceStore{}
}

func (NoOpMaintenanceStore) CreatePlannedMaintenance(context.Context, GettablePlannedMaintenance) (valuer.UUID, error) {
	return valuer.GenerateUUID(), nil
}
func (NoOpMaintenanceStore) DeletePlannedMaintenance(context.Context, valuer.UUID) error { return nil }
func (NoOpMaintenanceStore) GetPlannedMaintenanceByID(context.Context, valuer.UUID) (*GettablePlannedMaintenance, error) {
	return &GettablePlannedMaintenance{}, nil
}
func (NoOpMaintenanceStore) EditPlannedMaintenance(context.Context, GettablePlannedMaintenance, valuer.UUID) error {
	return nil
}
func (NoOpMaintenanceStore) GetAllPlannedMaintenance(context.Context, string) ([]*GettablePlannedMaintenance, error) {
	return []*GettablePlannedMaintenance{}, nil
}

package rules

import (
	"context"
	"time"

	ruletypes "github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type TaskType string

const (
	TaskTypeProm = "promql_ruletask"
	TaskTypeCh   = "ch_ruletask"
)

type Task interface {
	Name() string

	// Key returns the group key
	Key() string

	Type() TaskType
	CopyState(from Task) error
	Eval(ctx context.Context, ts time.Time)
	Run(ctx context.Context)
	Rules() []Rule
	Stop()
	Pause(b bool)
}

// newTask returns an appropriate group for
// rule type
func newTask(taskType TaskType, name, file string, frequency time.Duration, rules []Rule, opts *ManagerOptions, notify NotifyFunc, maintenanceStore ruletypes.MaintenanceStore, orgID valuer.UUID) Task {
	if taskType == TaskTypeCh {
		return NewRuleTask(name, file, frequency, rules, opts, notify, maintenanceStore, orgID)
	}
	return NewPromRuleTask(name, file, frequency, rules, opts, notify, maintenanceStore, orgID)
}

package ruler

import (
	"context"

	"github.com/SigNoz/signoz/pkg/statsreporter"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Ruler interface {
	statsreporter.StatsCollector

	// ListRuleStates returns all rules with their current evaluation state.
	ListRuleStates(ctx context.Context) (*ruletypes.GettableRules, error)

	// GetRule returns a single rule by ID.
	GetRule(ctx context.Context, id valuer.UUID) (*ruletypes.GettableRule, error)

	// CreateRule persists a new rule from a JSON string and starts its evaluator.
	CreateRule(ctx context.Context, ruleStr string) (*ruletypes.GettableRule, error)

	// EditRule replaces the rule identified by id with the given JSON string.
	EditRule(ctx context.Context, ruleStr string, id valuer.UUID) error

	// DeleteRule removes the rule identified by the string ID.
	DeleteRule(ctx context.Context, idStr string) error

	// PatchRule applies a partial update to the rule identified by id.
	PatchRule(ctx context.Context, ruleStr string, id valuer.UUID) (*ruletypes.GettableRule, error)

	// TestNotification fires a test alert for the rule defined in ruleStr.
	TestNotification(ctx context.Context, orgID valuer.UUID, ruleStr string) (int, error)

	// MaintenanceStore returns the store for planned maintenance / downtime schedules.
	MaintenanceStore() ruletypes.MaintenanceStore

	// Start begins rule evaluation. Blocks until Stop is called.
	Start(ctx context.Context)

	// Stop halts rule evaluation.
	Stop(ctx context.Context)
}

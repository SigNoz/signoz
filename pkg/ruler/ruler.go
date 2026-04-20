package ruler

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/statsreporter"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Ruler interface {
	factory.ServiceWithHealthy
	statsreporter.StatsCollector

	// ListRuleStates returns all rules with their current evaluation state.
	ListRuleStates(ctx context.Context) (*ruletypes.GettableRules, error)

	// GetRule returns a single rule by ID.
	GetRule(ctx context.Context, id valuer.UUID) (*ruletypes.GettableRule, error)

	// CreateRule persists a new rule from a JSON string and starts its evaluator.
	// TODO: accept PostableRule instead of raw string; the manager currently unmarshals
	// internally because it stores the raw JSON as Data. Requires changing the storage
	// model to store structured data.
	CreateRule(ctx context.Context, ruleStr string) (*ruletypes.GettableRule, error)

	// EditRule replaces the rule identified by id with the given JSON string.
	// TODO: same as CreateRule — accept PostableRule instead of raw string.
	EditRule(ctx context.Context, ruleStr string, id valuer.UUID) error

	// DeleteRule removes the rule identified by the string ID.
	// TODO: accept valuer.UUID instead of string for consistency with other methods.
	DeleteRule(ctx context.Context, idStr string) error

	// PatchRule applies a partial update to the rule identified by id.
	// TODO: same as CreateRule — accept PostableRule instead of raw string.
	PatchRule(ctx context.Context, ruleStr string, id valuer.UUID) (*ruletypes.GettableRule, error)

	// TestNotification fires a test alert for the rule defined in ruleStr.
	// TODO: same as CreateRule — accept PostableRule instead of raw string.
	TestNotification(ctx context.Context, orgID valuer.UUID, ruleStr string) (int, error)

	// MaintenanceStore returns the store for planned maintenance / downtime schedules.
	// TODO: expose downtime CRUD as methods on Ruler directly instead of leaking the
	// store interface. The handler should not call store methods directly.
	MaintenanceStore() ruletypes.MaintenanceStore
}

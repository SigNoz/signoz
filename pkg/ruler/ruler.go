package ruler

import (
	"context"

	"github.com/SigNoz/signoz/pkg/statsreporter"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Ruler interface {
	statsreporter.StatsCollector

	ListRuleStates(ctx context.Context) (*ruletypes.GettableRules, error)
	GetRule(ctx context.Context, id valuer.UUID) (*ruletypes.GettableRule, error)
	CreateRule(ctx context.Context, ruleStr string) (*ruletypes.GettableRule, error)
	EditRule(ctx context.Context, ruleStr string, id valuer.UUID) error
	DeleteRule(ctx context.Context, idStr string) error
	PatchRule(ctx context.Context, ruleStr string, id valuer.UUID) (*ruletypes.GettableRule, error)
	TestNotification(ctx context.Context, orgID valuer.UUID, ruleStr string) (int, error)

	MaintenanceStore() ruletypes.MaintenanceStore
}

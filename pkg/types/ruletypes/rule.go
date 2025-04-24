package ruletypes

import (
	"context"

	"github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

type Rule struct {
	bun.BaseModel `bun:"table:rule"`
	types.Identifiable
	types.TimeAuditable
	types.UserAuditable
	Deleted int    `bun:"deleted,notnull,default:0"`
	Data    string `bun:"data,type:text,notnull"`
	OrgID   string `bun:"org_id,type:text"`
}

type RuleHistory struct {
	bun.BaseModel `bun:"table:rule_history"`
	RuleID        int         `bun:"rule_id"`
	RuleUUID      valuer.UUID `bun:"rule_uuid"`
}

type RuleStore interface {
	CreateRule(context.Context, *Rule, func(context.Context, valuer.UUID) error) (valuer.UUID, error)
	EditRule(context.Context, *Rule, func(context.Context) error) error
	DeleteRule(context.Context, valuer.UUID, func(context.Context) error) error
	GetStoredRules(context.Context, string) ([]*Rule, error)
	GetStoredRule(context.Context, valuer.UUID) (*Rule, error)
	GetRuleUUID(context.Context, int) (*RuleHistory, error)
	GetAlertsInfo(context.Context) (*model.AlertsInfo, error)
	ListOrgs(context.Context) ([]string, error)
}

package signozruler

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/ruler"
	"github.com/SigNoz/signoz/pkg/ruler/rulestore/sqlrulestore"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type provider struct {
	ruleStore ruletypes.RuleStore
}

func NewFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[ruler.Ruler, ruler.Config] {
	return factory.NewProviderFactory(factory.MustNewName("signoz"), func(ctx context.Context, settings factory.ProviderSettings, config ruler.Config) (ruler.Ruler, error) {
		return New(ctx, settings, config, sqlstore)
	})
}

func New(ctx context.Context, settings factory.ProviderSettings, config ruler.Config, sqlstore sqlstore.SQLStore) (ruler.Ruler, error) {
	return &provider{ruleStore: sqlrulestore.NewRuleStore(sqlstore)}, nil
}

func (provider *provider) Collect(ctx context.Context, orgID valuer.UUID) (map[string]any, error) {
	rules, err := provider.ruleStore.GetStoredRules(ctx, orgID.String())
	if err != nil {
		return nil, err
	}

	return ruletypes.NewStatsFromRules(rules), nil
}

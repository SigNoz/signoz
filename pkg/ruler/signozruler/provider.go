package signozruler

import (
	"context"

	"github.com/SigNoz/signoz/pkg/alertmanager"
	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/modules/rulestatehistory"
	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/SigNoz/signoz/pkg/querier"
	"github.com/SigNoz/signoz/pkg/query-service/rules"
	"github.com/SigNoz/signoz/pkg/queryparser"
	"github.com/SigNoz/signoz/pkg/ruler"
	"github.com/SigNoz/signoz/pkg/ruler/rulestore/sqlrulestore"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type provider struct {
	*rules.Manager
	ruleStore ruletypes.RuleStore
}

func NewFactory(sqlstore sqlstore.SQLStore, queryParser queryparser.QueryParser) factory.ProviderFactory[ruler.Ruler, ruler.Config] {
	return factory.NewProviderFactory(factory.MustNewName("signoz"), func(ctx context.Context, settings factory.ProviderSettings, config ruler.Config) (ruler.Ruler, error) {
		return &provider{ruleStore: sqlrulestore.NewRuleStore(sqlstore, queryParser, settings)}, nil
	})
}

func New(
	config ruler.Config,
	cache cache.Cache,
	alertmanager alertmanager.Alertmanager,
	sqlstore sqlstore.SQLStore,
	telemetryStore telemetrystore.TelemetryStore,
	metadataStore telemetrytypes.MetadataStore,
	prometheus prometheus.Prometheus,
	orgGetter organization.Getter,
	ruleStateHistoryModule rulestatehistory.Module,
	querier querier.Querier,
	providerSettings factory.ProviderSettings,
	queryParser queryparser.QueryParser,
	prepareTaskFunc func(rules.PrepareTaskOptions) (rules.Task, error),
	prepareTestRuleFunc func(rules.PrepareTestRuleOptions) (int, error),
) (ruler.Ruler, error) {
	ruleStore := sqlrulestore.NewRuleStore(sqlstore, queryParser, providerSettings)
	maintenanceStore := sqlrulestore.NewMaintenanceStore(sqlstore)

	managerOpts := &rules.ManagerOptions{
		TelemetryStore:         telemetryStore,
		MetadataStore:          metadataStore,
		Prometheus:             prometheus,
		Context:                context.Background(),
		Querier:                querier,
		Logger:                 providerSettings.Logger,
		Cache:                  cache,
		EvalDelay:              config.EvalDelay,
		PrepareTaskFunc:        prepareTaskFunc,
		PrepareTestRuleFunc:    prepareTestRuleFunc,
		Alertmanager:           alertmanager,
		OrgGetter:              orgGetter,
		RuleStore:              ruleStore,
		MaintenanceStore:       maintenanceStore,
		SQLStore:               sqlstore,
		QueryParser:            queryParser,
		RuleStateHistoryModule: ruleStateHistoryModule,
	}

	manager, err := rules.NewManager(managerOpts)
	if err != nil {
		return nil, err
	}

	return &provider{Manager: manager, ruleStore: ruleStore}, nil
}

func (provider *provider) Collect(ctx context.Context, orgID valuer.UUID) (map[string]any, error) {
	rules, err := provider.ruleStore.GetStoredRules(ctx, orgID.String())
	if err != nil {
		return nil, err
	}

	return ruletypes.NewStatsFromRules(rules), nil
}

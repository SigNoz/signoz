package expressionroutes

import (
	"context"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/nfrouting"
	"github.com/SigNoz/signoz/pkg/types/routingtypes"
	"github.com/google/cel-go/cel"
	"github.com/prometheus/common/model"
)

// provider handles expression-based routing for notifications
type provider struct {
	routeStore routingtypes.RouteStore
	settings   factory.ScopedProviderSettings
}

func NewFactory(store routingtypes.RouteStore) factory.ProviderFactory[nfrouting.NotificationRoutes, nfrouting.Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("expression"),
		func(ctx context.Context, settings factory.ProviderSettings, config nfrouting.Config) (nfrouting.NotificationRoutes, error) {
			return New(ctx, settings, store)
		},
	)
}

// New creates a new rule-based grouping strategy provider.
func New(ctx context.Context, providerSettings factory.ProviderSettings, store routingtypes.RouteStore) (nfrouting.NotificationRoutes, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/nfrouting/expressionroutes")

	return &provider{
		settings:   settings,
		routeStore: store,
	}, nil
}

func (p *provider) Match(ctx context.Context, orgID string, set model.LabelSet) []string {
	routes, err := p.routeStore.GetAllByOrgID(ctx, orgID)
	if err != nil {
		return []string{}
	}

	var allChannels []string

	for _, route := range routes {
		if p.evaluateExpression(route.Expression, set) {
			allChannels = append(allChannels, route.Actions.Channels...)
		}
	}

	return allChannels
}

// evaluateExpression uses CEL-Go to evaluate expressions like:
// labels["k8s.namespace.name"] == 'auth' && labels["service"] in ['auth','payment'] && labels["host"] contains 'host-1'
func (p *provider) evaluateExpression(expression string, labelSet model.LabelSet) bool {
	// Create CEL environment
	env, err := cel.NewEnv(
		cel.Variable("labels", cel.MapType(cel.StringType, cel.StringType)),
	)
	if err != nil {
		return false
	}

	// Parse and check the expression
	ast, issues := env.Parse(expression)
	if issues != nil && issues.Err() != nil {
		return false
	}

	checked, issues := env.Check(ast)
	if issues != nil && issues.Err() != nil {
		return false
	}

	// Create program
	program, err := env.Program(checked)
	if err != nil {
		return false
	}

	// Convert Prometheus labels to map
	labelsMap := make(map[string]string)
	for k, v := range labelSet {
		labelsMap[string(k)] = string(v)
	}

	// Evaluate the expression
	result, _, err := program.Eval(map[string]interface{}{
		"labels": labelsMap,
	})
	if err != nil {
		return false
	}

	// Convert result to boolean
	if boolVal, ok := result.Value().(bool); ok {
		return boolVal
	}
	return false
}

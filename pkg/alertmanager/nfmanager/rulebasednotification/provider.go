package rulebasednotification

import (
	"context"
	"strings"
	"sync"

	"github.com/SigNoz/signoz/pkg/alertmanager/nfmanager"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/expr-lang/expr"
	"github.com/prometheus/common/model"

	"github.com/SigNoz/signoz/pkg/factory"
)

type provider struct {
	settings                             factory.ScopedProviderSettings
	orgToFingerprintToNotificationConfig map[string]map[string]alertmanagertypes.NotificationConfig
	routeStore                           alertmanagertypes.RouteStore
	mutex                                sync.RWMutex
}

// NewFactory creates a new factory for the rule-based grouping strategy.
func NewFactory(routeStore alertmanagertypes.RouteStore) factory.ProviderFactory[nfmanager.NotificationManager, nfmanager.Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("rulebased"),
		func(ctx context.Context, settings factory.ProviderSettings, config nfmanager.Config) (nfmanager.NotificationManager, error) {
			return New(ctx, settings, config, routeStore)
		},
	)
}

// New creates a new rule-based grouping strategy provider.
func New(ctx context.Context, providerSettings factory.ProviderSettings, config nfmanager.Config, routeStore alertmanagertypes.RouteStore) (nfmanager.NotificationManager, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/alertmanager/nfmanager/rulebasednotification")

	return &provider{
		settings:                             settings,
		orgToFingerprintToNotificationConfig: make(map[string]map[string]alertmanagertypes.NotificationConfig),
		routeStore:                           routeStore,
	}, nil
}

// GetNotificationConfig retrieves the notification configuration for the specified alert and organization.
func (r *provider) GetNotificationConfig(orgID string, ruleID string) (*alertmanagertypes.NotificationConfig, error) {
	notificationConfig := alertmanagertypes.GetDefaultNotificationConfig()
	if orgID == "" || ruleID == "" {
		return &notificationConfig, nil
	}

	r.mutex.RLock()
	defer r.mutex.RUnlock()

	if orgConfigs, exists := r.orgToFingerprintToNotificationConfig[orgID]; exists {
		if config, configExists := orgConfigs[ruleID]; configExists {
			if config.Renotify.RenotifyInterval != 0 {
				notificationConfig.Renotify.RenotifyInterval = config.Renotify.RenotifyInterval
			}
			if config.Renotify.NoDataInterval != 0 {
				notificationConfig.Renotify.NoDataInterval = config.Renotify.NoDataInterval
			}
			for k, v := range config.NotificationGroup {
				notificationConfig.NotificationGroup[k] = v
			}
			notificationConfig.UsePolicy = config.UsePolicy
			notificationConfig.GroupByAll = config.GroupByAll
		}
	}

	return &notificationConfig, nil
}

// SetNotificationConfig updates the notification configuration for the specified alert and organization.
func (r *provider) SetNotificationConfig(orgID string, ruleID string, config *alertmanagertypes.NotificationConfig) error {
	if orgID == "" || ruleID == "" {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "no org or rule id provided")
	}

	if config == nil {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "notification config cannot be nil")
	}

	r.mutex.Lock()
	defer r.mutex.Unlock()

	// Initialize org map if it doesn't exist
	if r.orgToFingerprintToNotificationConfig[orgID] == nil {
		r.orgToFingerprintToNotificationConfig[orgID] = make(map[string]alertmanagertypes.NotificationConfig)
	}

	r.orgToFingerprintToNotificationConfig[orgID][ruleID] = config.DeepCopy()

	return nil
}

func (r *provider) DeleteNotificationConfig(orgID string, ruleID string) error {
	if orgID == "" || ruleID == "" {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "no org or rule id provided")
	}

	r.mutex.Lock()
	defer r.mutex.Unlock()

	if _, exists := r.orgToFingerprintToNotificationConfig[orgID]; exists {
		delete(r.orgToFingerprintToNotificationConfig[orgID], ruleID)
	}

	return nil
}

func (r *provider) CreateRoutePolicy(ctx context.Context, orgID string, route *alertmanagertypes.RoutePolicy) error {
	if route == nil {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "route policy cannot be nil")
	}

	err := route.Validate()
	if err != nil {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid route policy: %v", err)
	}

	return r.routeStore.Create(ctx, route)
}

func (r *provider) CreateRoutePolicies(ctx context.Context, orgID string, routes []*alertmanagertypes.RoutePolicy) error {
	if len(routes) == 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "route policies cannot be empty")
	}

	for _, route := range routes {
		if route == nil {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "route policy cannot be nil")
		}
		if err := route.Validate(); err != nil {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "route policy with name %s: %s", route.Name, err.Error())
		}
	}
	return r.routeStore.CreateBatch(ctx, routes)
}

func (r *provider) GetRoutePolicyByID(ctx context.Context, orgID string, routeID string) (*alertmanagertypes.RoutePolicy, error) {
	if routeID == "" {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "routeID cannot be empty")
	}

	return r.routeStore.GetByID(ctx, orgID, routeID)
}

func (r *provider) GetAllRoutePolicies(ctx context.Context, orgID string) ([]*alertmanagertypes.RoutePolicy, error) {
	if orgID == "" {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "orgID cannot be empty")
	}

	return r.routeStore.GetAllByKind(ctx, orgID, alertmanagertypes.PolicyBasedExpression)
}

func (r *provider) DeleteRoutePolicy(ctx context.Context, orgID string, routeID string) error {
	if routeID == "" {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "routeID cannot be empty")
	}

	return r.routeStore.Delete(ctx, orgID, routeID)
}

func (r *provider) DeleteAllRoutePoliciesByName(ctx context.Context, orgID string, name string) error {
	if orgID == "" {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "orgID cannot be empty")
	}
	if name == "" {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "name cannot be empty")
	}
	return r.routeStore.DeleteRouteByName(ctx, orgID, name)
}

func (r *provider) Match(ctx context.Context, orgID string, ruleID string, set model.LabelSet) ([]string, error) {
	config, err := r.GetNotificationConfig(orgID, ruleID)
	if err != nil {
		return nil, errors.NewInternalf(errors.CodeInternal, "error getting notification configuration: %v", err)
	}
	var expressionRoutes []*alertmanagertypes.RoutePolicy
	if config.UsePolicy {
		expressionRoutes, err = r.routeStore.GetAllByKind(ctx, orgID, alertmanagertypes.PolicyBasedExpression)
		if err != nil {
			return []string{}, errors.NewInternalf(errors.CodeInternal, "error getting route policies: %v", err)
		}
	} else {
		expressionRoutes, err = r.routeStore.GetAllByName(ctx, orgID, ruleID)
		if err != nil {
			return []string{}, errors.NewInternalf(errors.CodeInternal, "error getting route policies: %v", err)
		}
	}
	var matchedChannels []string
	if _, ok := set[alertmanagertypes.NoDataLabel]; ok && !config.UsePolicy {
		for _, expressionRoute := range expressionRoutes {
			matchedChannels = append(matchedChannels, expressionRoute.Channels...)
		}
		return matchedChannels, nil
	}

	for _, route := range expressionRoutes {
		evaluateExpr, err := r.evaluateExpr(route.Expression, set)
		if err != nil {
			continue
		}
		if evaluateExpr {
			matchedChannels = append(matchedChannels, route.Channels...)
		}
	}

	return matchedChannels, nil
}

func (r *provider) evaluateExpr(expression string, labelSet model.LabelSet) (bool, error) {
	env := make(map[string]interface{})

	for k, v := range labelSet {
		key := string(k)
		value := string(v)

		if strings.Contains(key, ".") {
			parts := strings.Split(key, ".")
			current := env

			for i, part := range parts {
				if i == len(parts)-1 {
					current[part] = value
				} else {
					if current[part] == nil {
						current[part] = make(map[string]interface{})
					}
					current = current[part].(map[string]interface{})
				}
			}
		} else {
			env[key] = value
		}
	}

	program, err := expr.Compile(expression, expr.Env(env))
	if err != nil {
		return false, errors.NewInternalf(errors.CodeInternal, "error compiling route policy %s: %v", expression, err)
	}

	output, err := expr.Run(program, env)
	if err != nil {
		return false, errors.NewInternalf(errors.CodeInternal, "error running route policy %s: %v", expression, err)
	}

	if boolVal, ok := output.(bool); ok {
		return boolVal, nil
	}

	return false, errors.NewInternalf(errors.CodeInternal, "error in evaluating route policy %s: %v", expression, err)
}

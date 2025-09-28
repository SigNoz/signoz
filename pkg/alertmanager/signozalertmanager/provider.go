package signozalertmanager

import (
	"context"
	"time"

	amConfig "github.com/prometheus/alertmanager/config"

	"github.com/SigNoz/signoz/pkg/alertmanager"
	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagerstore/sqlalertmanagerstore"
	"github.com/SigNoz/signoz/pkg/alertmanager/nfmanager"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type provider struct {
	service             *alertmanager.Service
	config              alertmanager.Config
	settings            factory.ScopedProviderSettings
	configStore         alertmanagertypes.ConfigStore
	stateStore          alertmanagertypes.StateStore
	notificationManager nfmanager.NotificationManager
	stopC               chan struct{}
}

func NewFactory(sqlstore sqlstore.SQLStore, orgGetter organization.Getter, notificationManager nfmanager.NotificationManager) factory.ProviderFactory[alertmanager.Alertmanager, alertmanager.Config] {
	return factory.NewProviderFactory(factory.MustNewName("signoz"), func(ctx context.Context, settings factory.ProviderSettings, config alertmanager.Config) (alertmanager.Alertmanager, error) {
		return New(ctx, settings, config, sqlstore, orgGetter, notificationManager)
	})
}

func New(ctx context.Context, providerSettings factory.ProviderSettings, config alertmanager.Config, sqlstore sqlstore.SQLStore, orgGetter organization.Getter, notificationManager nfmanager.NotificationManager) (*provider, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/alertmanager/signozalertmanager")
	configStore := sqlalertmanagerstore.NewConfigStore(sqlstore)
	stateStore := sqlalertmanagerstore.NewStateStore(sqlstore)

	p := &provider{
		service: alertmanager.New(
			ctx,
			settings,
			config.Signoz.Config,
			stateStore,
			configStore,
			orgGetter,
			notificationManager,
		),
		settings:            settings,
		config:              config,
		configStore:         configStore,
		stateStore:          stateStore,
		notificationManager: notificationManager,
		stopC:               make(chan struct{}),
	}

	return p, nil
}

func (provider *provider) Start(ctx context.Context) error {
	if err := provider.service.SyncServers(ctx); err != nil {
		provider.settings.Logger().ErrorContext(ctx, "failed to sync alertmanager servers", "error", err)
		return err
	}

	ticker := time.NewTicker(provider.config.Signoz.PollInterval)
	defer ticker.Stop()
	for {
		select {
		case <-provider.stopC:
			return nil
		case <-ticker.C:
			if err := provider.service.SyncServers(ctx); err != nil {
				provider.settings.Logger().ErrorContext(ctx, "failed to sync alertmanager servers", "error", err)
			}
		}
	}
}

func (provider *provider) Stop(ctx context.Context) error {
	close(provider.stopC)
	return provider.service.Stop(ctx)
}

func (provider *provider) GetAlerts(ctx context.Context, orgID string, params alertmanagertypes.GettableAlertsParams) (alertmanagertypes.DeprecatedGettableAlerts, error) {
	return provider.service.GetAlerts(ctx, orgID, params)
}

func (provider *provider) PutAlerts(ctx context.Context, orgID string, alerts alertmanagertypes.PostableAlerts) error {
	return provider.service.PutAlerts(ctx, orgID, alerts)
}

func (provider *provider) TestReceiver(ctx context.Context, orgID string, receiver alertmanagertypes.Receiver) error {
	return provider.service.TestReceiver(ctx, orgID, receiver)
}

func (provider *provider) TestAlert(ctx context.Context, orgID string, alert *alertmanagertypes.PostableAlert, receivers []string) error {
	return provider.service.TestAlert(ctx, orgID, alert, receivers)
}

func (provider *provider) ListChannels(ctx context.Context, orgID string) ([]*alertmanagertypes.Channel, error) {
	return provider.configStore.ListChannels(ctx, orgID)
}

func (provider *provider) ListAllChannels(ctx context.Context) ([]*alertmanagertypes.Channel, error) {
	return nil, errors.Newf(errors.TypeUnsupported, errors.CodeUnsupported, "not supported by provider signoz")
}

func (provider *provider) GetChannelByID(ctx context.Context, orgID string, channelID valuer.UUID) (*alertmanagertypes.Channel, error) {
	return provider.configStore.GetChannelByID(ctx, orgID, channelID)
}

func (provider *provider) UpdateChannelByReceiverAndID(ctx context.Context, orgID string, receiver alertmanagertypes.Receiver, id valuer.UUID) error {
	channel, err := provider.configStore.GetChannelByID(ctx, orgID, id)
	if err != nil {
		return err
	}

	if err := channel.Update(receiver); err != nil {
		return err
	}

	config, err := provider.configStore.Get(ctx, orgID)
	if err != nil {
		return err
	}

	if err := config.UpdateReceiver(receiver); err != nil {
		return err
	}

	return provider.configStore.UpdateChannel(ctx, orgID, channel, alertmanagertypes.WithCb(func(ctx context.Context) error {
		return provider.configStore.Set(ctx, config)
	}))
}

func (provider *provider) DeleteChannelByID(ctx context.Context, orgID string, channelID valuer.UUID) error {
	channel, err := provider.configStore.GetChannelByID(ctx, orgID, channelID)
	if err != nil {
		return err
	}

	config, err := provider.configStore.Get(ctx, orgID)
	if err != nil {
		return err
	}

	if err := config.DeleteReceiver(channel.Name); err != nil {
		return err
	}

	return provider.configStore.DeleteChannelByID(ctx, orgID, channelID, alertmanagertypes.WithCb(func(ctx context.Context) error {
		return provider.configStore.Set(ctx, config)
	}))
}

func (provider *provider) CreateChannel(ctx context.Context, orgID string, receiver alertmanagertypes.Receiver) error {
	config, err := provider.configStore.Get(ctx, orgID)
	if err != nil {
		return err
	}

	if err := config.CreateReceiver(receiver); err != nil {
		return err
	}

	channel := alertmanagertypes.NewChannelFromReceiver(receiver, orgID)
	return provider.configStore.CreateChannel(ctx, channel, alertmanagertypes.WithCb(func(ctx context.Context) error {
		return provider.configStore.Set(ctx, config)
	}))
}

func (provider *provider) SetConfig(ctx context.Context, config *alertmanagertypes.Config) error {
	return provider.configStore.Set(ctx, config)
}

func (provider *provider) GetConfig(ctx context.Context, orgID string) (*alertmanagertypes.Config, error) {
	return provider.configStore.Get(ctx, orgID)
}

func (provider *provider) SetDefaultConfig(ctx context.Context, orgID string) error {
	config, err := alertmanagertypes.NewDefaultConfig(provider.config.Signoz.Config.Global, provider.config.Signoz.Config.Route, orgID)
	if err != nil {
		return err
	}

	return provider.configStore.Set(ctx, config)
}

func (provider *provider) Collect(ctx context.Context, orgID valuer.UUID) (map[string]any, error) {
	channels, err := provider.configStore.ListChannels(ctx, orgID.String())
	if err != nil {
		return nil, err
	}

	return alertmanagertypes.NewStatsFromChannels(channels), nil
}

func (provider *provider) SetNotificationConfig(ctx context.Context, orgID valuer.UUID, ruleId string, config *alertmanagertypes.NotificationConfig) error {
	err := provider.notificationManager.SetNotificationConfig(orgID.StringValue(), ruleId, config)
	if err != nil {
		return err
	}
	return nil
}

func (provider *provider) DeleteNotificationConfig(ctx context.Context, orgID valuer.UUID, ruleId string) error {
	err := provider.notificationManager.DeleteNotificationConfig(orgID.StringValue(), ruleId)
	if err != nil {
		return err
	}
	return nil
}

func (provider *provider) CreateRoutePolicy(ctx context.Context, routeRequest *alertmanagertypes.PostableExpressionRoute) (*alertmanagertypes.GettableExpressionRoute, error) {
	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		return nil, err
	}
	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		return nil, err
	}

	if err := routeRequest.Validate(); err != nil {
		return nil, err
	}

	route := alertmanagertypes.ExpressionRoute{
		Expression:     routeRequest.Expression,
		ExpressionKind: routeRequest.ExpressionKind,
		Priority:       routeRequest.Priority,
		Name:           routeRequest.Name,
		Description:    routeRequest.Description,
		Enabled:        routeRequest.Enabled,
		Tags:           routeRequest.Tags,
		Channels:       routeRequest.Channels,
		OrgID:          claims.OrgID,
		Identifiable: types.Identifiable{
			ID: valuer.GenerateUUID(),
		},
		UserAuditable: types.UserAuditable{
			CreatedBy: claims.Email,
			UpdatedBy: claims.Email,
		},
		TimeAuditable: types.TimeAuditable{
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
	}

	err = provider.notificationManager.CreateRoute(ctx, orgID.String(), &route)
	if err != nil {
		return nil, err
	}

	return &alertmanagertypes.GettableExpressionRoute{
		PostableExpressionRoute: *routeRequest,
		ID:                      route.ID.StringValue(),
		CreatedAt:               &route.CreatedAt,
		UpdatedAt:               &route.UpdatedAt,
		CreatedBy:               &route.CreatedBy,
		UpdatedBy:               &route.UpdatedBy,
	}, nil
}

func (provider *provider) CreateRoutePolicies(ctx context.Context, routeRequests []*alertmanagertypes.PostableExpressionRoute) ([]*alertmanagertypes.GettableExpressionRoute, error) {
	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		return nil, err
	}

	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		return nil, err
	}

	if len(routeRequests) == 0 {
		return []*alertmanagertypes.GettableExpressionRoute{}, nil
	}

	routes := make([]*alertmanagertypes.ExpressionRoute, 0, len(routeRequests))
	results := make([]*alertmanagertypes.GettableExpressionRoute, 0, len(routeRequests))

	for _, routeRequest := range routeRequests {
		if err := routeRequest.Validate(); err != nil {
			return nil, err
		}

		route := &alertmanagertypes.ExpressionRoute{
			Expression:     routeRequest.Expression,
			ExpressionKind: routeRequest.ExpressionKind,
			Priority:       routeRequest.Priority,
			Name:           routeRequest.Name,
			Description:    routeRequest.Description,
			Enabled:        routeRequest.Enabled,
			Tags:           routeRequest.Tags,
			Channels:       routeRequest.Channels,
			OrgID:          claims.OrgID,
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			UserAuditable: types.UserAuditable{
				CreatedBy: claims.Email,
				UpdatedBy: claims.Email,
			},
			TimeAuditable: types.TimeAuditable{
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			},
		}

		routes = append(routes, route)
		results = append(results, &alertmanagertypes.GettableExpressionRoute{
			PostableExpressionRoute: *routeRequest,
			ID:                      route.ID.StringValue(),
			CreatedAt:               &route.CreatedAt,
			UpdatedAt:               &route.UpdatedAt,
			CreatedBy:               &route.CreatedBy,
			UpdatedBy:               &route.UpdatedBy,
		})
	}

	err = provider.notificationManager.CreateRoutes(ctx, orgID.String(), routes)
	if err != nil {
		return nil, err
	}

	return results, nil
}

func (provider *provider) GetRoutePolicyByID(ctx context.Context, routeID string) (*alertmanagertypes.GettableExpressionRoute, error) {
	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		return nil, err
	}
	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		return nil, err
	}

	route, err := provider.notificationManager.GetRouteByID(ctx, orgID.String(), routeID)
	if err != nil {
		return nil, err
	}

	return &alertmanagertypes.GettableExpressionRoute{
		PostableExpressionRoute: alertmanagertypes.PostableExpressionRoute{
			Expression:     route.Expression,
			ExpressionKind: route.ExpressionKind,
			Channels:       route.Channels,
			Priority:       route.Priority,
			Name:           route.Name,
			Description:    route.Description,
			Enabled:        route.Enabled,
			Tags:           route.Tags,
		},
		ID:        route.ID.StringValue(),
		CreatedAt: &route.CreatedAt,
		UpdatedAt: &route.UpdatedAt,
		CreatedBy: &route.CreatedBy,
		UpdatedBy: &route.UpdatedBy,
	}, nil
}

func (provider *provider) GetAllRoutePolicies(ctx context.Context) ([]*alertmanagertypes.GettableExpressionRoute, error) {
	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		return nil, err
	}
	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		return nil, err
	}

	routes, err := provider.notificationManager.GetAllRoutes(ctx, orgID.String())
	if err != nil {
		return nil, err
	}

	results := make([]*alertmanagertypes.GettableExpressionRoute, 0, len(routes))
	for _, route := range routes {
		results = append(results, &alertmanagertypes.GettableExpressionRoute{
			PostableExpressionRoute: alertmanagertypes.PostableExpressionRoute{
				Expression:     route.Expression,
				ExpressionKind: route.ExpressionKind,
				Channels:       route.Channels,
				Priority:       route.Priority,
				Name:           route.Name,
				Description:    route.Description,
				Enabled:        route.Enabled,
				Tags:           route.Tags,
			},
			ID:        route.ID.StringValue(),
			CreatedAt: &route.CreatedAt,
			UpdatedAt: &route.UpdatedAt,
			CreatedBy: &route.CreatedBy,
			UpdatedBy: &route.UpdatedBy,
		})
	}

	return results, nil
}

func (provider *provider) UpdateRoutePolicyByID(ctx context.Context, routeID string, route *alertmanagertypes.PostableExpressionRoute) (*alertmanagertypes.GettableExpressionRoute, error) {
	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		return nil, errors.NewInvalidInputf(errors.CodeUnauthenticated, "invalid claims: %v", err)
	}
	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		return nil, err
	}

	if routeID == "" {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "routeID cannot be empty")
	}

	if route == nil {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "route cannot be nil")
	}

	if err := route.Validate(); err != nil {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid route: %v", err)
	}

	existingRoute, err := provider.notificationManager.GetRouteByID(ctx, claims.OrgID, routeID)
	if err != nil {
		return nil, errors.NewInvalidInputf(errors.CodeNotFound, "route not found: %v", err)
	}

	updatedRoute := &alertmanagertypes.ExpressionRoute{
		Expression:     route.Expression,
		ExpressionKind: route.ExpressionKind,
		Priority:       route.Priority,
		Name:           route.Name,
		Description:    route.Description,
		Enabled:        route.Enabled,
		Tags:           route.Tags,
		Channels:       route.Channels,
		OrgID:          claims.OrgID,
		Identifiable:   existingRoute.Identifiable,
		UserAuditable: types.UserAuditable{
			CreatedBy: existingRoute.CreatedBy,
			UpdatedBy: claims.Email,
		},
		TimeAuditable: types.TimeAuditable{
			CreatedAt: existingRoute.CreatedAt,
			UpdatedAt: time.Now(),
		},
	}

	err = provider.notificationManager.DeleteRoute(ctx, orgID.String(), routeID)
	if err != nil {
		return nil, errors.NewInvalidInputf(errors.CodeInternal, "error deleting existing route: %v", err)
	}

	err = provider.notificationManager.CreateRoute(ctx, orgID.String(), updatedRoute)
	if err != nil {
		return nil, err
	}

	return &alertmanagertypes.GettableExpressionRoute{
		PostableExpressionRoute: *route,
		ID:                      updatedRoute.ID.StringValue(),
		CreatedAt:               &updatedRoute.CreatedAt,
		UpdatedAt:               &updatedRoute.UpdatedAt,
		CreatedBy:               &updatedRoute.CreatedBy,
		UpdatedBy:               &updatedRoute.UpdatedBy,
	}, nil
}

func (provider *provider) DeleteRoutePolicyByID(ctx context.Context, routeID string) error {
	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		return errors.NewInvalidInputf(errors.CodeUnauthenticated, "invalid claims: %v", err)
	}
	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		return err
	}
	if routeID == "" {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "routeID cannot be empty")
	}

	return provider.notificationManager.DeleteRoute(ctx, orgID.String(), routeID)
}

func (provider *provider) CreateInhibitRules(ctx context.Context, orgID valuer.UUID, rules []amConfig.InhibitRule) error {
	config, err := provider.configStore.Get(ctx, orgID.String())
	if err != nil {
		return err
	}

	if err := config.AddInhibitRules(rules); err != nil {
		return err
	}

	return provider.configStore.Set(ctx, config)
}

func (provider *provider) DeleteAllRoutePoliciesByRuleId(ctx context.Context, names string) error {
	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		return errors.NewInvalidInputf(errors.CodeUnauthenticated, "invalid claims: %v", err)
	}
	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		return err
	}
	return provider.notificationManager.DeleteAllRoutesByName(ctx, orgID.String(), names)
}

func (provider *provider) UpdateAllRoutePoliciesByRuleId(ctx context.Context, names string, routes []*alertmanagertypes.PostableExpressionRoute) error {
	err := provider.DeleteAllRoutePoliciesByRuleId(ctx, names)
	if err != nil {
		return errors.NewInvalidInputf(errors.CodeInternal, "error deleting the routes: %v", err)
	}
	_, err = provider.CreateRoutePolicies(ctx, routes)
	return err
}

func (provider *provider) DeleteAllInhibitRulesByRuleId(ctx context.Context, orgID valuer.UUID, ruleId string) error {
	config, err := provider.configStore.Get(ctx, orgID.String())
	if err != nil {
		return err
	}

	if err := config.DeleteRuleIdInhibitor(ruleId); err != nil {
		return err
	}

	return provider.configStore.Set(ctx, config)
}

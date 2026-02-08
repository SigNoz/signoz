package signozalertmanager

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/query-service/utils/labels"
	"github.com/prometheus/common/model"

	amConfig "github.com/prometheus/alertmanager/config"

	"github.com/SigNoz/signoz/pkg/alertmanager"
	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagerstore/clickhousealertmanagerstore"
	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagerstore/sqlalertmanagerstore"
	"github.com/SigNoz/signoz/pkg/alertmanager/nfmanager"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type provider struct {
	service              *alertmanager.Service
	config               alertmanager.Config
	settings             factory.ScopedProviderSettings
	configStore          alertmanagertypes.ConfigStore
	stateStore           alertmanagertypes.StateStore
	notificationManager  nfmanager.NotificationManager
	maintenanceStore     alertmanagertypes.MaintenanceStore
	maintenanceExprMuter *MaintenanceExprMuter
	orgGetter            organization.Getter
	stopC                chan struct{}
}

func NewFactory(sqlstore sqlstore.SQLStore, orgGetter organization.Getter, notificationManager nfmanager.NotificationManager, telemetryStore telemetrystore.TelemetryStore) factory.ProviderFactory[alertmanager.Alertmanager, alertmanager.Config] {
	return factory.NewProviderFactory(factory.MustNewName("signoz"), func(ctx context.Context, settings factory.ProviderSettings, config alertmanager.Config) (alertmanager.Alertmanager, error) {
		return New(ctx, settings, config, sqlstore, orgGetter, notificationManager, telemetryStore)
	})
}

func New(ctx context.Context, providerSettings factory.ProviderSettings, config alertmanager.Config, sqlstore sqlstore.SQLStore, orgGetter organization.Getter, notificationManager nfmanager.NotificationManager, telemetryStore telemetrystore.TelemetryStore) (*provider, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/alertmanager/signozalertmanager")
	configStore := sqlalertmanagerstore.NewConfigStore(sqlstore)
	stateStore := sqlalertmanagerstore.NewStateStore(sqlstore)
	maintenanceExprMuter := NewMaintenanceExprMuter(settings.Logger())

	var stateHistoryStore alertmanagertypes.StateHistoryStore
	if telemetryStore != nil {
		stateHistoryStore = clickhousealertmanagerstore.NewStateHistoryStore(telemetryStore.ClickhouseDB())
	}

	p := &provider{
		service: alertmanager.New(
			ctx,
			settings,
			config.Signoz.Config,
			stateStore,
			configStore,
			orgGetter,
			notificationManager,
			maintenanceExprMuter,
			stateHistoryStore,
		),
		settings:             settings,
		config:               config,
		configStore:          configStore,
		stateStore:           stateStore,
		notificationManager:  notificationManager,
		maintenanceStore:     sqlalertmanagerstore.NewMaintenanceStore(sqlstore),
		maintenanceExprMuter: maintenanceExprMuter,
		orgGetter:            orgGetter,
		stopC:                make(chan struct{}),
	}

	return p, nil
}

func (provider *provider) Start(ctx context.Context) error {
	if err := provider.service.SyncServers(ctx); err != nil {
		provider.settings.Logger().ErrorContext(ctx, "failed to sync alertmanager servers", "error", err)
		return err
	}

	// Initial maintenance sync before entering the ticker loop.
	provider.syncMaintenance(ctx, provider.maintenanceExprMuter)

	// Start background sweep for stale alerts in state history tracking.
	provider.service.StartStateHistorySweep(ctx)

	serverTicker := time.NewTicker(provider.config.Signoz.PollInterval)
	defer serverTicker.Stop()

	maintenanceTicker := time.NewTicker(maintenanceSyncInterval)
	defer maintenanceTicker.Stop()

	for {
		select {
		case <-provider.stopC:
			return nil
		case <-serverTicker.C:
			if err := provider.service.SyncServers(ctx); err != nil {
				provider.settings.Logger().ErrorContext(ctx, "failed to sync alertmanager servers", "error", err)
			}
		case <-maintenanceTicker.C:
			provider.syncMaintenance(ctx, provider.maintenanceExprMuter)
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

func (provider *provider) TestAlert(ctx context.Context, orgID string, ruleID string, receiversMap map[*alertmanagertypes.PostableAlert][]string) error {
	config, err := provider.notificationManager.GetNotificationConfig(orgID, ruleID)
	if err != nil {
		return err
	}
	if config.UsePolicy {
		for alert := range receiversMap {
			set := make(model.LabelSet)
			for k, v := range alert.Labels {
				set[model.LabelName(k)] = model.LabelValue(v)
			}
			match, err := provider.notificationManager.Match(ctx, orgID, alert.Labels[labels.AlertRuleIdLabel], set)
			if err != nil {
				return err
			}
			if len(match) == 0 {
				delete(receiversMap, alert)
			} else {
				receiversMap[alert] = match
			}
		}
	}
	return provider.service.TestAlert(ctx, orgID, receiversMap, config)
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

func (provider *provider) CreateChannel(ctx context.Context, orgID string, receiver alertmanagertypes.Receiver) (*alertmanagertypes.Channel, error) {
	config, err := provider.configStore.Get(ctx, orgID)
	if err != nil {
		return nil, err
	}

	if err := config.CreateReceiver(receiver); err != nil {
		return nil, err
	}

	channel, err := alertmanagertypes.NewChannelFromReceiver(receiver, orgID)
	if err != nil {
		return nil, err
	}

	err = provider.configStore.CreateChannel(ctx, channel, alertmanagertypes.WithCb(func(ctx context.Context) error {
		return provider.configStore.Set(ctx, config)
	}))
	if err != nil {
		return nil, err
	}

	return channel, nil
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

func (provider *provider) CreateRoutePolicy(ctx context.Context, routeRequest *alertmanagertypes.PostableRoutePolicy) (*alertmanagertypes.GettableRoutePolicy, error) {
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

	route := alertmanagertypes.RoutePolicy{
		Expression:     routeRequest.Expression,
		ExpressionKind: routeRequest.ExpressionKind,
		Name:           routeRequest.Name,
		Description:    routeRequest.Description,
		Enabled:        true,
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

	err = provider.notificationManager.CreateRoutePolicy(ctx, orgID.String(), &route)
	if err != nil {
		return nil, err
	}

	return &alertmanagertypes.GettableRoutePolicy{
		PostableRoutePolicy: *routeRequest,
		ID:                  route.ID.StringValue(),
		CreatedAt:           &route.CreatedAt,
		UpdatedAt:           &route.UpdatedAt,
		CreatedBy:           &route.CreatedBy,
		UpdatedBy:           &route.UpdatedBy,
	}, nil
}

func (provider *provider) CreateRoutePolicies(ctx context.Context, routeRequests []*alertmanagertypes.PostableRoutePolicy) ([]*alertmanagertypes.GettableRoutePolicy, error) {
	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		return nil, err
	}

	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		return nil, err
	}

	if len(routeRequests) == 0 {
		return []*alertmanagertypes.GettableRoutePolicy{}, nil
	}

	routes := make([]*alertmanagertypes.RoutePolicy, 0, len(routeRequests))
	results := make([]*alertmanagertypes.GettableRoutePolicy, 0, len(routeRequests))

	for _, routeRequest := range routeRequests {
		if err := routeRequest.Validate(); err != nil {
			return nil, err
		}

		route := &alertmanagertypes.RoutePolicy{
			Expression:     routeRequest.Expression,
			ExpressionKind: routeRequest.ExpressionKind,
			Name:           routeRequest.Name,
			Description:    routeRequest.Description,
			Enabled:        true,
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
		results = append(results, &alertmanagertypes.GettableRoutePolicy{
			PostableRoutePolicy: *routeRequest,
			ID:                  route.ID.StringValue(),
			CreatedAt:           &route.CreatedAt,
			UpdatedAt:           &route.UpdatedAt,
			CreatedBy:           &route.CreatedBy,
			UpdatedBy:           &route.UpdatedBy,
		})
	}

	err = provider.notificationManager.CreateRoutePolicies(ctx, orgID.String(), routes)
	if err != nil {
		return nil, err
	}

	return results, nil
}

func (provider *provider) GetRoutePolicyByID(ctx context.Context, routeID string) (*alertmanagertypes.GettableRoutePolicy, error) {
	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		return nil, err
	}
	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		return nil, err
	}

	route, err := provider.notificationManager.GetRoutePolicyByID(ctx, orgID.String(), routeID)
	if err != nil {
		return nil, err
	}

	return &alertmanagertypes.GettableRoutePolicy{
		PostableRoutePolicy: alertmanagertypes.PostableRoutePolicy{
			Expression:     route.Expression,
			ExpressionKind: route.ExpressionKind,
			Channels:       route.Channels,
			Name:           route.Name,
			Description:    route.Description,
			Tags:           route.Tags,
		},
		ID:        route.ID.StringValue(),
		CreatedAt: &route.CreatedAt,
		UpdatedAt: &route.UpdatedAt,
		CreatedBy: &route.CreatedBy,
		UpdatedBy: &route.UpdatedBy,
	}, nil
}

func (provider *provider) GetAllRoutePolicies(ctx context.Context) ([]*alertmanagertypes.GettableRoutePolicy, error) {
	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		return nil, err
	}
	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		return nil, err
	}

	routes, err := provider.notificationManager.GetAllRoutePolicies(ctx, orgID.String())
	if err != nil {
		return nil, err
	}

	results := make([]*alertmanagertypes.GettableRoutePolicy, 0, len(routes))
	for _, route := range routes {
		results = append(results, &alertmanagertypes.GettableRoutePolicy{
			PostableRoutePolicy: alertmanagertypes.PostableRoutePolicy{
				Expression:     route.Expression,
				ExpressionKind: route.ExpressionKind,
				Channels:       route.Channels,
				Name:           route.Name,
				Description:    route.Description,
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

func (provider *provider) UpdateRoutePolicyByID(ctx context.Context, routeID string, route *alertmanagertypes.PostableRoutePolicy) (*alertmanagertypes.GettableRoutePolicy, error) {
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

	existingRoute, err := provider.notificationManager.GetRoutePolicyByID(ctx, claims.OrgID, routeID)
	if err != nil {
		return nil, errors.NewInvalidInputf(errors.CodeNotFound, "route not found: %v", err)
	}

	updatedRoute := &alertmanagertypes.RoutePolicy{
		Expression:     route.Expression,
		ExpressionKind: route.ExpressionKind,
		Name:           route.Name,
		Description:    route.Description,
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

	err = provider.notificationManager.DeleteRoutePolicy(ctx, orgID.String(), routeID)
	if err != nil {
		return nil, errors.NewInvalidInputf(errors.CodeInternal, "error deleting existing route: %v", err)
	}

	err = provider.notificationManager.CreateRoutePolicy(ctx, orgID.String(), updatedRoute)
	if err != nil {
		return nil, err
	}

	return &alertmanagertypes.GettableRoutePolicy{
		PostableRoutePolicy: *route,
		ID:                  updatedRoute.ID.StringValue(),
		CreatedAt:           &updatedRoute.CreatedAt,
		UpdatedAt:           &updatedRoute.UpdatedAt,
		CreatedBy:           &updatedRoute.CreatedBy,
		UpdatedBy:           &updatedRoute.UpdatedBy,
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

	return provider.notificationManager.DeleteRoutePolicy(ctx, orgID.String(), routeID)
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
	return provider.notificationManager.DeleteAllRoutePoliciesByName(ctx, orgID.String(), names)
}

func (provider *provider) UpdateAllRoutePoliciesByRuleId(ctx context.Context, names string, routes []*alertmanagertypes.PostableRoutePolicy) error {
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

	if err := config.DeleteRuleIDInhibitor(ruleId); err != nil {
		return err
	}

	return provider.configStore.Set(ctx, config)
}

func (provider *provider) GetAllPlannedMaintenance(ctx context.Context, orgID string) ([]*alertmanagertypes.GettablePlannedMaintenance, error) {
	return provider.maintenanceStore.GetAllPlannedMaintenance(ctx, orgID)
}

func (provider *provider) GetPlannedMaintenanceByID(ctx context.Context, id valuer.UUID) (*alertmanagertypes.GettablePlannedMaintenance, error) {
	return provider.maintenanceStore.GetPlannedMaintenanceByID(ctx, id)
}

func (provider *provider) CreatePlannedMaintenance(ctx context.Context, maintenance alertmanagertypes.GettablePlannedMaintenance) (valuer.UUID, error) {
	return provider.maintenanceStore.CreatePlannedMaintenance(ctx, maintenance)
}

func (provider *provider) EditPlannedMaintenance(ctx context.Context, maintenance alertmanagertypes.GettablePlannedMaintenance, id valuer.UUID) error {
	return provider.maintenanceStore.EditPlannedMaintenance(ctx, maintenance, id)
}

func (provider *provider) DeletePlannedMaintenance(ctx context.Context, id valuer.UUID) error {
	return provider.maintenanceStore.DeletePlannedMaintenance(ctx, id)
}

func (provider *provider) RecordRuleStateHistory(ctx context.Context, orgID string, entries []alertmanagertypes.RuleStateHistory) error {
	return provider.service.RecordRuleStateHistory(ctx, orgID, entries)
}

func (provider *provider) GetLastSavedRuleStateHistory(ctx context.Context, ruleID string) ([]alertmanagertypes.RuleStateHistory, error) {
	return provider.service.GetLastSavedRuleStateHistory(ctx, ruleID)
}

func (provider *provider) GetRuleStateHistoryTimeline(ctx context.Context, orgID string, ruleID string, params *alertmanagertypes.QueryRuleStateHistory) (*alertmanagertypes.RuleStateTimeline, error) {
	return provider.service.GetRuleStateHistoryTimeline(ctx, orgID, ruleID, params)
}

func (provider *provider) GetRuleStateHistoryTopContributors(ctx context.Context, orgID string, ruleID string, params *alertmanagertypes.QueryRuleStateHistory) ([]alertmanagertypes.RuleStateHistoryContributor, error) {
	return provider.service.GetRuleStateHistoryTopContributors(ctx, orgID, ruleID, params)
}

func (provider *provider) GetOverallStateTransitions(ctx context.Context, orgID string, ruleID string, params *alertmanagertypes.QueryRuleStateHistory) ([]alertmanagertypes.RuleStateTransition, error) {
	return provider.service.GetOverallStateTransitions(ctx, orgID, ruleID, params)
}

func (provider *provider) GetRuleStats(ctx context.Context, orgID string, ruleID string, params *alertmanagertypes.QueryRuleStateHistory) (*alertmanagertypes.RuleStats, error) {
	return provider.service.GetRuleStats(ctx, orgID, ruleID, params)
}

const (
	maintenanceSyncInterval = 30 * time.Second
)

// syncMaintenance checks planned maintenance windows and updates the given
// MaintenanceExprMuter with active maintenance entries. The muter is injected
// into the notification pipeline as a MuteStage, suppressing notifications
// while allowing rules to continue evaluating (preserving state history).
func (provider *provider) syncMaintenance(ctx context.Context, muter *MaintenanceExprMuter) {
	orgs, err := provider.orgGetter.ListByOwnedKeyRange(ctx)
	if err != nil {
		provider.settings.Logger().ErrorContext(ctx, "failed to list orgs for maintenance sync", "error", err)
		return
	}

	now := time.Now()
	var activeExprs []activeMaintenanceExpr

	for _, org := range orgs {
		orgID := org.ID.StringValue()
		maintenanceList, err := provider.maintenanceStore.GetAllPlannedMaintenance(ctx, orgID)
		if err != nil {
			provider.settings.Logger().ErrorContext(ctx, "failed to get planned maintenance for sync", "orgID", orgID, "error", err)
			continue
		}

		for _, maint := range maintenanceList {
			_, active := maint.CurrentWindowEndTime(now)
			if !active {
				continue
			}

			activeExprs = append(activeExprs, activeMaintenanceExpr{
				ruleIDs:    maint.RuleIDs,
				expression: maint.Expression,
			})
		}
	}

	muter.SetActiveExpressions(activeExprs)
}

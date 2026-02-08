package alertmanager

import (
	"context"
	"encoding/json"
	"math"
	"sync"
	"time"

	"github.com/prometheus/alertmanager/featurecontrol"
	"github.com/prometheus/alertmanager/matcher/compat"
	amtypes "github.com/prometheus/alertmanager/types"
	"github.com/prometheus/common/model"

	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagerserver"
	"github.com/SigNoz/signoz/pkg/alertmanager/nfmanager"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
)

type Service struct {
	// config is the config for the alertmanager service
	config alertmanagerserver.Config

	// stateStore is the state store for the alertmanager service
	stateStore alertmanagertypes.StateStore

	// configStore is the config store for the alertmanager service
	configStore alertmanagertypes.ConfigStore

	// organization is the organization module for the alertmanager service
	orgGetter organization.Getter

	// settings is the settings for the alertmanager service
	settings factory.ScopedProviderSettings

	// Map of organization id to alertmanager server
	servers map[string]*alertmanagerserver.Server

	// Mutex to protect the servers map
	serversMtx sync.RWMutex

	notificationManager nfmanager.NotificationManager

	// maintenanceExprMuter is an optional muter for expression-based maintenance scoping
	maintenanceExprMuter amtypes.Muter

	// stateHistoryStore writes rule state history to persistent storage (e.g. ClickHouse)
	stateHistoryStore alertmanagertypes.StateHistoryStore

	// stateTracker tracks alert state transitions for v2 state history recording
	stateTracker *stateTracker
}

func New(
	ctx context.Context,
	settings factory.ScopedProviderSettings,
	config alertmanagerserver.Config,
	stateStore alertmanagertypes.StateStore,
	configStore alertmanagertypes.ConfigStore,
	orgGetter organization.Getter,
	nfManager nfmanager.NotificationManager,
	maintenanceExprMuter amtypes.Muter,
	stateHistoryStore alertmanagertypes.StateHistoryStore,
) *Service {
	service := &Service{
		config:               config,
		stateStore:           stateStore,
		configStore:          configStore,
		orgGetter:            orgGetter,
		settings:             settings,
		servers:              make(map[string]*alertmanagerserver.Server),
		serversMtx:           sync.RWMutex{},
		notificationManager:  nfManager,
		maintenanceExprMuter: maintenanceExprMuter,
		stateHistoryStore:   stateHistoryStore,
		stateTracker:         newStateTracker(),
	}

	return service
}

func (service *Service) SyncServers(ctx context.Context) error {
	compat.InitFromFlags(service.settings.Logger(), featurecontrol.NoopFlags{})
	orgs, err := service.orgGetter.ListByOwnedKeyRange(ctx)
	if err != nil {
		return err
	}

	service.serversMtx.Lock()
	for _, org := range orgs {
		config, err := service.getConfig(ctx, org.ID.StringValue())
		if err != nil {
			service.settings.Logger().ErrorContext(ctx, "failed to get alertmanager config for org", "org_id", org.ID.StringValue(), "error", err)
			continue
		}

		// If the server is not present, create it and sync the config
		if _, ok := service.servers[org.ID.StringValue()]; !ok {
			server, err := service.newServer(ctx, org.ID.StringValue())
			if err != nil {
				service.settings.Logger().ErrorContext(ctx, "failed to create alertmanager server", "org_id", org.ID.StringValue(), "error", err)
				continue
			}

			service.servers[org.ID.StringValue()] = server
		}

		if service.servers[org.ID.StringValue()].Hash() == config.StoreableConfig().Hash {
			service.settings.Logger().DebugContext(ctx, "skipping alertmanager sync for org", "org_id", org.ID.StringValue(), "hash", config.StoreableConfig().Hash)
			continue
		}

		err = service.servers[org.ID.StringValue()].SetConfig(ctx, config)
		if err != nil {
			service.settings.Logger().ErrorContext(ctx, "failed to set config for alertmanager server", "org_id", org.ID.StringValue(), "error", err)
			continue
		}
	}
	service.serversMtx.Unlock()

	return nil
}

func (service *Service) GetAlerts(ctx context.Context, orgID string, params alertmanagertypes.GettableAlertsParams) (alertmanagertypes.DeprecatedGettableAlerts, error) {
	service.serversMtx.RLock()
	defer service.serversMtx.RUnlock()

	server, err := service.getServer(orgID)
	if err != nil {
		return nil, err
	}

	alerts, err := server.GetAlerts(ctx, params)
	if err != nil {
		return nil, err
	}

	return alertmanagertypes.NewDeprecatedGettableAlertsFromGettableAlerts(alerts), nil
}

func (service *Service) PutAlerts(ctx context.Context, orgID string, alerts alertmanagertypes.PostableAlerts) error {
	service.serversMtx.RLock()
	defer service.serversMtx.RUnlock()

	server, err := service.getServer(orgID)
	if err != nil {
		return err
	}

	// Convert to typed alerts for state tracking (same conversion the server does).
	now := time.Now()
	typedAlerts, _ := alertmanagertypes.NewAlertsFromPostableAlerts(
		alerts, time.Duration(service.config.Global.ResolveTimeout), now,
	)

	// Delegate to server for notification pipeline.
	if err := server.PutAlerts(ctx, alerts); err != nil {
		return err
	}

	// Record state history from the incoming alerts.
	service.recordStateHistoryFromAlerts(ctx, orgID, typedAlerts, now)

	return nil
}

func (service *Service) TestReceiver(ctx context.Context, orgID string, receiver alertmanagertypes.Receiver) error {
	service.serversMtx.RLock()
	defer service.serversMtx.RUnlock()

	server, err := service.getServer(orgID)
	if err != nil {
		return err
	}

	return server.TestReceiver(ctx, receiver)
}

func (service *Service) TestAlert(ctx context.Context, orgID string, receiversMap map[*alertmanagertypes.PostableAlert][]string, config *alertmanagertypes.NotificationConfig) error {
	service.serversMtx.RLock()
	defer service.serversMtx.RUnlock()

	server, err := service.getServer(orgID)
	if err != nil {
		return err
	}

	return server.TestAlert(ctx, receiversMap, config)
}

func (service *Service) Stop(ctx context.Context) error {
	var errs []error
	for _, server := range service.servers {
		if err := server.Stop(ctx); err != nil {
			errs = append(errs, err)
			service.settings.Logger().ErrorContext(ctx, "failed to stop alertmanager server", "error", err)
		}
	}

	return errors.Join(errs...)
}

func (service *Service) newServer(ctx context.Context, orgID string) (*alertmanagerserver.Server, error) {
	config, err := service.getConfig(ctx, orgID)
	if err != nil {
		return nil, err
	}

	server, err := alertmanagerserver.New(ctx, service.settings.Logger(), service.settings.PrometheusRegisterer(), service.config, orgID, service.stateStore, service.notificationManager, service.maintenanceExprMuter)
	if err != nil {
		return nil, err
	}

	beforeCompareAndSelectHash := config.StoreableConfig().Hash
	config, err = service.compareAndSelectConfig(ctx, config)
	if err != nil {
		return nil, err
	}

	if beforeCompareAndSelectHash == config.StoreableConfig().Hash {
		service.settings.Logger().DebugContext(ctx, "skipping config store update for org", "org_id", orgID, "hash", config.StoreableConfig().Hash)
		return server, nil
	}

	err = service.configStore.Set(ctx, config)
	if err != nil {
		return nil, err
	}

	return server, nil
}

func (service *Service) getConfig(ctx context.Context, orgID string) (*alertmanagertypes.Config, error) {
	config, err := service.configStore.Get(ctx, orgID)
	if err != nil {
		if !errors.Ast(err, errors.TypeNotFound) {
			return nil, err
		}

		config, err = alertmanagertypes.NewDefaultConfig(service.config.Global, service.config.Route, orgID)
		if err != nil {
			return nil, err
		}
	}

	if err := config.SetGlobalConfig(service.config.Global); err != nil {
		return nil, err
	}
	if err := config.SetRouteConfig(service.config.Route); err != nil {
		return nil, err
	}

	return config, nil
}

func (service *Service) compareAndSelectConfig(ctx context.Context, incomingConfig *alertmanagertypes.Config) (*alertmanagertypes.Config, error) {
	channels, err := service.configStore.ListChannels(ctx, incomingConfig.StoreableConfig().OrgID)
	if err != nil {
		return nil, err
	}

	matchers, err := service.configStore.GetMatchers(ctx, incomingConfig.StoreableConfig().OrgID)
	if err != nil {
		return nil, err
	}

	config, err := alertmanagertypes.NewConfigFromChannels(service.config.Global, service.config.Route, channels, incomingConfig.StoreableConfig().OrgID)
	if err != nil {
		return nil, err
	}

	for ruleID, receivers := range matchers {
		err = config.CreateRuleIDMatcher(ruleID, receivers)
		if err != nil {
			return nil, err
		}
	}

	if incomingConfig.StoreableConfig().Hash != config.StoreableConfig().Hash {
		service.settings.Logger().InfoContext(ctx, "mismatch found, updating config to match channels and matchers")
		return config, nil
	}

	return incomingConfig, nil

}

// RecordRuleStateHistory applies maintenance muting logic and writes state history entries.
// For each entry with State=="firing", if the maintenance muter matches the entry's labels,
// the state is changed to "muted" before writing.
func (service *Service) RecordRuleStateHistory(ctx context.Context, orgID string, entries []alertmanagertypes.RuleStateHistory) error {
	if service.stateHistoryStore == nil {
		return nil
	}

	for i := range entries {
		entries[i].OrgID = orgID
	}

	if service.maintenanceExprMuter != nil {
		for i := range entries {
			if entries[i].State != "firing" {
				continue
			}
			lbls := labelsFromJSON(entries[i].Labels)
			if lbls == nil {
				continue
			}
			// Add ruleId to the label set for muter matching.
			lbls["ruleId"] = model.LabelValue(entries[i].RuleID)
			if service.maintenanceExprMuter.Mutes(lbls) {
				entries[i].State = "muted"
			}
		}
	}

	return service.stateHistoryStore.WriteRuleStateHistory(ctx, entries)
}

func (service *Service) GetLastSavedRuleStateHistory(ctx context.Context, ruleID string) ([]alertmanagertypes.RuleStateHistory, error) {
	if service.stateHistoryStore == nil {
		return nil, nil
	}

	return service.stateHistoryStore.GetLastSavedRuleStateHistory(ctx, ruleID)
}

func (service *Service) GetRuleStateHistoryTimeline(ctx context.Context, orgID string, ruleID string, params *alertmanagertypes.QueryRuleStateHistory) (*alertmanagertypes.RuleStateTimeline, error) {
	if service.stateHistoryStore == nil {
		return &alertmanagertypes.RuleStateTimeline{Items: []alertmanagertypes.RuleStateHistory{}}, nil
	}
	return service.stateHistoryStore.GetRuleStateHistoryTimeline(ctx, orgID, ruleID, params)
}

func (service *Service) GetRuleStateHistoryTopContributors(ctx context.Context, orgID string, ruleID string, params *alertmanagertypes.QueryRuleStateHistory) ([]alertmanagertypes.RuleStateHistoryContributor, error) {
	if service.stateHistoryStore == nil {
		return []alertmanagertypes.RuleStateHistoryContributor{}, nil
	}
	return service.stateHistoryStore.GetRuleStateHistoryTopContributors(ctx, orgID, ruleID, params)
}

func (service *Service) GetOverallStateTransitions(ctx context.Context, orgID string, ruleID string, params *alertmanagertypes.QueryRuleStateHistory) ([]alertmanagertypes.RuleStateTransition, error) {
	if service.stateHistoryStore == nil {
		return []alertmanagertypes.RuleStateTransition{}, nil
	}
	return service.stateHistoryStore.GetOverallStateTransitions(ctx, orgID, ruleID, params)
}

func (service *Service) GetRuleStats(ctx context.Context, orgID string, ruleID string, params *alertmanagertypes.QueryRuleStateHistory) (*alertmanagertypes.RuleStats, error) {
	if service.stateHistoryStore == nil {
		return &alertmanagertypes.RuleStats{}, nil
	}

	store := service.stateHistoryStore

	// Current period stats.
	totalCurrentTriggers, err := store.GetTotalTriggers(ctx, orgID, ruleID, params)
	if err != nil {
		return nil, err
	}
	currentTriggersSeries, err := store.GetTriggersByInterval(ctx, orgID, ruleID, params)
	if err != nil {
		return nil, err
	}
	currentAvgResolutionTime, err := store.GetAvgResolutionTime(ctx, orgID, ruleID, params)
	if err != nil {
		return nil, err
	}
	currentAvgResolutionTimeSeries, err := store.GetAvgResolutionTimeByInterval(ctx, orgID, ruleID, params)
	if err != nil {
		return nil, err
	}

	// Past period stats — shift time window backward.
	pastParams := *params
	duration := params.End - params.Start
	if duration >= 86400000 {
		days := int64(math.Ceil(float64(duration) / 86400000))
		pastParams.Start -= days * 86400000
		pastParams.End -= days * 86400000
	} else {
		pastParams.Start -= 86400000
		pastParams.End -= 86400000
	}

	totalPastTriggers, err := store.GetTotalTriggers(ctx, orgID, ruleID, &pastParams)
	if err != nil {
		return nil, err
	}
	pastTriggersSeries, err := store.GetTriggersByInterval(ctx, orgID, ruleID, &pastParams)
	if err != nil {
		return nil, err
	}
	pastAvgResolutionTime, err := store.GetAvgResolutionTime(ctx, orgID, ruleID, &pastParams)
	if err != nil {
		return nil, err
	}
	pastAvgResolutionTimeSeries, err := store.GetAvgResolutionTimeByInterval(ctx, orgID, ruleID, &pastParams)
	if err != nil {
		return nil, err
	}

	if math.IsNaN(currentAvgResolutionTime) || math.IsInf(currentAvgResolutionTime, 0) {
		currentAvgResolutionTime = 0
	}
	if math.IsNaN(pastAvgResolutionTime) || math.IsInf(pastAvgResolutionTime, 0) {
		pastAvgResolutionTime = 0
	}

	return &alertmanagertypes.RuleStats{
		TotalCurrentTriggers:           totalCurrentTriggers,
		TotalPastTriggers:              totalPastTriggers,
		CurrentTriggersSeries:          currentTriggersSeries,
		PastTriggersSeries:             pastTriggersSeries,
		CurrentAvgResolutionTime:       currentAvgResolutionTime,
		PastAvgResolutionTime:          pastAvgResolutionTime,
		CurrentAvgResolutionTimeSeries: currentAvgResolutionTimeSeries,
		PastAvgResolutionTimeSeries:    pastAvgResolutionTimeSeries,
	}, nil
}

// recordStateHistoryFromAlerts detects state transitions from incoming alerts
// and records them via RecordRuleStateHistory (which applies maintenance muting).
func (service *Service) recordStateHistoryFromAlerts(ctx context.Context, orgID string, alerts []*amtypes.Alert, now time.Time) {
	if service.stateHistoryStore == nil {
		return
	}

	entries := service.stateTracker.processAlerts(orgID, alerts, now)
	if len(entries) == 0 {
		return
	}

	if err := service.RecordRuleStateHistory(ctx, orgID, entries); err != nil {
		service.settings.Logger().ErrorContext(ctx, "failed to record state history", "error", err)
	}
}

// StartStateHistorySweep starts a background goroutine that periodically checks
// for stale firing alerts and records them as resolved. Call this once after creating the service.
func (service *Service) StartStateHistorySweep(ctx context.Context) {
	if service.stateHistoryStore == nil {
		return
	}

	staleTimeout := 2 * time.Duration(service.config.Global.ResolveTimeout)
	if staleTimeout == 0 {
		staleTimeout = 10 * time.Minute
	}

	go func() {
		ticker := time.NewTicker(1 * time.Minute)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				now := time.Now()
				entriesByOrg := service.stateTracker.sweepStale(staleTimeout, now)
				for orgID, orgEntries := range entriesByOrg {
					if err := service.RecordRuleStateHistory(ctx, orgID, orgEntries); err != nil {
						service.settings.Logger().ErrorContext(ctx, "failed to record stale state history", "org_id", orgID, "error", err)
					}
				}
			}
		}
	}()
}

// labelsFromJSON parses a JSON string of labels into a model.LabelSet.
func labelsFromJSON(labelsJSON string) model.LabelSet {
	if labelsJSON == "" {
		return nil
	}
	var m map[string]string
	if err := json.Unmarshal([]byte(labelsJSON), &m); err != nil {
		return nil
	}
	ls := make(model.LabelSet, len(m))
	for k, v := range m {
		ls[model.LabelName(k)] = model.LabelValue(v)
	}
	return ls
}

// getServer returns the server for the given orgID. It should be called with the lock held.
func (service *Service) getServer(orgID string) (*alertmanagerserver.Server, error) {
	server, ok := service.servers[orgID]
	if !ok {
		return nil, errors.Newf(errors.TypeNotFound, ErrCodeAlertmanagerNotFound, "alertmanager not found for org %s", orgID)
	}

	return server, nil
}

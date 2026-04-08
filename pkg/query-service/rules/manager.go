package rules

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/SigNoz/signoz/pkg/querier"
	"github.com/SigNoz/signoz/pkg/queryparser"

	"github.com/go-openapi/strfmt"

	"github.com/SigNoz/signoz/pkg/alertmanager"
	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/modules/rulestatehistory"
	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type PrepareTaskOptions struct {
	Rule             *ruletypes.PostableRule
	TaskName         string
	RuleStore        ruletypes.RuleStore
	MaintenanceStore ruletypes.MaintenanceStore
	Querier          querier.Querier
	Logger           *slog.Logger
	Cache            cache.Cache
	ManagerOpts      *ManagerOptions
	NotifyFunc       NotifyFunc
	SQLStore         sqlstore.SQLStore
	OrgID            valuer.UUID
}

type PrepareTestRuleOptions struct {
	Rule             *ruletypes.PostableRule
	RuleStore        ruletypes.RuleStore
	MaintenanceStore ruletypes.MaintenanceStore
	Querier          querier.Querier
	Logger           *slog.Logger
	Cache            cache.Cache
	ManagerOpts      *ManagerOptions
	NotifyFunc       NotifyFunc
	SQLStore         sqlstore.SQLStore
	OrgID            valuer.UUID
}

const taskNameSuffix = "webAppEditor"

func RuleIDFromTaskName(n string) string {
	return strings.Split(n, "-groupname")[0]
}

func prepareTaskName(ruleID string) string {
	return fmt.Sprintf("%s-groupname", ruleID)
}

// ManagerOptions bundles options for the Manager.
type ManagerOptions struct {
	TelemetryStore telemetrystore.TelemetryStore
	MetadataStore  telemetrytypes.MetadataStore
	Prometheus     prometheus.Prometheus

	Context     context.Context
	ResendDelay time.Duration
	Querier     querier.Querier
	Logger      *slog.Logger
	Cache       cache.Cache

	EvalDelay valuer.TextDuration

	RuleStateHistoryModule rulestatehistory.Module

	PrepareTaskFunc     func(opts PrepareTaskOptions) (Task, error)
	PrepareTestRuleFunc func(opts PrepareTestRuleOptions) (int, error)
	Alertmanager        alertmanager.Alertmanager
	OrgGetter           organization.Getter
	RuleStore           ruletypes.RuleStore
	MaintenanceStore    ruletypes.MaintenanceStore
	SQLStore            sqlstore.SQLStore
	QueryParser         queryparser.QueryParser
}

// The Manager manages recording and alerting rules.
type Manager struct {
	opts  *ManagerOptions
	tasks map[string]Task
	rules map[string]Rule
	mtx   sync.RWMutex
	block chan struct{}
	// datastore to store alert definitions
	ruleStore        ruletypes.RuleStore
	maintenanceStore ruletypes.MaintenanceStore

	logger              *slog.Logger
	cache               cache.Cache
	prepareTaskFunc     func(opts PrepareTaskOptions) (Task, error)
	prepareTestRuleFunc func(opts PrepareTestRuleOptions) (int, error)

	alertmanager alertmanager.Alertmanager
	sqlstore     sqlstore.SQLStore
	orgGetter    organization.Getter
	// queryParser is used for parsing queries for rules
	queryParser queryparser.QueryParser
}

func defaultOptions(o *ManagerOptions) *ManagerOptions {
	if o.ResendDelay == time.Duration(0) {
		o.ResendDelay = 1 * time.Minute
	}
	if o.Logger == nil {
		o.Logger = slog.Default()
	}
	if o.PrepareTaskFunc == nil {
		o.PrepareTaskFunc = defaultPrepareTaskFunc
	}
	if o.PrepareTestRuleFunc == nil {
		o.PrepareTestRuleFunc = defaultTestNotification
	}
	return o
}

func defaultPrepareTaskFunc(opts PrepareTaskOptions) (Task, error) {

	rules := make([]Rule, 0)
	var task Task

	ruleID := RuleIDFromTaskName(opts.TaskName)

	evaluation, err := opts.Rule.Evaluation.GetEvaluation()
	if err != nil {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "evaluation is invalid: %v", err)
	}

	if opts.Rule.RuleType == ruletypes.RuleTypeThreshold {
		// create a threshold rule
		tr, err := NewThresholdRule(
			ruleID,
			opts.OrgID,
			opts.Rule,
			opts.Querier,
			opts.Logger,
			WithEvalDelay(opts.ManagerOpts.EvalDelay),
			WithSQLStore(opts.SQLStore),
			WithQueryParser(opts.ManagerOpts.QueryParser),
			WithMetadataStore(opts.ManagerOpts.MetadataStore),
			WithRuleStateHistoryModule(opts.ManagerOpts.RuleStateHistoryModule),
		)

		if err != nil {
			return task, err
		}

		rules = append(rules, tr)

		// create ch rule task for evaluation
		task = newTask(TaskTypeCh, opts.TaskName, taskNameSuffix, evaluation.GetFrequency().Duration(), rules, opts.ManagerOpts, opts.NotifyFunc, opts.MaintenanceStore, opts.OrgID)

	} else if opts.Rule.RuleType == ruletypes.RuleTypeProm {

		// create promql rule
		pr, err := NewPromRule(
			ruleID,
			opts.OrgID,
			opts.Rule,
			opts.Logger,
			opts.ManagerOpts.Prometheus,
			WithSQLStore(opts.SQLStore),
			WithQueryParser(opts.ManagerOpts.QueryParser),
			WithMetadataStore(opts.ManagerOpts.MetadataStore),
			WithRuleStateHistoryModule(opts.ManagerOpts.RuleStateHistoryModule),
		)

		if err != nil {
			return task, err
		}

		rules = append(rules, pr)

		// create promql rule task for evaluation
		task = newTask(TaskTypeProm, opts.TaskName, taskNameSuffix, evaluation.GetFrequency().Duration(), rules, opts.ManagerOpts, opts.NotifyFunc, opts.MaintenanceStore, opts.OrgID)

	} else {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported rule type %s. Supported types: %s, %s", opts.Rule.RuleType, ruletypes.RuleTypeProm, ruletypes.RuleTypeThreshold)
	}

	return task, nil
}

// NewManager returns an implementation of Manager, ready to be started
// by calling the Run method.
func NewManager(o *ManagerOptions) (*Manager, error) {
	o = defaultOptions(o)

	m := &Manager{
		tasks:               map[string]Task{},
		rules:               map[string]Rule{},
		ruleStore:           o.RuleStore,
		maintenanceStore:    o.MaintenanceStore,
		opts:                o,
		block:               make(chan struct{}),
		logger:              o.Logger,
		cache:               o.Cache,
		prepareTaskFunc:     o.PrepareTaskFunc,
		prepareTestRuleFunc: o.PrepareTestRuleFunc,
		alertmanager:        o.Alertmanager,
		orgGetter:           o.OrgGetter,
		sqlstore:            o.SQLStore,
		queryParser:         o.QueryParser,
	}

	m.logger.Debug("manager created successfully with notification group")
	return m, nil
}

func (m *Manager) Start(ctx context.Context) {
	if err := m.initiate(ctx); err != nil {
		m.logger.ErrorContext(ctx, "failed to initialize alerting rules manager", errors.Attr(err))
	}
	m.run(ctx)
}

func (m *Manager) RuleStore() ruletypes.RuleStore {
	return m.ruleStore
}

func (m *Manager) MaintenanceStore() ruletypes.MaintenanceStore {
	return m.maintenanceStore
}

func (m *Manager) Pause(b bool) {
	m.mtx.Lock()
	defer m.mtx.Unlock()
	for _, t := range m.tasks {
		t.Pause(b)
	}
}

func (m *Manager) initiate(ctx context.Context) error {
	orgs, err := m.orgGetter.ListByOwnedKeyRange(ctx)
	if err != nil {
		return err
	}

	var loadErrors []error
	for _, org := range orgs {
		storedRules, err := m.ruleStore.GetStoredRules(ctx, org.ID.StringValue())
		if err != nil {
			return err
		}
		if len(storedRules) == 0 {
			return nil
		}

		for _, rec := range storedRules {
			taskName := fmt.Sprintf("%s-groupname", rec.ID.StringValue())
			parsedRule := ruletypes.PostableRule{}

			err := json.Unmarshal([]byte(rec.Data), &parsedRule)
			if err != nil {
				m.logger.InfoContext(ctx, "failed to load rule in json format", "name", taskName)
				loadErrors = append(loadErrors, err)
				continue
			}

			if parsedRule.NotificationSettings != nil {
				config := parsedRule.NotificationSettings.GetAlertManagerNotificationConfig()
				err = m.alertmanager.SetNotificationConfig(ctx, org.ID, rec.ID.StringValue(), &config)
				if err != nil {
					loadErrors = append(loadErrors, err)
					m.logger.WarnContext(ctx, "failed to set rule notification config", slog.String("rule.id", rec.ID.StringValue()), errors.Attr(err))
				}
			}
			if !parsedRule.Disabled {
				err := m.addTask(ctx, org.ID, &parsedRule, taskName)
				if err != nil {
					m.logger.ErrorContext(ctx, "failed to load the rule definition", "name", taskName, errors.Attr(err))
				}
			}
		}
	}

	if len(loadErrors) > 0 {
		return errors.Join(loadErrors...)
	}

	return nil
}

// Run starts processing of the rule manager.
func (m *Manager) run(_ context.Context) {
	// initiate blocked tasks
	close(m.block)
}

// Stop the rule manager's rule evaluation cycles.
func (m *Manager) Stop(_ context.Context) {
	m.mtx.Lock()
	defer m.mtx.Unlock()

	m.logger.Info("stopping rule manager")

	for _, t := range m.tasks {
		t.Stop()
	}

	m.logger.Info("rule manager stopped")
}

// validateChannels checks that every channel referenced by the rule
// exists as a notification channel for the given org.
func (m *Manager) validateChannels(ctx context.Context, orgID string, rule *ruletypes.PostableRule) error {
	channels := rule.Channels()
	if len(channels) == 0 {
		return nil
	}

	orgChannels, err := m.alertmanager.ListChannels(ctx, orgID)
	if err != nil {
		return err
	}

	known := make(map[string]struct{}, len(orgChannels))
	for _, ch := range orgChannels {
		known[ch.Name] = struct{}{}
	}

	var unknown []string
	for _, name := range channels {
		if _, ok := known[name]; !ok {
			unknown = append(unknown, name)
		}
	}

	if len(unknown) > 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput,
			"channels: the following channels do not exist: %v", unknown)
	}
	return nil
}

// EditRule writes the rule definition to the
// datastore and also updates the rule executor
func (m *Manager) EditRule(ctx context.Context, ruleStr string, id valuer.UUID) error {
	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		return err
	}
	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		return err
	}
	parsedRule := ruletypes.PostableRule{}
	err = json.Unmarshal([]byte(ruleStr), &parsedRule)
	if err != nil {
		return err
	}
	if err := parsedRule.Validate(); err != nil {
		return err
	}
	if err := m.validateChannels(ctx, claims.OrgID, &parsedRule); err != nil {
		return err
	}
	existingRule, err := m.ruleStore.GetStoredRule(ctx, id)
	if err != nil {
		return err
	}

	existingRule.UpdatedAt = time.Now()
	existingRule.UpdatedBy = claims.Email
	existingRule.Data = ruleStr

	return m.ruleStore.EditRule(ctx, existingRule, func(ctx context.Context) error {
		if parsedRule.NotificationSettings != nil {
			config := parsedRule.NotificationSettings.GetAlertManagerNotificationConfig()
			err = m.alertmanager.SetNotificationConfig(ctx, orgID, id.StringValue(), &config)
			if err != nil {
				return err
			}
			if !parsedRule.NotificationSettings.UsePolicy {
				request, err := parsedRule.GetRuleRouteRequest(id.StringValue())
				if err != nil {
					return err
				}
				err = m.alertmanager.UpdateAllRoutePoliciesByRuleId(ctx, id.StringValue(), request)
				if err != nil {
					return err
				}
				err = m.alertmanager.DeleteAllInhibitRulesByRuleId(ctx, orgID, id.StringValue())
				if err != nil {
					return err
				}

				inhibitRules, err := parsedRule.GetInhibitRules(id.StringValue())
				if err != nil {
					return err
				}
				err = m.alertmanager.CreateInhibitRules(ctx, orgID, inhibitRules)
				if err != nil {
					return err
				}
			}
		}
		err = m.syncRuleStateWithTask(ctx, orgID, prepareTaskName(existingRule.ID.StringValue()), &parsedRule)
		if err != nil {
			return err
		}

		return nil
	})
}

func (m *Manager) editTask(_ context.Context, orgID valuer.UUID, rule *ruletypes.PostableRule, taskName string) error {
	m.mtx.Lock()
	defer m.mtx.Unlock()

	m.logger.Debug("editing a rule task", "name", taskName)

	newTask, err := m.prepareTaskFunc(PrepareTaskOptions{
		Rule:             rule,
		TaskName:         taskName,
		RuleStore:        m.ruleStore,
		MaintenanceStore: m.maintenanceStore,
		Querier:          m.opts.Querier,
		Logger:           m.opts.Logger,
		Cache:            m.cache,
		ManagerOpts:      m.opts,
		NotifyFunc:       m.notifyFunc,
		SQLStore:         m.sqlstore,
		OrgID:            orgID,
	})

	if err != nil {
		m.logger.Error("loading tasks failed", errors.Attr(err))
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "error preparing rule with given parameters, previous rule set restored")
	}

	for _, r := range newTask.Rules() {
		m.rules[r.ID()] = r
	}

	// If there is an old task with the same identifier, stop it and wait for
	// it to finish the current iteration. Then copy it into the new group.
	oldTask, ok := m.tasks[taskName]
	if !ok {
		m.logger.Warn("rule task not found, a new task will be created", "name", taskName)
	}

	delete(m.tasks, taskName)

	if ok {
		oldTask.Stop()
		newTask.CopyState(oldTask)
	}
	go func() {
		// Wait with starting evaluation until the rule manager
		// is told to run. This is necessary to avoid running
		// queries against a bootstrapping storage.
		<-m.block
		newTask.Run(m.opts.Context)
	}()

	m.tasks[taskName] = newTask
	return nil
}

func (m *Manager) DeleteRule(ctx context.Context, idStr string) error {
	id, err := valuer.NewUUID(idStr)
	if err != nil {
		m.logger.ErrorContext(ctx, "delete rule received a rule id in invalid format, must be a valid uuid-v7", slog.String("rule.id", idStr), errors.Attr(err))
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "delete rule received an rule id in invalid format, must be a valid uuid-v7")
	}

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		return err
	}

	_, err = m.ruleStore.GetStoredRule(ctx, id)
	if err != nil {
		return err
	}

	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		return err
	}

	return m.ruleStore.DeleteRule(ctx, id, func(ctx context.Context) error {
		cfg, err := m.alertmanager.GetConfig(ctx, claims.OrgID)
		if err != nil {
			return err
		}

		err = cfg.DeleteRuleIDMatcher(id.StringValue())
		if err != nil {
			return err
		}

		err = m.alertmanager.SetConfig(ctx, cfg)
		if err != nil {
			return err
		}

		err = m.alertmanager.DeleteNotificationConfig(ctx, orgID, id.String())
		if err != nil {
			return err
		}

		err = m.alertmanager.DeleteAllRoutePoliciesByRuleId(ctx, id.String())
		if err != nil {
			return err
		}

		err = m.alertmanager.DeleteAllInhibitRulesByRuleId(ctx, orgID, id.String())
		if err != nil {
			return err
		}

		taskName := prepareTaskName(id.StringValue())
		m.deleteTask(taskName)

		return nil
	})
}

func (m *Manager) deleteTask(taskName string) {
	m.mtx.Lock()
	defer m.mtx.Unlock()
	m.logger.Debug("deleting a rule task", "name", taskName)

	oldg, ok := m.tasks[taskName]
	if ok {
		oldg.Stop()
		delete(m.tasks, taskName)
		delete(m.rules, RuleIDFromTaskName(taskName))
		m.logger.Debug("rule task deleted", "name", taskName)
	} else {
		m.logger.Info("rule not found for deletion", "name", taskName)
	}
}

// CreateRule stores rule def into db and also
// starts an executor for the rule
func (m *Manager) CreateRule(ctx context.Context, ruleStr string) (*ruletypes.GettableRule, error) {
	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		return nil, err
	}

	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		return nil, err
	}
	parsedRule := ruletypes.PostableRule{}
	err = json.Unmarshal([]byte(ruleStr), &parsedRule)
	if err != nil {
		return nil, err
	}
	if err := parsedRule.Validate(); err != nil {
		return nil, err
	}
	if err := m.validateChannels(ctx, claims.OrgID, &parsedRule); err != nil {
		return nil, err
	}
	now := time.Now()
	storedRule := &ruletypes.Rule{
		Identifiable: types.Identifiable{
			ID: valuer.GenerateUUID(),
		},
		TimeAuditable: types.TimeAuditable{
			CreatedAt: now,
			UpdatedAt: now,
		},
		UserAuditable: types.UserAuditable{
			CreatedBy: claims.Email,
			UpdatedBy: claims.Email,
		},
		Data:  ruleStr,
		OrgID: claims.OrgID,
	}

	id, err := m.ruleStore.CreateRule(ctx, storedRule, func(ctx context.Context, id valuer.UUID) error {
		if parsedRule.NotificationSettings != nil {
			config := parsedRule.NotificationSettings.GetAlertManagerNotificationConfig()
			err = m.alertmanager.SetNotificationConfig(ctx, orgID, id.StringValue(), &config)
			if err != nil {
				return err
			}
			if !parsedRule.NotificationSettings.UsePolicy {
				request, err := parsedRule.GetRuleRouteRequest(id.StringValue())
				if err != nil {
					return err
				}
				_, err = m.alertmanager.CreateRoutePolicies(ctx, request)
				if err != nil {
					return err
				}
				inhibitRules, err := parsedRule.GetInhibitRules(id.StringValue())
				if err != nil {
					return err
				}
				err = m.alertmanager.CreateInhibitRules(ctx, orgID, inhibitRules)
				if err != nil {
					return err
				}
			}
		}

		taskName := prepareTaskName(id.StringValue())
		if err = m.addTask(ctx, orgID, &parsedRule, taskName); err != nil {
			return err
		}

		return nil
	})
	if err != nil {
		return nil, err
	}

	return &ruletypes.GettableRule{
		Id:           id.StringValue(),
		PostableRule: parsedRule,
	}, nil
}

func (m *Manager) addTask(_ context.Context, orgID valuer.UUID, rule *ruletypes.PostableRule, taskName string) error {
	m.mtx.Lock()
	defer m.mtx.Unlock()

	m.logger.Debug("adding a new rule task", "name", taskName)
	newTask, err := m.prepareTaskFunc(PrepareTaskOptions{
		Rule:             rule,
		TaskName:         taskName,
		RuleStore:        m.ruleStore,
		MaintenanceStore: m.maintenanceStore,
		Querier:          m.opts.Querier,
		Logger:           m.opts.Logger,
		Cache:            m.cache,
		ManagerOpts:      m.opts,
		NotifyFunc:       m.notifyFunc,
		SQLStore:         m.sqlstore,
		OrgID:            orgID,
	})

	if err != nil {
		m.logger.Error("creating rule task failed", "name", taskName, errors.Attr(err))
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "error loading rules, previous rule set restored")
	}

	for _, r := range newTask.Rules() {
		m.rules[r.ID()] = r
	}

	// If there is another task with the same identifier, raise an error
	_, ok := m.tasks[taskName]
	if ok {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "a rule with the same name already exists")
	}

	go func() {
		// Wait with starting evaluation until the rule manager
		// is told to run. This is necessary to avoid running
		// queries against a bootstrapping storage.
		<-m.block
		newTask.Run(m.opts.Context)
	}()

	m.tasks[taskName] = newTask
	return nil
}

// RuleTasks returns the list of manager's rule tasks.
func (m *Manager) RuleTasks() []Task {
	m.mtx.RLock()
	defer m.mtx.RUnlock()

	rgs := make([]Task, 0, len(m.tasks))
	for _, g := range m.tasks {
		rgs = append(rgs, g)
	}

	sort.Slice(rgs, func(i, j int) bool {
		return rgs[i].Name() < rgs[j].Name()
	})

	return rgs
}

// RuleTasksWithoutLock returns the list of manager's rule tasks without
// acquiring a lock on the manager.
func (m *Manager) RuleTasksWithoutLock() []Task {

	rgs := make([]Task, 0, len(m.tasks))
	for _, g := range m.tasks {
		rgs = append(rgs, g)
	}

	sort.Slice(rgs, func(i, j int) bool {
		return rgs[i].Name() < rgs[j].Name()
	})

	return rgs
}

// Rules returns the list of the manager's rules.
func (m *Manager) Rules() []Rule {
	m.mtx.RLock()
	defer m.mtx.RUnlock()

	rules := []Rule{}
	for _, r := range m.rules {
		rules = append(rules, r)
	}

	return rules
}

// TriggeredAlerts returns the list of the manager's rules.
func (m *Manager) TriggeredAlerts() []*ruletypes.NamedAlert {
	// m.mtx.RLock()
	// defer m.mtx.RUnlock()

	namedAlerts := []*ruletypes.NamedAlert{}

	for _, r := range m.rules {
		active := r.ActiveAlerts()

		for _, a := range active {
			awn := &ruletypes.NamedAlert{
				Alert: a,
				Name:  r.Name(),
			}
			namedAlerts = append(namedAlerts, awn)
		}
	}

	return namedAlerts
}

// NotifyFunc sends notifications about a set of alerts generated by the given expression.
type NotifyFunc func(ctx context.Context, orgID string, alerts ...*ruletypes.Alert)

// notifyFunc implements the NotifyFunc for a Notifier.
func (m *Manager) notifyFunc(ctx context.Context, orgID string, alerts ...*ruletypes.Alert) {
	var res []*alertmanagertypes.PostableAlert

	for _, alert := range alerts {
		generatorURL := alert.GeneratorURL

		a := &alertmanagertypes.PostableAlert{
			Annotations: alert.Annotations.Map(),
			StartsAt:    strfmt.DateTime(alert.FiredAt),
			Alert: alertmanagertypes.AlertModel{
				Labels:       alert.Labels.Map(),
				GeneratorURL: strfmt.URI(generatorURL),
			},
		}
		if !alert.ResolvedAt.IsZero() {
			a.EndsAt = strfmt.DateTime(alert.ResolvedAt)
		} else {
			a.EndsAt = strfmt.DateTime(alert.ValidUntil)
		}

		res = append(res, a)
	}

	if len(alerts) > 0 {
		m.alertmanager.PutAlerts(ctx, orgID, res)
	}
}

func (m *Manager) testNotifyFunc(ctx context.Context, orgID string, alerts ...*ruletypes.Alert) {
	if len(alerts) == 0 {
		return
	}
	ruleID := alerts[0].Labels.Map()[ruletypes.AlertRuleIDLabel]
	receiverMap := make(map[*alertmanagertypes.PostableAlert][]string)
	for _, alert := range alerts {
		generatorURL := alert.GeneratorURL

		a := &alertmanagertypes.PostableAlert{}
		a.Annotations = alert.Annotations.Map()
		a.StartsAt = strfmt.DateTime(alert.FiredAt)
		labelsMap := alert.Labels.Map()
		labelsMap[ruletypes.TestAlertLabel] = "true"
		a.Alert = alertmanagertypes.AlertModel{
			Labels:       labelsMap,
			GeneratorURL: strfmt.URI(generatorURL),
		}
		if !alert.ResolvedAt.IsZero() {
			a.EndsAt = strfmt.DateTime(alert.ResolvedAt)
		} else {
			a.EndsAt = strfmt.DateTime(alert.ValidUntil)
		}
		receiverMap[a] = alert.Receivers
	}
	err := m.alertmanager.TestAlert(ctx, orgID, ruleID, receiverMap)
	if err != nil {
		m.logger.ErrorContext(ctx, "failed to send test notification", errors.Attr(err))
	}
}

func (m *Manager) ListActiveRules() ([]Rule, error) {
	ruleList := []Rule{}

	for _, r := range m.rules {
		ruleList = append(ruleList, r)
	}

	return ruleList, nil
}

func (m *Manager) ListRuleStates(ctx context.Context) (*ruletypes.GettableRules, error) {
	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		return nil, err
	}
	// fetch rules from DB
	storedRules, err := m.ruleStore.GetStoredRules(ctx, claims.OrgID)
	if err != nil {
		return nil, err
	}

	// initiate response object
	resp := make([]*ruletypes.GettableRule, 0)

	for _, s := range storedRules {

		ruleResponse := ruletypes.GettableRule{}
		err = json.Unmarshal([]byte(s.Data), &ruleResponse)
		if err != nil {
			m.logger.ErrorContext(ctx, "failed to unmarshal rule from db", slog.String("rule.id", s.ID.StringValue()), errors.Attr(err))
			continue
		}

		ruleResponse.Id = s.ID.StringValue()

		// fetch state of rule from memory
		if rm, ok := m.rules[ruleResponse.Id]; !ok {
			ruleResponse.State = ruletypes.StateDisabled
			ruleResponse.Disabled = true
		} else {
			ruleResponse.State = rm.State()
		}
		ruleResponse.CreatedAt = &s.CreatedAt
		ruleResponse.CreatedBy = &s.CreatedBy
		ruleResponse.UpdatedAt = &s.UpdatedAt
		ruleResponse.UpdatedBy = &s.UpdatedBy
		resp = append(resp, &ruleResponse)
	}

	return &ruletypes.GettableRules{Rules: resp}, nil
}

func (m *Manager) GetRule(ctx context.Context, id valuer.UUID) (*ruletypes.GettableRule, error) {
	s, err := m.ruleStore.GetStoredRule(ctx, id)
	if err != nil {
		return nil, err
	}
	r := ruletypes.GettableRule{}
	err = json.Unmarshal([]byte(s.Data), &r)
	if err != nil {
		m.logger.ErrorContext(ctx, "failed to unmarshal rule from db", slog.String("rule.id", s.ID.StringValue()), errors.Attr(err))
		return nil, err
	}
	r.Id = id.StringValue()
	// fetch state of rule from memory
	if rm, ok := m.rules[r.Id]; !ok {
		r.State = ruletypes.StateDisabled
		r.Disabled = true
	} else {
		r.State = rm.State()
	}
	r.CreatedAt = &s.CreatedAt
	r.CreatedBy = &s.CreatedBy
	r.UpdatedAt = &s.UpdatedAt
	r.UpdatedBy = &s.UpdatedBy

	return &r, nil
}

// syncRuleStateWithTask ensures that the state of a stored rule matches
// the task state. For example - if a stored rule is disabled, then
// there is no task running against it.
func (m *Manager) syncRuleStateWithTask(ctx context.Context, orgID valuer.UUID, taskName string, rule *ruletypes.PostableRule) error {

	if rule.Disabled {
		// check if rule has any task running
		if _, ok := m.tasks[taskName]; ok {
			// delete task from memory
			m.deleteTask(taskName)
		}
	} else {
		// check if rule has a task running
		if _, ok := m.tasks[taskName]; !ok {
			// rule has no task, start one
			if err := m.addTask(ctx, orgID, rule, taskName); err != nil {
				return err
			}
		} else {
			if err := m.editTask(ctx, orgID, rule, taskName); err != nil {
				return err
			}
		}
	}
	return nil
}

// PatchRule supports attribute level changes to the rule definition unlike
// EditRule, which updates entire rule definition in the DB.
// the process:
//   - get the latest rule from db
//   - over write the patch attributes received in input (ruleStr)
//   - re-deploy or undeploy task as necessary
//   - update the patched rule in the DB
func (m *Manager) PatchRule(ctx context.Context, ruleStr string, id valuer.UUID) (*ruletypes.GettableRule, error) {
	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		return nil, err
	}

	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		return nil, err
	}

	taskName := prepareTaskName(id.StringValue())

	// retrieve rule from DB
	storedJSON, err := m.ruleStore.GetStoredRule(ctx, id)
	if err != nil {
		m.logger.ErrorContext(ctx, "failed to get stored rule with given id", slog.String("rule.id", id.StringValue()), errors.Attr(err))
		return nil, err
	}

	storedRule := ruletypes.PostableRule{}
	if err := json.Unmarshal([]byte(storedJSON.Data), &storedRule); err != nil {
		m.logger.ErrorContext(ctx, "failed to unmarshal rule from db", slog.String("rule.id", id.StringValue()), errors.Attr(err))
		return nil, err
	}

	if err := json.Unmarshal([]byte(ruleStr), &storedRule); err != nil {
		m.logger.ErrorContext(ctx, "failed to unmarshal patched rule with given id", slog.String("rule.id", id.StringValue()), errors.Attr(err))
		return nil, err
	}
	if err := storedRule.Validate(); err != nil {
		return nil, err
	}
	if err := m.validateChannels(ctx, claims.OrgID, &storedRule); err != nil {
		return nil, err
	}
	// deploy or un-deploy task according to patched (new) rule state
	if err := m.syncRuleStateWithTask(ctx, orgID, taskName, &storedRule); err != nil {
		m.logger.ErrorContext(ctx, "failed to sync stored rule state with the task", slog.String("task.name", taskName), errors.Attr(err))
		return nil, err
	}

	newStoredJson, err := json.Marshal(&storedRule)
	if err != nil {
		m.logger.ErrorContext(ctx, "failed to marshal new stored rule with given id", slog.String("rule.id", id.StringValue()), errors.Attr(err))
		return nil, err
	}

	now := time.Now()
	storedJSON.Data = string(newStoredJson)
	storedJSON.UpdatedBy = claims.Email
	storedJSON.UpdatedAt = now

	err = m.ruleStore.EditRule(ctx, storedJSON, func(ctx context.Context) error { return nil })
	if err != nil {
		if err := m.syncRuleStateWithTask(ctx, orgID, taskName, &storedRule); err != nil {
			m.logger.ErrorContext(ctx, "failed to restore rule after patch failure", "task_name", taskName, errors.Attr(err))
		}
		return nil, err
	}

	// prepare http response
	response := ruletypes.GettableRule{
		Id:           id.StringValue(),
		PostableRule: storedRule,
	}

	// fetch state of rule from memory
	if rm, ok := m.rules[id.StringValue()]; !ok {
		response.State = ruletypes.StateDisabled
		response.Disabled = true
	} else {
		response.State = rm.State()
	}

	return &response, nil
}

// TestNotification prepares a dummy rule for given rule parameters and
// sends a test notification. returns alert count and error (if any)
func (m *Manager) TestNotification(ctx context.Context, orgID valuer.UUID, ruleStr string) (int, error) {
	parsedRule := ruletypes.PostableRule{}
	err := json.Unmarshal([]byte(ruleStr), &parsedRule)
	if err != nil {
		return 0, errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "failed to unmarshal rule")
	}
	if err := parsedRule.Validate(); err != nil {
		return 0, err
	}
	if err := m.validateChannels(ctx, orgID.StringValue(), &parsedRule); err != nil {
		return 0, err
	}
	if !parsedRule.NotificationSettings.UsePolicy {
		parsedRule.NotificationSettings.GroupBy = append(parsedRule.NotificationSettings.GroupBy, ruletypes.LabelThresholdName)
	}
	config := parsedRule.NotificationSettings.GetAlertManagerNotificationConfig()
	err = m.alertmanager.SetNotificationConfig(ctx, orgID, parsedRule.AlertName, &config)
	if err != nil {
		return 0, err
	}

	alertCount, err := m.prepareTestRuleFunc(PrepareTestRuleOptions{
		Rule:             &parsedRule,
		RuleStore:        m.ruleStore,
		MaintenanceStore: m.maintenanceStore,
		Querier:          m.opts.Querier,
		Logger:           m.opts.Logger,
		Cache:            m.cache,
		ManagerOpts:      m.opts,
		NotifyFunc:       m.testNotifyFunc,
		SQLStore:         m.sqlstore,
		OrgID:            orgID,
	})

	return alertCount, err
}

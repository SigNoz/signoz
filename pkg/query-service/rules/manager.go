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

	"github.com/SigNoz/signoz/pkg/query-service/utils/labels"

	"go.uber.org/zap"

	"github.com/go-openapi/strfmt"

	"github.com/SigNoz/signoz/pkg/alertmanager"
	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/prometheus"
	querierV5 "github.com/SigNoz/signoz/pkg/querier"
	"github.com/SigNoz/signoz/pkg/query-service/interfaces"
	"github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	ruletypes "github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type PrepareTaskOptions struct {
	Rule             *ruletypes.PostableRule
	TaskName         string
	RuleStore        ruletypes.RuleStore
	MaintenanceStore ruletypes.MaintenanceStore
	Logger           *zap.Logger
	Reader           interfaces.Reader
	Querier          querierV5.Querier
	SLogger          *slog.Logger
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
	Logger           *zap.Logger
	Reader           interfaces.Reader
	Querier          querierV5.Querier
	SLogger          *slog.Logger
	Cache            cache.Cache
	ManagerOpts      *ManagerOptions
	NotifyFunc       NotifyFunc
	SQLStore         sqlstore.SQLStore
	OrgID            valuer.UUID
}

const taskNamesuffix = "webAppEditor"

func RuleIdFromTaskName(n string) string {
	return strings.Split(n, "-groupname")[0]
}

func prepareTaskName(ruleId interface{}) string {
	switch ruleId.(type) {
	case int, int64:
		return fmt.Sprintf("%d-groupname", ruleId)
	case string:
		return fmt.Sprintf("%s-groupname", ruleId)
	default:
		return fmt.Sprintf("%v-groupname", ruleId)
	}
}

// ManagerOptions bundles options for the Manager.
type ManagerOptions struct {
	TelemetryStore telemetrystore.TelemetryStore
	Prometheus     prometheus.Prometheus

	Context     context.Context
	Logger      *zap.Logger
	ResendDelay time.Duration
	Reader      interfaces.Reader
	Querier     querierV5.Querier
	SLogger     *slog.Logger
	Cache       cache.Cache

	EvalDelay time.Duration

	PrepareTaskFunc     func(opts PrepareTaskOptions) (Task, error)
	PrepareTestRuleFunc func(opts PrepareTestRuleOptions) (int, *model.ApiError)
	Alertmanager        alertmanager.Alertmanager
	OrgGetter           organization.Getter
	RuleStore           ruletypes.RuleStore
	MaintenanceStore    ruletypes.MaintenanceStore
	SqlStore            sqlstore.SQLStore
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

	logger              *zap.Logger
	reader              interfaces.Reader
	cache               cache.Cache
	prepareTaskFunc     func(opts PrepareTaskOptions) (Task, error)
	prepareTestRuleFunc func(opts PrepareTestRuleOptions) (int, *model.ApiError)

	alertmanager alertmanager.Alertmanager
	sqlstore     sqlstore.SQLStore
	orgGetter    organization.Getter
}

func defaultOptions(o *ManagerOptions) *ManagerOptions {
	if o.ResendDelay == time.Duration(0) {
		o.ResendDelay = 1 * time.Minute
	}
	if o.Logger == nil {
		o.Logger = zap.L()
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

	ruleId := RuleIdFromTaskName(opts.TaskName)

	evaluation, err := opts.Rule.Evaluation.GetEvaluation()
	if err != nil {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "evaluation is invalid: %v", err)
	}

	if opts.Rule.RuleType == ruletypes.RuleTypeThreshold {
		// create a threshold rule
		tr, err := NewThresholdRule(
			ruleId,
			opts.OrgID,
			opts.Rule,
			opts.Reader,
			opts.Querier,
			opts.SLogger,
			WithEvalDelay(opts.ManagerOpts.EvalDelay),
			WithSQLStore(opts.SQLStore),
		)

		if err != nil {
			return task, err
		}

		rules = append(rules, tr)

		// create ch rule task for evalution
		task = newTask(TaskTypeCh, opts.TaskName, taskNamesuffix, time.Duration(evaluation.GetFrequency()), rules, opts.ManagerOpts, opts.NotifyFunc, opts.MaintenanceStore, opts.OrgID)

	} else if opts.Rule.RuleType == ruletypes.RuleTypeProm {

		// create promql rule
		pr, err := NewPromRule(
			ruleId,
			opts.OrgID,
			opts.Rule,
			opts.SLogger,
			opts.Reader,
			opts.ManagerOpts.Prometheus,
			WithSQLStore(opts.SQLStore),
		)

		if err != nil {
			return task, err
		}

		rules = append(rules, pr)

		// create promql rule task for evalution
		task = newTask(TaskTypeProm, opts.TaskName, taskNamesuffix, time.Duration(evaluation.GetFrequency()), rules, opts.ManagerOpts, opts.NotifyFunc, opts.MaintenanceStore, opts.OrgID)

	} else {
		return nil, fmt.Errorf("unsupported rule type %s. Supported types: %s, %s", opts.Rule.RuleType, ruletypes.RuleTypeProm, ruletypes.RuleTypeThreshold)
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
		reader:              o.Reader,
		cache:               o.Cache,
		prepareTaskFunc:     o.PrepareTaskFunc,
		prepareTestRuleFunc: o.PrepareTestRuleFunc,
		alertmanager:        o.Alertmanager,
		orgGetter:           o.OrgGetter,
		sqlstore:            o.SqlStore,
	}

	zap.L().Debug("Manager created successfully with NotificationGroup")
	return m, nil
}

func (m *Manager) Start(ctx context.Context) {
	if err := m.initiate(ctx); err != nil {
		zap.L().Error("failed to initialize alerting rules manager", zap.Error(err))
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
				zap.L().Info("failed to load rule in json format", zap.String("name", taskName))
				loadErrors = append(loadErrors, err)
				continue
			}
			if parsedRule.NotificationSettings != nil {
				config := parsedRule.NotificationSettings.GetAlertManagerNotificationConfig()
				err = m.alertmanager.SetNotificationConfig(ctx, org.ID, rec.ID.StringValue(), &config)
				if err != nil {
					loadErrors = append(loadErrors, err)
					zap.L().Info("failed to set rule notification config", zap.String("ruleId", rec.ID.StringValue()))
				}
			}
			if !parsedRule.Disabled {
				err := m.addTask(ctx, org.ID, &parsedRule, taskName)
				if err != nil {
					zap.L().Error("failed to load the rule definition", zap.String("name", taskName), zap.Error(err))
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
func (m *Manager) Stop(ctx context.Context) {
	m.mtx.Lock()
	defer m.mtx.Unlock()

	zap.L().Info("Stopping rule manager...")

	for _, t := range m.tasks {
		t.Stop()
	}

	zap.L().Info("Rule manager stopped")
}

// EditRuleDefinition writes the rule definition to the
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

	zap.L().Debug("editing a rule task", zap.String("name", taskName))

	newTask, err := m.prepareTaskFunc(PrepareTaskOptions{
		Rule:             rule,
		TaskName:         taskName,
		RuleStore:        m.ruleStore,
		MaintenanceStore: m.maintenanceStore,
		Logger:           m.logger,
		Reader:           m.reader,
		Querier:          m.opts.Querier,
		SLogger:          m.opts.SLogger,
		Cache:            m.cache,
		ManagerOpts:      m.opts,
		NotifyFunc:       m.prepareNotifyFunc(),
		SQLStore:         m.sqlstore,
		OrgID:            orgID,
	})

	if err != nil {
		zap.L().Error("loading tasks failed", zap.Error(err))
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "error preparing rule with given parameters, previous rule set restored")
	}

	for _, r := range newTask.Rules() {
		m.rules[r.ID()] = r
	}

	// If there is an old task with the same identifier, stop it and wait for
	// it to finish the current iteration. Then copy it into the new group.
	oldTask, ok := m.tasks[taskName]
	if !ok {
		zap.L().Warn("rule task not found, a new task will be created", zap.String("name", taskName))
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
		zap.L().Error("delete rule received an rule id in invalid format, must be a valid uuid-v7", zap.String("id", idStr), zap.Error(err))
		return fmt.Errorf("delete rule received an rule id in invalid format, must be a valid uuid-v7")
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
	zap.L().Debug("deleting a rule task", zap.String("name", taskName))

	oldg, ok := m.tasks[taskName]
	if ok {
		oldg.Stop()
		delete(m.tasks, taskName)
		delete(m.rules, RuleIdFromTaskName(taskName))
		zap.L().Debug("rule task deleted", zap.String("name", taskName))
	} else {
		zap.L().Info("rule not found for deletion", zap.String("name", taskName))
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

	zap.L().Debug("adding a new rule task", zap.String("name", taskName))
	newTask, err := m.prepareTaskFunc(PrepareTaskOptions{
		Rule:             rule,
		TaskName:         taskName,
		RuleStore:        m.ruleStore,
		MaintenanceStore: m.maintenanceStore,
		Logger:           m.logger,
		Reader:           m.reader,
		Querier:          m.opts.Querier,
		SLogger:          m.opts.SLogger,
		Cache:            m.cache,
		ManagerOpts:      m.opts,
		NotifyFunc:       m.prepareNotifyFunc(),
		SQLStore:         m.sqlstore,
		OrgID:            orgID,
	})

	if err != nil {
		zap.L().Error("creating rule task failed", zap.String("name", taskName), zap.Error(err))
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "error loading rules, previous rule set restored")
	}

	for _, r := range newTask.Rules() {
		m.rules[r.ID()] = r
	}

	// If there is an another task with the same identifier, raise an error
	_, ok := m.tasks[taskName]
	if ok {
		return fmt.Errorf("a rule with the same name already exists")
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

// RuleTasks returns the list of manager's rule tasks.
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
type NotifyFunc func(ctx context.Context, orgID string, expr string, alerts ...*ruletypes.Alert)

// prepareNotifyFunc implements the NotifyFunc for a Notifier.
func (m *Manager) prepareNotifyFunc() NotifyFunc {
	return func(ctx context.Context, orgID string, expr string, alerts ...*ruletypes.Alert) {
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
}

func (m *Manager) prepareTestNotifyFunc() NotifyFunc {
	return func(ctx context.Context, orgID string, expr string, alerts ...*ruletypes.Alert) {
		if len(alerts) == 0 {
			return
		}
		ruleID := alerts[0].Labels.Map()[labels.AlertRuleIdLabel]
		receiverMap := make(map[*alertmanagertypes.PostableAlert][]string)
		for _, alert := range alerts {
			generatorURL := alert.GeneratorURL

			a := &alertmanagertypes.PostableAlert{}
			a.Annotations = alert.Annotations.Map()
			a.StartsAt = strfmt.DateTime(alert.FiredAt)
			a.Alert = alertmanagertypes.AlertModel{
				Labels:       alert.Labels.Map(),
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
			zap.L().Error("failed to send test notification", zap.Error(err))
			return
		}
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
			zap.L().Error("failed to unmarshal rule from db", zap.String("id", s.ID.StringValue()), zap.Error(err))
			continue
		}

		ruleResponse.Id = s.ID.StringValue()

		// fetch state of rule from memory
		if rm, ok := m.rules[ruleResponse.Id]; !ok {
			ruleResponse.State = model.StateDisabled
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
		zap.L().Error("failed to unmarshal rule from db", zap.String("id", s.ID.StringValue()), zap.Error(err))
		return nil, err
	}
	r.Id = id.StringValue()
	// fetch state of rule from memory
	if rm, ok := m.rules[r.Id]; !ok {
		r.State = model.StateDisabled
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
			// rule has not task, start one
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
		zap.L().Error("failed to get stored rule with given id", zap.String("id", id.StringValue()), zap.Error(err))
		return nil, err
	}

	storedRule := ruletypes.PostableRule{}
	if err := json.Unmarshal([]byte(storedJSON.Data), &storedRule); err != nil {
		zap.L().Error("failed to unmarshal rule from db", zap.String("id", id.StringValue()), zap.Error(err))
		return nil, err
	}

	if err := json.Unmarshal([]byte(ruleStr), &storedRule); err != nil {
		zap.L().Error("failed to unmarshal patched rule with given id", zap.String("id", id.StringValue()), zap.Error(err))
		return nil, err
	}

	// deploy or un-deploy task according to patched (new) rule state
	if err := m.syncRuleStateWithTask(ctx, orgID, taskName, &storedRule); err != nil {
		zap.L().Error("failed to sync stored rule state with the task", zap.String("taskName", taskName), zap.Error(err))
		return nil, err
	}

	newStoredJson, err := json.Marshal(&storedRule)
	if err != nil {
		zap.L().Error("failed to marshal new stored rule with given id", zap.String("id", id.StringValue()), zap.Error(err))
		return nil, err
	}

	now := time.Now()
	storedJSON.Data = string(newStoredJson)
	storedJSON.UpdatedBy = claims.Email
	storedJSON.UpdatedAt = now

	err = m.ruleStore.EditRule(ctx, storedJSON, func(ctx context.Context) error { return nil })
	if err != nil {
		if err := m.syncRuleStateWithTask(ctx, orgID, taskName, &storedRule); err != nil {
			zap.L().Error("failed to restore rule after patch failure", zap.String("taskName", taskName), zap.Error(err))
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
		response.State = model.StateDisabled
		response.Disabled = true
	} else {
		response.State = rm.State()
	}

	return &response, nil
}

// TestNotification prepares a dummy rule for given rule parameters and
// sends a test notification. returns alert count and error (if any)
func (m *Manager) TestNotification(ctx context.Context, orgID valuer.UUID, ruleStr string) (int, *model.ApiError) {
	parsedRule := ruletypes.PostableRule{}
	err := json.Unmarshal([]byte(ruleStr), &parsedRule)
	if err != nil {
		return 0, model.BadRequest(err)
	}
	if !parsedRule.NotificationSettings.UsePolicy {
		parsedRule.NotificationSettings.GroupBy = append(parsedRule.NotificationSettings.GroupBy, ruletypes.LabelThresholdName)
	}
	config := parsedRule.NotificationSettings.GetAlertManagerNotificationConfig()
	err = m.alertmanager.SetNotificationConfig(ctx, orgID, parsedRule.AlertName, &config)
	if err != nil {
		return 0, &model.ApiError{
			Typ: model.ErrorBadData,
			Err: err,
		}
	}

	alertCount, apiErr := m.prepareTestRuleFunc(PrepareTestRuleOptions{
		Rule:             &parsedRule,
		RuleStore:        m.ruleStore,
		MaintenanceStore: m.maintenanceStore,
		Logger:           m.logger,
		SLogger:          m.opts.SLogger,
		Reader:           m.reader,
		Querier:          m.opts.Querier,
		Cache:            m.cache,
		ManagerOpts:      m.opts,
		NotifyFunc:       m.prepareTestNotifyFunc(),
		SQLStore:         m.sqlstore,
		OrgID:            orgID,
	})

	return alertCount, apiErr
}

func (m *Manager) GetAlertDetailsForMetricNames(ctx context.Context, metricNames []string) (map[string][]ruletypes.GettableRule, *model.ApiError) {
	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: err}
	}

	result := make(map[string][]ruletypes.GettableRule)
	rules, err := m.ruleStore.GetStoredRules(ctx, claims.OrgID)
	if err != nil {
		zap.L().Error("Error getting stored rules", zap.Error(err))
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: err}
	}

	metricRulesMap := make(map[string][]ruletypes.GettableRule)

	for _, storedRule := range rules {
		var rule ruletypes.GettableRule
		err = json.Unmarshal([]byte(storedRule.Data), &rule)
		if err != nil {
			zap.L().Error("failed to unmarshal rule from db", zap.String("id", storedRule.ID.StringValue()), zap.Error(err))
			continue
		}

		if rule.AlertType != ruletypes.AlertTypeMetric || rule.RuleCondition == nil || rule.RuleCondition.CompositeQuery == nil {
			continue
		}
		rule.Id = storedRule.ID.StringValue()
		rule.CreatedAt = &storedRule.CreatedAt
		rule.CreatedBy = &storedRule.CreatedBy
		rule.UpdatedAt = &storedRule.UpdatedAt
		rule.UpdatedBy = &storedRule.UpdatedBy

		for _, query := range rule.RuleCondition.CompositeQuery.BuilderQueries {
			if query.AggregateAttribute.Key != "" {
				metricRulesMap[query.AggregateAttribute.Key] = append(metricRulesMap[query.AggregateAttribute.Key], rule)
			}
		}

		for _, query := range rule.RuleCondition.CompositeQuery.PromQueries {
			if query.Query != "" {
				for _, metricName := range metricNames {
					if strings.Contains(query.Query, metricName) {
						metricRulesMap[metricName] = append(metricRulesMap[metricName], rule)
					}
				}
			}
		}

		for _, query := range rule.RuleCondition.CompositeQuery.ClickHouseQueries {
			if query.Query != "" {
				for _, metricName := range metricNames {
					if strings.Contains(query.Query, metricName) {
						metricRulesMap[metricName] = append(metricRulesMap[metricName], rule)
					}
				}
			}
		}
	}

	for _, metricName := range metricNames {
		if rules, exists := metricRulesMap[metricName]; exists {
			seen := make(map[string]bool)
			uniqueRules := make([]ruletypes.GettableRule, 0)

			for _, rule := range rules {
				if !seen[rule.Id] {
					seen[rule.Id] = true
					uniqueRules = append(uniqueRules, rule)
				}
			}

			result[metricName] = uniqueRules
		}
	}

	return result, nil
}

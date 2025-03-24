package rules

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"go.uber.org/zap"

	"errors"

	"github.com/go-openapi/strfmt"
	"github.com/jmoiron/sqlx"

	"github.com/SigNoz/signoz/pkg/alertmanager"
	"github.com/SigNoz/signoz/pkg/query-service/cache"
	"github.com/SigNoz/signoz/pkg/query-service/interfaces"
	"github.com/SigNoz/signoz/pkg/query-service/model"
	pqle "github.com/SigNoz/signoz/pkg/query-service/pqlEngine"
	"github.com/SigNoz/signoz/pkg/query-service/telemetry"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
)

type PrepareTaskOptions struct {
	Rule              *PostableRule
	TaskName          string
	RuleDB            RuleDB
	Logger            *zap.Logger
	Reader            interfaces.Reader
	Cache             cache.Cache
	FF                interfaces.FeatureLookup
	ManagerOpts       *ManagerOptions
	NotifyFunc        NotifyFunc
	SQLStore          sqlstore.SQLStore
	UseLogsNewSchema  bool
	UseTraceNewSchema bool
}

type PrepareTestRuleOptions struct {
	Rule              *PostableRule
	RuleDB            RuleDB
	Logger            *zap.Logger
	Reader            interfaces.Reader
	Cache             cache.Cache
	FF                interfaces.FeatureLookup
	ManagerOpts       *ManagerOptions
	NotifyFunc        NotifyFunc
	SQLStore          sqlstore.SQLStore
	UseLogsNewSchema  bool
	UseTraceNewSchema bool
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
	PqlEngine *pqle.PqlEngine

	// RepoURL is used to generate a backlink in sent alert messages
	RepoURL string

	// rule db conn
	DBConn *sqlx.DB

	Context      context.Context
	Logger       *zap.Logger
	ResendDelay  time.Duration
	DisableRules bool
	FeatureFlags interfaces.FeatureLookup
	Reader       interfaces.Reader
	Cache        cache.Cache

	EvalDelay time.Duration

	PrepareTaskFunc func(opts PrepareTaskOptions) (Task, error)

	UseLogsNewSchema    bool
	UseTraceNewSchema   bool
	PrepareTestRuleFunc func(opts PrepareTestRuleOptions) (int, *model.ApiError)
	Alertmanager        alertmanager.Alertmanager
	SQLStore            sqlstore.SQLStore
}

// The Manager manages recording and alerting rules.
type Manager struct {
	opts  *ManagerOptions
	tasks map[string]Task
	rules map[string]Rule
	mtx   sync.RWMutex
	block chan struct{}
	// datastore to store alert definitions
	ruleDB RuleDB

	logger *zap.Logger

	featureFlags        interfaces.FeatureLookup
	reader              interfaces.Reader
	cache               cache.Cache
	prepareTaskFunc     func(opts PrepareTaskOptions) (Task, error)
	prepareTestRuleFunc func(opts PrepareTestRuleOptions) (int, *model.ApiError)

	UseLogsNewSchema  bool
	UseTraceNewSchema bool

	alertmanager alertmanager.Alertmanager
	sqlstore     sqlstore.SQLStore
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
	if opts.Rule.RuleType == RuleTypeThreshold {
		// create a threshold rule
		tr, err := NewThresholdRule(
			ruleId,
			opts.Rule,
			opts.FF,
			opts.Reader,
			opts.UseLogsNewSchema,
			opts.UseTraceNewSchema,
			WithEvalDelay(opts.ManagerOpts.EvalDelay),
			WithSQLStore(opts.SQLStore),
		)

		if err != nil {
			return task, err
		}

		rules = append(rules, tr)

		// create ch rule task for evalution
		task = newTask(TaskTypeCh, opts.TaskName, taskNamesuffix, time.Duration(opts.Rule.Frequency), rules, opts.ManagerOpts, opts.NotifyFunc, opts.RuleDB)

	} else if opts.Rule.RuleType == RuleTypeProm {

		// create promql rule
		pr, err := NewPromRule(
			ruleId,
			opts.Rule,
			opts.Logger,
			opts.Reader,
			opts.ManagerOpts.PqlEngine,
			WithSQLStore(opts.SQLStore),
		)

		if err != nil {
			return task, err
		}

		rules = append(rules, pr)

		// create promql rule task for evalution
		task = newTask(TaskTypeProm, opts.TaskName, taskNamesuffix, time.Duration(opts.Rule.Frequency), rules, opts.ManagerOpts, opts.NotifyFunc, opts.RuleDB)

	} else {
		return nil, fmt.Errorf("unsupported rule type %s. Supported types: %s, %s", opts.Rule.RuleType, RuleTypeProm, RuleTypeThreshold)
	}

	return task, nil
}

// NewManager returns an implementation of Manager, ready to be started
// by calling the Run method.
func NewManager(o *ManagerOptions) (*Manager, error) {
	o = defaultOptions(o)
	db := NewRuleDB(o.DBConn, o.SQLStore)
	telemetry.GetInstance().SetAlertsInfoCallback(db.GetAlertsInfo)
	m := &Manager{
		tasks:               map[string]Task{},
		rules:               map[string]Rule{},
		ruleDB:              db,
		opts:                o,
		block:               make(chan struct{}),
		logger:              o.Logger,
		featureFlags:        o.FeatureFlags,
		reader:              o.Reader,
		cache:               o.Cache,
		prepareTaskFunc:     o.PrepareTaskFunc,
		prepareTestRuleFunc: o.PrepareTestRuleFunc,
		alertmanager:        o.Alertmanager,
		sqlstore:            o.SQLStore,
	}

	return m, nil
}

func (m *Manager) Start() {
	if err := m.initiate(); err != nil {
		zap.L().Error("failed to initialize alerting rules manager", zap.Error(err))
	}
	m.run()
}

func (m *Manager) RuleDB() RuleDB {
	return m.ruleDB
}

func (m *Manager) Pause(b bool) {
	m.mtx.Lock()
	defer m.mtx.Unlock()
	for _, t := range m.tasks {
		t.Pause(b)
	}
}

func (m *Manager) initiate() error {
	storedRules, err := m.ruleDB.GetStoredRules(context.Background())
	if err != nil {
		return err
	}
	if len(storedRules) == 0 {
		return nil
	}
	var loadErrors []error

	for _, rec := range storedRules {
		taskName := fmt.Sprintf("%d-groupname", rec.Id)
		parsedRule, err := ParsePostableRule([]byte(rec.Data))

		if err != nil {
			if errors.Is(err, ErrFailedToParseJSON) {
				zap.L().Info("failed to load rule in json format, trying yaml now:", zap.String("name", taskName))

				// see if rule is stored in yaml format
				parsedRule, err = parsePostableRule([]byte(rec.Data), RuleDataKindYaml)

				if err != nil {
					zap.L().Error("failed to parse and initialize yaml rule", zap.String("name", taskName), zap.Error(err))
					// just one rule is being parsed so expect just one error
					loadErrors = append(loadErrors, err)
					continue
				}
			} else {
				zap.L().Error("failed to parse and initialize rule", zap.String("name", taskName), zap.Error(err))
				// just one rule is being parsed so expect just one error
				loadErrors = append(loadErrors, err)
				continue
			}
		}
		if !parsedRule.Disabled {
			err := m.addTask(parsedRule, taskName)
			if err != nil {
				zap.L().Error("failed to load the rule definition", zap.String("name", taskName), zap.Error(err))
			}
		}
	}

	if len(loadErrors) > 0 {
		return errors.Join(loadErrors...)
	}

	return nil
}

// Run starts processing of the rule manager.
func (m *Manager) run() {
	// initiate blocked tasks
	close(m.block)
}

// Stop the rule manager's rule evaluation cycles.
func (m *Manager) Stop() {
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
func (m *Manager) EditRule(ctx context.Context, ruleStr string, id string) error {
	claims, ok := authtypes.ClaimsFromContext(ctx)
	if !ok {
		return errors.New("claims not found in context")
	}

	parsedRule, err := ParsePostableRule([]byte(ruleStr))
	if err != nil {
		return err
	}

	existingRule, err := m.ruleDB.GetStoredRule(ctx, id)
	if err != nil {
		return err
	}

	now := time.Now()
	existingRule.UpdatedAt = &now
	existingRule.UpdatedBy = &claims.Email
	existingRule.Data = ruleStr

	return m.ruleDB.EditRule(ctx, existingRule, func(ctx context.Context) error {
		cfg, err := m.alertmanager.GetConfig(ctx, claims.OrgID)
		if err != nil {
			return err
		}

		var preferredChannels []string
		if len(parsedRule.PreferredChannels) == 0 {
			channels, err := m.alertmanager.ListChannels(ctx, claims.OrgID)
			if err != nil {
				return err
			}

			for _, channel := range channels {
				preferredChannels = append(preferredChannels, channel.Name)
			}
		} else {
			preferredChannels = parsedRule.PreferredChannels
		}

		err = cfg.UpdateRuleIDMatcher(id, preferredChannels)
		if err != nil {
			return err
		}

		err = m.alertmanager.SetConfig(ctx, cfg)
		if err != nil {
			return err
		}

		if !m.opts.DisableRules {
			err = m.syncRuleStateWithTask(prepareTaskName(existingRule.Id), parsedRule)
			if err != nil {
				return err
			}
		}

		return nil
	})
}

func (m *Manager) editTask(rule *PostableRule, taskName string) error {
	m.mtx.Lock()
	defer m.mtx.Unlock()

	zap.L().Debug("editing a rule task", zap.String("name", taskName))

	newTask, err := m.prepareTaskFunc(PrepareTaskOptions{
		Rule:        rule,
		TaskName:    taskName,
		RuleDB:      m.ruleDB,
		Logger:      m.logger,
		Reader:      m.reader,
		Cache:       m.cache,
		FF:          m.featureFlags,
		ManagerOpts: m.opts,
		NotifyFunc:  m.prepareNotifyFunc(),
		SQLStore:    m.sqlstore,

		UseLogsNewSchema:  m.opts.UseLogsNewSchema,
		UseTraceNewSchema: m.opts.UseTraceNewSchema,
	})

	if err != nil {
		zap.L().Error("loading tasks failed", zap.Error(err))
		return errors.New("error preparing rule with given parameters, previous rule set restored")
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

func (m *Manager) DeleteRule(ctx context.Context, id string) error {
	_, err := strconv.Atoi(id)
	if err != nil {
		zap.L().Error("delete rule received an rule id in invalid format, must be a number", zap.String("id", id), zap.Error(err))
		return fmt.Errorf("delete rule received an rule id in invalid format, must be a number")
	}

	claims, ok := authtypes.ClaimsFromContext(ctx)
	if !ok {
		return errors.New("claims not found in context")
	}

	_, err = m.ruleDB.GetStoredRule(ctx, id)
	if err != nil {
		return err
	}

	return m.ruleDB.DeleteRule(ctx, id, func(ctx context.Context) error {
		cfg, err := m.alertmanager.GetConfig(ctx, claims.OrgID)
		if err != nil {
			return err
		}

		err = cfg.DeleteRuleIDMatcher(id)
		if err != nil {
			return err
		}

		err = m.alertmanager.SetConfig(ctx, cfg)
		if err != nil {
			return err
		}

		taskName := prepareTaskName(id)
		if !m.opts.DisableRules {
			m.deleteTask(taskName)
		}

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
func (m *Manager) CreateRule(ctx context.Context, ruleStr string) (*GettableRule, error) {
	parsedRule, err := ParsePostableRule([]byte(ruleStr))
	if err != nil {
		return nil, err
	}

	claims, ok := authtypes.ClaimsFromContext(ctx)
	if !ok {
		return nil, errors.New("claims not found in context")
	}

	now := time.Now()
	storedRule := &StoredRule{
		CreatedAt: &now,
		CreatedBy: &claims.Email,
		UpdatedAt: &now,
		UpdatedBy: &claims.Email,
		Data:      ruleStr,
	}

	id, err := m.ruleDB.CreateRule(ctx, storedRule, func(ctx context.Context, id int64) error {
		cfg, err := m.alertmanager.GetConfig(ctx, claims.OrgID)
		if err != nil {
			return err
		}

		var preferredChannels []string
		if len(parsedRule.PreferredChannels) == 0 {
			channels, err := m.alertmanager.ListChannels(ctx, claims.OrgID)
			if err != nil {
				return err
			}

			for _, channel := range channels {
				preferredChannels = append(preferredChannels, channel.Name)
			}
		} else {
			preferredChannels = parsedRule.PreferredChannels
		}

		err = cfg.CreateRuleIDMatcher(fmt.Sprintf("%d", id), preferredChannels)
		if err != nil {
			return err
		}

		err = m.alertmanager.SetConfig(ctx, cfg)
		if err != nil {
			return err
		}

		taskName := prepareTaskName(id)
		if !m.opts.DisableRules {
			if err := m.addTask(parsedRule, taskName); err != nil {
				return err
			}
		}

		return nil
	})
	if err != nil {
		return nil, err
	}

	return &GettableRule{
		Id:           fmt.Sprintf("%d", id),
		PostableRule: *parsedRule,
	}, nil
}

func (m *Manager) addTask(rule *PostableRule, taskName string) error {
	m.mtx.Lock()
	defer m.mtx.Unlock()

	zap.L().Debug("adding a new rule task", zap.String("name", taskName))
	newTask, err := m.prepareTaskFunc(PrepareTaskOptions{
		Rule:        rule,
		TaskName:    taskName,
		RuleDB:      m.ruleDB,
		Logger:      m.logger,
		Reader:      m.reader,
		Cache:       m.cache,
		FF:          m.featureFlags,
		ManagerOpts: m.opts,
		NotifyFunc:  m.prepareNotifyFunc(),
		SQLStore:    m.sqlstore,

		UseLogsNewSchema:  m.opts.UseLogsNewSchema,
		UseTraceNewSchema: m.opts.UseTraceNewSchema,
	})

	if err != nil {
		zap.L().Error("creating rule task failed", zap.String("name", taskName), zap.Error(err))
		return errors.New("error loading rules, previous rule set restored")
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
func (m *Manager) TriggeredAlerts() []*NamedAlert {
	// m.mtx.RLock()
	// defer m.mtx.RUnlock()

	namedAlerts := []*NamedAlert{}

	for _, r := range m.rules {
		active := r.ActiveAlerts()

		for _, a := range active {
			awn := &NamedAlert{
				Alert: a,
				Name:  r.Name(),
			}
			namedAlerts = append(namedAlerts, awn)
		}
	}

	return namedAlerts
}

// NotifyFunc sends notifications about a set of alerts generated by the given expression.
type NotifyFunc func(ctx context.Context, orgID string, expr string, alerts ...*Alert)

// prepareNotifyFunc implements the NotifyFunc for a Notifier.
func (m *Manager) prepareNotifyFunc() NotifyFunc {
	return func(ctx context.Context, orgID string, expr string, alerts ...*Alert) {
		var res []*alertmanagertypes.PostableAlert

		for _, alert := range alerts {
			generatorURL := alert.GeneratorURL
			if generatorURL == "" {
				generatorURL = m.opts.RepoURL
			}

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
	return func(ctx context.Context, orgID string, expr string, alerts ...*Alert) {
		if len(alerts) == 0 {
			return
		}

		alert := alerts[0]
		generatorURL := alert.GeneratorURL
		if generatorURL == "" {
			generatorURL = m.opts.RepoURL
		}

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

		if len(alert.Receivers) == 0 {
			channels, err := m.alertmanager.ListChannels(ctx, orgID)
			if err != nil {
				zap.L().Error("failed to list channels while sending test notification", zap.Error(err))
				return
			}

			for _, channel := range channels {
				alert.Receivers = append(alert.Receivers, channel.Name)
			}
		}

		m.alertmanager.TestAlert(ctx, orgID, a, alert.Receivers)
	}
}

func (m *Manager) ListActiveRules() ([]Rule, error) {
	ruleList := []Rule{}

	for _, r := range m.rules {
		ruleList = append(ruleList, r)
	}

	return ruleList, nil
}

func (m *Manager) ListRuleStates(ctx context.Context) (*GettableRules, error) {

	// fetch rules from DB
	storedRules, err := m.ruleDB.GetStoredRules(ctx)
	if err != nil {
		return nil, err
	}

	// initiate response object
	resp := make([]*GettableRule, 0)

	for _, s := range storedRules {

		ruleResponse := &GettableRule{}
		if err := json.Unmarshal([]byte(s.Data), ruleResponse); err != nil { // Parse []byte to go struct pointer
			zap.L().Error("failed to unmarshal rule from db", zap.Int("id", s.Id), zap.Error(err))
			continue
		}

		ruleResponse.Id = fmt.Sprintf("%d", s.Id)

		// fetch state of rule from memory
		if rm, ok := m.rules[ruleResponse.Id]; !ok {
			ruleResponse.State = model.StateDisabled
			ruleResponse.Disabled = true
		} else {
			ruleResponse.State = rm.State()
		}
		ruleResponse.CreatedAt = s.CreatedAt
		ruleResponse.CreatedBy = s.CreatedBy
		ruleResponse.UpdatedAt = s.UpdatedAt
		ruleResponse.UpdatedBy = s.UpdatedBy
		resp = append(resp, ruleResponse)
	}

	return &GettableRules{Rules: resp}, nil
}

func (m *Manager) GetRule(ctx context.Context, id string) (*GettableRule, error) {
	s, err := m.ruleDB.GetStoredRule(ctx, id)
	if err != nil {
		return nil, err
	}
	r := &GettableRule{}
	if err := json.Unmarshal([]byte(s.Data), r); err != nil {
		return nil, err
	}
	r.Id = fmt.Sprintf("%d", s.Id)
	// fetch state of rule from memory
	if rm, ok := m.rules[r.Id]; !ok {
		r.State = model.StateDisabled
		r.Disabled = true
	} else {
		r.State = rm.State()
	}
	r.CreatedAt = s.CreatedAt
	r.CreatedBy = s.CreatedBy
	r.UpdatedAt = s.UpdatedAt
	r.UpdatedBy = s.UpdatedBy

	return r, nil
}

// syncRuleStateWithTask ensures that the state of a stored rule matches
// the task state. For example - if a stored rule is disabled, then
// there is no task running against it.
func (m *Manager) syncRuleStateWithTask(taskName string, rule *PostableRule) error {

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
			if err := m.addTask(rule, taskName); err != nil {
				return err
			}
		} else {
			if err := m.editTask(rule, taskName); err != nil {
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
func (m *Manager) PatchRule(ctx context.Context, ruleStr string, ruleId string) (*GettableRule, error) {
	claims, ok := authtypes.ClaimsFromContext(ctx)
	if !ok {
		return nil, errors.New("claims not found in context")
	}

	if ruleId == "" {
		return nil, fmt.Errorf("id is mandatory for patching rule")
	}

	taskName := prepareTaskName(ruleId)

	// retrieve rule from DB
	storedJSON, err := m.ruleDB.GetStoredRule(ctx, ruleId)
	if err != nil {
		zap.L().Error("failed to get stored rule with given id", zap.String("id", ruleId), zap.Error(err))
		return nil, err
	}

	// storedRule holds the current stored rule from DB
	storedRule := PostableRule{}
	if err := json.Unmarshal([]byte(storedJSON.Data), &storedRule); err != nil {
		zap.L().Error("failed to unmarshal stored rule with given id", zap.String("id", ruleId), zap.Error(err))
		return nil, err
	}

	// patchedRule is combo of stored rule and patch received in the request
	patchedRule, err := parseIntoRule(storedRule, []byte(ruleStr), "json")
	if err != nil {
		return nil, err
	}

	// deploy or un-deploy task according to patched (new) rule state
	if err := m.syncRuleStateWithTask(taskName, patchedRule); err != nil {
		zap.L().Error("failed to sync stored rule state with the task", zap.String("taskName", taskName), zap.Error(err))
		return nil, err
	}

	// prepare rule json to write to update db
	patchedRuleBytes, err := json.Marshal(patchedRule)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	storedJSON.Data = string(patchedRuleBytes)
	storedJSON.UpdatedBy = &claims.Email
	storedJSON.UpdatedAt = &now

	err = m.ruleDB.EditRule(ctx, storedJSON, func(ctx context.Context) error { return nil })
	if err != nil {
		if err := m.syncRuleStateWithTask(taskName, &storedRule); err != nil {
			zap.L().Error("failed to restore rule after patch failure", zap.String("taskName", taskName), zap.Error(err))
		}
		return nil, err
	}

	// prepare http response
	response := GettableRule{
		Id:           ruleId,
		PostableRule: *patchedRule,
	}

	// fetch state of rule from memory
	if rm, ok := m.rules[ruleId]; !ok {
		response.State = model.StateDisabled
		response.Disabled = true
	} else {
		response.State = rm.State()
	}

	return &response, nil
}

// TestNotification prepares a dummy rule for given rule parameters and
// sends a test notification. returns alert count and error (if any)
func (m *Manager) TestNotification(ctx context.Context, ruleStr string) (int, *model.ApiError) {

	parsedRule, err := ParsePostableRule([]byte(ruleStr))

	if err != nil {
		return 0, model.BadRequest(err)
	}

	alertCount, apiErr := m.prepareTestRuleFunc(PrepareTestRuleOptions{
		Rule:              parsedRule,
		RuleDB:            m.ruleDB,
		Logger:            m.logger,
		Reader:            m.reader,
		Cache:             m.cache,
		FF:                m.featureFlags,
		ManagerOpts:       m.opts,
		NotifyFunc:        m.prepareTestNotifyFunc(),
		SQLStore:          m.sqlstore,
		UseLogsNewSchema:  m.opts.UseLogsNewSchema,
		UseTraceNewSchema: m.opts.UseTraceNewSchema,
	})

	return alertCount, apiErr
}

func (m *Manager) GetAlertDetailsForMetricNames(ctx context.Context, metricNames []string) (map[string][]GettableRule, *model.ApiError) {
	result := make(map[string][]GettableRule)

	rules, err := m.ruleDB.GetStoredRules(ctx)
	if err != nil {
		zap.L().Error("Error getting stored rules", zap.Error(err))
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: err}
	}

	metricRulesMap := make(map[string][]GettableRule)

	for _, storedRule := range rules {
		var rule GettableRule
		if err := json.Unmarshal([]byte(storedRule.Data), &rule); err != nil {
			zap.L().Error("Invalid rule data", zap.Error(err))
			continue
		}

		if rule.AlertType != AlertTypeMetric || rule.RuleCondition == nil || rule.RuleCondition.CompositeQuery == nil {
			continue
		}

		rule.Id = fmt.Sprintf("%d", storedRule.Id)
		rule.CreatedAt = storedRule.CreatedAt
		rule.CreatedBy = storedRule.CreatedBy
		rule.UpdatedAt = storedRule.UpdatedAt
		rule.UpdatedBy = storedRule.UpdatedBy

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
			uniqueRules := make([]GettableRule, 0)

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

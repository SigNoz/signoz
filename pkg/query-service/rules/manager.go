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

	"github.com/google/uuid"

	"github.com/go-kit/log"

	"go.uber.org/zap"

	"github.com/jmoiron/sqlx"
	"github.com/pkg/errors"

	// opentracing "github.com/opentracing/opentracing-go"
	am "go.signoz.io/signoz/pkg/query-service/integrations/alertManager"
	"go.signoz.io/signoz/pkg/query-service/interfaces"
	"go.signoz.io/signoz/pkg/query-service/model"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/utils/labels"
)

// namespace for prom metrics
const namespace = "signoz"
const taskNamesuffix = "webAppEditor"

func ruleIdFromTaskName(n string) string {
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
	NotifierOpts am.NotifierOptions
	Queriers     *Queriers

	// RepoURL is used to generate a backlink in sent alert messages
	RepoURL string

	// rule db conn
	DBConn *sqlx.DB

	Context      context.Context
	Logger       log.Logger
	ResendDelay  time.Duration
	DisableRules bool
	FeatureFlags interfaces.FeatureLookup
}

// The Manager manages recording and alerting rules.
type Manager struct {
	opts  *ManagerOptions
	tasks map[string]Task
	rules map[string]Rule
	mtx   sync.RWMutex
	block chan struct{}
	// Notifier sends messages through alert manager
	notifier *am.Notifier

	// datastore to store alert definitions
	ruleDB RuleDB

	// pause all rule tasks
	pause  bool
	logger log.Logger

	featureFlags interfaces.FeatureLookup
}

func defaultOptions(o *ManagerOptions) *ManagerOptions {
	if o.NotifierOpts.QueueCapacity == 0 {
		o.NotifierOpts.QueueCapacity = 10000
	}
	if o.NotifierOpts.Timeout == 0 {
		o.NotifierOpts.Timeout = 10 * time.Second
	}
	if o.ResendDelay == time.Duration(0) {
		o.ResendDelay = 1 * time.Minute
	}
	return o
}

// NewManager returns an implementation of Manager, ready to be started
// by calling the Run method.
func NewManager(o *ManagerOptions) (*Manager, error) {

	o = defaultOptions(o)
	// here we just initiate notifier, it will be started
	// in run()
	notifier, err := am.NewNotifier(&o.NotifierOpts, nil)
	if err != nil {
		// todo(amol): rethink on this, the query service
		// should not be down because alert manager is not available
		return nil, err
	}

	db := newRuleDB(o.DBConn)

	m := &Manager{
		tasks:        map[string]Task{},
		rules:        map[string]Rule{},
		notifier:     notifier,
		ruleDB:       db,
		opts:         o,
		block:        make(chan struct{}),
		logger:       o.Logger,
		featureFlags: o.FeatureFlags,
	}
	return m, nil
}

func (m *Manager) Start() {
	if err := m.initiate(); err != nil {
		zap.S().Errorf("failed to initialize alerting rules manager: %v", err)
	}
	m.run()
}

func (m *Manager) Pause(b bool) {
	m.mtx.Lock()
	defer m.mtx.Unlock()
	for _, t := range m.tasks {
		t.Pause(b)
	}
}

func (m *Manager) initiate() error {
	storedRules, err := m.ruleDB.GetStoredRules()
	if err != nil {
		return err
	}
	if len(storedRules) == 0 {
		return nil
	}
	var loadErrors []error

	for _, rec := range storedRules {
		taskName := fmt.Sprintf("%d-groupname", rec.Id)
		parsedRule, errs := ParsePostableRule([]byte(rec.Data))

		if len(errs) > 0 {
			if errs[0].Error() == "failed to load json" {
				zap.S().Info("failed to load rule in json format, trying yaml now:", rec.Data)

				// see if rule is stored in yaml format
				parsedRule, errs = parsePostableRule([]byte(rec.Data), "yaml")

				if parsedRule == nil {
					zap.S().Errorf("failed to parse and initialize yaml rule:", errs)
					// just one rule is being parsed so expect just one error
					loadErrors = append(loadErrors, errs[0])
					continue
				} else {
					// rule stored in yaml, so migrate it to json
					zap.S().Info("msg:", "migrating rule from JSON to yaml", "\t rule:", rec.Data, "\t parsed rule:", parsedRule)
					ruleJSON, err := json.Marshal(parsedRule)
					if err == nil {
						taskName, _, err := m.ruleDB.EditRuleTx(string(ruleJSON), fmt.Sprintf("%d", rec.Id))
						if err != nil {
							zap.S().Errorf("msg: failed to migrate rule ", "/t error:", err)
						} else {
							zap.S().Info("msg:", "migrated rule from yaml to json", "/t rule:", taskName)
						}
					}
				}
			} else {
				zap.S().Errorf("failed to parse and initialize rule:", errs)
				// just one rule is being parsed so expect just one error
				loadErrors = append(loadErrors, errs[0])
				continue
			}
		}
		if !parsedRule.Disabled {
			err := m.addTask(parsedRule, taskName)
			if err != nil {
				zap.S().Errorf("failed to load the rule definition (%s): %v", taskName, err)
			}
		}
	}

	return nil
}

// Run starts processing of the rule manager.
func (m *Manager) run() {
	// initiate notifier
	go m.notifier.Run()

	// initiate blocked tasks
	close(m.block)
}

// Stop the rule manager's rule evaluation cycles.
func (m *Manager) Stop() {
	m.mtx.Lock()
	defer m.mtx.Unlock()

	zap.S().Info("msg: ", "Stopping rule manager...")

	for _, t := range m.tasks {
		t.Stop()
	}

	zap.S().Info("msg: ", "Rule manager stopped")
}

// EditRuleDefinition writes the rule definition to the
// datastore and also updates the rule executor
func (m *Manager) EditRule(ruleStr string, id string) error {

	parsedRule, errs := ParsePostableRule([]byte(ruleStr))

	currentRule, err := m.GetRule(id)
	if err != nil {
		zap.S().Errorf("msg: ", "failed to get the rule from rule db", "\t ruleid: ", id)
		return err
	}

	if !checkIfTraceOrLogQB(&currentRule.PostableRule) {
		// check if the new rule uses any feature that is not enabled
		err = m.checkFeatureUsage(parsedRule)
		if err != nil {
			return err
		}
	}

	if len(errs) > 0 {
		zap.S().Errorf("failed to parse rules:", errs)
		// just one rule is being parsed so expect just one error
		return errs[0]
	}

	taskName, _, err := m.ruleDB.EditRuleTx(ruleStr, id)
	if err != nil {
		return err
	}

	if !m.opts.DisableRules {
		err = m.syncRuleStateWithTask(taskName, parsedRule)
		if err != nil {
			return err
		}
	}

	// update feature usage if the current rule is not a trace or log query builder
	if !checkIfTraceOrLogQB(&currentRule.PostableRule) {
		err = m.updateFeatureUsage(parsedRule, 1)
		if err != nil {
			zap.S().Errorf("error updating feature usage: %v", err)
		}
		// update feature usage if the new rule is not a trace or log query builder and the current rule is
	} else if !checkIfTraceOrLogQB(parsedRule) {
		err = m.updateFeatureUsage(&currentRule.PostableRule, -1)
		if err != nil {
			zap.S().Errorf("error updating feature usage: %v", err)
		}
	}

	return nil
}

func (m *Manager) editTask(rule *PostableRule, taskName string) error {
	m.mtx.Lock()
	defer m.mtx.Unlock()

	zap.S().Debugf("msg:", "editing a rule task", "\t task name:", taskName)

	newTask, err := m.prepareTask(false, rule, taskName)

	if err != nil {
		zap.S().Errorf("msg:", "loading tasks failed", "\t err:", err)
		return errors.New("error preparing rule with given parameters, previous rule set restored")
	}

	// If there is an old task with the same identifier, stop it and wait for
	// it to finish the current iteration. Then copy it into the new group.
	oldTask, ok := m.tasks[taskName]
	if !ok {
		zap.S().Warnf("msg:", "rule task not found, a new task will be created ", "\t task name:", taskName)
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

func (m *Manager) DeleteRule(id string) error {

	idInt, err := strconv.Atoi(id)
	if err != nil {
		zap.S().Errorf("msg: ", "delete rule received an rule id in invalid format, must be a number", "\t ruleid:", id)
		return fmt.Errorf("delete rule received an rule id in invalid format, must be a number")
	}

	// update feature usage
	rule, err := m.GetRule(id)
	if err != nil {
		zap.S().Errorf("msg: ", "failed to get the rule from rule db", "\t ruleid: ", id)
		return err
	}

	taskName := prepareTaskName(int64(idInt))
	if !m.opts.DisableRules {
		m.deleteTask(taskName)
	}

	if _, _, err := m.ruleDB.DeleteRuleTx(id); err != nil {
		zap.S().Errorf("msg: ", "failed to delete the rule from rule db", "\t ruleid: ", id)
		return err
	}

	err = m.updateFeatureUsage(&rule.PostableRule, -1)
	if err != nil {
		zap.S().Errorf("error updating feature usage: %v", err)
	}

	return nil
}

func (m *Manager) deleteTask(taskName string) {
	m.mtx.Lock()
	defer m.mtx.Unlock()
	zap.S().Debugf("msg:", "deleting a rule task", "\t task name:", taskName)

	oldg, ok := m.tasks[taskName]
	if ok {
		oldg.Stop()
		delete(m.tasks, taskName)
		delete(m.rules, ruleIdFromTaskName(taskName))
		zap.S().Debugf("msg:", "rule task deleted", "\t task name:", taskName)
	} else {
		zap.S().Info("msg: ", "rule not found for deletion", "\t name:", taskName)
	}
}

// CreateRule stores rule def into db and also
// starts an executor for the rule
func (m *Manager) CreateRule(ruleStr string) error {
	parsedRule, errs := ParsePostableRule([]byte(ruleStr))

	// check if the rule uses any feature that is not enabled
	err := m.checkFeatureUsage(parsedRule)
	if err != nil {
		return err
	}

	if len(errs) > 0 {
		zap.S().Errorf("failed to parse rules:", errs)
		// just one rule is being parsed so expect just one error
		return errs[0]
	}

	taskName, tx, err := m.ruleDB.CreateRuleTx(ruleStr)
	if err != nil {
		return err
	}
	if !m.opts.DisableRules {
		if err := m.addTask(parsedRule, taskName); err != nil {
			tx.Rollback()
			return err
		}
	}
	err = tx.Commit()
	if err != nil {
		return err
	}

	// update feature usage
	err = m.updateFeatureUsage(parsedRule, 1)
	if err != nil {
		zap.S().Errorf("error updating feature usage: %v", err)
	}
	return nil
}

func (m *Manager) updateFeatureUsage(parsedRule *PostableRule, usage int64) error {
	isTraceOrLogQB := checkIfTraceOrLogQB(parsedRule)
	if isTraceOrLogQB {
		feature, err := m.featureFlags.GetFeatureFlag(model.QueryBuilderAlerts)
		if err != nil {
			return err
		}
		feature.Usage += usage
		if feature.Usage == feature.UsageLimit && feature.UsageLimit != -1 {
			feature.Active = false
		}
		if feature.Usage < feature.UsageLimit || feature.UsageLimit == -1 {
			feature.Active = true
		}
		err = m.featureFlags.UpdateFeatureFlag(feature)
		if err != nil {
			return err
		}
	}
	return nil
}

func (m *Manager) checkFeatureUsage(parsedRule *PostableRule) error {
	isTraceOrLogQB := checkIfTraceOrLogQB(parsedRule)
	if isTraceOrLogQB {
		err := m.featureFlags.CheckFeature(model.QueryBuilderAlerts)
		if err != nil {
			switch err.(type) {
			case model.ErrFeatureUnavailable:
				zap.S().Errorf("feature unavailable", zap.String("featureKey", model.QueryBuilderAlerts), zap.Error(err))
				return model.BadRequest(err)
			default:
				zap.S().Errorf("feature check failed", zap.String("featureKey", model.QueryBuilderAlerts), zap.Error(err))
				return model.BadRequest(err)
			}
		}
	}
	return nil
}

func checkIfTraceOrLogQB(parsedRule *PostableRule) bool {
	if parsedRule != nil {
		if parsedRule.RuleCondition.QueryType() == v3.QueryTypeBuilder {
			for _, query := range parsedRule.RuleCondition.CompositeQuery.BuilderQueries {
				if query.DataSource == v3.DataSourceTraces || query.DataSource == v3.DataSourceLogs {
					return true
				}
			}
		}
	}
	return false
}

func (m *Manager) addTask(rule *PostableRule, taskName string) error {
	m.mtx.Lock()
	defer m.mtx.Unlock()

	zap.S().Debugf("msg:", "adding a new rule task", "\t task name:", taskName)
	newTask, err := m.prepareTask(false, rule, taskName)

	if err != nil {
		zap.S().Errorf("msg:", "creating rule task failed", "\t name:", taskName, "\t err", err)
		return errors.New("error loading rules, previous rule set restored")
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

// prepareTask prepares a rule task from postable rule
func (m *Manager) prepareTask(acquireLock bool, r *PostableRule, taskName string) (Task, error) {

	if acquireLock {
		m.mtx.Lock()
		defer m.mtx.Unlock()
	}

	rules := make([]Rule, 0)
	var task Task

	if r.Alert == "" {
		zap.S().Errorf("msg:", "task load failed, at least one rule must be set", "\t task name:", taskName)
		return task, fmt.Errorf("task load failed, at least one rule must be set")
	}

	ruleId := ruleIdFromTaskName(taskName)
	if r.RuleType == RuleTypeThreshold {
		// create a threshold rule
		tr, err := NewThresholdRule(
			ruleId,
			r,
			ThresholdRuleOpts{},
		)

		if err != nil {
			return task, err
		}

		rules = append(rules, tr)

		// create ch rule task for evalution
		task = newTask(TaskTypeCh, taskName, taskNamesuffix, time.Duration(r.Frequency), rules, m.opts, m.prepareNotifyFunc())

		// add rule to memory
		m.rules[ruleId] = tr

	} else if r.RuleType == RuleTypeProm {

		// create promql rule
		pr, err := NewPromRule(
			ruleId,
			r,
			log.With(m.logger, "alert", r.Alert),
			PromRuleOpts{},
		)

		if err != nil {
			return task, err
		}

		rules = append(rules, pr)

		// create promql rule task for evalution
		task = newTask(TaskTypeProm, taskName, taskNamesuffix, time.Duration(r.Frequency), rules, m.opts, m.prepareNotifyFunc())

		// add rule to memory
		m.rules[ruleId] = pr

	} else {
		return nil, fmt.Errorf(fmt.Sprintf("unsupported rule type. Supported types: %s, %s", RuleTypeProm, RuleTypeThreshold))
	}

	return task, nil
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
type NotifyFunc func(ctx context.Context, expr string, alerts ...*Alert)

// prepareNotifyFunc implements the NotifyFunc for a Notifier.
func (m *Manager) prepareNotifyFunc() NotifyFunc {
	return func(ctx context.Context, expr string, alerts ...*Alert) {
		var res []*am.Alert

		for _, alert := range alerts {
			generatorURL := alert.GeneratorURL
			if generatorURL == "" {
				generatorURL = m.opts.RepoURL
			}

			a := &am.Alert{
				StartsAt:     alert.FiredAt,
				Labels:       alert.Labels,
				Annotations:  alert.Annotations,
				GeneratorURL: generatorURL,
				Receivers:    alert.Receivers,
			}
			if !alert.ResolvedAt.IsZero() {
				a.EndsAt = alert.ResolvedAt
			} else {
				a.EndsAt = alert.ValidUntil
			}
			res = append(res, a)
		}

		if len(alerts) > 0 {
			m.notifier.Send(res...)
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

func (m *Manager) ListRuleStates() (*GettableRules, error) {

	// fetch rules from DB
	storedRules, err := m.ruleDB.GetStoredRules()
	if err != nil {
		return nil, err
	}

	// initiate response object
	resp := make([]*GettableRule, 0)

	for _, s := range storedRules {

		ruleResponse := &GettableRule{}
		if err := json.Unmarshal([]byte(s.Data), ruleResponse); err != nil { // Parse []byte to go struct pointer
			zap.S().Errorf("msg:", "invalid rule data", "\t err:", err)
			continue
		}

		ruleResponse.Id = fmt.Sprintf("%d", s.Id)

		// fetch state of rule from memory
		if rm, ok := m.rules[ruleResponse.Id]; !ok {
			ruleResponse.State = StateDisabled.String()
			ruleResponse.Disabled = true
		} else {
			ruleResponse.State = rm.State().String()
		}
		resp = append(resp, ruleResponse)
	}

	return &GettableRules{Rules: resp}, nil
}

func (m *Manager) GetRule(id string) (*GettableRule, error) {
	s, err := m.ruleDB.GetStoredRule(id)
	if err != nil {
		return nil, err
	}
	r := &GettableRule{}
	if err := json.Unmarshal([]byte(s.Data), r); err != nil {
		return nil, err
	}
	r.Id = fmt.Sprintf("%d", s.Id)
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
func (m *Manager) PatchRule(ruleStr string, ruleId string) (*GettableRule, error) {

	if ruleId == "" {
		return nil, fmt.Errorf("id is mandatory for patching rule")
	}

	taskName := prepareTaskName(ruleId)

	// retrieve rule from DB
	storedJSON, err := m.ruleDB.GetStoredRule(ruleId)
	if err != nil {
		zap.S().Errorf("msg:", "failed to get stored rule with given id", "\t error:", err)
		return nil, err
	}

	// storedRule holds the current stored rule from DB
	storedRule := PostableRule{}
	if err := json.Unmarshal([]byte(storedJSON.Data), &storedRule); err != nil {
		zap.S().Errorf("msg:", "failed to get unmarshal stored rule with given id", "\t error:", err)
		return nil, err
	}

	// patchedRule is combo of stored rule and patch received in the request
	patchedRule, errs := parseIntoRule(storedRule, []byte(ruleStr), "json")
	if len(errs) > 0 {
		zap.S().Errorf("failed to parse rules:", errs)
		// just one rule is being parsed so expect just one error
		return nil, errs[0]
	}

	// deploy or un-deploy task according to patched (new) rule state
	if err := m.syncRuleStateWithTask(taskName, patchedRule); err != nil {
		zap.S().Errorf("failed to sync stored rule state with the task")
		return nil, err
	}

	// prepare rule json to write to update db
	patchedRuleBytes, err := json.Marshal(patchedRule)
	if err != nil {
		return nil, err
	}

	// write updated rule to db
	if _, _, err = m.ruleDB.EditRuleTx(string(patchedRuleBytes), ruleId); err != nil {
		// write failed, rollback task state

		// restore task state from the stored rule
		if err := m.syncRuleStateWithTask(taskName, &storedRule); err != nil {
			zap.S().Errorf("msg: ", "failed to restore rule after patch failure", "\t error:", err)
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
		response.State = StateDisabled.String()
		response.Disabled = true
	} else {
		response.State = rm.State().String()
	}

	return &response, nil
}

// TestNotification prepares a dummy rule for given rule parameters and
// sends a test notification. returns alert count and error (if any)
func (m *Manager) TestNotification(ctx context.Context, ruleStr string) (int, *model.ApiError) {

	parsedRule, errs := ParsePostableRule([]byte(ruleStr))

	if len(errs) > 0 {
		zap.S().Errorf("msg: failed to parse rule from request:", "\t error: ", errs)
		return 0, newApiErrorBadData(errs[0])
	}

	var alertname = parsedRule.Alert
	if alertname == "" {
		// alertname is not mandatory for testing, so picking
		// a random string here
		alertname = uuid.New().String()
	}

	// append name to indicate this is test alert
	parsedRule.Alert = fmt.Sprintf("%s%s", alertname, TestAlertPostFix)

	var rule Rule
	var err error

	if parsedRule.RuleType == RuleTypeThreshold {

		// add special labels for test alerts
		parsedRule.Labels[labels.AlertAdditionalInfoLabel] = fmt.Sprintf("The rule threshold is set to %.4f, and the observed metric value is {{$value}}.", *parsedRule.RuleCondition.Target)
		parsedRule.Annotations[labels.AlertSummaryLabel] = fmt.Sprintf("The rule threshold is set to %.4f, and the observed metric value is {{$value}}.", *parsedRule.RuleCondition.Target)
		parsedRule.Labels[labels.RuleSourceLabel] = ""
		parsedRule.Labels[labels.AlertRuleIdLabel] = ""

		// create a threshold rule
		rule, err = NewThresholdRule(
			alertname,
			parsedRule,
			ThresholdRuleOpts{
				SendUnmatched: true,
				SendAlways:    true,
			},
		)

		if err != nil {
			zap.S().Errorf("msg: failed to prepare a new threshold rule for test:", "\t error: ", err)
			return 0, newApiErrorBadData(err)
		}

	} else if parsedRule.RuleType == RuleTypeProm {

		// create promql rule
		rule, err = NewPromRule(
			alertname,
			parsedRule,
			log.With(m.logger, "alert", alertname),
			PromRuleOpts{
				SendAlways: true,
			},
		)

		if err != nil {
			zap.S().Errorf("msg: failed to prepare a new promql rule for test:", "\t error: ", err)
			return 0, newApiErrorBadData(err)
		}
	} else {
		return 0, newApiErrorBadData(fmt.Errorf("failed to derive ruletype with given information"))
	}

	// set timestamp to current utc time
	ts := time.Now().UTC()

	count, err := rule.Eval(ctx, ts, m.opts.Queriers)
	if err != nil {
		zap.S().Warn("msg:", "Evaluating rule failed", "\t rule:", rule, "\t err: ", err)
		return 0, newApiErrorInternal(fmt.Errorf("rule evaluation failed"))
	}
	alertsFound := count.(int)
	rule.SendAlerts(ctx, ts, 0, time.Duration(1*time.Minute), m.prepareNotifyFunc())

	return alertsFound, nil
}

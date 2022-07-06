package rules

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/go-kit/log"

	"go.uber.org/zap"

	"github.com/jmoiron/sqlx"
	"github.com/pkg/errors"

	// opentracing "github.com/opentracing/opentracing-go"
	am "go.signoz.io/query-service/integrations/alertManager"
)

// namespace for prom metrics
const namespace = "signoz"
const taskNamesuffix = "webAppEditor"

func ruleIdFromTaskName(n string) string {
	return strings.Split(n, "-groupname")[0]
}

func prepareTaskName(ruleId int64) string {
	return fmt.Sprintf("%d-groupname", ruleId)
}

// ManagerOptions bundles options for the Manager.
type ManagerOptions struct {
	NotifierOpts am.NotifierOptions
	Queriers     *Queriers
	ExternalURL  *url.URL

	// rule db conn
	Conn *sqlx.DB

	Context     context.Context
	Logger      log.Logger
	ResendDelay time.Duration
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

	db := newRuleDB(o.Conn)

	m := &Manager{
		tasks:    map[string]Task{},
		rules:    map[string]Rule{},
		notifier: notifier,
		ruleDB:   db,
		opts:     o,
		block:    make(chan struct{}),
		logger:   o.Logger,
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

		err := m.addTask(parsedRule, taskName)
		if err != nil {
			zap.S().Errorf("failed to load the rule definition (%s): %v", taskName, err)
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

	if len(errs) > 0 {
		zap.S().Errorf("failed to parse rules:", errs)
		// just one rule is being parsed so expect just one error
		return errs[0]
	}

	taskName, _, err := m.ruleDB.EditRuleTx(ruleStr, id)
	if err != nil {
		return err
	}

	err = m.editTask(parsedRule, taskName)
	if err != nil {
		// todo(amol): using tx with sqllite3 is gets
		// database locked. need to research and resolve this
		//tx.Rollback()
		return err
	}

	// return tx.Commit()
	return nil
}

func (m *Manager) editTask(rule *PostableRule, taskName string) error {
	m.mtx.Lock()
	defer m.mtx.Unlock()

	newTask, err := m.prepareTask(false, rule, taskName)

	if err != nil {
		zap.S().Errorf("msg:", "loading tasks failed", "\t err:", err)
		return errors.New("error preparing rule with given parameters, previous rule set restored")
	}

	// If there is an old task with the same identifier, stop it and wait for
	// it to finish the current iteration. Then copy it into the new group.
	oldTask, ok := m.tasks[taskName]
	if !ok {
		zap.S().Errorf("msg:", "rule task not found, edit task failed", "\t task name:", taskName)
		return errors.New("rule task not found, edit task failed")
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
	taskName, tx, err := m.ruleDB.DeleteRuleTx(id)
	if err != nil {
		return err
	}

	if err := m.deleteTask(taskName); err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit()
}

func (m *Manager) deleteTask(taskName string) error {
	m.mtx.Lock()
	defer m.mtx.Unlock()

	oldg, ok := m.tasks[taskName]
	if ok {
		oldg.Stop()
		delete(m.tasks, taskName)
		delete(m.rules, ruleIdFromTaskName(taskName))
	} else {
		zap.S().Errorf("msg:", "rule not found for deletion", "\t name:", taskName)
		return fmt.Errorf("rule not found")
	}

	return nil
}

// CreateRule stores rule def into db and also
// starts an executor for the rule
func (m *Manager) CreateRule(ruleStr string) error {
	parsedRule, errs := ParsePostableRule([]byte(ruleStr))

	if len(errs) > 0 {
		zap.S().Errorf("failed to parse rules:", errs)
		// just one rule is being parsed so expect just one error
		return errs[0]
	}

	taskName, tx, err := m.ruleDB.CreateRuleTx(ruleStr)
	if err != nil {
		return err
	}

	if err := m.addTask(parsedRule, taskName); err != nil {
		tx.Rollback()
		return err
	}
	return tx.Commit()
}

func (m *Manager) addTask(rule *PostableRule, taskName string) error {
	m.mtx.Lock()
	defer m.mtx.Unlock()

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
			r.Alert,
			r.RuleCondition,
			time.Duration(r.EvalWindow),
			r.Labels,
			r.Annotations,
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
			r.Alert,
			r.RuleCondition,
			time.Duration(r.EvalWindow),
			r.Labels,
			r.Annotations,
			// required as promql engine works with logger and not zap
			log.With(m.logger, "alert", r.Alert),
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
			a := &am.Alert{
				StartsAt:     alert.FiredAt,
				Labels:       alert.Labels,
				Annotations:  alert.Annotations,
				GeneratorURL: m.opts.ExternalURL.String(),
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
			zap.S().Warnf("msg:", "invalid rule id  found while fetching list of rules", "\t err:", err, "\t rule_id:", ruleResponse.Id)
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

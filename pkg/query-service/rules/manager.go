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

func groupKey(name, file string) string {
	return name + ";" + file
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
		groupName := fmt.Sprintf("%d-groupname", rec.Id)
		parsedRule, errs := ParsePostableRule([]byte(rec.Data))

		if len(errs) > 0 {
			if errs[0].Error() == "failed to load json" {
				zap.S().Info("failed to load rule in json format, trying yaml now:", rec.Data)
				parsedRule, errs = parsePostableRule([]byte(rec.Data), "yaml")
				if parsedRule == nil {
					zap.S().Errorf("failed to parse and initialize yaml rule:", errs)
					// just one rule is being parsed so expect just one error
					loadErrors = append(loadErrors, errs[0])
					continue
				} else {
					// migrate the rule to json before continuing
					zap.S().Info("migrating rule from JSON to yaml", rec.Id)
					ruleJSON, err := json.Marshal(parsedRule)
					if err == nil {
						_, tx, err := m.ruleDB.EditRuleTx(string(ruleJSON), fmt.Sprintf("%d", rec.Id))
						if err != nil {
							zap.S().Errorf("failed to migrate rule ", err, ruleJSON, rec.Id)
						} else {
							tx.Commit()
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

		err := m.addTask(parsedRule, groupName)
		if err != nil {
			zap.S().Errorf("failed to load the rule definition (%s): %v", groupName, err)
		}
	}

	return nil
}

// Run starts processing of the rule manager.
func (m *Manager) run() {
	go m.notifier.Run()
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

	groupName, _, err := m.ruleDB.EditRuleTx(ruleStr, id)
	if err != nil {
		return err
	}

	err = m.editTask(parsedRule, groupName)
	if err != nil {
		//tx.Rollback()
		return err
	}

	// return tx.Commit()
	return nil
}

func (m *Manager) editTask(rule *PostableRule, groupName string) error {
	m.mtx.Lock()
	defer m.mtx.Unlock()

	var tasks map[string]Task
	var errs []error

	tasks, errs = m.loadTask(false, rule, groupName)

	if errs != nil {
		for _, e := range errs {
			zap.S().Errorf("msg", "loading tasks failed", "err", e)
		}
		return errors.New("error loading rules, previous rule set restored")
	}

	var wg sync.WaitGroup

	for _, newg := range tasks {
		wg.Add(1)

		// If there is an old group with the same identifier, stop it and wait for
		// it to finish the current iteration. Then copy it into the new group.
		gn := groupKey(newg.Name(), taskNamesuffix)
		oldg, ok := m.tasks[gn]
		if !ok {
			return errors.New("rule not found")
		}

		delete(m.tasks, gn)

		go func(newg Task) {
			if ok {
				oldg.Stop()
				newg.CopyState(oldg)
			}
			go func() {
				// Wait with starting evaluation until the rule manager
				// is told to run. This is necessary to avoid running
				// queries against a bootstrapping storage.
				<-m.block
				newg.Run(m.opts.Context)
			}()
			wg.Done()
		}(newg)

		m.tasks[gn] = newg

	}

	// // Stop remaining old tasks.
	// for _, oldg := range m.tasks {
	// 	oldg.Stop()
	// }

	wg.Wait()

	return nil
}

func (m *Manager) DeleteRule(id string) error {
	groupName, tx, err := m.ruleDB.DeleteRuleTx(id)
	if err != nil {
		return err
	}

	if err := m.deleteTask(groupName); err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit()
}

func (m *Manager) deleteTask(groupName string) error {
	m.mtx.Lock()
	defer m.mtx.Unlock()

	gn := groupKey(groupName, taskNamesuffix)

	oldg, ok := m.tasks[gn]

	var wg sync.WaitGroup
	wg.Add(1)
	go func(newg Task) {
		if ok {
			oldg.Stop()
			delete(m.tasks, gn)
			delete(m.rules, groupName)
		}
		defer wg.Done()
	}(oldg)

	wg.Wait()

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

	groupName, tx, err := m.ruleDB.CreateRuleTx(ruleStr)
	if err != nil {
		return err
	}

	if err := m.addTask(parsedRule, groupName); err != nil {
		tx.Rollback()
		return err
	}
	return tx.Commit()
}

func (m *Manager) addTask(rule *PostableRule, groupName string) error {
	m.mtx.Lock()
	defer m.mtx.Unlock()

	// m.restored = true

	var tasks map[string]Task
	var errs []error

	tasks, errs = m.loadTask(false, rule, groupName)

	if errs != nil {
		for _, e := range errs {
			zap.S().Errorf("msg", "loading rule tasks failed", "err", e)
		}
		return errors.New("error loading rules, previous rule set restored")
	}

	var wg sync.WaitGroup

	for _, newg := range tasks {
		wg.Add(1)

		// If there is an old group with the same identifier, stop it and wait for
		// it to finish the current iteration. Then copy it into the new group.
		gn := groupKey(newg.Name(), taskNamesuffix)
		oldg, ok := m.tasks[gn]
		delete(m.tasks, gn)

		go func(newg Task) {
			if ok {
				oldg.Stop()
				newg.CopyState(oldg)
			}
			go func() {
				// Wait with starting evaluation until the rule manager
				// is told to run. This is necessary to avoid running
				// queries against a bootstrapping storage.
				<-m.block
				newg.Run(m.opts.Context)
			}()
			wg.Done()
		}(newg)

		if !ok {
			m.tasks[gn] = newg
		}
	}

	wg.Wait()

	return nil
}

// loadTask loads a given rule in rule manager. the method
func (m *Manager) loadTask(acquireLock bool, r *PostableRule, groupName string) (map[string]Task, []error) {

	if acquireLock {
		m.mtx.Lock()
		defer m.mtx.Unlock()
	}

	rules := make([]Rule, 0)
	tasks := make(map[string]Task)

	if r.Alert == "" {
		return tasks, []error{fmt.Errorf("at least one rule must be set")}
	}

	ruleId := strings.Split(groupName, "-groupname")[0]

	if r.RuleType == RuleTypeThreshold {
		// create a threshold rule
		tr := NewThresholdRule(
			ruleId,
			r.Alert,
			r.RuleCondition,
			time.Duration(r.EvalWindow),
			r.Labels,
			r.Annotations,
			log.With(m.logger, "alert", r.Alert),
		)

		rules = append(rules, tr)

		// create ch rule task for evalution
		tasks[groupKey(groupName, taskNamesuffix)] = newTask(TaskTypeCh, groupName, taskNamesuffix, time.Duration(r.Frequency), rules, m.opts, m.prepareNotifyFunc())

		// add rule to memory
		m.rules[ruleId] = tr

	} else if r.RuleType == RuleTypeProm {

		// create promql rule
		pr := NewPromRule(
			ruleId,
			r.Alert,
			r.RuleCondition,
			time.Duration(r.EvalWindow),
			r.Labels,
			r.Annotations,
			log.With(m.logger, "alert", r.Alert),
		)
		rules = append(rules, pr)

		// create promql rule task for evalution
		tasks[groupKey(groupName, taskNamesuffix)] = newTask(TaskTypeProm, groupName, taskNamesuffix, time.Duration(r.Frequency), rules, m.opts, m.prepareNotifyFunc())

		// add rule to memory
		m.rules[ruleId] = pr

	} else {
		return nil, []error{fmt.Errorf(fmt.Sprintf("unsupported rule type. Supported types: %s, %s", RuleTypeProm, RuleTypeThreshold))}
	}

	return tasks, nil
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
	zap.S().Info("stored rules:", len(storedRules))
	// initiate response object
	resp := make([]*GettableRule, 0)

	for _, s := range storedRules {

		ruleResponse := &GettableRule{}
		if err := json.Unmarshal([]byte(s.Data), ruleResponse); err != nil { // Parse []byte to go struct pointer
			zap.S().Errorf("msg:", "invalid rule data", "/terr:", err)
			continue
		}

		ruleResponse.Id = fmt.Sprintf("%d", s.Id)

		// fetch state of rule from memory
		if rm, ok := m.rules[ruleResponse.Id]; !ok {
			zap.S().Warnf("msg:", "invalid rule id  found while fetching list of rules", "/terr:", err, "/trule_id:", ruleResponse.Id)
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

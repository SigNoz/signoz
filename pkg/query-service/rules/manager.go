package rules

import (
	"context"
	"fmt"
	"net/url"
	"sort"
	"sync"
	"time"
	
	"github.com/go-kit/log"
	"github.com/go-kit/log/level"
	"go.uber.org/zap"

	"github.com/pkg/errors"
	"github.com/jmoiron/sqlx"

	am "go.signoz.io/query-service/integrations/alertManager"
	opentracing "github.com/opentracing/opentracing-go"
	
	"go.signoz.io/query-service/utils/labels"
)

// namespace for prom metrics
const namespace = "signoz"

// Queriers register the options for querying metrics or event sources
// which return a condition that results in a alert. Currently we support
// promql engine and clickhouse queries but in future we may include
// api readers for Machine Learning (ML) use cases.
// Note: each rule will pick up the querier it is interested in
// and use it. This allows rules to have flexibility in choosing 
// the query engines. 
type Queriers struct {
	// promql engine
	PqlEngine promql.PqlEngine

	// metric querier 
	Ch ClickHouseReader 
}

// ManagerOptions bundles options for the Manager.
type ManagerOptions struct {
	NotifierOpts am.NotifierOptions	
	Queriers *Queriers
	ExternalURL *url.URL 
	
	// rule db conn
	Conn *sqlx.DB

	Context     context.Context
	Logger      log.Logger
	ResendDelay time.Duration
}

// The Manager manages recording and alerting rules.
type Manager struct {
	opts   *ManagerOptions
	groups map[string]*Group
	mtx    sync.RWMutex
	block  chan struct{}
	// Notifier sends messages through alert manager
	notifier *am.Notifier
	
	// datastore to store alert definitions
	ruleDB RuleDB
	logger log.Logger
}

// NewManager returns an implementation of Manager, ready to be started
// by calling the Run method.
func NewManager(o *ManagerOptions) (*Manager, error) {
	
	// o.NotifierOpts.QueueCapacity = 10000
	// o.NotifierOpts.Timeout = time.Duration.Seconds(10)
	notifier, err := am.NewNotifier(o.NotifierOpts, log.With(logger, "component", "notifier"))
	if err != nil {
		return nil, err	
	}

	db := newRuleDB(o.Conn)

	m := &Manager{
		groups: map[string]*Group{},
		notifier: notifier,
		ruleDB: db,
		opts:   o,
		block:  make(chan struct{}),
		logger: o.Logger,
	}
	return m, nil
}

func (m *Manager) Start() error {
	if err := m.initiate(); err != nil {
		zap.S().Errorf("failed to initialize alerting rules manager: %v", err)
		return err
	}
	m.run()
}

func (m *Manager) initiate() error {
	ruleRecs, err := m.db.GetRules()
	if err != nil {
		return err
	} 
	if len(ruleRecs) == 0 {
		return nil 
	}
	for _, rec := range ruleRecs {
		groupName := fmt.Sprintf("%d-groupname", rule.Id)
		err := m.addGroup(rule.Data, groupName)
		if err != nil {
			zap.S().Errorf("failed to load the rule definition (%s): %v", groupName, err)
		}
	}
	return nil
}

// Run starts processing of the rule manager.
func (m *Manager) run() {
	close(m.block)
}

// Stop the rule manager's rule evaluation cycles.
func (m *Manager) Stop() {
	m.mtx.Lock()
	defer m.mtx.Unlock()

	level.Info(m.logger).Log("msg", "Stopping rule manager...")

	for _, eg := range m.groups {
		eg.stop()
	}

	level.Info(m.logger).Log("msg", "Rule manager stopped")
}

// EditRuleDefinition writes the rule definition to the
// datastore and also updates the rule executor 
func (m *Manager) EditRule(ruleStr string, id string) error {
	parsedRule, errs := ParsePostableRule([]byte(ruleStr))

	if len(errs) > 0 {
		zap.S().Errorf("failed to parse rules:", errs)
		// just one rule is being parsed so expect just one error 
		return nil, errs[0]
	}


	groupName, tx, err := m.EditRuleTx(ruleStr, id)
	if err != nil {
		return err
	}

	
	err = r.editGroup(parsedRule, groupName)
	if err != nil {
		tx.Rollback()
	} 

	return tx.Commit() 
}

func (m *Manager) editGroup(rule PostableRule, groupName string) error {
	m.mtx.Lock()
	defer m.mtx.Unlock()

	// m.restored = true

	var groups map[string]*Group
	var errs []error

	groups, errs = m.LoadGroup(rule, groupName)

	if errs != nil {
		for _, e := range errs {
			level.Error(m.logger).Log("msg", "loading groups failed", "err", e)
		}
		return errors.New("error loading rules, previous rule set restored")
	}

	var wg sync.WaitGroup

	for _, newg := range groups {
		wg.Add(1)

		// If there is an old group with the same identifier, stop it and wait for
		// it to finish the current iteration. Then copy it into the new group.
		gn := groupKey(newg.name, newg.file)
		oldg, ok := m.groups[gn]
		if !ok {
			return errors.New("rule not found")
		}

		delete(m.groups, gn)

		go func(newg *Group) {
			if ok {
				oldg.stop()
				newg.CopyState(oldg)
			}
			go func() {
				// Wait with starting evaluation until the rule manager
				// is told to run. This is necessary to avoid running
				// queries against a bootstrapping storage.
				<-m.block
				newg.run(m.opts.Context)
			}()
			wg.Done()
		}(newg)

		m.groups[gn] = newg

	}

	// // Stop remaining old groups.
	// for _, oldg := range m.groups {
	// 	oldg.stop()
	// }

	wg.Wait()

	return nil
}

func (m *Manager) DeleteRule(id string) error {
	groupName, tx, err := m.db.DeleteRuleTx(id)
	if err != nil {
		return err
	}

	if err := m.deleteGroup(groupName); err != nil {
		tx.Rollback()
		return err
	}
	return tx.Commit()
}

func (m *Manager) deleteGroup(groupName string) error {
	m.mtx.Lock()
	defer m.mtx.Unlock()

	// m.restored = true

	filename := "webAppEditor"

	gn := groupKey(groupName, filename)
	oldg, ok := m.groups[gn]

	var wg sync.WaitGroup
	wg.Add(1)
	go func(newg *Group) {
		if ok {
			oldg.stop()
			delete(m.groups, gn)
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
		return nil, errs[0]
	}

	groupName, tx, err := m.db.CreateRuleTx(ruleStr)
	if err != nil {
		return err
	}

	if err := m.addGroup(parsedRule, groupName); err != nil {
		tx.Rollback()
		return err
	}
	return tx.Commit()
}

func (m *Manager) addGroup(rule PostableRule, groupName string) error {
	m.mtx.Lock()
	defer m.mtx.Unlock()

	// m.restored = true

	var groups map[string]*Group
	var errs []error

	groups, errs = m.LoadGroup(rule, groupName)

	if errs != nil {
		for _, e := range errs {
			level.Error(m.logger).Log("msg", "loading groups failed", "err", e)
		}
		return errors.New("error loading rules, previous rule set restored")
	}

	var wg sync.WaitGroup

	for _, newg := range groups {
		wg.Add(1)

		// If there is an old group with the same identifier, stop it and wait for
		// it to finish the current iteration. Then copy it into the new group.
		gn := groupKey(newg.name, newg.file)
		oldg, ok := m.groups[gn]
		delete(m.groups, gn)

		go func(newg *Group) {
			if ok {
				oldg.stop()
				newg.CopyState(oldg)
			}
			go func() {
				// Wait with starting evaluation until the rule manager
				// is told to run. This is necessary to avoid running
				// queries against a bootstrapping storage.
				<-m.block
				newg.run(m.opts.Context)
			}()
			wg.Done()
		}(newg)

		if !ok {
			m.groups[gn] = newg
		}
	}

	wg.Wait()

	return nil
}

// loadGroup loads a given rule in rule manager
func (m *Manager) loadGroup(r PostableRule, groupName string) (map[string]*Group, []error) {

	// shouldRestore := !m.restored
	filename := "webAppEditor"

	rules := make([]Rule, 0)
	groups := make(map[string]*Group)

	if r.Alert == "" {
		return groups, fmt.Errorf("at least one rule must be set")
	}
	rules = append(rules, NewThresholdRule(
		r.Alert,
		&r.QueryBuilder,
		time.Duration(r.HoldDuration),
		labels.FromMap(r.Labels),
		labels.FromMap(r.Annotations),
		log.With(m.logger, "alert", r.Alert),
	))
	
	groups[groupKey(groupName, filename)] = NewGroup(groupName, filename, r.Frequency, rules, m.opts)

	return groups, nil
}

// RuleGroups returns the list of manager's rule groups.
func (m *Manager) RuleGroups() []*Group {
	m.mtx.RLock()
	defer m.mtx.RUnlock()

	rgs := make([]*Group, 0, len(m.groups))
	for _, g := range m.groups {
		rgs = append(rgs, g)
	}

	sort.Slice(rgs, func(i, j int) bool {
		return rgs[i].file < rgs[j].file && rgs[i].name < rgs[j].name
	})

	return rgs
}

// RuleGroups returns the list of manager's rule groups.
func (m *Manager) RuleGroupsWithoutLock() []*Group {

	rgs := make([]*Group, 0, len(m.groups))
	for _, g := range m.groups {
		rgs = append(rgs, g)
	}

	sort.Slice(rgs, func(i, j int) bool {
		return rgs[i].file < rgs[j].file && rgs[i].name < rgs[j].name
	})

	return rgs
}

// Rules returns the list of the manager's rules.
func (m *Manager) Rules() []Rule {
	m.mtx.RLock()
	defer m.mtx.RUnlock()

	var rules []Rule
	for _, g := range m.groups {
		rules = append(rules, g.rules...)
	}

	return rules
}

// AlertingRules returns the list of the manager's alerting rules.
func (m *Manager) AlertingRules() []*AlertingRule {
	m.mtx.RLock()
	defer m.mtx.RUnlock()

	alerts := []*AlertingRule{}
	for _, rule := range m.Rules() {
		if alertingRule, ok := rule.(*AlertingRule); ok {
			alerts = append(alerts, alertingRule)
		}
	}
	return alerts
}


// NotifyFunc sends notifications about a set of alerts generated by the given expression.
type NotifyFunc func(ctx context.Context, expr string, alerts ...*Alert)

// sendAlerts implements the NotifyFunc for a Notifier.
func func (m *Manager) sendAlerts() NotifyFunc {
	return func(ctx context.Context, expr string, alerts ...*rules.Alert) {
		var res []*am.Alert

		for _, alert := range alerts {
			a := &notifier.Alert{
				StartsAt:     alert.FiredAt,
				Labels:       alert.Labels,
				Annotations:  alert.Annotations,
				GeneratorURL: m.opts.externalURL + strutil.TableLinkForExpression(expr),
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

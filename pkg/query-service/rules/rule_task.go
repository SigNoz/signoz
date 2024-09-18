package rules

import (
	"context"
	"fmt"
	"sort"
	"sync"
	"time"

	opentracing "github.com/opentracing/opentracing-go"
	"go.signoz.io/signoz/pkg/query-service/common"
	"go.signoz.io/signoz/pkg/query-service/utils/labels"
	"go.uber.org/zap"
)

// RuleTask holds a rule (with composite queries)
// and evaluates the rule at a given frequency
type RuleTask struct {
	name               string
	file               string
	frequency          time.Duration
	rules              []Rule
	opts               *ManagerOptions
	mtx                sync.Mutex
	evaluationDuration time.Duration
	evaluationTime     time.Duration
	lastEvaluation     time.Time

	done       chan struct{}
	terminated chan struct{}

	pause  bool
	notify NotifyFunc

	ruleDB RuleDB
}

const DefaultFrequency = 1 * time.Minute

// NewRuleTask makes a new RuleTask with the given name, options, and rules.
func NewRuleTask(name, file string, frequency time.Duration, rules []Rule, opts *ManagerOptions, notify NotifyFunc, ruleDB RuleDB) *RuleTask {

	if time.Now() == time.Now().Add(frequency) {
		frequency = DefaultFrequency
	}
	zap.L().Info("initiating a new rule task", zap.String("name", name), zap.Duration("frequency", frequency))

	return &RuleTask{
		name:       name,
		file:       file,
		pause:      false,
		frequency:  frequency,
		rules:      rules,
		opts:       opts,
		done:       make(chan struct{}),
		terminated: make(chan struct{}),
		notify:     notify,
		ruleDB:     ruleDB,
	}
}

// Name returns the group name.
func (g *RuleTask) Name() string { return g.name }

// Key returns the group key
func (g *RuleTask) Key() string {
	return g.name + ";" + g.file
}

// Name returns the group name.
func (g *RuleTask) Type() TaskType { return TaskTypeCh }

// Rules returns the group's rules.
func (g *RuleTask) Rules() []Rule { return g.rules }

// Interval returns the group's interval.
func (g *RuleTask) Interval() time.Duration { return g.frequency }

func (g *RuleTask) Pause(b bool) {
	g.mtx.Lock()
	defer g.mtx.Unlock()
	g.pause = b
}

type QueryOrigin struct{}

func NewQueryOriginContext(ctx context.Context, data map[string]interface{}) context.Context {
	return context.WithValue(ctx, QueryOrigin{}, data)
}

func (g *RuleTask) Run(ctx context.Context) {
	defer close(g.terminated)

	// Wait an initial amount to have consistently slotted intervals.
	evalTimestamp := g.EvalTimestamp(time.Now().UnixNano()).Add(g.frequency)
	zap.L().Debug("group run to begin at", zap.Time("evalTimestamp", evalTimestamp))
	select {
	case <-time.After(time.Until(evalTimestamp)):
	case <-g.done:
		return
	}

	ctx = NewQueryOriginContext(ctx, map[string]interface{}{
		"ruleRuleTask": map[string]string{
			"name": g.Name(),
		},
	})

	iter := func() {
		if g.pause {
			// todo(amol): remove in memory active alerts
			// and last series state
			return
		}
		start := time.Now()
		g.Eval(ctx, evalTimestamp)
		timeSinceStart := time.Since(start)

		g.setEvaluationTime(timeSinceStart)
		g.setLastEvaluation(start)
	}

	// The assumption here is that since the ticker was started after having
	// waited for `evalTimestamp` to pass, the ticks will trigger soon
	// after each `evalTimestamp + N * g.frequency` occurrence.
	tick := time.NewTicker(g.frequency)
	defer tick.Stop()

	iter()

	// let the group iterate and run
	for {
		select {
		case <-g.done:
			return
		default:
			select {
			case <-g.done:
				return
			case <-tick.C:
				missed := (time.Since(evalTimestamp) / g.frequency) - 1
				evalTimestamp = evalTimestamp.Add((missed + 1) * g.frequency)
				iter()
			}
		}
	}
}

func (g *RuleTask) Stop() {
	close(g.done)
	<-g.terminated
}

func (g *RuleTask) hash() uint64 {
	l := labels.New(
		labels.Label{Name: "name", Value: g.name},
	)
	return l.Hash()
}

// ThresholdRules returns the list of the group's threshold rules.
func (g *RuleTask) ThresholdRules() []*ThresholdRule {
	g.mtx.Lock()
	defer g.mtx.Unlock()
	var alerts []*ThresholdRule
	for _, rule := range g.rules {
		if tr, ok := rule.(*ThresholdRule); ok {
			alerts = append(alerts, tr)
		}
	}
	sort.Slice(alerts, func(i, j int) bool {
		return alerts[i].State() > alerts[j].State() ||
			(alerts[i].State() == alerts[j].State() &&
				alerts[i].Name() < alerts[j].Name())
	})
	return alerts
}

// HasAlertingRules returns true if the group contains at least one AlertingRule.
func (g *RuleTask) HasAlertingRules() bool {
	g.mtx.Lock()
	defer g.mtx.Unlock()

	for _, rule := range g.rules {
		if _, ok := rule.(*ThresholdRule); ok {
			return true
		}
	}
	return false
}

// GetEvaluationDuration returns the time in seconds it took to evaluate the rule group.
func (g *RuleTask) GetEvaluationDuration() time.Duration {
	g.mtx.Lock()
	defer g.mtx.Unlock()
	return g.evaluationDuration
}

// SetEvaluationDuration sets the time in seconds the last evaluation took.
func (g *RuleTask) SetEvaluationDuration(dur time.Duration) {
	g.mtx.Lock()
	defer g.mtx.Unlock()
	g.evaluationDuration = dur
}

// GetEvaluationTime returns the time in seconds it took to evaluate the rule group.
func (g *RuleTask) GetEvaluationTime() time.Duration {
	g.mtx.Lock()
	defer g.mtx.Unlock()
	return g.evaluationTime
}

// setEvaluationTime sets the time in seconds the last evaluation took.
func (g *RuleTask) setEvaluationTime(dur time.Duration) {
	g.mtx.Lock()
	defer g.mtx.Unlock()
	g.evaluationTime = dur
}

// GetLastEvaluation returns the time the last evaluation of the rule group took place.
func (g *RuleTask) GetLastEvaluation() time.Time {
	g.mtx.Lock()
	defer g.mtx.Unlock()
	return g.lastEvaluation
}

// setLastEvaluation updates evaluationTimestamp to the timestamp of when the rule group was last evaluated.
func (g *RuleTask) setLastEvaluation(ts time.Time) {
	g.mtx.Lock()
	defer g.mtx.Unlock()
	g.lastEvaluation = ts
}

// EvalTimestamp returns the immediately preceding consistently slotted evaluation time.
func (g *RuleTask) EvalTimestamp(startTime int64) time.Time {
	var (
		offset = int64(g.hash() % uint64(g.frequency))
		adjNow = startTime - offset
		base   = adjNow - (adjNow % int64(g.frequency))
	)

	return time.Unix(0, base+offset).UTC()
}

func nameAndLabels(rule Rule) string {
	return rule.Name() + rule.Labels().String()
}

// CopyState copies the alerting rule and staleness related state from the given group.
//
// Rules are matched based on their name and labels. If there are duplicates, the
// first is matched with the first, second with the second etc.
func (g *RuleTask) CopyState(fromTask Task) error {

	from, ok := fromTask.(*RuleTask)
	if !ok {
		return fmt.Errorf("invalid from task for copy")
	}
	g.evaluationTime = from.evaluationTime
	g.lastEvaluation = from.lastEvaluation

	ruleMap := make(map[string][]int, len(from.rules))

	for fi, fromRule := range from.rules {
		nameAndLabels := nameAndLabels(fromRule)
		l := ruleMap[nameAndLabels]
		ruleMap[nameAndLabels] = append(l, fi)
	}

	for _, rule := range g.rules {
		nameAndLabels := nameAndLabels(rule)
		indexes := ruleMap[nameAndLabels]
		if len(indexes) == 0 {
			continue
		}
		fi := indexes[0]
		ruleMap[nameAndLabels] = indexes[1:]

		ar, ok := rule.(*ThresholdRule)
		if !ok {
			continue
		}
		far, ok := from.rules[fi].(*ThresholdRule)
		if !ok {
			continue
		}

		for fp, a := range far.Active {
			ar.Active[fp] = a
		}
		ar.handledRestart = far.handledRestart
	}

	return nil
}

// Eval runs a single evaluation cycle in which all rules are evaluated sequentially.
func (g *RuleTask) Eval(ctx context.Context, ts time.Time) {

	zap.L().Debug("rule task eval started", zap.String("name", g.name), zap.Time("start time", ts))

	maintenance, err := g.ruleDB.GetAllPlannedMaintenance(ctx)

	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
	}

	for i, rule := range g.rules {
		if rule == nil {
			continue
		}

		shouldSkip := false
		for _, m := range maintenance {
			zap.L().Info("checking if rule should be skipped", zap.String("rule", rule.ID()), zap.Any("maintenance", m))
			if m.shouldSkip(rule.ID(), ts) {
				shouldSkip = true
				break
			}
		}

		if shouldSkip {
			zap.L().Info("rule should be skipped", zap.String("rule", rule.ID()))
			continue
		}

		select {
		case <-g.done:
			return
		default:
		}

		func(i int, rule Rule) {
			sp, ctx := opentracing.StartSpanFromContext(ctx, "rule")

			sp.SetTag("name", rule.Name())
			defer func(t time.Time) {
				sp.Finish()

				since := time.Since(t)
				rule.SetEvaluationDuration(since)
				rule.SetEvaluationTimestamp(t)
			}(time.Now())

			kvs := map[string]string{
				"alertID": rule.ID(),
				"source":  "alerts",
				"client":  "query-service",
			}
			ctx = context.WithValue(ctx, common.LogCommentKey, kvs)

			_, err := rule.Eval(ctx, ts)
			if err != nil {
				rule.SetHealth(HealthBad)
				rule.SetLastError(err)

				zap.L().Warn("Evaluating rule failed", zap.String("ruleid", rule.ID()), zap.Error(err))

				// Canceled queries are intentional termination of queries. This normally
				// happens on shutdown and thus we skip logging of any errors here.
				//! if _, ok := err.(promql.ErrQueryCanceled); !ok {
				//	level.Warn(g.logger).Log("msg", "Evaluating rule failed", "rule", rule, "err", err)
				//}
				return
			}

			rule.SendAlerts(ctx, ts, g.opts.ResendDelay, g.frequency, g.notify)

		}(i, rule)
	}
}

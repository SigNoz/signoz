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
	opentracing "github.com/opentracing/opentracing-go"
	"github.com/pkg/errors"
	"go.signoz.io/query-service/utils/labels"
)

// Group is a set of rules that have a logical relation.
type Group struct {
	name                 string
	file                 string
	frequency            time.Duration
	rules                []Rule
	seriesInPreviousEval []map[string]labels.Labels // One per Rule.
	staleSeries          []labels.Labels
	opts                 *ManagerOptions
	mtx                  sync.Mutex
	evaluationDuration   time.Duration
	evaluationTime       time.Duration
	lastEvaluation       time.Time

	markStale   bool
	done        chan struct{}
	terminated  chan struct{}
	managerDone chan struct{}

	logger log.Logger
}

func groupKey(name, file string) string {
	return name + ";" + file
}

// NewGroup makes a new Group with the given name, options, and rules.
func NewGroup(name, file string, frequency time.Duration, rules []Rule, opts *ManagerOptions) *Group {

	return &Group{
		name:                 name,
		file:                 file,
		frequency:            frequency,
		rules:                rules,
		opts:                 opts,
		seriesInPreviousEval: make([]map[string]labels.Labels, len(rules)),
		done:                 make(chan struct{}),
		terminated:           make(chan struct{}),
		logger:               log.With(opts.Logger, "group", name),
	}
}

// Name returns the group name.
func (g *Group) Name() string { return g.name }

// Rules returns the group's rules.
func (g *Group) Rules() []Rule { return g.rules }

// Interval returns the group's interval.
func (g *Group) Interval() time.Duration { return g.frequency }

type QueryOrigin struct{}

func NewQueryOriginContext(ctx context.Context, data map[string]interface{}) context.Context {
	return context.WithValue(ctx, QueryOrigin{}, data)
}

func (g *Group) run(ctx context.Context) {
	defer close(g.terminated)

	// Wait an initial amount to have consistently slotted intervals.
	evalTimestamp := g.EvalTimestamp(time.Now().UnixNano()).Add(g.frequency)

	select {
	case <-time.After(time.Until(evalTimestamp)):
	case <-g.done:
		return
	}

	ctx = NewQueryOriginContext(ctx, map[string]interface{}{
		"ruleGroup": map[string]string{
			"name": g.Name(),
		},
	})

	iter := func() {

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

	// defer cleanup
	defer func() {
		if !g.markStale {
			return
		}
		go func(now time.Time) {
			for _, rule := range g.seriesInPreviousEval {
				for _, r := range rule {
					g.staleSeries = append(g.staleSeries, r)
				}
			}
			// That can be garbage collected at this point.
			g.seriesInPreviousEval = nil

		}(time.Now())

	}()

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

func (g *Group) stop() {
	close(g.done)
	<-g.terminated
}

func (g *Group) hash() uint64 {
	l := labels.New(
		labels.Label{Name: "name", Value: g.name},
	)
	return l.Hash()
}

// ThresholdRules returns the list of the group's threshold rules.
func (g *Group) ThresholdRules() []*ThresholdRule {
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
func (g *Group) HasAlertingRules() bool {
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
func (g *Group) GetEvaluationDuration() time.Duration {
	g.mtx.Lock()
	defer g.mtx.Unlock()
	return g.evaluationDuration
}

// SetEvaluationDuration sets the time in seconds the last evaluation took.
func (g *Group) SetEvaluationDuration(dur time.Duration) {
	g.mtx.Lock()
	defer g.mtx.Unlock()
	g.evaluationDuration = dur
}

// GetEvaluationTime returns the time in seconds it took to evaluate the rule group.
func (g *Group) GetEvaluationTime() time.Duration {
	g.mtx.Lock()
	defer g.mtx.Unlock()
	return g.evaluationTime
}

// setEvaluationTime sets the time in seconds the last evaluation took.
func (g *Group) setEvaluationTime(dur time.Duration) {
	g.mtx.Lock()
	defer g.mtx.Unlock()
	g.evaluationTime = dur
}

// GetLastEvaluation returns the time the last evaluation of the rule group took place.
func (g *Group) GetLastEvaluation() time.Time {
	g.mtx.Lock()
	defer g.mtx.Unlock()
	return g.lastEvaluation
}

// setLastEvaluation updates evaluationTimestamp to the timestamp of when the rule group was last evaluated.
func (g *Group) setLastEvaluation(ts time.Time) {
	g.mtx.Lock()
	defer g.mtx.Unlock()
	g.lastEvaluation = ts
}

// EvalTimestamp returns the immediately preceding consistently slotted evaluation time.
func (g *Group) EvalTimestamp(startTime int64) time.Time {
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
func (g *Group) CopyState(from *Group) {
	g.evaluationTime = from.evaluationTime
	g.lastEvaluation = from.lastEvaluation

	ruleMap := make(map[string][]int, len(from.rules))

	for fi, fromRule := range from.rules {
		nameAndLabels := nameAndLabels(fromRule)
		l := ruleMap[nameAndLabels]
		ruleMap[nameAndLabels] = append(l, fi)
	}

	for i, rule := range g.rules {
		nameAndLabels := nameAndLabels(rule)
		indexes := ruleMap[nameAndLabels]
		if len(indexes) == 0 {
			continue
		}
		fi := indexes[0]
		g.seriesInPreviousEval[i] = from.seriesInPreviousEval[fi]
		ruleMap[nameAndLabels] = indexes[1:]

		ar, ok := rule.(*ThresholdRule)
		if !ok {
			continue
		}
		far, ok := from.rules[fi].(*ThresholdRule)
		if !ok {
			continue
		}

		for fp, a := range far.active {
			ar.active[fp] = a
		}
	}

	// Handle deleted and unmatched duplicate rules.
	g.staleSeries = from.staleSeries
	for fi, fromRule := range from.rules {
		nameAndLabels := nameAndLabels(fromRule)
		l := ruleMap[nameAndLabels]
		if len(l) != 0 {
			for _, series := range from.seriesInPreviousEval[fi] {
				g.staleSeries = append(g.staleSeries, series)
			}
		}
	}
}

// Eval runs a single evaluation cycle in which all rules are evaluated sequentially.
func (g *Group) Eval(ctx context.Context, ts time.Time) {
	var samplesTotal float64
	for i, rule := range g.rules {
		if rule == nil {
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

			vector, err := rule.Eval(ctx, ts, g.opts.Queriers, g.opts.ExternalURL)
			if err != nil {
				rule.SetHealth(HealthBad)
				rule.SetLastError(err)

				level.Warn(g.logger).Log("msg", "Evaluating rule failed", "rule", rule, "err", err)

				// Canceled queries are intentional termination of queries. This normally
				// happens on shutdown and thus we skip logging of any errors here.
				//! if _, ok := err.(promql.ErrQueryCanceled); !ok {
				//	level.Warn(g.logger).Log("msg", "Evaluating rule failed", "rule", rule, "err", err)
				//}
				return
			}
			samplesTotal += float64(len(vector))

			if ar, ok := rule.(*ThresholdRule); ok {
				ar.sendAlerts(ctx, ts, g.opts.ResendDelay, g.interval, g.opts.NotifyFunc)
			}

			seriesReturned := make(map[string]labels.Labels, len(g.seriesInPreviousEval[i]))

			defer func() {
				g.seriesInPreviousEval[i] = seriesReturned
			}()

			for _, s := range vector {
				seriesReturned[s.Metric.String()] = s.Metric
			}

		}(i, rule)
	}
}

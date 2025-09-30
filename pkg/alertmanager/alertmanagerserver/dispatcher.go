package alertmanagerserver

import (
	"context"
	"fmt"
	"log/slog"
	"sort"
	"sync"
	"time"

	"github.com/SigNoz/signoz/pkg/alertmanager/nfmanager"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"

	"github.com/prometheus/alertmanager/dispatch"
	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/pkg/labels"
	"github.com/prometheus/alertmanager/provider"
	"github.com/prometheus/alertmanager/store"
	"github.com/prometheus/alertmanager/types"
	"github.com/prometheus/common/model"
)

// Dispatcher sorts incoming alerts into aggregation groups and
// assigns the correct notifiers to each.
type Dispatcher struct {
	route   *dispatch.Route
	alerts  provider.Alerts
	stage   notify.Stage
	marker  types.GroupMarker
	metrics *DispatcherMetrics
	limits  Limits

	timeout func(time.Duration) time.Duration

	mtx                sync.RWMutex
	aggrGroupsPerRoute map[*dispatch.Route]map[model.Fingerprint]*aggrGroup
	aggrGroupsNum      int

	done   chan struct{}
	ctx    context.Context
	cancel func()

	logger              *slog.Logger
	notificationManager nfmanager.NotificationManager
	orgID               string
	receiverRoutes      map[string]*dispatch.Route
}

// We use the upstream Limits interface from Prometheus
type Limits = dispatch.Limits

// NewDispatcher returns a new Dispatcher.
func NewDispatcher(
	ap provider.Alerts,
	r *dispatch.Route,
	s notify.Stage,
	mk types.GroupMarker,
	to func(time.Duration) time.Duration,
	lim Limits,
	l *slog.Logger,
	m *DispatcherMetrics,
	n nfmanager.NotificationManager,
	orgID string,
) *Dispatcher {
	if lim == nil {
		// Use a simple implementation when no limits are provided
		lim = &unlimitedLimits{}
	}

	disp := &Dispatcher{
		alerts:              ap,
		stage:               s,
		route:               r,
		marker:              mk,
		timeout:             to,
		logger:              l.With("component", "signoz-dispatcher"),
		metrics:             m,
		limits:              lim,
		notificationManager: n,
		orgID:               orgID,
	}
	return disp
}

// Run starts dispatching alerts incoming via the updates channel.
func (d *Dispatcher) Run() {
	d.done = make(chan struct{})

	d.mtx.Lock()
	d.aggrGroupsPerRoute = map[*dispatch.Route]map[model.Fingerprint]*aggrGroup{}
	d.receiverRoutes = map[string]*dispatch.Route{}
	d.aggrGroupsNum = 0
	d.metrics.aggrGroups.Set(0)
	d.ctx, d.cancel = context.WithCancel(context.Background())
	d.mtx.Unlock()

	d.run(d.alerts.Subscribe())
	close(d.done)
}

func (d *Dispatcher) run(it provider.AlertIterator) {
	maintenance := time.NewTicker(30 * time.Second)
	defer maintenance.Stop()

	defer it.Close()

	for {
		select {
		case alert, ok := <-it.Next():
			if !ok {
				// Iterator exhausted for some reason.
				if err := it.Err(); err != nil {
					d.logger.ErrorContext(d.ctx, "Error on alert update", "err", err)
				}
				return
			}

			d.logger.DebugContext(d.ctx, "SigNoz Custom Dispatcher: Received alert", "alert", alert)

			// Log errors but keep trying.
			if err := it.Err(); err != nil {
				d.logger.ErrorContext(d.ctx, "Error on alert update", "err", err)
				continue
			}

			now := time.Now()
			channels, err := d.notificationManager.Match(d.ctx, d.orgID, getRuleIDFromAlert(alert), alert.Labels)
			if err != nil {
				d.logger.ErrorContext(d.ctx, "Error on alert match", "err", err)
				continue
			}
			for _, channel := range channels {
				route := d.getOrCreateRoute(channel)
				d.processAlert(alert, route)
			}
			d.metrics.processingDuration.Observe(time.Since(now).Seconds())

		case <-maintenance.C:
			d.doMaintenance()
		case <-d.ctx.Done():
			return
		}
	}
}

func (d *Dispatcher) doMaintenance() {
	d.mtx.Lock()
	defer d.mtx.Unlock()
	for _, groups := range d.aggrGroupsPerRoute {
		for _, ag := range groups {
			if ag.empty() {
				ag.stop()
				d.marker.DeleteByGroupKey(ag.routeID, ag.GroupKey())
				delete(groups, ag.fingerprint())
				d.aggrGroupsNum--
				d.metrics.aggrGroups.Dec()
			}
		}
	}
}

// AlertGroup represents how alerts exist within an aggrGroup.
type AlertGroup struct {
	Alerts   types.AlertSlice
	Labels   model.LabelSet
	Receiver string
	GroupKey string
	RouteID  string
	Renotify time.Duration
}

type AlertGroups []*AlertGroup

func (ag AlertGroups) Swap(i, j int) { ag[i], ag[j] = ag[j], ag[i] }
func (ag AlertGroups) Less(i, j int) bool {
	if ag[i].Labels.Equal(ag[j].Labels) {
		return ag[i].Receiver < ag[j].Receiver
	}
	return ag[i].Labels.Before(ag[j].Labels)
}
func (ag AlertGroups) Len() int { return len(ag) }

// Groups returns a slice of AlertGroups from the dispatcher's internal state.
func (d *Dispatcher) Groups(routeFilter func(*dispatch.Route) bool, alertFilter func(*types.Alert, time.Time) bool) (AlertGroups, map[model.Fingerprint][]string) {
	groups := AlertGroups{}

	d.mtx.RLock()
	defer d.mtx.RUnlock()

	// Keep a list of receivers for an alert to prevent checking each alert
	// again against all routes. The alert has already matched against this
	// route on ingestion.
	receivers := map[model.Fingerprint][]string{}

	now := time.Now()
	for route, ags := range d.aggrGroupsPerRoute {
		if !routeFilter(route) {
			continue
		}

		for _, ag := range ags {
			receiver := route.RouteOpts.Receiver
			alertGroup := &AlertGroup{
				Labels:   ag.labels,
				Receiver: receiver,
				GroupKey: ag.GroupKey(),
				RouteID:  ag.routeID,
				Renotify: ag.opts.RepeatInterval,
			}

			alerts := ag.alerts.List()
			filteredAlerts := make([]*types.Alert, 0, len(alerts))
			for _, a := range alerts {
				if !alertFilter(a, now) {
					continue
				}

				fp := a.Fingerprint()
				if r, ok := receivers[fp]; ok {
					// Receivers slice already exists. Add
					// the current receiver to the slice.
					receivers[fp] = append(r, receiver)
				} else {
					// First time we've seen this alert fingerprint.
					// Initialize a new receivers slice.
					receivers[fp] = []string{receiver}
				}

				filteredAlerts = append(filteredAlerts, a)
			}
			if len(filteredAlerts) == 0 {
				continue
			}
			alertGroup.Alerts = filteredAlerts

			groups = append(groups, alertGroup)
		}
	}
	sort.Sort(groups)
	for i := range groups {
		sort.Sort(groups[i].Alerts)
	}
	for i := range receivers {
		sort.Strings(receivers[i])
	}

	return groups, receivers
}

// Stop the dispatcher.
func (d *Dispatcher) Stop() {
	if d == nil {
		return
	}
	d.mtx.Lock()
	if d.cancel == nil {
		d.mtx.Unlock()
		return
	}
	d.cancel()
	d.cancel = nil
	d.mtx.Unlock()

	<-d.done
}

// notifyFunc is a function that performs notification for the alert
// with the given fingerprint. It aborts on context cancelation.
// Returns false iff notifying failed.
type notifyFunc func(context.Context, ...*types.Alert) bool

// processAlert determines in which aggregation group the alert falls
// and inserts it.
// no data alert will only have ruleId and no data label
func (d *Dispatcher) processAlert(alert *types.Alert, route *dispatch.Route) {
	ruleId := getRuleIDFromAlert(alert)
	config, err := d.notificationManager.GetNotificationConfig(d.orgID, ruleId)
	if err != nil {
		d.logger.ErrorContext(d.ctx, "error getting alert notification config", "rule_id", ruleId, "error", err)
		return
	}
	renotifyInterval := config.Renotify.RenotifyInterval

	groupLabels := getGroupLabels(alert, config.NotificationGroup, config.GroupByAll)

	if alertmanagertypes.NoDataAlert(alert) {
		renotifyInterval = config.Renotify.NoDataInterval
		groupLabels[alertmanagertypes.NoDataLabel] = alert.Labels[alertmanagertypes.NoDataLabel] //to create new group key for no data alerts
	}

	fp := groupLabels.Fingerprint()

	d.mtx.Lock()
	defer d.mtx.Unlock()

	routeGroups, ok := d.aggrGroupsPerRoute[route]
	if !ok {
		routeGroups = map[model.Fingerprint]*aggrGroup{}
		d.aggrGroupsPerRoute[route] = routeGroups
	}

	ag, ok := routeGroups[fp]
	if ok {
		ag.insert(alert)
		return
	}

	// If the group does not exist, create it. But check the limit first.
	if limit := d.limits.MaxNumberOfAggregationGroups(); limit > 0 && d.aggrGroupsNum >= limit {
		d.metrics.aggrGroupLimitReached.Inc()
		d.logger.ErrorContext(d.ctx, "Too many aggregation groups, cannot create new group for alert", "groups", d.aggrGroupsNum, "limit", limit, "alert", alert.Name())
		return
	}

	ag = newAggrGroup(d.ctx, groupLabels, route, d.timeout, d.logger, renotifyInterval)

	routeGroups[fp] = ag
	d.aggrGroupsNum++
	d.metrics.aggrGroups.Inc()

	// Insert the 1st alert in the group before starting the group's run()
	// function, to make sure that when the run() will be executed the 1st
	// alert is already there.
	ag.insert(alert)

	go ag.run(func(ctx context.Context, alerts ...*types.Alert) bool {
		_, _, err := d.stage.Exec(ctx, d.logger, alerts...)
		if err != nil {
			logger := d.logger.With("num_alerts", len(alerts), "err", err)
			if errors.Is(ctx.Err(), context.Canceled) {
				// It is expected for the context to be canceled on
				// configuration reload or shutdown. In this case, the
				// message should only be logged at the debug level.
				logger.DebugContext(ctx, "Notify for alerts failed")
			} else {
				logger.ErrorContext(ctx, "Notify for alerts failed")
			}
		}
		return err == nil
	})
}

// aggrGroup aggregates alert fingerprints into groups to which a
// common set of routing options applies.
// It emits notifications in the specified intervals.
type aggrGroup struct {
	labels   model.LabelSet
	opts     *dispatch.RouteOpts
	logger   *slog.Logger
	routeID  string
	routeKey string

	alerts  *store.Alerts
	ctx     context.Context
	cancel  func()
	done    chan struct{}
	next    *time.Timer
	timeout func(time.Duration) time.Duration

	mtx        sync.RWMutex
	hasFlushed bool
}

// newAggrGroup returns a new aggregation group.
func newAggrGroup(ctx context.Context, labels model.LabelSet, r *dispatch.Route, to func(time.Duration) time.Duration, logger *slog.Logger, renotify time.Duration) *aggrGroup {
	if to == nil {
		to = func(d time.Duration) time.Duration { return d }
	}

	opts := deepCopyRouteOpts(r.RouteOpts, renotify)

	ag := &aggrGroup{
		labels:   labels,
		routeID:  r.ID(),
		routeKey: r.Key(),
		opts:     &opts,
		timeout:  to,
		alerts:   store.NewAlerts(),
		done:     make(chan struct{}),
	}
	ag.ctx, ag.cancel = context.WithCancel(ctx)

	ag.logger = logger.With("aggr_group", ag)

	// Set an initial one-time wait before flushing
	// the first batch of notifications.
	ag.next = time.NewTimer(ag.opts.GroupWait)

	return ag
}

func (ag *aggrGroup) fingerprint() model.Fingerprint {
	return ag.labels.Fingerprint()
}

func (ag *aggrGroup) GroupKey() string {
	return fmt.Sprintf("%s:%s", ag.routeKey, ag.labels)
}

func (ag *aggrGroup) String() string {
	return ag.GroupKey()
}

func (ag *aggrGroup) run(nf notifyFunc) {
	defer close(ag.done)
	defer ag.next.Stop()

	for {
		select {
		case now := <-ag.next.C:
			// Give the notifications time until the next flush to
			// finish before terminating them.
			ctx, cancel := context.WithTimeout(ag.ctx, ag.timeout(ag.opts.GroupInterval))

			// The now time we retrieve from the ticker is the only reliable
			// point of time reference for the subsequent notification pipeline.
			// Calculating the current time directly is prone to flaky behavior,
			// which usually only becomes apparent in tests.
			ctx = notify.WithNow(ctx, now)

			// Populate context with information needed along the pipeline.
			ctx = notify.WithGroupKey(ctx, ag.GroupKey())
			ctx = notify.WithGroupLabels(ctx, ag.labels)
			ctx = notify.WithReceiverName(ctx, ag.opts.Receiver)
			ctx = notify.WithRepeatInterval(ctx, ag.opts.RepeatInterval)
			ctx = notify.WithMuteTimeIntervals(ctx, ag.opts.MuteTimeIntervals)
			ctx = notify.WithActiveTimeIntervals(ctx, ag.opts.ActiveTimeIntervals)
			ctx = notify.WithRouteID(ctx, ag.routeID)

			// Wait the configured interval before calling flush again.
			ag.mtx.Lock()
			ag.next.Reset(ag.opts.GroupInterval)
			ag.hasFlushed = true
			ag.mtx.Unlock()

			ag.flush(func(alerts ...*types.Alert) bool {
				return nf(ctx, alerts...)
			})

			cancel()

		case <-ag.ctx.Done():
			return
		}
	}
}

func (ag *aggrGroup) stop() {
	// Calling cancel will terminate all in-process notifications
	// and the run() loop.
	ag.cancel()
	<-ag.done
}

// insert inserts the alert into the aggregation group.
func (ag *aggrGroup) insert(alert *types.Alert) {
	if err := ag.alerts.Set(alert); err != nil {
		ag.logger.ErrorContext(ag.ctx, "error on set alert", "err", err)
	}

	// Immediately trigger a flush if the wait duration for this
	// alert is already over.
	ag.mtx.Lock()
	defer ag.mtx.Unlock()
	if !ag.hasFlushed && alert.StartsAt.Add(ag.opts.GroupWait).Before(time.Now()) {
		ag.next.Reset(0)
	}
}

func (ag *aggrGroup) empty() bool {
	return ag.alerts.Empty()
}

// flush sends notifications for all new alerts.
func (ag *aggrGroup) flush(notify func(...*types.Alert) bool) {
	if ag.empty() {
		return
	}

	var (
		alerts        = ag.alerts.List()
		alertsSlice   = make(types.AlertSlice, 0, len(alerts))
		resolvedSlice = make(types.AlertSlice, 0, len(alerts))
		now           = time.Now()
	)
	for _, alert := range alerts {
		a := *alert
		// Ensure that alerts don't resolve as time move forwards.
		if a.ResolvedAt(now) {
			resolvedSlice = append(resolvedSlice, &a)
		} else {
			a.EndsAt = time.Time{}
		}
		alertsSlice = append(alertsSlice, &a)
	}
	sort.Stable(alertsSlice)

	ag.logger.DebugContext(ag.ctx, "flushing", "alerts", fmt.Sprintf("%v", alertsSlice))

	if notify(alertsSlice...) {
		// Delete all resolved alerts as we just sent a notification for them,
		// and we don't want to send another one. However, we need to make sure
		// that each resolved alert has not fired again during the flush as then
		// we would delete an active alert thinking it was resolved.
		if err := ag.alerts.DeleteIfNotModified(resolvedSlice); err != nil {
			ag.logger.ErrorContext(ag.ctx, "error on delete alerts", "err", err)
		}
	}
}

// unlimitedLimits provides unlimited aggregation groups for SigNoz
type unlimitedLimits struct{}

func (u *unlimitedLimits) MaxNumberOfAggregationGroups() int { return 0 }

func getRuleIDFromAlert(alert *types.Alert) string {
	for name, value := range alert.Labels {
		if string(name) == "ruleId" {
			return string(value)
		}
	}
	return ""
}

func deepCopyRouteOpts(opts dispatch.RouteOpts, renotify time.Duration) dispatch.RouteOpts {
	newOpts := opts

	if opts.GroupBy != nil {
		newOpts.GroupBy = make(map[model.LabelName]struct{}, len(opts.GroupBy))
		for k, v := range opts.GroupBy {
			newOpts.GroupBy[k] = v
		}
	}

	if opts.MuteTimeIntervals != nil {
		newOpts.MuteTimeIntervals = make([]string, len(opts.MuteTimeIntervals))
		copy(newOpts.MuteTimeIntervals, opts.MuteTimeIntervals)
	}

	if opts.ActiveTimeIntervals != nil {
		newOpts.ActiveTimeIntervals = make([]string, len(opts.ActiveTimeIntervals))
		copy(newOpts.ActiveTimeIntervals, opts.ActiveTimeIntervals)
	}

	if renotify > 0 {
		newOpts.RepeatInterval = renotify
	}

	return newOpts
}

func getGroupLabels(alert *types.Alert, groups map[model.LabelName]struct{}, groupByAll bool) model.LabelSet {
	groupLabels := model.LabelSet{}
	for ln, lv := range alert.Labels {
		if _, ok := groups[ln]; ok || groupByAll {
			groupLabels[ln] = lv
		}
	}
	return groupLabels
}

func (d *Dispatcher) getOrCreateRoute(receiver string) *dispatch.Route {
	d.mtx.Lock()
	defer d.mtx.Unlock()
	if route, exists := d.receiverRoutes[receiver]; exists {
		return route
	}
	route := &dispatch.Route{
		RouteOpts: dispatch.RouteOpts{
			Receiver:      receiver,
			GroupWait:     30 * time.Second,
			GroupInterval: 5 * time.Minute,
			GroupByAll:    false,
		},
		Matchers: labels.Matchers{{
			Name:  "__receiver__",
			Value: receiver,
			Type:  labels.MatchEqual,
		}},
	}
	d.receiverRoutes[receiver] = route
	return route
}

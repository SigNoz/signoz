package alertManager

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"sync/atomic"

	"net/http"
	"net/url"
	"sync"
	"time"

	old_ctx "golang.org/x/net/context"

	"github.com/go-kit/log"
	"github.com/go-kit/log/level"

	"go.uber.org/zap"
	"golang.org/x/net/context/ctxhttp"
)

const (
	alertPushEndpoint = "v1/alerts"
	contentTypeJSON   = "application/json"
)

// Notifier is responsible for dispatching alert notifications to an
// alert manager service.
type Notifier struct {
	queue []*Alert
	opts  *NotifierOptions

	more   chan struct{}
	mtx    sync.RWMutex
	ctx    context.Context
	cancel func()

	alertmanagers *alertmanagerSet
	logger        log.Logger
}

// NotifierOptions are the configurable parameters of a Handler.
type NotifierOptions struct {
	QueueCapacity int
	// Used for sending HTTP requests to the Alertmanager.
	Do func(ctx old_ctx.Context, client *http.Client, req *http.Request) (*http.Response, error)
	// List of alert manager urls
	AlertManagerURLs []string
	// timeout limit on requests
	Timeout time.Duration
}

func (opts *NotifierOptions) String() string {
	var urls string
	for _, u := range opts.AlertManagerURLs {
		urls = fmt.Sprintf("%s %s", urls, u)
	}
	return urls
}

// todo(amol): add metrics

func NewNotifier(o *NotifierOptions, logger log.Logger) (*Notifier, error) {
	ctx, cancel := context.WithCancel(context.Background())
	if o.Do == nil {
		o.Do = ctxhttp.Do
	}
	if logger == nil {
		logger = log.NewNopLogger()
	}

	n := &Notifier{
		queue:  make([]*Alert, 0, o.QueueCapacity),
		ctx:    ctx,
		cancel: cancel,
		more:   make(chan struct{}, 1),
		opts:   o,
		logger: logger,
	}
	timeout := o.Timeout

	if int64(timeout) == 0 {
		timeout = time.Duration(30 * time.Second)
	}

	amset, err := newAlertmanagerSet(o.AlertManagerURLs, timeout, logger)
	if err != nil {
		zap.L().Error("failed to parse alert manager urls")
		return n, err
	}
	n.alertmanagers = amset
	zap.L().Info("Starting notifier with alert manager", zap.Strings("urls", o.AlertManagerURLs))
	return n, nil
}

const maxBatchSize = 64

func (n *Notifier) queueLen() int {
	n.mtx.RLock()
	defer n.mtx.RUnlock()

	return len(n.queue)
}

func (n *Notifier) nextBatch() []*Alert {
	n.mtx.Lock()
	defer n.mtx.Unlock()

	var alerts []*Alert

	if len(n.queue) > maxBatchSize {
		alerts = append(make([]*Alert, 0, maxBatchSize), n.queue[:maxBatchSize]...)
		n.queue = n.queue[maxBatchSize:]
	} else {
		alerts = append(make([]*Alert, 0, len(n.queue)), n.queue...)
		n.queue = n.queue[:0]
	}

	return alerts
}

// Run dispatches notifications continuously.
func (n *Notifier) Run() {
	zap.L().Info("msg: Initiating alert notifier...")
	for {
		select {
		case <-n.ctx.Done():
			return
		case <-n.more:
		}
		alerts := n.nextBatch()

		if !n.sendAll(alerts...) {
			zap.L().Warn("msg: dropped alerts", zap.Int("count", len(alerts)))
			// n.metrics.dropped.Add(float64(len(alerts)))
		}
		// If the queue still has items left, kick off the next iteration.
		if n.queueLen() > 0 {
			n.setMore()
		}
	}
}

// Send queues the given notification requests for processing.
// Panics if called on a handler that is not running.
func (n *Notifier) Send(alerts ...*Alert) {
	n.mtx.Lock()
	defer n.mtx.Unlock()

	// Queue capacity should be significantly larger than a single alert
	// batch could be.
	if d := len(alerts) - n.opts.QueueCapacity; d > 0 {
		alerts = alerts[d:]

		level.Warn(n.logger).Log("msg", "Alert batch larger than queue capacity, dropping alerts", "num_dropped", d)
		//n.metrics.dropped.Add(float64(d))
	}

	// If the queue is full, remove the oldest alerts in favor
	// of newer ones.
	if d := (len(n.queue) + len(alerts)) - n.opts.QueueCapacity; d > 0 {
		n.queue = n.queue[d:]

		level.Warn(n.logger).Log("msg", "Alert notification queue full, dropping alerts", "num_dropped", d)
		//n.metrics.dropped.Add(float64(d))
	}
	n.queue = append(n.queue, alerts...)

	// Notify sending goroutine that there are alerts to be processed.
	n.setMore()
}

// setMore signals that the alert queue has items.
func (n *Notifier) setMore() {
	// If we cannot send on the channel, it means the signal already exists
	// and has not been consumed yet.
	select {
	case n.more <- struct{}{}:
	default:
	}
}

// Alertmanagers returns a slice of Alertmanager URLs.
func (n *Notifier) Alertmanagers() []*url.URL {
	n.mtx.RLock()
	amset := n.alertmanagers
	n.mtx.RUnlock()

	var res []*url.URL

	amset.mtx.RLock()
	for _, am := range amset.ams {
		res = append(res, am.URLPath(alertPushEndpoint))
	}
	amset.mtx.RUnlock()

	return res
}

// sendAll sends the alerts to all configured Alertmanagers concurrently.
// It returns true if the alerts could be sent successfully to at least one Alertmanager.
func (n *Notifier) sendAll(alerts ...*Alert) bool {

	b, err := json.Marshal(alerts)
	if err != nil {
		zap.L().Error("Encoding alerts failed", zap.Error(err))
		return false
	}

	n.mtx.RLock()
	ams := n.alertmanagers
	n.mtx.RUnlock()

	var (
		wg         sync.WaitGroup
		numSuccess uint64
	)

	ams.mtx.RLock()

	for _, am := range ams.ams {
		wg.Add(1)

		ctx, cancel := context.WithTimeout(n.ctx, time.Duration(ams.timeout))
		defer cancel()

		go func(ams *alertmanagerSet, am Manager) {
			u := am.URLPath(alertPushEndpoint).String()
			if err := n.sendOne(ctx, ams.client, u, b); err != nil {
				zap.L().Error("Error calling alert API", zap.String("alertmanager", u), zap.Int("count", len(alerts)), zap.Error(err))
			} else {
				atomic.AddUint64(&numSuccess, 1)
			}
			// n.metrics.latency.WithLabelValues(u).Observe(time.Since(begin).Seconds())
			// n.metrics.sent.WithLabelValues(u).Add(float64(len(alerts)))

			wg.Done()
		}(ams, am)
	}
	ams.mtx.RUnlock()

	wg.Wait()

	return numSuccess > 0
}

func (n *Notifier) sendOne(ctx context.Context, c *http.Client, url string, b []byte) error {
	req, err := http.NewRequest("POST", url, bytes.NewReader(b))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", contentTypeJSON)
	resp, err := n.opts.Do(ctx, c, req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	// Any HTTP status 2xx is OK.
	if resp.StatusCode/100 != 2 {
		return fmt.Errorf("bad response status %v", resp.Status)
	}
	return err
}

// Stop shuts down the notification handler.
func (n *Notifier) Stop() {
	level.Info(n.logger).Log("msg", "Stopping notification manager...")
	n.cancel()
}

// alertmanagerSet contains a set of Alertmanagers discovered via a group of service
// discovery definitions that have a common configuration on how alerts should be sent.
type alertmanagerSet struct {
	urls    []string
	client  *http.Client
	timeout time.Duration
	mtx     sync.RWMutex
	ams     []Manager

	logger log.Logger
}

func newAlertmanagerSet(urls []string, timeout time.Duration, logger log.Logger) (*alertmanagerSet, error) {
	client := &http.Client{}

	s := &alertmanagerSet{
		client:  client,
		urls:    urls,
		logger:  logger,
		timeout: timeout,
	}

	ams := []Manager{}
	for _, u := range urls {
		am, err := New(WithURL(u))
		if err != nil {
			level.Error(s.logger).Log(fmt.Sprintf("invalid alert manager url %s: %s", u, err))
		} else {
			ams = append(ams, am)
		}
	}
	if len(ams) == 0 {
		return s, fmt.Errorf("no alert managers")
	}
	s.ams = ams
	return s, nil
}

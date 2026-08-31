package prometheus

import (
	"context"
	"log/slog"
	"math"
	"net/http"
	"strconv"
	"time"

	promModel "github.com/prometheus/common/model"
	"github.com/prometheus/prometheus/promql"
	"github.com/prometheus/prometheus/util/stats"

	"github.com/SigNoz/signoz/pkg/errors"
)

// Handler serves the Prometheus HTTP query API over a Prometheus provider:
// /query and /query_range in the shape of Prometheus' /api/v1 endpoints
// (https://prometheus.io/docs/prometheus/latest/querying/api/), intended to
// be mounted under a distinguishing prefix (/prometheus/api/v1) so
// PromQL-only endpoints are separate from the SigNoz query APIs. The request
// and response contracts follow Prometheus: form-encoded GET/POST params,
// {"status":"success","data":{resultType,result}} on success and
// {"status":"error","errorType","error"} with Prometheus' status codes on
// failure — so Prometheus-compatible clients can point at the prefix. The
// wire shapes are documented as OpenAPI schemas in render.go.
type Handler interface {
	Query(http.ResponseWriter, *http.Request)

	QueryRange(http.ResponseWriter, *http.Request)
}

type handler struct {
	logger *slog.Logger
	prom   Prometheus
}

func NewHandler(logger *slog.Logger, prom Prometheus) Handler {
	return &handler{logger: logger, prom: prom}
}

// QueryRange evaluates an expression over a grid: query, start, end, step,
// and optional timeout/stats params, all in Prometheus' formats.
func (h *handler) QueryRange(w http.ResponseWriter, r *http.Request) {
	start, err := parseTime(r.FormValue("start"))
	if err != nil {
		h.respondError(r.Context(), w, errBadData, err)
		return
	}
	end, err := parseTime(r.FormValue("end"))
	if err != nil {
		h.respondError(r.Context(), w, errBadData, err)
		return
	}
	if end.Before(start) {
		h.respondError(r.Context(), w, errBadData, errors.NewInvalidInputf(errors.CodeInvalidInput, "end timestamp must not be before start time"))
		return
	}
	step, err := parseDuration(r.FormValue("step"))
	if err != nil {
		h.respondError(r.Context(), w, errBadData, err)
		return
	}
	if step <= 0 {
		h.respondError(r.Context(), w, errBadData, errors.NewInvalidInputf(errors.CodeInvalidInput, "zero or negative query resolution step widths are not accepted. Try a positive integer"))
		return
	}
	// The engine materializes every point of every series; an unbounded
	// grid is an unbounded allocation. 11,000 points covers 60s resolution
	// for a week or 1h resolution for a year.
	if end.Sub(start)/step > 11000 {
		h.respondError(r.Context(), w, errBadData, errors.NewInvalidInputf(errors.CodeInvalidInput, "exceeded maximum resolution of 11,000 points per timeseries. Try decreasing the query resolution (?step=XX)"))
		return
	}

	ctx, cancel, err := h.contextWithTimeout(r)
	if err != nil {
		h.respondError(r.Context(), w, errBadData, err)
		return
	}
	defer cancel()

	if h.tryRangeExecutor(ctx, w, r, start, end, step) {
		return
	}

	qry, err := h.prom.Engine().NewRangeQuery(ctx, h.prom.Storage(), nil, r.FormValue("query"), start, end, step)
	if err != nil {
		h.respondError(r.Context(), w, errBadData, err)
		return
	}
	h.exec(ctx, w, r, qry)
}

// tryRangeExecutor serves the query the way a RangeExecutor provider is
// designed to serve: evaluated inside the datastore when the shape allows.
// It reports whether the response was written.
func (h *handler) tryRangeExecutor(ctx context.Context, w http.ResponseWriter, r *http.Request, start, end time.Time, step time.Duration) bool {
	re, ok := h.prom.(RangeExecutor)
	if !ok {
		return false
	}
	matrix, served, err := re.TryExecuteRange(ctx, r.FormValue("query"), start, end, step)
	if err != nil {
		h.respondError(ctx, w, errExec, err)
		return true
	}
	if !served {
		return false
	}
	h.respond(ctx, w, &queryData{ResultType: matrix.Type(), Result: matrix}, nil, nil)
	return true
}

// Query evaluates an expression at a single instant: query and optional
// time/timeout/stats params. A missing time evaluates at the server's now,
// as in Prometheus.
func (h *handler) Query(w http.ResponseWriter, r *http.Request) {
	ts := time.Now()
	if t := r.FormValue("time"); t != "" {
		var err error
		ts, err = parseTime(t)
		if err != nil {
			h.respondError(r.Context(), w, errBadData, err)
			return
		}
	}

	ctx, cancel, err := h.contextWithTimeout(r)
	if err != nil {
		h.respondError(r.Context(), w, errBadData, err)
		return
	}
	defer cancel()

	qry, err := h.prom.Engine().NewInstantQuery(ctx, h.prom.Storage(), nil, r.FormValue("query"), ts)
	if err != nil {
		h.respondError(r.Context(), w, errBadData, err)
		return
	}
	h.exec(ctx, w, r, qry)
}

func (h *handler) exec(ctx context.Context, w http.ResponseWriter, r *http.Request, qry promql.Query) {
	defer qry.Close()
	res := qry.Exec(ctx)
	if res.Err != nil {
		h.logger.ErrorContext(ctx, "error evaluating promql query", errors.Attr(res.Err))
		switch res.Err.(type) {
		case promql.ErrQueryCanceled:
			h.respondError(ctx, w, errCanceled, res.Err)
		case promql.ErrQueryTimeout:
			h.respondError(ctx, w, errTimeout, res.Err)
		case promql.ErrStorage:
			h.respondError(ctx, w, errInternal, res.Err)
		default:
			h.respondError(ctx, w, errExec, res.Err)
		}
		return
	}

	data := &queryData{ResultType: res.Value.Type(), Result: res.Value}
	if r.FormValue("stats") != "" {
		data.Stats = stats.NewQueryStats(qry.Stats())
	}
	warnings, infos := res.Warnings.AsStrings(r.FormValue("query"), 10, 10)
	h.respond(ctx, w, data, warnings, infos)
}

func (h *handler) contextWithTimeout(r *http.Request) (context.Context, context.CancelFunc, error) {
	ctx := r.Context()
	if to := r.FormValue("timeout"); to != "" {
		timeout, err := parseDuration(to)
		if err != nil {
			return nil, nil, err
		}
		ctx, cancel := context.WithTimeout(ctx, timeout)
		return ctx, cancel, nil
	}
	ctx, cancel := context.WithCancel(ctx)
	return ctx, cancel, nil
}

// parseTime accepts Prometheus' time formats: float unix seconds or RFC3339.
func parseTime(s string) (time.Time, error) {
	if t, err := strconv.ParseFloat(s, 64); err == nil {
		sec, ns := math.Modf(t)
		return time.Unix(int64(sec), int64(ns*float64(time.Second))), nil
	}
	if t, err := time.Parse(time.RFC3339Nano, s); err == nil {
		return t, nil
	}
	return time.Time{}, errors.NewInvalidInputf(errors.CodeInvalidInput, "cannot parse %q to a valid timestamp", s)
}

// parseDuration accepts Prometheus' duration formats: float seconds or a
// duration string like 5m.
func parseDuration(s string) (time.Duration, error) {
	if d, err := strconv.ParseFloat(s, 64); err == nil {
		ts := d * float64(time.Second)
		if ts > float64(math.MaxInt64) || ts < float64(math.MinInt64) {
			return 0, errors.NewInvalidInputf(errors.CodeInvalidInput, "cannot parse %q to a valid duration. It overflows int64", s)
		}
		return time.Duration(ts), nil
	}
	if d, err := promModel.ParseDuration(s); err == nil {
		return time.Duration(d), nil
	}
	return 0, errors.NewInvalidInputf(errors.CodeInvalidInput, "cannot parse %q to a valid duration", s)
}

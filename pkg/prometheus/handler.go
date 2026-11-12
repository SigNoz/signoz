package prometheus

import (
	"context"
	"log/slog"
	"math"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/mux"
	promModel "github.com/prometheus/common/model"
	"github.com/prometheus/prometheus/model/labels"
	"github.com/prometheus/prometheus/promql"
	"github.com/prometheus/prometheus/promql/parser"
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

	Labels(http.ResponseWriter, *http.Request)

	LabelValues(http.ResponseWriter, *http.Request)

	Series(http.ResponseWriter, *http.Request)
}

type handler struct {
	logger *slog.Logger
	prom   Prometheus
	parser Parser
}

func NewHandler(logger *slog.Logger, prom Prometheus) Handler {
	return &handler{logger: logger, prom: prom, parser: NewParser()}
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

	res, err := h.prom.QueryRange(ctx, r.FormValue("query"), start, end, step)
	h.respondResult(ctx, w, r, res, err)
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

	res, err := h.prom.Query(ctx, r.FormValue("query"), ts)
	h.respondResult(ctx, w, r, res, err)
}

// Labels returns the union of label names visible under the request's
// match[] selectors, or unfiltered when none are given.
func (h *handler) Labels(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		h.respondError(r.Context(), w, errBadData, err)
		return
	}
	matcherSets, start, end, limit, err := h.parseSeriesParams(r)
	if err != nil {
		h.respondError(r.Context(), w, errBadData, err)
		return
	}

	names, err := h.prom.LabelNames(r.Context(), matcherSets, start, end, limit)
	if err != nil {
		h.respondStoreError(r.Context(), w, "error listing prometheus label names", err)
		return
	}
	if names == nil {
		names = []string{}
	}
	h.respond(r.Context(), w, names, nil, nil)
}

// LabelValues returns the union of values for the {name} path segment,
// scoped by the request's match[] selectors.
func (h *handler) LabelValues(w http.ResponseWriter, r *http.Request) {
	name := mux.Vars(r)["name"]
	if !promModel.LabelName(name).IsValid() {
		h.respondError(r.Context(), w, errBadData, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid label name %q", name))
		return
	}
	if err := r.ParseForm(); err != nil {
		h.respondError(r.Context(), w, errBadData, err)
		return
	}

	matcherSets, start, end, limit, err := h.parseSeriesParams(r)
	if err != nil {
		h.respondError(r.Context(), w, errBadData, err)
		return
	}

	values, err := h.prom.LabelValues(r.Context(), name, matcherSets, start, end, limit)
	if err != nil {
		h.respondStoreError(r.Context(), w, "error listing prometheus label values", err)
		return
	}
	if values == nil {
		values = []string{}
	}
	h.respond(r.Context(), w, values, nil, nil)
}

// Series returns the deduplicated union of label sets matched by the
// request's match[] selectors. Unlike Labels and LabelValues, at least one
// match[] is required, as in Prometheus.
func (h *handler) Series(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		h.respondError(r.Context(), w, errBadData, err)
		return
	}
	if len(r.Form["match[]"]) == 0 {
		h.respondError(r.Context(), w, errBadData, errors.NewInvalidInputf(errors.CodeInvalidInput, "no match[] parameter provided"))
		return
	}

	matcherSets, start, end, limit, err := h.parseSeriesParams(r)
	if err != nil {
		h.respondError(r.Context(), w, errBadData, err)
		return
	}

	series, err := h.prom.Series(r.Context(), matcherSets, start, end, limit)
	if err != nil {
		h.respondStoreError(r.Context(), w, "error listing prometheus series", err)
		return
	}
	if series == nil {
		series = []labels.Labels{}
	}
	h.respond(r.Context(), w, series, nil, nil)
}

// parseSeriesParams parses the match[]/start/end/limit parameters shared by
// Labels, LabelValues and Series. The caller must have already called
// r.ParseForm.
func (h *handler) parseSeriesParams(r *http.Request) (matcherSets [][]*labels.Matcher, start, end time.Time, limit int, err error) {
	start, end, err = h.parseWindow(r)
	if err != nil {
		return nil, time.Time{}, time.Time{}, 0, err
	}

	limit, err = parseLimit(r.FormValue("limit"))
	if err != nil {
		return nil, time.Time{}, time.Time{}, 0, err
	}

	matcherSets, err = h.parser.ParseMetricSelectors(r.Form["match[]"])
	if err != nil {
		return nil, time.Time{}, time.Time{}, 0, err
	}

	return matcherSets, start, end, limit, nil
}

// parseWindow reads the optional start/end bounds. Prometheus defaults these
// to the full retention window; this backend instead defaults to the Unix
// epoch and now, since the storage layer picks its ClickHouse table from the
// start/end span and an unbounded sentinel would pick a meaningless one.
func (h *handler) parseWindow(r *http.Request) (time.Time, time.Time, error) {
	start := time.Unix(0, 0)
	if s := r.FormValue("start"); s != "" {
		var err error
		start, err = parseTime(s)
		if err != nil {
			return time.Time{}, time.Time{}, err
		}
	}
	end := time.Now()
	if e := r.FormValue("end"); e != "" {
		var err error
		end, err = parseTime(e)
		if err != nil {
			return time.Time{}, time.Time{}, err
		}
	}
	if end.Before(start) {
		return time.Time{}, time.Time{}, errors.NewInvalidInputf(errors.CodeInvalidInput, "end timestamp must not be before start time")
	}
	return start, end, nil
}

// parseLimit accepts a non-negative integer; 0 (including unset) means unlimited.
func parseLimit(s string) (int, error) {
	if s == "" {
		return 0, nil
	}
	limit, err := strconv.Atoi(s)
	if err != nil || limit < 0 {
		return 0, errors.NewInvalidInputf(errors.CodeInvalidInput, "cannot parse %q to a valid limit", s)
	}
	return limit, nil
}

// respondStoreError maps a metadata-lookup error to the Prometheus error
// envelope: invalid-input errors (bad matchers, etc.) are bad_data, anything
// else from the storage layer is internal.
func (h *handler) respondStoreError(ctx context.Context, w http.ResponseWriter, msg string, err error) {
	h.logger.ErrorContext(ctx, msg, errors.Attr(err))
	if errors.Ast(err, errors.TypeInvalidInput) {
		h.respondError(ctx, w, errBadData, err)
		return
	}
	h.respondError(ctx, w, errInternal, err)
}

func (h *handler) respondResult(ctx context.Context, w http.ResponseWriter, r *http.Request, res *Result, err error) {
	if err != nil {
		h.logger.ErrorContext(ctx, "error evaluating promql query", errors.Attr(err))
		var parseErrs parser.ParseErrors
		if errors.As(err, &parseErrs) {
			h.respondError(ctx, w, errBadData, err)
			return
		}
		switch err.(type) {
		case promql.ErrQueryCanceled:
			h.respondError(ctx, w, errCanceled, err)
		case promql.ErrQueryTimeout:
			h.respondError(ctx, w, errTimeout, err)
		case promql.ErrStorage:
			h.respondError(ctx, w, errInternal, err)
		default:
			h.respondError(ctx, w, errExec, err)
		}
		return
	}

	data := &queryData{ResultType: res.Value.Type(), Result: res.Value}
	if r.FormValue("stats") != "" && res.Stats != nil {
		data.Stats = stats.NewQueryStats(res.Stats)
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

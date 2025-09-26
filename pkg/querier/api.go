package querier

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"runtime/debug"
	"strconv"

	"github.com/SigNoz/signoz/pkg/analytics"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/ctxtypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/SigNoz/signoz/pkg/variables"
)

type API struct {
	set       factory.ProviderSettings
	analytics analytics.Analytics
	querier   Querier
}

func NewAPI(set factory.ProviderSettings, querier Querier, analytics analytics.Analytics) *API {
	return &API{set: set, querier: querier, analytics: analytics}
}

func (a *API) QueryRange(rw http.ResponseWriter, req *http.Request) {

	ctx := req.Context()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	var queryRangeRequest qbtypes.QueryRangeRequest
	if err := json.NewDecoder(req.Body).Decode(&queryRangeRequest); err != nil {
		render.Error(rw, err)
		return
	}

	defer func() {
		if r := recover(); r != nil {
			stackTrace := string(debug.Stack())

			queryJSON, _ := json.Marshal(queryRangeRequest)

			a.set.Logger.ErrorContext(ctx, "panic in QueryRange",
				"error", r,
				"user", claims.UserID,
				"payload", string(queryJSON),
				"stacktrace", stackTrace,
			)

			render.Error(rw, errors.NewInternalf(
				errors.CodeInternal,
				"Something went wrong on our end. It's not you, it's us. Our team is notified about it. Reach out to support if issue persists.",
			))
		}
	}()

	// Validate the query request
	if err := queryRangeRequest.Validate(); err != nil {
		render.Error(rw, err)
		return
	}

	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	queryRangeResponse, err := a.querier.QueryRange(ctx, orgID, &queryRangeRequest)
	if err != nil {
		render.Error(rw, err)
		return
	}

	a.logEvent(req.Context(), req.Header.Get("Referer"), queryRangeResponse.QBEvent)

	render.Success(rw, http.StatusOK, queryRangeResponse)
}
func (a *API) QueryRawStream(rw http.ResponseWriter, req *http.Request) {
	ctx := req.Context()

	// get the param from url and add it to body
	startParam := req.URL.Query().Get("start")
	filterParam := req.URL.Query().Get("filter")

	start, err := strconv.ParseUint(startParam, 10, 64)
	if err != nil {
		start = 0
	}
	// create the v5 request param
	queryRangeRequest := qbtypes.QueryRangeRequest{
		Start:       start,
		RequestType: qbtypes.RequestTypeRawStream,
		CompositeQuery: qbtypes.CompositeQuery{
			Queries: []qbtypes.QueryEnvelope{
				{
					Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
						Signal: telemetrytypes.SignalLogs,
						Name:   "raw_stream",
						Filter: &qbtypes.Filter{
							Expression: filterParam,
						},
						Limit: 500,
						Order: []qbtypes.OrderBy{
							{
								Direction: qbtypes.OrderDirectionDesc,
								Key: qbtypes.OrderByKey{
									TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
										Name:         "timestamp",
										Materialized: true,
									},
								},
							},
							{
								Direction: qbtypes.OrderDirectionDesc,
								Key: qbtypes.OrderByKey{
									TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
										Name:         "id",
										Materialized: true,
									},
								},
							},
						},
					},
				},
			},
		},
	}

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	defer func() {
		if r := recover(); r != nil {
			stackTrace := string(debug.Stack())

			queryJSON, _ := json.Marshal(queryRangeRequest)

			a.set.Logger.ErrorContext(ctx, "panic in QueryRawStream",
				"error", r,
				"user", claims.UserID,
				"payload", string(queryJSON),
				"stacktrace", stackTrace,
			)

			render.Error(rw, errors.NewInternalf(
				errors.CodeInternal,
				"Something went wrong on our end. It's not you, it's us. Our team is notified about it. Reach out to support if issue persists.",
			))
		}
	}()

	// Validate the query request
	if err := queryRangeRequest.Validate(); err != nil {
		render.Error(rw, err)
		return
	}

	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	rw.Header().Set("Connection", "keep-alive")
	rw.Header().Set("Content-Type", "text/event-stream")
	rw.Header().Set("Cache-Control", "no-cache")
	rw.Header().Set("Access-Control-Allow-Origin", "*")
	rw.WriteHeader(200)

	flusher, ok := rw.(http.Flusher)
	if !ok {
		render.Error(rw, errors.Newf(errors.TypeUnsupported, errors.CodeUnsupported, "streaming is not supported"))
		return
	}
	flusher.Flush()

	client := &qbtypes.RawStream{Name: req.RemoteAddr, Logs: make(chan *qbtypes.RawRow, 1000), Done: make(chan *bool), Error: make(chan error)}
	go a.querier.QueryRawStream(ctx, orgID, &queryRangeRequest, client)

	for {
		select {
		case log := <-client.Logs:
			var buf bytes.Buffer
			enc := json.NewEncoder(&buf)
			err := enc.Encode(log)
			if err != nil {
				fmt.Fprintf(rw, "event: error\ndata: %v\n\n", err.Error())
				flusher.Flush()
				return
			}
			fmt.Fprintf(rw, "data: %v\n\n", buf.String())
			flusher.Flush()
		case <-client.Done:
			return
		case err := <-client.Error:
			fmt.Fprintf(rw, "event: error\ndata: %v\n\n", err.Error())
			flusher.Flush()
			return
		}
	}
}

// TODO(srikanthccv): everything done here can be done on frontend as well
// For the time being I am adding a helper function
func (a *API) ReplaceVariables(rw http.ResponseWriter, req *http.Request) {

	var queryRangeRequest qbtypes.QueryRangeRequest
	if err := json.NewDecoder(req.Body).Decode(&queryRangeRequest); err != nil {
		render.Error(rw, err)
		return
	}

	errs := []error{}

	for idx, item := range queryRangeRequest.CompositeQuery.Queries {
		if item.Type == qbtypes.QueryTypeBuilder {
			switch spec := item.Spec.(type) {
			case qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]:
				if spec.Filter != nil && spec.Filter.Expression != "" {
					replaced, err := variables.ReplaceVariablesInExpression(spec.Filter.Expression, queryRangeRequest.Variables)
					if err != nil {
						errs = append(errs, err)
					}
					spec.Filter.Expression = replaced
				}
				queryRangeRequest.CompositeQuery.Queries[idx].Spec = spec
			case qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]:
				if spec.Filter != nil && spec.Filter.Expression != "" {
					replaced, err := variables.ReplaceVariablesInExpression(spec.Filter.Expression, queryRangeRequest.Variables)
					if err != nil {
						errs = append(errs, err)
					}
					spec.Filter.Expression = replaced
				}
				queryRangeRequest.CompositeQuery.Queries[idx].Spec = spec
			case qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]:
				if spec.Filter != nil && spec.Filter.Expression != "" {
					replaced, err := variables.ReplaceVariablesInExpression(spec.Filter.Expression, queryRangeRequest.Variables)
					if err != nil {
						errs = append(errs, err)
					}
					spec.Filter.Expression = replaced
				}
				queryRangeRequest.CompositeQuery.Queries[idx].Spec = spec
			}
		}
	}

	if len(errs) != 0 {
		render.Error(rw, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, errors.Join(errs...).Error()))
		return
	}

	render.Success(rw, http.StatusOK, queryRangeRequest)
}

func (a *API) logEvent(ctx context.Context, referrer string, event *qbtypes.QBEvent) {
	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		return
	}

	if !(event.LogsUsed || event.MetricsUsed || event.TracesUsed) {
		return
	}

	properties := map[string]any{
		"version":           event.Version,
		"logs_used":         event.LogsUsed,
		"traces_used":       event.TracesUsed,
		"metrics_used":      event.MetricsUsed,
		"source":            event.Source,
		"filter_applied":    event.FilterApplied,
		"group_by_applied":  event.GroupByApplied,
		"query_type":        event.QueryType,
		"panel_type":        event.PanelType,
		"number_of_queries": event.NumberOfQueries,
	}

	if referrer == "" {
		return
	}

	comments := ctxtypes.CommentFromContext(ctx).Map()
	for key, value := range comments {
		properties[key] = value
	}

	if !event.HasData {
		a.analytics.TrackUser(ctx, claims.OrgID, claims.UserID, "Telemetry Query Returned Empty", properties)
		return
	}
	a.analytics.TrackUser(ctx, claims.OrgID, claims.UserID, "Telemetry Query Returned Results", properties)
}

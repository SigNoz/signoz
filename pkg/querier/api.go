package querier

import (
	"context"
	"encoding/json"
	"net/http"
	"runtime/debug"

	"github.com/SigNoz/signoz/pkg/analytics"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/ctxtypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
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
		render.Error(rw, errors.NewInvalidInputf(errors.CodeInvalidInput, errors.Join(errs...).Error()))
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

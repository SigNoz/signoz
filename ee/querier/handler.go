package querier

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"runtime/debug"

	anomalyV2 "github.com/SigNoz/signoz/ee/anomaly"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/querier"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type handler struct {
	set       factory.ProviderSettings
	querier   querier.Querier
	community querier.Handler
}

func NewHandler(set factory.ProviderSettings, querier querier.Querier, community querier.Handler) querier.Handler {
	return &handler{
		set:       set,
		querier:   querier,
		community: community,
	}
}

func (h *handler) QueryRange(rw http.ResponseWriter, req *http.Request) {
	bodyBytes, err := io.ReadAll(req.Body)
	if err != nil {
		render.Error(rw, errors.NewInvalidInputf(errors.CodeInvalidInput, "failed to read request body: %v", err))
		return
	}
	req.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

	ctx := req.Context()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	var queryRangeRequest qbtypes.QueryRangeRequest
	if err := json.NewDecoder(req.Body).Decode(&queryRangeRequest); err != nil {
		render.Error(rw, errors.NewInvalidInputf(errors.CodeInvalidInput, "failed to decode request body: %v", err))
		return
	}

	defer func() {
		if r := recover(); r != nil {
			stackTrace := string(debug.Stack())

			queryJSON, _ := json.Marshal(queryRangeRequest)

			h.set.Logger.ErrorContext(ctx, "panic in QueryRange",
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

	if err := queryRangeRequest.Validate(); err != nil {
		render.Error(rw, err)
		return
	}

	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	if anomalyQuery, ok := queryRangeRequest.IsAnomalyRequest(); ok {
		anomalies, err := h.handleAnomalyQuery(ctx, orgID, anomalyQuery, queryRangeRequest)
		if err != nil {
			render.Error(rw, errors.NewInternalf(errors.CodeInternal, "failed to get anomalies: %v", err))
			return
		}

		results := []any{}
		for _, item := range anomalies.Results {
			results = append(results, item)
		}

		// Build step intervals from the anomaly query
		stepIntervals := make(map[string]uint64)
		if anomalyQuery.StepInterval.Duration > 0 {
			stepIntervals[anomalyQuery.Name] = uint64(anomalyQuery.StepInterval.Duration.Seconds())
		}

		finalResp := &qbtypes.QueryRangeResponse{
			Type: queryRangeRequest.RequestType,
			Data: qbtypes.QueryData{
				Results: results,
			},
			Meta: qbtypes.ExecStats{
				StepIntervals: stepIntervals,
			},
		}

		render.Success(rw, http.StatusOK, finalResp)
		return
	}

	// regular query range request, delegate to community handler
	req.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
	h.community.QueryRange(rw, req)
}

func (h *handler) QueryRawStream(rw http.ResponseWriter, req *http.Request) {
	h.community.QueryRawStream(rw, req)
}

func (h *handler) ReplaceVariables(rw http.ResponseWriter, req *http.Request) {
	h.community.ReplaceVariables(rw, req)
}

func extractSeasonality(anomalyQuery *qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]) anomalyV2.Seasonality {
	for _, fn := range anomalyQuery.Functions {
		if fn.Name == qbtypes.FunctionNameAnomaly {
			for _, arg := range fn.Args {
				if arg.Name == "seasonality" {
					if seasonalityStr, ok := arg.Value.(string); ok {
						switch seasonalityStr {
						case "weekly":
							return anomalyV2.SeasonalityWeekly
						case "hourly":
							return anomalyV2.SeasonalityHourly
						}
					}
				}
			}
		}
	}
	return anomalyV2.SeasonalityDaily // default
}

func (h *handler) createAnomalyProvider(seasonality anomalyV2.Seasonality) anomalyV2.Provider {
	switch seasonality {
	case anomalyV2.SeasonalityWeekly:
		return anomalyV2.NewWeeklyProvider(
			anomalyV2.WithQuerier[*anomalyV2.WeeklyProvider](h.querier),
			anomalyV2.WithLogger[*anomalyV2.WeeklyProvider](h.set.Logger),
		)
	case anomalyV2.SeasonalityHourly:
		return anomalyV2.NewHourlyProvider(
			anomalyV2.WithQuerier[*anomalyV2.HourlyProvider](h.querier),
			anomalyV2.WithLogger[*anomalyV2.HourlyProvider](h.set.Logger),
		)
	default:
		return anomalyV2.NewDailyProvider(
			anomalyV2.WithQuerier[*anomalyV2.DailyProvider](h.querier),
			anomalyV2.WithLogger[*anomalyV2.DailyProvider](h.set.Logger),
		)
	}
}

func (h *handler) handleAnomalyQuery(ctx context.Context, orgID valuer.UUID, anomalyQuery *qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation], queryRangeRequest qbtypes.QueryRangeRequest) (*anomalyV2.AnomaliesResponse, error) {
	seasonality := extractSeasonality(anomalyQuery)
	provider := h.createAnomalyProvider(seasonality)

	return provider.GetAnomalies(ctx, orgID, &anomalyV2.AnomaliesRequest{Params: queryRangeRequest})
}

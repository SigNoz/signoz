package api

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"runtime/debug"

	anomalyV2 "github.com/SigNoz/signoz/ee/anomaly"
	"github.com/SigNoz/signoz/ee/query-service/anomaly"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/render"
	baseapp "github.com/SigNoz/signoz/pkg/query-service/app"
	"github.com/SigNoz/signoz/pkg/query-service/app/queryBuilder"
	"github.com/SigNoz/signoz/pkg/query-service/model"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"go.uber.org/zap"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

func (aH *APIHandler) queryRangeV4(w http.ResponseWriter, r *http.Request) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(w, err)
		return
	}
	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(w, err)
		return
	}

	bodyBytes, _ := io.ReadAll(r.Body)
	r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

	queryRangeParams, apiErrorObj := baseapp.ParseQueryRangeParams(r)

	if apiErrorObj != nil {
		zap.L().Error("error parsing metric query range params", zap.Error(apiErrorObj.Err))
		RespondError(w, apiErrorObj, nil)
		return
	}
	queryRangeParams.Version = "v4"

	// add temporality for each metric
	temporalityErr := aH.PopulateTemporality(r.Context(), orgID, queryRangeParams)
	if temporalityErr != nil {
		zap.L().Error("Error while adding temporality for metrics", zap.Error(temporalityErr))
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: temporalityErr}, nil)
		return
	}

	anomalyQueryExists := false
	anomalyQuery := &v3.BuilderQuery{}
	if queryRangeParams.CompositeQuery.QueryType == v3.QueryTypeBuilder {
		for _, query := range queryRangeParams.CompositeQuery.BuilderQueries {
			for _, fn := range query.Functions {
				if fn.Name == v3.FunctionNameAnomaly {
					anomalyQueryExists = true
					anomalyQuery = query
					break
				}
			}
		}
	}

	if anomalyQueryExists {
		// ensure all queries have metric data source, and there should be only one anomaly query
		for _, query := range queryRangeParams.CompositeQuery.BuilderQueries {
			// What is query.QueryName == query.Expression doing here?
			// In the current implementation, the way to recognize if a query is a formula is by
			// checking if the expression is the same as the query name. if the expression is different
			// then it is a formula. otherwise, it is simple builder query.
			if query.DataSource != v3.DataSourceMetrics && query.QueryName == query.Expression {
				RespondError(w, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("all queries must have metric data source")}, nil)
				return
			}
		}

		// get the threshold, and seasonality from the anomaly query
		var seasonality anomaly.Seasonality
		for _, fn := range anomalyQuery.Functions {
			if fn.Name == v3.FunctionNameAnomaly {
				seasonalityStr, ok := fn.NamedArgs["seasonality"].(string)
				if !ok {
					seasonalityStr = "daily"
				}
				if seasonalityStr == "weekly" {
					seasonality = anomaly.SeasonalityWeekly
				} else if seasonalityStr == "daily" {
					seasonality = anomaly.SeasonalityDaily
				} else {
					seasonality = anomaly.SeasonalityHourly
				}
				break
			}
		}
		var provider anomaly.Provider
		switch seasonality {
		case anomaly.SeasonalityWeekly:
			provider = anomaly.NewWeeklyProvider(
				anomaly.WithCache[*anomaly.WeeklyProvider](aH.Signoz.Cache),
				anomaly.WithKeyGenerator[*anomaly.WeeklyProvider](queryBuilder.NewKeyGenerator()),
				anomaly.WithReader[*anomaly.WeeklyProvider](aH.opts.DataConnector),
			)
		case anomaly.SeasonalityDaily:
			provider = anomaly.NewDailyProvider(
				anomaly.WithCache[*anomaly.DailyProvider](aH.Signoz.Cache),
				anomaly.WithKeyGenerator[*anomaly.DailyProvider](queryBuilder.NewKeyGenerator()),
				anomaly.WithReader[*anomaly.DailyProvider](aH.opts.DataConnector),
			)
		case anomaly.SeasonalityHourly:
			provider = anomaly.NewHourlyProvider(
				anomaly.WithCache[*anomaly.HourlyProvider](aH.Signoz.Cache),
				anomaly.WithKeyGenerator[*anomaly.HourlyProvider](queryBuilder.NewKeyGenerator()),
				anomaly.WithReader[*anomaly.HourlyProvider](aH.opts.DataConnector),
			)
		default:
			provider = anomaly.NewDailyProvider(
				anomaly.WithCache[*anomaly.DailyProvider](aH.Signoz.Cache),
				anomaly.WithKeyGenerator[*anomaly.DailyProvider](queryBuilder.NewKeyGenerator()),
				anomaly.WithReader[*anomaly.DailyProvider](aH.opts.DataConnector),
			)
		}
		anomalies, err := provider.GetAnomalies(r.Context(), orgID, &anomaly.GetAnomaliesRequest{Params: queryRangeParams})
		if err != nil {
			RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, nil)
			return
		}
		resp := v3.QueryRangeResponse{
			Result:     anomalies.Results,
			ResultType: "anomaly",
		}
		aH.Respond(w, resp)
	} else {
		r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
		aH.QueryRangeV4(w, r)
	}
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

func createAnomalyProvider(aH *APIHandler, seasonality anomalyV2.Seasonality) anomalyV2.Provider {
	switch seasonality {
	case anomalyV2.SeasonalityWeekly:
		return anomalyV2.NewWeeklyProvider(
			anomalyV2.WithQuerier[*anomalyV2.WeeklyProvider](aH.Signoz.Querier),
			anomalyV2.WithLogger[*anomalyV2.WeeklyProvider](aH.Signoz.Instrumentation.Logger()),
		)
	case anomalyV2.SeasonalityHourly:
		return anomalyV2.NewHourlyProvider(
			anomalyV2.WithQuerier[*anomalyV2.HourlyProvider](aH.Signoz.Querier),
			anomalyV2.WithLogger[*anomalyV2.HourlyProvider](aH.Signoz.Instrumentation.Logger()),
		)
	default:
		return anomalyV2.NewDailyProvider(
			anomalyV2.WithQuerier[*anomalyV2.DailyProvider](aH.Signoz.Querier),
			anomalyV2.WithLogger[*anomalyV2.DailyProvider](aH.Signoz.Instrumentation.Logger()),
		)
	}
}

func (aH *APIHandler) handleAnomalyQuery(ctx context.Context, orgID valuer.UUID, anomalyQuery *qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation], queryRangeRequest qbtypes.QueryRangeRequest) (*anomalyV2.AnomaliesResponse, error) {
	seasonality := extractSeasonality(anomalyQuery)
	provider := createAnomalyProvider(aH, seasonality)

	return provider.GetAnomalies(ctx, orgID, &anomalyV2.AnomaliesRequest{Params: queryRangeRequest})
}

func (aH *APIHandler) queryRangeV5(rw http.ResponseWriter, req *http.Request) {

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

			aH.Signoz.Instrumentation.Logger().ErrorContext(ctx, "panic in QueryRange",
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
		anomalies, err := aH.handleAnomalyQuery(ctx, orgID, anomalyQuery, queryRangeRequest)
		if err != nil {
			render.Error(rw, errors.NewInternalf(errors.CodeInternal, "failed to get anomalies: %v", err))
			return
		}

		results := []any{}
		for _, item := range anomalies.Results {
			results = append(results, item)
		}

		finalResp := &qbtypes.QueryRangeResponse{
			Type: queryRangeRequest.RequestType,
			Data: struct {
				Results []any `json:"results"`
			}{
				Results: results,
			},
			Meta: struct {
				RowsScanned  uint64 `json:"rowsScanned"`
				BytesScanned uint64 `json:"bytesScanned"`
				DurationMS   uint64 `json:"durationMs"`
			}{},
		}

		render.Success(rw, http.StatusOK, finalResp)
		return
	} else {
		// regular query range request, let the querier handle it
		req.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
		aH.QuerierAPI.QueryRange(rw, req)
	}
}

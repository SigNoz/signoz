package api

import (
	"bytes"
	"fmt"
	"io"
	"net/http"

	"github.com/SigNoz/signoz/ee/query-service/anomaly"
	"github.com/SigNoz/signoz/pkg/http/render"
	baseapp "github.com/SigNoz/signoz/pkg/query-service/app"
	"github.com/SigNoz/signoz/pkg/query-service/app/queryBuilder"
	"github.com/SigNoz/signoz/pkg/query-service/model"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"go.uber.org/zap"
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

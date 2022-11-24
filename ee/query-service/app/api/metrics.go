package api

import (
	"bytes"
	"fmt"
	"net/http"
	"sync"
	"text/template"
	"time"

	"go.signoz.io/signoz/pkg/query-service/app/metrics"
	"go.signoz.io/signoz/pkg/query-service/app/parser"
	"go.signoz.io/signoz/pkg/query-service/constants"
	basemodel "go.signoz.io/signoz/pkg/query-service/model"
	querytemplate "go.signoz.io/signoz/pkg/query-service/utils/queryTemplate"
	"go.uber.org/zap"
)

func (ah *APIHandler) queryRangeMetricsV2(w http.ResponseWriter, r *http.Request) {
	if !ah.CheckFeature(basemodel.CustomMetricsFunction) {
		zap.S().Info("CustomMetricsFunction feature is not enabled in this plan")
		ah.APIHandler.QueryRangeMetricsV2(w, r)
		return
	}
	metricsQueryRangeParams, apiErrorObj := parser.ParseMetricQueryRangeParams(r)

	if apiErrorObj != nil {
		zap.S().Errorf(apiErrorObj.Err.Error())
		RespondError(w, apiErrorObj, nil)
		return
	}

	// prometheus instant query needs same timestamp
	if metricsQueryRangeParams.CompositeMetricQuery.PanelType == basemodel.QUERY_VALUE &&
		metricsQueryRangeParams.CompositeMetricQuery.QueryType == basemodel.PROM {
		metricsQueryRangeParams.Start = metricsQueryRangeParams.End
	}

	// round up the end to nearest multiple
	if metricsQueryRangeParams.CompositeMetricQuery.QueryType == basemodel.QUERY_BUILDER {
		end := (metricsQueryRangeParams.End) / 1000
		step := metricsQueryRangeParams.Step
		metricsQueryRangeParams.End = (end / step * step) * 1000
	}

	type channelResult struct {
		Series    []*basemodel.Series
		TableName string
		Err       error
		Name      string
		Query     string
	}

	execClickHouseQueries := func(queries map[string]string) ([]*basemodel.Series, []string, error, map[string]string) {
		var seriesList []*basemodel.Series
		var tableName []string
		ch := make(chan channelResult, len(queries))
		var wg sync.WaitGroup

		for name, query := range queries {
			wg.Add(1)
			go func(name, query string) {
				defer wg.Done()
				seriesList, tableName, err := ah.opts.DataConnector.GetMetricResultEE(r.Context(), query)
				for _, series := range seriesList {
					series.QueryName = name
				}

				if err != nil {
					ch <- channelResult{Err: fmt.Errorf("error in query-%s: %v", name, err), Name: name, Query: query}
					return
				}
				ch <- channelResult{Series: seriesList, TableName: tableName}
			}(name, query)
		}

		wg.Wait()
		close(ch)

		var errs []error
		errQuriesByName := make(map[string]string)
		// read values from the channel
		for r := range ch {
			if r.Err != nil {
				errs = append(errs, r.Err)
				errQuriesByName[r.Name] = r.Query
				continue
			}
			seriesList = append(seriesList, r.Series...)
			tableName = append(tableName, r.TableName)
		}
		if len(errs) != 0 {
			return nil, nil, fmt.Errorf("encountered multiple errors: %s", metrics.FormatErrs(errs, "\n")), errQuriesByName
		}
		return seriesList, tableName, nil, nil
	}

	execPromQueries := func(metricsQueryRangeParams *basemodel.QueryRangeParamsV2) ([]*basemodel.Series, error, map[string]string) {
		var seriesList []*basemodel.Series
		ch := make(chan channelResult, len(metricsQueryRangeParams.CompositeMetricQuery.PromQueries))
		var wg sync.WaitGroup

		for name, query := range metricsQueryRangeParams.CompositeMetricQuery.PromQueries {
			if query.Disabled {
				continue
			}
			wg.Add(1)
			go func(name string, query *basemodel.PromQuery) {
				var seriesList []*basemodel.Series
				defer wg.Done()
				tmpl := template.New("promql-query")
				tmpl, tmplErr := tmpl.Parse(query.Query)
				if tmplErr != nil {
					ch <- channelResult{Err: fmt.Errorf("error in parsing query-%s: %v", name, tmplErr), Name: name, Query: query.Query}
					return
				}
				var queryBuf bytes.Buffer
				tmplErr = tmpl.Execute(&queryBuf, metricsQueryRangeParams.Variables)
				if tmplErr != nil {
					ch <- channelResult{Err: fmt.Errorf("error in parsing query-%s: %v", name, tmplErr), Name: name, Query: query.Query}
					return
				}
				query.Query = queryBuf.String()
				queryModel := basemodel.QueryRangeParams{
					Start: time.UnixMilli(metricsQueryRangeParams.Start),
					End:   time.UnixMilli(metricsQueryRangeParams.End),
					Step:  time.Duration(metricsQueryRangeParams.Step * int64(time.Second)),
					Query: query.Query,
				}
				promResult, _, err := ah.opts.DataConnector.GetQueryRangeResult(r.Context(), &queryModel)
				if err != nil {
					ch <- channelResult{Err: fmt.Errorf("error in query-%s: %v", name, err), Name: name, Query: query.Query}
					return
				}
				matrix, _ := promResult.Matrix()
				for _, v := range matrix {
					var s basemodel.Series
					s.QueryName = name
					s.Labels = v.Metric.Copy().Map()
					for _, p := range v.Points {
						s.Points = append(s.Points, basemodel.MetricPoint{Timestamp: p.T, Value: p.V})
					}
					seriesList = append(seriesList, &s)
				}
				ch <- channelResult{Series: seriesList}
			}(name, query)
		}

		wg.Wait()
		close(ch)

		var errs []error
		errQuriesByName := make(map[string]string)
		// read values from the channel
		for r := range ch {
			if r.Err != nil {
				errs = append(errs, r.Err)
				errQuriesByName[r.Name] = r.Query
				continue
			}
			seriesList = append(seriesList, r.Series...)
		}
		if len(errs) != 0 {
			return nil, fmt.Errorf("encountered multiple errors: %s", metrics.FormatErrs(errs, "\n")), errQuriesByName
		}
		return seriesList, nil, nil
	}

	var seriesList []*basemodel.Series
	var tableName []string
	var err error
	var errQuriesByName map[string]string
	switch metricsQueryRangeParams.CompositeMetricQuery.QueryType {
	case basemodel.QUERY_BUILDER:
		runQueries := metrics.PrepareBuilderMetricQueries(metricsQueryRangeParams, constants.SIGNOZ_TIMESERIES_TABLENAME)
		if runQueries.Err != nil {
			RespondError(w, &basemodel.ApiError{Typ: basemodel.ErrorBadData, Err: runQueries.Err}, nil)
			return
		}
		seriesList, tableName, err, errQuriesByName = execClickHouseQueries(runQueries.Queries)

	case basemodel.CLICKHOUSE:
		queries := make(map[string]string)

		for name, chQuery := range metricsQueryRangeParams.CompositeMetricQuery.ClickHouseQueries {
			if chQuery.Disabled {
				continue
			}
			tmpl := template.New("clickhouse-query")
			tmpl, err := tmpl.Parse(chQuery.Query)
			if err != nil {
				RespondError(w, &basemodel.ApiError{Typ: basemodel.ErrorBadData, Err: err}, nil)
				return
			}
			var query bytes.Buffer

			// replace go template variables
			querytemplate.AssignReservedVars(metricsQueryRangeParams)

			err = tmpl.Execute(&query, metricsQueryRangeParams.Variables)
			if err != nil {
				RespondError(w, &basemodel.ApiError{Typ: basemodel.ErrorBadData, Err: err}, nil)
				return
			}
			queries[name] = query.String()
		}
		seriesList, tableName, err, errQuriesByName = execClickHouseQueries(queries)
	case basemodel.PROM:
		seriesList, err, errQuriesByName = execPromQueries(metricsQueryRangeParams)
	default:
		err = fmt.Errorf("invalid query type")
		RespondError(w, &basemodel.ApiError{Typ: basemodel.ErrorBadData, Err: err}, errQuriesByName)
		return
	}

	if err != nil {
		apiErrObj := &basemodel.ApiError{Typ: basemodel.ErrorBadData, Err: err}
		RespondError(w, apiErrObj, errQuriesByName)
		return
	}
	if metricsQueryRangeParams.CompositeMetricQuery.PanelType == basemodel.QUERY_VALUE &&
		len(seriesList) > 1 &&
		(metricsQueryRangeParams.CompositeMetricQuery.QueryType == basemodel.QUERY_BUILDER ||
			metricsQueryRangeParams.CompositeMetricQuery.QueryType == basemodel.CLICKHOUSE) {
		RespondError(w, &basemodel.ApiError{Typ: basemodel.ErrorBadData, Err: fmt.Errorf("invalid: query resulted in more than one series for value type")}, nil)
		return
	}

	type ResponseFormat struct {
		ResultType string              `json:"resultType"`
		Result     []*basemodel.Series `json:"result"`
		TableName  []string            `json:"tableName"`
	}
	resp := ResponseFormat{ResultType: "matrix", Result: seriesList, TableName: tableName}
	ah.Respond(w, resp)
}

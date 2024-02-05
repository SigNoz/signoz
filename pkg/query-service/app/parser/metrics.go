package parser

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"go.signoz.io/signoz/pkg/query-service/app/metrics"
	"go.signoz.io/signoz/pkg/query-service/model"
)

func validateQueryRangeParamsV2(qp *model.QueryRangeParamsV2) error {
	var errs []error
	if !(qp.DataSource >= model.METRICS && qp.DataSource <= model.LOGS) {
		errs = append(errs, fmt.Errorf("unsupported data source"))
	}
	if !(qp.CompositeMetricQuery.QueryType >= model.QUERY_BUILDER && qp.CompositeMetricQuery.QueryType <= model.PROM) {
		errs = append(errs, fmt.Errorf("unsupported query type"))
	}
	if !(qp.CompositeMetricQuery.PanelType >= model.TIME_SERIES && qp.CompositeMetricQuery.PanelType <= model.QUERY_VALUE) {
		errs = append(errs, fmt.Errorf("unsupported panel type"))
	}
	if len(errs) != 0 {
		return fmt.Errorf("one or more errors found : %s", metrics.FormatErrs(errs, ","))
	}
	return nil
}

func ParseMetricQueryRangeParams(r *http.Request) (*model.QueryRangeParamsV2, *model.ApiError) {

	var postData *model.QueryRangeParamsV2

	if err := json.NewDecoder(r.Body).Decode(&postData); err != nil {
		return nil, &model.ApiError{Typ: model.ErrorBadData, Err: err}
	}
	if err := validateQueryRangeParamsV2(postData); err != nil {
		return nil, &model.ApiError{Typ: model.ErrorBadData, Err: err}
	}
	// prepare the variables for the corrspnding query type
	formattedVars := make(map[string]interface{})
	for name, value := range postData.Variables {
		if postData.CompositeMetricQuery.QueryType == model.PROM {
			formattedVars[name] = metrics.PromFormattedValue(value)
		} else if postData.CompositeMetricQuery.QueryType == model.CLICKHOUSE {
			formattedVars[name] = metrics.FormattedValue(value)
		}
	}
	// replace the variables in metrics builder filter item with actual value
	if postData.CompositeMetricQuery.QueryType == model.QUERY_BUILDER {
		for _, query := range postData.CompositeMetricQuery.BuilderQueries {
			if query.TagFilters == nil || len(query.TagFilters.Items) == 0 {
				continue
			}
			for idx := range query.TagFilters.Items {
				item := &query.TagFilters.Items[idx]
				value := item.Value
				if value != nil {
					switch x := value.(type) {
					case string:
						variableName := strings.Trim(x, "{{ . }}")
						if _, ok := postData.Variables[variableName]; ok {
							item.Value = postData.Variables[variableName]
						}
					case []interface{}:
						if len(x) > 0 {
							switch x[0].(type) {
							case string:
								variableName := strings.Trim(x[0].(string), "{{ . }}")
								if _, ok := postData.Variables[variableName]; ok {
									item.Value = postData.Variables[variableName]
								}
							}
						}
					}
				}
			}
		}
	}
	postData.Variables = formattedVars

	return postData, nil
}

func ParseMetricAutocompleteTagParams(r *http.Request) (*model.MetricAutocompleteTagParams, *model.ApiError) {

	metricName := r.URL.Query().Get("metricName")
	if len(metricName) == 0 {
		err := fmt.Errorf("metricName not present in params")
		return nil, &model.ApiError{Typ: model.ErrorBadData, Err: err}
	}

	tagsStr := r.URL.Query().Get("tags")

	// parsing tags
	var tags map[string]string
	if tagsStr != "" && len(tagsStr) != 0 {

		err := json.Unmarshal([]byte(tagsStr), &tags)
		if err != nil {
			return nil, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("unable to parse tags in params: %v", err)}
		}
	}

	matchText := r.URL.Query().Get("match")

	tagKey := r.URL.Query().Get("tagKey")

	metricAutocompleteTagParams := &model.MetricAutocompleteTagParams{
		MetricName: metricName,
		MetricTags: tags,
		Match:      matchText,
		TagKey:     tagKey,
	}

	return metricAutocompleteTagParams, nil
}

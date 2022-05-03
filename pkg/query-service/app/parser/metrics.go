package parser

import (
	"encoding/json"
	"fmt"
	"net/http"

	"go.signoz.io/query-service/model"
)

func ParseMetricQueryRangeParams(r *http.Request) (*model.QueryRangeParamsV2, *model.ApiError) {

	var postData *model.QueryRangeParamsV2
	err := json.NewDecoder(r.Body).Decode(&postData)

	if err != nil {
		return nil, &model.ApiError{Typ: model.ErrorBadData, Err: err}
	}

	return nil, nil
}

func ParseMetricAutocompleteTagParams(r *http.Request) (*model.MetricAutocompleteTagParams, *model.ApiError) {

	metricName := r.URL.Query().Get("metricName")
	if len(metricName) == 0 {
		err := fmt.Errorf("metricName not present in params")
		return nil, &model.ApiError{Typ: model.ErrorBadData, Err: err}
	}

	tagsStr := r.URL.Query().Get("tags")
	// fmt.Println(tagsStr)

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

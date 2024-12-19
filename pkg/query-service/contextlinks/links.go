package contextlinks

import (
	"encoding/json"
	"fmt"
	"net/url"
	"time"

	tracesV3 "go.signoz.io/signoz/pkg/query-service/app/traces/v3"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/utils"
)

func PrepareLinksToTraces(start, end time.Time, filterItems []v3.FilterItem) string {

	// Traces list view expects time in nanoseconds
	tr := v3.URLShareableTimeRange{
		Start:    start.UnixNano(),
		End:      end.UnixNano(),
		PageSize: 100,
	}

	options := v3.URLShareableOptions{
		MaxLines:      2,
		Format:        "list",
		SelectColumns: tracesV3.TracesListViewDefaultSelectedColumns,
	}

	period, _ := json.Marshal(tr)
	urlEncodedTimeRange := url.QueryEscape(string(period))

	builderQuery := v3.BuilderQuery{
		DataSource:         v3.DataSourceTraces,
		QueryName:          "A",
		AggregateOperator:  v3.AggregateOperatorNoOp,
		AggregateAttribute: v3.AttributeKey{},
		Filters: &v3.FilterSet{
			Items:    filterItems,
			Operator: "AND",
		},
		Expression:   "A",
		Disabled:     false,
		Having:       []v3.Having{},
		StepInterval: 60,
		OrderBy: []v3.OrderBy{
			{
				ColumnName: "timestamp",
				Order:      "desc",
			},
		},
	}

	urlData := v3.URLShareableCompositeQuery{
		QueryType: string(v3.QueryTypeBuilder),
		Builder: v3.URLShareableBuilderQuery{
			QueryData: []v3.BuilderQuery{
				builderQuery,
			},
			QueryFormulas: make([]string, 0),
		},
	}

	data, _ := json.Marshal(urlData)
	compositeQuery := url.QueryEscape(url.QueryEscape(string(data)))

	optionsData, _ := json.Marshal(options)
	urlEncodedOptions := url.QueryEscape(string(optionsData))

	return fmt.Sprintf("compositeQuery=%s&timeRange=%s&startTime=%d&endTime=%d&options=%s", compositeQuery, urlEncodedTimeRange, tr.Start, tr.End, urlEncodedOptions)
}

func PrepareLinksToLogs(start, end time.Time, filterItems []v3.FilterItem) string {

	// Logs list view expects time in milliseconds
	tr := v3.URLShareableTimeRange{
		Start:    start.UnixMilli(),
		End:      end.UnixMilli(),
		PageSize: 100,
	}

	options := v3.URLShareableOptions{
		MaxLines:      2,
		Format:        "list",
		SelectColumns: []v3.AttributeKey{},
	}

	period, _ := json.Marshal(tr)
	urlEncodedTimeRange := url.QueryEscape(string(period))

	builderQuery := v3.BuilderQuery{
		DataSource:         v3.DataSourceLogs,
		QueryName:          "A",
		AggregateOperator:  v3.AggregateOperatorNoOp,
		AggregateAttribute: v3.AttributeKey{},
		Filters: &v3.FilterSet{
			Items:    filterItems,
			Operator: "AND",
		},
		Expression:   "A",
		Disabled:     false,
		Having:       []v3.Having{},
		StepInterval: 60,
		OrderBy: []v3.OrderBy{
			{
				ColumnName: "timestamp",
				Order:      "desc",
			},
		},
	}

	urlData := v3.URLShareableCompositeQuery{
		QueryType: string(v3.QueryTypeBuilder),
		Builder: v3.URLShareableBuilderQuery{
			QueryData: []v3.BuilderQuery{
				builderQuery,
			},
			QueryFormulas: make([]string, 0),
		},
	}

	data, _ := json.Marshal(urlData)
	compositeQuery := url.QueryEscape(url.QueryEscape(string(data)))

	optionsData, _ := json.Marshal(options)
	urlEncodedOptions := url.QueryEscape(string(optionsData))

	return fmt.Sprintf("compositeQuery=%s&timeRange=%s&startTime=%d&endTime=%d&options=%s", compositeQuery, urlEncodedTimeRange, tr.Start, tr.End, urlEncodedOptions)
}

// The following function is used to prepare the where clause for the query
// `lbls` contains the key value pairs of the labels from the result of the query
// We iterate over the where clause and replace the labels with the actual values
// There are two cases:
// 1. The label is present in the where clause
// 2. The label is not present in the where clause
//
// Example for case 2:
// Latency by serviceName without any filter
// In this case, for each service with latency > threshold we send a notification
// The expectation will be that clicking on the related traces for service A, will
// take us to the traces page with the filter serviceName=A
// So for all the missing labels in the where clause, we add them as key = value
//
// Example for case 1:
// Severity text IN (WARN, ERROR)
// In this case, the Severity text will appear in the `lbls` if it were part of the group
// by clause, in which case we replace it with the actual value for the notification
// i.e Severity text = WARN
// If the Severity text is not part of the group by clause, then we add it as it is
func PrepareFilters(labels map[string]string, whereClauseItems []v3.FilterItem, groupByItems []v3.AttributeKey, keys map[string]v3.AttributeKey) []v3.FilterItem {
	var filterItems []v3.FilterItem

	added := make(map[string]struct{})

	for _, item := range whereClauseItems {
		exists := false
		for key, value := range labels {
			if item.Key.Key == key {
				// if the label is present in the where clause, replace it with key = value
				filterItems = append(filterItems, v3.FilterItem{
					Key:      item.Key,
					Operator: v3.FilterOperatorEqual,
					Value:    value,
				})
				exists = true
				added[key] = struct{}{}
				break
			}
		}

		if !exists {
			// if there is no label for the filter item, add it as it is
			filterItems = append(filterItems, item)
		}
	}

	// if there are labels which are not part of the where clause, but
	// exist in the result, then they could be part of the group by clause
	for key, value := range labels {
		if _, ok := added[key]; !ok {
			// start by taking the attribute key from the keys map, if not present, create a new one
			var attributeKey v3.AttributeKey
			var attrFound bool

			// as of now this logic will only apply for logs
			for _, tKey := range utils.GenerateEnrichmentKeys(v3.AttributeKey{Key: key}) {
				if val, ok := keys[tKey]; ok {
					attributeKey = val
					attrFound = true
					break
				}
			}

			// check if the attribute key is directly present, as of now this will always be false for logs
			// as for logs it will be satisfied in the condition above
			if !attrFound {
				attributeKey, attrFound = keys[key]
			}

			// if the attribute key is not present, create a new one
			if !attrFound {
				attributeKey = v3.AttributeKey{Key: key}
			}

			// if there is a group by item with the same key, use that instead
			for _, groupByItem := range groupByItems {
				if groupByItem.Key == key {
					attributeKey = groupByItem
					break
				}
			}

			filterItems = append(filterItems, v3.FilterItem{
				Key:      attributeKey,
				Operator: v3.FilterOperatorEqual,
				Value:    value,
			})
		}
	}

	return filterItems
}

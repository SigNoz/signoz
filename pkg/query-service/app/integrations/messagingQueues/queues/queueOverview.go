package queues

import (
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

func BuildOverviewQuery(queueList *QueueListRequest) (*v3.ClickHouseQuery, error) {

	err := queueList.Validate()
	if err != nil {
		return nil, err
	}

	filterSet := parseFilters(queueList.Filters.Items)

	query := generateOverviewSQL(queueList.Start, queueList.End, filterSet)

	return &v3.ClickHouseQuery{
		Query: query,
	}, nil
}

func parseFilters(item []v3.FilterItem) *QueueFilters {

	sqlFilters := &QueueFilters{}

	for _, filter := range item {
		switch filter.Key.Key {
		case "service.name":
			updateFilterSlice(&sqlFilters.ServiceName, filter.Value)
		case "name":
			updateFilterSlice(&sqlFilters.SpanName, filter.Value)
		case "destination":
			updateFilterSlice(&sqlFilters.Destination, filter.Value)
		case "queue":
			updateFilterSlice(&sqlFilters.Queue, filter.Value)
		case "kind_string":
			updateFilterSlice(&sqlFilters.Kind, filter.Value)
		}
	}
	return sqlFilters
}

func updateFilterSlice(slice *[]string, value interface{}) {
	if strValue, ok := value.(string); ok && strValue != "" {
		*slice = append(*slice, strValue)
	} else if strValues, ok := value.([]interface{}); ok {
		for _, strValue := range strValues {
			// validating nil cases, otherwise query breaks
			if val, ok := strValue.(string); ok && val != "" {
				*slice = append(*slice, val)
			}
		}
	}
}

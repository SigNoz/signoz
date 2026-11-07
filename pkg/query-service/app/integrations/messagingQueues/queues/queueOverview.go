package queues

import (
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
)

// BuildOverviewQuery validates the incoming queue overview payload and compiles
// the corresponding ClickHouse aggregation query across all supported queue systems.
func BuildOverviewQuery(queueList *QueueListRequest) (*v3.ClickHouseQuery, error) {
	if err := queueList.Validate(); err != nil {
		return nil, err
	}

	var items []v3.FilterItem
	if queueList.Filters != nil {
		items = queueList.Filters.Items
	}

	query := generateOverviewSQL(queueList.Start, queueList.End, items)

	return &v3.ClickHouseQuery{
		Query: query,
	}, nil
}

package queues

import (
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

func BuildOverviewQuery(queueList *QueueListRequest) (*v3.ClickHouseQuery, error) {

	err := queueList.Validate()
	if err != nil {
		return nil, err
	}

	query := generateOverviewSQL(queueList.Start, queueList.End, queueList.Filters.Items)

	return &v3.ClickHouseQuery{
		Query: query,
	}, nil
}

package kafka

import (
	"fmt"

	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

var defaultStepInterval int64 = 60

func BuildQueryRangeParams(messagingQueue *MessagingQueue, queryContext string) (*v3.QueryRangeParamsV3, error) {

	var cq *v3.CompositeQuery
	if queryContext == "producer" {
		chq, err := buildProducerClickHouseQuery(messagingQueue)
		if err != nil {
			return nil, err
		}
		cq, err = buildCompositeQueryProducer(chq)

		if err != nil {
			return nil, err
		}
	} else if queryContext == "consumer" {
		chq, err := buildConsumerClickHouseQuery(messagingQueue)
		if err != nil {
			return nil, err
		}
		cq, err = buildCompositeQueryConsumer(chq)
		if err != nil {
			return nil, err
		}
	}

	queryRangeParams := &v3.QueryRangeParamsV3{
		Start:          messagingQueue.Start,
		End:            messagingQueue.End,
		Step:           defaultStepInterval,
		CompositeQuery: cq,
		Version:        "v4",
		FormatForWeb:   true,
	}

	return queryRangeParams, nil
}

func buildProducerClickHouseQuery(messagingQueue *MessagingQueue) (*v3.ClickHouseQuery, error) {
	start := messagingQueue.Start
	end := messagingQueue.End
	topic, ok := messagingQueue.Variables["topic"]
	if !ok {
		return nil, fmt.Errorf("invalid type for Topic")
	}

	partition, ok := messagingQueue.Variables["partition"]

	if !ok {
		return nil, fmt.Errorf("invalid type for Partition")
	}
	query := generateProducerSQL(start, end, topic, partition)

	return &v3.ClickHouseQuery{
		Query: query,
	}, nil
}

func buildConsumerClickHouseQuery(messagingQueue *MessagingQueue) (*v3.ClickHouseQuery, error) {
	start := messagingQueue.Start
	end := messagingQueue.End
	topic, ok := messagingQueue.Variables["topic"]
	if !ok {
		return nil, fmt.Errorf("invalid type for Topic")
	}

	partition, ok := messagingQueue.Variables["partition"]

	if !ok {
		return nil, fmt.Errorf("invalid type for Partition")
	}
	query := generateConsumerSQL(start, end, topic, partition)

	return &v3.ClickHouseQuery{
		Query: query,
	}, nil
}

func buildCompositeQueryProducer(chq *v3.ClickHouseQuery) (*v3.CompositeQuery, error) {
	return &v3.CompositeQuery{
		QueryType:         v3.QueryTypeClickHouseSQL,
		ClickHouseQueries: map[string]*v3.ClickHouseQuery{"producer": chq},
		PanelType:         v3.PanelTypeTable,
	}, nil
}

func buildCompositeQueryConsumer(chq *v3.ClickHouseQuery) (*v3.CompositeQuery, error) {
	return &v3.CompositeQuery{
		QueryType:         v3.QueryTypeClickHouseSQL,
		ClickHouseQueries: map[string]*v3.ClickHouseQuery{"consumer": chq},
		PanelType:         v3.PanelTypeTable,
	}, nil
}

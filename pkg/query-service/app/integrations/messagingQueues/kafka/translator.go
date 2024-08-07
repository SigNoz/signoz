package kafka

import (
	"fmt"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

var defaultStepInterval int64 = 60

func BuildQueryRangeParams(messagingQueue *MessagingQueue, queryContext string) (*v3.QueryRangeParamsV3, error) {

	// ToDo: propagate this through APIs when there are different handlers
	queueType := kafkaQueue

	var cq *v3.CompositeQuery

	chq, err := buildClickHouseQuery(messagingQueue, queueType, queryContext)

	if err != nil {
		return nil, err
	}

	cq, err = buildCompositeQuery(chq, queryContext)

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

func buildClickHouseQueryNetwork(messagingQueue *MessagingQueue, queueType string) (*v3.ClickHouseQuery, error) {
	start := messagingQueue.Start
	end := messagingQueue.End
	consumerGroup, ok := messagingQueue.Variables["consumer_group"]
	if !ok {
		return nil, fmt.Errorf("consumer_group not found in the request")
	}

	query := generateNetworkLatencyThroughputSQL(start, end, consumerGroup, queueType)

	return &v3.ClickHouseQuery{
		Query: query,
	}, nil
}

func buildClickHouseQueriesNetwork(messagingQueue *MessagingQueue, attributeCache []Clients) (map[string]*v3.ClickHouseQuery, error) {
	cq := make(map[string]*v3.ClickHouseQuery)
	start := messagingQueue.Start
	end := messagingQueue.End

	for i, clientInfo := range attributeCache {
		query := generateNetworkLatencyFetchSQL(defaultStepInterval, start/1000000, end/1000000, clientInfo.ConsumerId, clientInfo.ServiceName)
		chq := &v3.ClickHouseQuery{
			Query: query,
		}
		index := fmt.Sprintf("latency_%d", i)
		cq[index] = chq
	}

	return cq, nil
}

func BuildQRParamsNetwork(messagingQueue *MessagingQueue, queryContext string, attributeCache []Clients) (*v3.QueryRangeParamsV3, error) {

	// ToDo: propagate this through APIs when there are different handlers
	queueType := kafkaQueue

	var cq *v3.CompositeQuery

	if queryContext == "throughput" {
		chq, err := buildClickHouseQueryNetwork(messagingQueue, queueType)

		if err != nil {
			return nil, err
		}

		cq, err = buildCompositeQuery(chq, queryContext)
	} else if queryContext == "fetch-latency" {
		chq, err := buildClickHouseQueriesNetwork(messagingQueue, attributeCache)
		if err != nil {
			return nil, err
		}
		cq = &v3.CompositeQuery{
			QueryType:         v3.QueryTypeClickHouseSQL,
			ClickHouseQueries: chq,
			PanelType:         v3.PanelTypeTable,
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

func buildClickHouseQuery(messagingQueue *MessagingQueue, queueType string, queryContext string) (*v3.ClickHouseQuery, error) {
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

	var query string
	if queryContext == "producer" {
		query = generateProducerSQL(start, end, topic, partition, queueType)
	} else if queryContext == "consumer" {
		consumerGroup, ok := messagingQueue.Variables["consumer_group"]
		if !ok {
			return nil, fmt.Errorf("invalid type for consumer group")
		}
		query = generateConsumerSQL(start, end, topic, partition, consumerGroup, queueType)
	}

	return &v3.ClickHouseQuery{
		Query: query,
	}, nil
}

func buildCompositeQuery(chq *v3.ClickHouseQuery, queryContext string) (*v3.CompositeQuery, error) {
	return &v3.CompositeQuery{
		QueryType:         v3.QueryTypeClickHouseSQL,
		ClickHouseQueries: map[string]*v3.ClickHouseQuery{queryContext: chq},
		PanelType:         v3.PanelTypeTable,
	}, nil
}

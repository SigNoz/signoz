package kafka

import (
	"fmt"
	"strings"

	"go.signoz.io/signoz/pkg/query-service/common"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

var defaultStepInterval int64 = 60

func BuildQueryRangeParams(messagingQueue *MessagingQueue, queryContext string) (*v3.QueryRangeParamsV3, error) {

	// ToDo: propagate this through APIs when there are different handlers
	queueType := KafkaQueue

	chq, err := BuildClickHouseQuery(messagingQueue, queueType, queryContext)

	if err != nil {
		return nil, err
	}

	var cq *v3.CompositeQuery

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

func PrepareClikhouseQueries(messagingQueue *MessagingQueue, queryContext string) (*v3.ClickHouseQuery, error) {
	queueType := KafkaQueue

	chq, err := BuildClickHouseQuery(messagingQueue, queueType, queryContext)

	return chq, err
}

func buildClickHouseQueryNetwork(messagingQueue *MessagingQueue, queueType string) (*v3.ClickHouseQuery, error) {
	start := messagingQueue.Start
	end := messagingQueue.End
	consumerGroup, ok := messagingQueue.Variables["consumer_group"]
	if !ok {
		return nil, fmt.Errorf("consumer_group not found in the request")
	}

	partitionID, ok := messagingQueue.Variables["partition"]
	if !ok {
		return nil, fmt.Errorf("partition not found in the request")
	}

	query := generateNetworkLatencyThroughputSQL(start, end, consumerGroup, partitionID, queueType)

	return &v3.ClickHouseQuery{
		Query: query,
	}, nil
}

func formatstring(str []string) string {
	joined := strings.Join(str, ", ")
	if len(joined) <= 2 {
		return ""
	}
	return joined[1 : len(joined)-1]
}

func buildBuilderQueriesNetwork(unixMilliStart, unixMilliEnd int64, attributeCache *Clients) (map[string]*v3.BuilderQuery, error) {
	bq := make(map[string]*v3.BuilderQuery)
	queryName := fmt.Sprintf("latency")

	chq := &v3.BuilderQuery{
		QueryName:    queryName,
		StepInterval: common.MinAllowedStepInterval(unixMilliStart, unixMilliEnd),
		DataSource:   v3.DataSourceMetrics,
		AggregateAttribute: v3.AttributeKey{
			Key: "kafka_consumer_fetch_latency_avg",
		},
		AggregateOperator: v3.AggregateOperatorAvg,
		Temporality:       v3.Unspecified,
		TimeAggregation:   v3.TimeAggregationAvg,
		SpaceAggregation:  v3.SpaceAggregationAvg,
		Filters: &v3.FilterSet{
			Operator: "AND",
			Items: []v3.FilterItem{
				{
					Key: v3.AttributeKey{
						Key:      "service_name",
						Type:     v3.AttributeKeyTypeTag,
						DataType: v3.AttributeKeyDataTypeString,
					},
					Operator: v3.FilterOperatorIn,
					Value:    attributeCache.ServiceName,
				},
				{
					Key: v3.AttributeKey{
						Key:      "client_id",
						Type:     v3.AttributeKeyTypeTag,
						DataType: v3.AttributeKeyDataTypeString,
					},
					Operator: v3.FilterOperatorIn,
					Value:    attributeCache.ClientID,
				},
				{
					Key: v3.AttributeKey{
						Key:      "service_instance_id",
						Type:     v3.AttributeKeyTypeTag,
						DataType: v3.AttributeKeyDataTypeString,
					},
					Operator: v3.FilterOperatorIn,
					Value:    attributeCache.ServiceInstanceID,
				},
			},
		},
		Expression: queryName,
		ReduceTo:   v3.ReduceToOperatorAvg,
		GroupBy: []v3.AttributeKey{{
			Key:      "service_name",
			DataType: v3.AttributeKeyDataTypeString,
			Type:     v3.AttributeKeyTypeTag,
		},
			{
				Key:      "client_id",
				DataType: v3.AttributeKeyDataTypeString,
				Type:     v3.AttributeKeyTypeTag,
			},
			{
				Key:      "service_instance_id",
				DataType: v3.AttributeKeyDataTypeString,
				Type:     v3.AttributeKeyTypeTag,
			},
		},
	}
	bq[queryName] = chq
	return bq, nil
}

func BuildQRParamsNetwork(messagingQueue *MessagingQueue, queryContext string, attributeCache *Clients) (*v3.QueryRangeParamsV3, error) {

	queueType := KafkaQueue

	unixMilliStart := messagingQueue.Start / 1000000
	unixMilliEnd := messagingQueue.End / 1000000

	var cq *v3.CompositeQuery

	if queryContext == "throughput" {
		chq, err := buildClickHouseQueryNetwork(messagingQueue, queueType)

		if err != nil {
			return nil, err
		}

		cq, err = buildCompositeQuery(chq, queryContext)

	} else if queryContext == "fetch-latency" {
		bhq, err := buildBuilderQueriesNetwork(unixMilliStart, unixMilliEnd, attributeCache)
		if err != nil {
			return nil, err
		}
		cq = &v3.CompositeQuery{
			QueryType:      v3.QueryTypeBuilder,
			BuilderQueries: bhq,
			PanelType:      v3.PanelTypeTable,
		}
	}

	queryRangeParams := &v3.QueryRangeParamsV3{
		Start:          unixMilliStart,
		End:            unixMilliEnd,
		Step:           defaultStepInterval,
		CompositeQuery: cq,
		Version:        "v4",
		FormatForWeb:   true,
	}

	return queryRangeParams, nil
}

func BuildClickHouseQuery(messagingQueue *MessagingQueue, queueType string, queryContext string) (*v3.ClickHouseQuery, error) {
	start := messagingQueue.Start
	end := messagingQueue.End

	var topic, partition string

	if queryContext == "producer" || queryContext == "consumer" {
		var ok bool
		topic, ok = messagingQueue.Variables["topic"]
		if !ok {
			return nil, fmt.Errorf("invalid type for Topic")
		}
		partition, ok = messagingQueue.Variables["partition"]
		if !ok {
			return nil, fmt.Errorf("invalid type for Partition")
		}
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
	} else if queryContext == "onboard_producers" {
		query = onboardProducersSQL(start, end, queueType)
	} else if queryContext == "onboard_consumers" {
		query = onboardConsumerSQL(start, end, queueType)
	} else if queryContext == "onboard_kafka" {
		query = onboardKafkaSQL(start, end)
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

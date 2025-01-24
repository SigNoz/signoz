/* eslint-disable sonarjs/no-duplicate-string */
import { PANEL_TYPES } from 'constants/queryBuilder';
import { GetWidgetQueryBuilderProps } from 'container/MetricsApplication/types';
import { Widgets } from 'types/api/dashboard/getAll';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';
import { v4 as uuid } from 'uuid';

interface GetWidgetQueryProps {
	title: string;
	description: string;
	queryData: IBuilderQuery[];
	panelTypes?: PANEL_TYPES;
	yAxisUnit?: string;
	columnUnits?: Record<string, string>;
}

interface GetWidgetQueryPropsReturn extends GetWidgetQueryBuilderProps {
	description?: string;
	nullZeroValues: string;
	columnUnits?: Record<string, string>;
}

export const getWidgetQueryBuilder = ({
	query,
	title = '',
	panelTypes,
	yAxisUnit = '',
	fillSpans = false,
	id,
	nullZeroValues,
	description,
}: GetWidgetQueryPropsReturn): Widgets => ({
	description: description || '',
	id: id || uuid(),
	isStacked: false,
	nullZeroValues: nullZeroValues || '',
	opacity: '1',
	panelTypes,
	query,
	timePreferance: 'GLOBAL_TIME',
	title,
	yAxisUnit,
	softMax: null,
	softMin: null,
	selectedLogFields: [],
	selectedTracesFields: [],
	fillSpans,
});

export function getWidgetQuery(
	props: GetWidgetQueryProps,
): GetWidgetQueryPropsReturn {
	const { title, description, panelTypes, yAxisUnit, columnUnits } = props;
	return {
		title,
		yAxisUnit: yAxisUnit || 'none',
		panelTypes: panelTypes || PANEL_TYPES.TIME_SERIES,
		fillSpans: false,
		description,
		nullZeroValues: 'zero',
		columnUnits,
		query: {
			queryType: EQueryType.QUERY_BUILDER,
			promql: [],
			builder: {
				queryData: props.queryData,
				queryFormulas: [],
			},
			clickhouse_sql: [],
			id: uuid(),
		},
	};
}

export const requestTimesWidgetData = getWidgetQueryBuilder(
	getWidgetQuery({
		queryData: [
			{
				aggregateAttribute: {
					dataType: DataTypes.Float64,
					id: 'kafka_request_time_avg--float64--Gauge--true',
					isColumn: true,
					isJSON: false,
					key: 'kafka_request_time_avg',
					type: 'Gauge',
				},
				aggregateOperator: 'avg',
				dataSource: DataSource.METRICS,
				disabled: false,
				expression: 'A',
				filters: {
					items: [],
					op: 'AND',
				},
				functions: [],
				groupBy: [],
				having: [],
				legend: 'Request Times',
				limit: null,
				orderBy: [],
				queryName: 'A',
				reduceTo: 'avg',
				spaceAggregation: 'avg',
				stepInterval: 60,
				timeAggregation: 'avg',
			},
		],
		title: 'Request Times',
		description:
			'This metric is used to measure the average latency experienced by requests across the Kafka broker.',
	}),
);

export const brokerCountWidgetData = getWidgetQueryBuilder(
	getWidgetQuery({
		queryData: [
			{
				aggregateAttribute: {
					dataType: DataTypes.Float64,
					id: 'kafka_brokers--float64--Gauge--true',
					isColumn: true,
					isJSON: false,
					key: 'kafka_brokers',
					type: 'Gauge',
				},
				aggregateOperator: 'sum',
				dataSource: DataSource.METRICS,
				disabled: false,
				expression: 'A',
				filters: {
					items: [],
					op: 'AND',
				},
				functions: [],
				groupBy: [],
				having: [],
				legend: 'Broker count',
				limit: null,
				orderBy: [],
				queryName: 'A',
				reduceTo: 'avg',
				spaceAggregation: 'avg',
				stepInterval: 60,
				timeAggregation: 'sum',
			},
		],
		title: 'Broker Count',
		description: 'Total number of active brokers in the Kafka cluster.\n',
	}),
);

export const producerFetchRequestPurgatoryWidgetData = getWidgetQueryBuilder(
	getWidgetQuery({
		queryData: [
			{
				aggregateAttribute: {
					dataType: DataTypes.Float64,
					id: 'kafka_purgatory_size--float64--Gauge--true',
					isColumn: true,
					isJSON: false,
					key: 'kafka_purgatory_size',
					type: 'Gauge',
				},
				aggregateOperator: 'avg',
				dataSource: DataSource.METRICS,
				disabled: false,
				expression: 'A',
				filters: {
					items: [],
					op: 'AND',
				},
				functions: [],
				groupBy: [],
				having: [],
				legend: 'Producer and Fetch Request Purgatory',
				limit: null,
				orderBy: [],
				queryName: 'A',
				reduceTo: 'avg',
				spaceAggregation: 'avg',
				stepInterval: 60,
				timeAggregation: 'avg',
			},
		],
		title: 'Producer and Fetch Request Purgatory',
		description:
			'Measures the number of requests that Kafka brokers have received but cannot immediately fulfill',
	}),
);

export const brokerNetworkThroughputWidgetData = getWidgetQueryBuilder(
	getWidgetQuery({
		queryData: [
			{
				aggregateAttribute: {
					dataType: DataTypes.Float64,
					id:
						'kafka_server_brokertopicmetrics_bytesoutpersec_oneminuterate--float64--Gauge--true',
					isColumn: true,
					isJSON: false,
					key: 'kafka_server_brokertopicmetrics_bytesoutpersec_oneminuterate',
					type: 'Gauge',
				},
				aggregateOperator: 'avg',
				dataSource: DataSource.METRICS,
				disabled: false,
				expression: 'A',
				filters: {
					items: [],
					op: 'AND',
				},
				functions: [],
				groupBy: [],
				having: [],
				legend: 'Broker Network Throughput',
				limit: null,
				orderBy: [],
				queryName: 'A',
				reduceTo: 'avg',
				spaceAggregation: 'avg',
				stepInterval: 60,
				timeAggregation: 'avg',
			},
		],
		title: 'Broker Network Throughput',
		description:
			'Helps gauge the data throughput from the Kafka broker to consumer clients, focusing on the network usage associated with serving messages to consumers.',
	}),
);

export const ioWaitTimeWidgetData = getWidgetQueryBuilder(
	getWidgetQuery({
		queryData: [
			{
				aggregateAttribute: {
					dataType: DataTypes.Float64,
					id: 'kafka_producer_io_waittime_total--float64--Sum--true',
					isColumn: true,
					isJSON: false,
					key: 'kafka_producer_io_waittime_total',
					type: 'Sum',
				},
				aggregateOperator: 'rate',
				dataSource: DataSource.METRICS,
				disabled: false,
				expression: 'A',
				filters: {
					items: [],
					op: 'AND',
				},
				functions: [],
				groupBy: [],
				having: [],
				legend: 'I/O Wait Time',
				limit: null,
				orderBy: [],
				queryName: 'A',
				reduceTo: 'avg',
				spaceAggregation: 'sum',
				stepInterval: 60,
				timeAggregation: 'rate',
			},
		],
		title: 'I/O Wait Time',
		description:
			'This metric measures the total time that producers are in an I/O wait state, indicating potential bottlenecks in data transmission from producers to Kafka brokers.',
	}),
);

export const requestResponseWidgetData = getWidgetQueryBuilder(
	getWidgetQuery({
		queryData: [
			{
				aggregateAttribute: {
					dataType: DataTypes.Float64,
					id: 'kafka_producer_request_rate--float64--Gauge--true',
					isColumn: true,
					isJSON: false,
					key: 'kafka_producer_request_rate',
					type: 'Gauge',
				},
				aggregateOperator: 'avg',
				dataSource: DataSource.METRICS,
				disabled: false,
				expression: 'A',
				filters: {
					items: [],
					op: 'AND',
				},
				functions: [],
				groupBy: [],
				having: [],
				legend: 'Request Rate',
				limit: null,
				orderBy: [],
				queryName: 'A',
				reduceTo: 'avg',
				spaceAggregation: 'avg',
				stepInterval: 60,
				timeAggregation: 'avg',
			},
			{
				aggregateAttribute: {
					dataType: DataTypes.Float64,
					id: 'kafka_producer_response_rate--float64--Gauge--true',
					isColumn: true,
					isJSON: false,
					key: 'kafka_producer_response_rate',
					type: 'Gauge',
				},
				aggregateOperator: 'avg',
				dataSource: DataSource.METRICS,
				disabled: false,
				expression: 'B',
				filters: {
					items: [],
					op: 'AND',
				},
				functions: [],
				groupBy: [],
				having: [],
				legend: 'Response Rate',
				limit: null,
				orderBy: [],
				queryName: 'B',
				reduceTo: 'avg',
				spaceAggregation: 'avg',
				stepInterval: 60,
				timeAggregation: 'avg',
			},
		],
		title: 'Request and Response Rate',
		description:
			"Indicates how many requests the producer is sending per second, reflecting the intensity of the producer's interaction with the Kafka cluster. Also, helps Kafka administrators gauge the responsiveness of brokers to producer requests.",
	}),
);

export const averageRequestLatencyWidgetData = getWidgetQueryBuilder(
	getWidgetQuery({
		queryData: [
			{
				aggregateAttribute: {
					dataType: DataTypes.Float64,
					id: 'kafka_producer_request_latency_avg--float64--Gauge--true',
					isColumn: true,
					isJSON: false,
					key: 'kafka_producer_request_latency_avg',
					type: 'Gauge',
				},
				aggregateOperator: 'avg',
				dataSource: DataSource.METRICS,
				disabled: false,
				expression: 'A',
				filters: {
					items: [],
					op: 'AND',
				},
				functions: [],
				groupBy: [],
				having: [],
				legend: 'Average Request Latency',
				limit: null,
				orderBy: [],
				queryName: 'A',
				reduceTo: 'avg',
				spaceAggregation: 'avg',
				stepInterval: 60,
				timeAggregation: 'avg',
			},
		],
		title: 'Average Request Latency',
		description:
			'Helps Kafka administrators and developers understand the average latency experienced by producer requests.',
	}),
);

export const kafkaProducerByteRateWidgetData = getWidgetQueryBuilder(
	getWidgetQuery({
		queryData: [
			{
				aggregateAttribute: {
					dataType: DataTypes.Float64,
					id: 'kafka_producer_byte_rate--float64--Gauge--true',
					isColumn: true,
					isJSON: false,
					key: 'kafka_producer_byte_rate',
					type: 'Gauge',
				},
				aggregateOperator: 'avg',
				dataSource: DataSource.METRICS,
				disabled: false,
				expression: 'A',
				filters: {
					items: [],
					op: 'AND',
				},
				functions: [],
				groupBy: [
					{
						dataType: DataTypes.String,
						id: 'topic--string--tag--false',
						isColumn: false,
						isJSON: false,
						key: 'topic',
						type: 'tag',
					},
				],
				having: [],
				legend: '',
				limit: null,
				orderBy: [],
				queryName: 'A',
				reduceTo: 'avg',
				spaceAggregation: 'avg',
				stepInterval: 60,
				timeAggregation: 'avg',
			},
		],
		title: 'kafka_producer_byte_rate',
		description:
			'Helps measure the data output rate from the producer, indicating the load a producer is placing on Kafka brokers.',
	}),
);

export const bytesConsumedWidgetData = getWidgetQueryBuilder(
	getWidgetQuery({
		queryData: [
			{
				aggregateAttribute: {
					dataType: DataTypes.Float64,
					id: 'kafka_consumer_bytes_consumed_rate--float64--Gauge--true',
					isColumn: true,
					isJSON: false,
					key: 'kafka_consumer_bytes_consumed_rate',
					type: 'Gauge',
				},
				aggregateOperator: 'avg',
				dataSource: DataSource.METRICS,
				disabled: false,
				expression: 'A',
				filters: {
					items: [],
					op: 'AND',
				},
				functions: [],
				groupBy: [],
				having: [],
				legend: 'Bytes Consumed',
				limit: null,
				orderBy: [],
				queryName: 'A',
				reduceTo: 'avg',
				spaceAggregation: 'avg',
				stepInterval: 60,
				timeAggregation: 'avg',
			},
		],
		title: 'Bytes Consumed',
		description:
			'Helps Kafka administrators monitor the data consumption rate of a consumer group, showing how much data (in bytes) is being read from the Kafka cluster over time.',
	}),
);

export const consumerOffsetWidgetData = getWidgetQueryBuilder(
	getWidgetQuery({
		queryData: [
			{
				aggregateAttribute: {
					dataType: DataTypes.Float64,
					id: 'kafka_consumer_group_offset--float64--Gauge--true',
					isColumn: true,
					isJSON: false,
					key: 'kafka_consumer_group_offset',
					type: 'Gauge',
				},
				aggregateOperator: 'avg',
				dataSource: DataSource.METRICS,
				disabled: false,
				expression: 'A',
				filters: {
					items: [],
					op: 'AND',
				},
				functions: [],
				groupBy: [
					{
						dataType: DataTypes.String,
						id: 'group--string--tag--false',
						isColumn: false,
						isJSON: false,
						key: 'group',
						type: 'tag',
					},
					{
						dataType: DataTypes.String,
						id: 'topic--string--tag--false',
						isColumn: false,
						isJSON: false,
						key: 'topic',
						type: 'tag',
					},
					{
						dataType: DataTypes.String,
						id: 'partition--string--tag--false',
						isColumn: false,
						isJSON: false,
						key: 'partition',
						type: 'tag',
					},
				],
				having: [],
				legend: '',
				limit: null,
				orderBy: [],
				queryName: 'A',
				reduceTo: 'avg',
				spaceAggregation: 'avg',
				stepInterval: 60,
				timeAggregation: 'avg',
			},
		],
		title: 'Consumer Offset',
		description: 'Current offset of each consumer group for each topic partition',
	}),
);

export const consumerGroupMemberWidgetData = getWidgetQueryBuilder(
	getWidgetQuery({
		queryData: [
			{
				aggregateAttribute: {
					dataType: DataTypes.Float64,
					id: 'kafka_consumer_group_members--float64--Gauge--true',
					isColumn: true,
					isJSON: false,
					key: 'kafka_consumer_group_members',
					type: 'Gauge',
				},
				aggregateOperator: 'sum',
				dataSource: DataSource.METRICS,
				disabled: false,
				expression: 'A',
				filters: {
					items: [],
					op: 'AND',
				},
				functions: [],
				groupBy: [
					{
						dataType: DataTypes.String,
						id: 'group--string--tag--false',
						isColumn: false,
						isJSON: false,
						key: 'group',
						type: 'tag',
					},
				],
				having: [],
				legend: '',
				limit: null,
				orderBy: [],
				queryName: 'A',
				reduceTo: 'avg',
				spaceAggregation: 'sum',
				stepInterval: 60,
				timeAggregation: 'sum',
			},
		],
		title: 'Consumer Group Members',
		description: 'Number of active users in each group',
	}),
);

export const consumerLagByGroupWidgetData = getWidgetQueryBuilder(
	getWidgetQuery({
		queryData: [
			{
				aggregateAttribute: {
					dataType: DataTypes.Float64,
					id: 'kafka_consumer_group_lag--float64--Gauge--true',
					isColumn: true,
					isJSON: false,
					key: 'kafka_consumer_group_lag',
					type: 'Gauge',
				},
				aggregateOperator: 'avg',
				dataSource: DataSource.METRICS,
				disabled: false,
				expression: 'A',
				filters: {
					items: [],
					op: 'AND',
				},
				functions: [],
				groupBy: [
					{
						dataType: DataTypes.String,
						id: 'group--string--tag--false',
						isColumn: false,
						isJSON: false,
						key: 'group',
						type: 'tag',
					},
					{
						dataType: DataTypes.String,
						id: 'topic--string--tag--false',
						isColumn: false,
						isJSON: false,
						key: 'topic',
						type: 'tag',
					},
					{
						dataType: DataTypes.String,
						id: 'partition--string--tag--false',
						isColumn: false,
						isJSON: false,
						key: 'partition',
						type: 'tag',
					},
				],
				having: [],
				legend: '',
				limit: null,
				orderBy: [],
				queryName: 'A',
				reduceTo: 'avg',
				spaceAggregation: 'avg',
				stepInterval: 60,
				timeAggregation: 'avg',
			},
		],
		title: 'Consumer Lag by Group',
		description:
			'Helps Kafka administrators assess whether consumer groups are keeping up with the incoming data stream or falling behind',
	}),
);

export const consumerFetchRateWidgetData = getWidgetQueryBuilder(
	getWidgetQuery({
		queryData: [
			{
				aggregateAttribute: {
					dataType: DataTypes.Float64,
					id: 'kafka_consumer_fetch_rate--float64--Gauge--true',
					isColumn: true,
					isJSON: false,
					key: 'kafka_consumer_fetch_rate',
					type: 'Gauge',
				},
				aggregateOperator: 'avg',
				dataSource: DataSource.METRICS,
				disabled: false,
				expression: 'A',
				filters: {
					items: [],
					op: 'AND',
				},
				functions: [],
				groupBy: [
					{
						dataType: DataTypes.String,
						id: 'service_name--string--tag--false',
						isColumn: false,
						isJSON: false,
						key: 'service_name',
						type: 'tag',
					},
				],
				having: [],
				legend: '',
				limit: null,
				orderBy: [],
				queryName: 'A',
				reduceTo: 'avg',
				spaceAggregation: 'avg',
				stepInterval: 60,
				timeAggregation: 'avg',
			},
		],
		title: 'Consumer Fetch Rate',
		description:
			'Metric measures the rate at which fetch requests are made by a Kafka consumer to the broker, typically in requests per second.',
	}),
);

export const messagesConsumedWidgetData = getWidgetQueryBuilder(
	getWidgetQuery({
		queryData: [
			{
				aggregateAttribute: {
					dataType: DataTypes.Float64,
					id: 'kafka_consumer_records_consumed_rate--float64--Gauge--true',
					isColumn: true,
					isJSON: false,
					key: 'kafka_consumer_records_consumed_rate',
					type: 'Gauge',
				},
				aggregateOperator: 'avg',
				dataSource: DataSource.METRICS,
				disabled: false,
				expression: 'A',
				filters: {
					items: [],
					op: 'AND',
				},
				functions: [],
				groupBy: [],
				having: [],
				legend: 'Messages Consumed',
				limit: null,
				orderBy: [],
				queryName: 'A',
				reduceTo: 'avg',
				spaceAggregation: 'avg',
				stepInterval: 60,
				timeAggregation: 'avg',
			},
		],
		title: 'Messages Consumed',
		description:
			'Measures the rate at which a Kafka consumer is consuming records (messages) per second from Kafka brokers.',
	}),
);

export const jvmGCCountWidgetData = getWidgetQueryBuilder(
	getWidgetQuery({
		queryData: [
			{
				aggregateAttribute: {
					dataType: DataTypes.Float64,
					id: 'jvm_gc_collections_count--float64--Sum--true',
					isColumn: true,
					isJSON: false,
					key: 'jvm_gc_collections_count',
					type: 'Sum',
				},
				aggregateOperator: 'rate',
				dataSource: DataSource.METRICS,
				disabled: false,
				expression: 'A',
				filters: {
					items: [],
					op: 'AND',
				},
				functions: [],
				groupBy: [],
				having: [],
				legend: 'JVM GC Count',
				limit: null,
				orderBy: [],
				queryName: 'A',
				reduceTo: 'avg',
				spaceAggregation: 'sum',
				stepInterval: 60,
				timeAggregation: 'rate',
			},
		],
		title: 'JVM GC Count',
		description:
			'Tracks the total number of garbage collection (GC) events that have occurred in the Java Virtual Machine (JVM).',
	}),
);

export const jvmGcCollectionsElapsedWidgetData = getWidgetQueryBuilder(
	getWidgetQuery({
		queryData: [
			{
				aggregateAttribute: {
					dataType: DataTypes.Float64,
					id: 'jvm_gc_collections_elapsed--float64--Sum--true',
					isColumn: true,
					isJSON: false,
					key: 'jvm_gc_collections_elapsed',
					type: 'Sum',
				},
				aggregateOperator: 'rate',
				dataSource: DataSource.METRICS,
				disabled: false,
				expression: 'A',
				filters: {
					items: [],
					op: 'AND',
				},
				functions: [],
				groupBy: [],
				having: [],
				legend: 'garbagecollector',
				limit: null,
				orderBy: [],
				queryName: 'A',
				reduceTo: 'avg',
				spaceAggregation: 'sum',
				stepInterval: 60,
				timeAggregation: 'rate',
			},
		],
		title: 'jvm_gc_collections_elapsed',
		description:
			'Measures the total time (usually in milliseconds) spent on garbage collection (GC) events in the Java Virtual Machine (JVM).',
	}),
);

export const cpuRecentUtilizationWidgetData = getWidgetQueryBuilder(
	getWidgetQuery({
		queryData: [
			{
				aggregateAttribute: {
					dataType: DataTypes.Float64,
					id: 'jvm_cpu_recent_utilization--float64--Gauge--true',
					isColumn: true,
					isJSON: false,
					key: 'jvm_cpu_recent_utilization',
					type: 'Gauge',
				},
				aggregateOperator: 'avg',
				dataSource: DataSource.METRICS,
				disabled: false,
				expression: 'A',
				filters: {
					items: [],
					op: 'AND',
				},
				functions: [],
				groupBy: [],
				having: [],
				legend: 'CPU utilization',
				limit: null,
				orderBy: [],
				queryName: 'A',
				reduceTo: 'avg',
				spaceAggregation: 'avg',
				stepInterval: 60,
				timeAggregation: 'avg',
			},
		],
		title: 'CPU Recent Utilization',
		description:
			'This metric measures the recent CPU usage by the Java Virtual Machine (JVM), typically expressed as a percentage.',
	}),
);

export const jvmMemoryHeapWidgetData = getWidgetQueryBuilder(
	getWidgetQuery({
		queryData: [
			{
				aggregateAttribute: {
					dataType: DataTypes.Float64,
					id: 'jvm_memory_heap_max--float64--Gauge--true',
					isColumn: true,
					isJSON: false,
					key: 'jvm_memory_heap_max',
					type: 'Gauge',
				},
				aggregateOperator: 'avg',
				dataSource: DataSource.METRICS,
				disabled: false,
				expression: 'A',
				filters: {
					items: [],
					op: 'AND',
				},
				functions: [],
				groupBy: [],
				having: [],
				legend: 'JVM memory heap',
				limit: null,
				orderBy: [],
				queryName: 'A',
				reduceTo: 'avg',
				spaceAggregation: 'avg',
				stepInterval: 60,
				timeAggregation: 'avg',
			},
		],
		title: 'JVM memory heap',
		description:
			'The metric represents the maximum amount of heap memory available to the Java Virtual Machine (JVM)',
	}),
);

export const partitionCountPerTopicWidgetData = getWidgetQueryBuilder(
	getWidgetQuery({
		queryData: [
			{
				aggregateAttribute: {
					dataType: DataTypes.Float64,
					id: 'kafka_topic_partitions--float64--Gauge--true',
					isColumn: true,
					isJSON: false,
					key: 'kafka_topic_partitions',
					type: 'Gauge',
				},
				aggregateOperator: 'sum',
				dataSource: DataSource.METRICS,
				disabled: false,
				expression: 'A',
				filters: {
					items: [],
					op: 'AND',
				},
				functions: [],
				groupBy: [
					{
						dataType: DataTypes.String,
						id: 'topic--string--tag--false',
						isColumn: false,
						isJSON: false,
						key: 'topic',
						type: 'tag',
					},
				],
				having: [],
				legend: '',
				limit: null,
				orderBy: [],
				queryName: 'A',
				reduceTo: 'avg',
				spaceAggregation: 'sum',
				stepInterval: 60,
				timeAggregation: 'sum',
			},
		],
		title: 'Partition Count per Topic',
		description: 'Number of partitions for each topic',
	}),
);

export const currentOffsetPartitionWidgetData = getWidgetQueryBuilder(
	getWidgetQuery({
		queryData: [
			{
				aggregateAttribute: {
					dataType: DataTypes.Float64,
					id: 'kafka_partition_current_offset--float64--Gauge--true',
					isColumn: true,
					isJSON: false,
					key: 'kafka_partition_current_offset',
					type: 'Gauge',
				},
				aggregateOperator: 'avg',
				dataSource: DataSource.METRICS,
				disabled: false,
				expression: 'A',
				filters: {
					items: [],
					op: 'AND',
				},
				functions: [],
				groupBy: [
					{
						dataType: DataTypes.String,
						id: 'topic--string--tag--false',
						isColumn: false,
						isJSON: false,
						key: 'topic',
						type: 'tag',
					},
					{
						dataType: DataTypes.String,
						id: 'partition--string--tag--false',
						isColumn: false,
						isJSON: false,
						key: 'partition',
						type: 'tag',
					},
				],
				having: [],
				legend: '',
				limit: null,
				orderBy: [],
				queryName: 'A',
				reduceTo: 'avg',
				spaceAggregation: 'avg',
				stepInterval: 60,
				timeAggregation: 'avg',
			},
		],
		title: 'Current Offset ( Partition )',
		description:
			'Current offset of each partition, showing the latest position in each partition',
	}),
);

export const oldestOffsetWidgetData = getWidgetQueryBuilder(
	getWidgetQuery({
		queryData: [
			{
				aggregateAttribute: {
					dataType: DataTypes.Float64,
					id: 'kafka_partition_oldest_offset--float64--Gauge--true',
					isColumn: true,
					isJSON: false,
					key: 'kafka_partition_oldest_offset',
					type: 'Gauge',
				},
				aggregateOperator: 'avg',
				dataSource: DataSource.METRICS,
				disabled: false,
				expression: 'A',
				filters: {
					items: [],
					op: 'AND',
				},
				functions: [],
				groupBy: [
					{
						dataType: DataTypes.String,
						id: 'topic--string--tag--false',
						isColumn: false,
						isJSON: false,
						key: 'topic',
						type: 'tag',
					},
					{
						dataType: DataTypes.String,
						id: 'partition--string--tag--false',
						isColumn: false,
						isJSON: false,
						key: 'partition',
						type: 'tag',
					},
				],
				having: [],
				legend: '',
				limit: null,
				orderBy: [],
				queryName: 'A',
				reduceTo: 'avg',
				spaceAggregation: 'avg',
				stepInterval: 60,
				timeAggregation: 'avg',
			},
		],
		title: 'Oldest Offset (Partition)',
		description:
			'Oldest offset of each partition to identify log retention and offset range.',
	}),
);

export const insyncReplicasWidgetData = getWidgetQueryBuilder(
	getWidgetQuery({
		queryData: [
			{
				aggregateAttribute: {
					dataType: DataTypes.Float64,
					id: 'kafka_partition_replicas_in_sync--float64--Gauge--true',
					isColumn: true,
					isJSON: false,
					key: 'kafka_partition_replicas_in_sync',
					type: 'Gauge',
				},
				aggregateOperator: 'avg',
				dataSource: DataSource.METRICS,
				disabled: false,
				expression: 'A',
				filters: {
					items: [],
					op: 'AND',
				},
				functions: [],
				groupBy: [
					{
						dataType: DataTypes.String,
						id: 'topic--string--tag--false',
						isColumn: false,
						isJSON: false,
						key: 'topic',
						type: 'tag',
					},
					{
						dataType: DataTypes.String,
						id: 'partition--string--tag--false',
						isColumn: false,
						isJSON: false,
						key: 'partition',
						type: 'tag',
					},
				],
				having: [],
				legend: '',
				limit: null,
				orderBy: [],
				queryName: 'A',
				reduceTo: 'avg',
				spaceAggregation: 'avg',
				stepInterval: 60,
				timeAggregation: 'avg',
			},
		],
		title: 'In-Sync Replicas (ISR)',
		description:
			'Count of in-sync replicas for each partition to ensure data availability.',
	}),
);

/* eslint-disable sonarjs/no-duplicate-string */
import { PANEL_TYPES } from 'constants/queryBuilder';
import { GetWidgetQueryBuilderProps } from 'container/MetricsApplication/types';
import { Widgets } from 'types/api/dashboard/getAll';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import {
	IBuilderFormula,
	IBuilderQuery,
} from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { DataSource, ReduceOperators } from 'types/common/queryBuilder';
import { v4 as uuid } from 'uuid';

interface GetWidgetQueryProps {
	title: string;
	description: string;
	queryData: IBuilderQuery[];
	queryFormulas?: IBuilderFormula[];
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
				queryFormulas: (props.queryFormulas as IBuilderFormula[]) || [],
				queryTraceOperator: [],
			},
			clickhouse_sql: [],
			id: uuid(),
		},
	};
}

export const getRequestTimesWidgetData = (): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.Float64,
						key: 'kafka.request.time.avg',
						id: 'kafka.request.time.avg--float64--Gauge--true',
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
					reduceTo: ReduceOperators.AVG,
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

export const getBrokerCountWidgetData = (): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.Float64,
						key: 'kafka.brokers',
						id: 'kafka.brokers--float64--Gauge--true',
						type: 'Gauge',
					},
					aggregateOperator: 'sum',
					dataSource: DataSource.METRICS,
					disabled: false,
					expression: 'A',
					filters: { items: [], op: 'AND' },
					functions: [],
					groupBy: [],
					having: [],
					legend: 'Broker count',
					limit: null,
					orderBy: [],
					queryName: 'A',
					reduceTo: ReduceOperators.AVG,
					spaceAggregation: 'avg',
					stepInterval: 60,
					timeAggregation: 'sum',
				},
			],
			title: 'Broker Count',
			description: 'Total number of active brokers in the Kafka cluster.',
		}),
	);

export const getProducerFetchRequestPurgatoryWidgetData = (): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.Float64,
						key: 'kafka.purgatory.size',
						id: 'kafka.purgatory.size--float64--Gauge--true',
						type: 'Gauge',
					},
					aggregateOperator: 'avg',
					dataSource: DataSource.METRICS,
					disabled: false,
					expression: 'A',
					filters: { items: [], op: 'AND' },
					functions: [],
					groupBy: [],
					having: [],
					legend: 'Producer and Fetch Request Purgatory',
					limit: null,
					orderBy: [],
					queryName: 'A',
					reduceTo: ReduceOperators.AVG,
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

export const getBrokerNetworkThroughputWidgetData = (): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.Float64,
						key:
							'kafka_server_brokertopicmetrics_total_replicationbytesinpersec_oneminuterate',
						id:
							'kafka_server_brokertopicmetrics_total_replicationbytesinpersec_oneminuterate--float64--Gauge--true',
						type: 'Gauge',
					},
					aggregateOperator: 'avg',
					dataSource: DataSource.METRICS,
					disabled: false,
					expression: 'A',
					filters: { items: [], op: 'AND' },
					functions: [],
					groupBy: [],
					having: [],
					legend: 'Broker Network Throughput',
					limit: null,
					orderBy: [],
					queryName: 'A',
					reduceTo: ReduceOperators.AVG,
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

export const getIoWaitTimeWidgetData = (): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.Float64,
						key: 'kafka.producer.io_waittime_total',
						id: 'kafka.producer.io_waittime_total--float64--Sum--true',
						type: 'Sum',
					},
					aggregateOperator: 'rate',
					dataSource: DataSource.METRICS,
					disabled: false,
					expression: 'A',
					filters: { items: [], op: 'AND' },
					functions: [],
					groupBy: [],
					having: [],
					legend: 'I/O Wait Time',
					limit: null,
					orderBy: [],
					queryName: 'A',
					reduceTo: ReduceOperators.AVG,
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

export const getRequestResponseWidgetData = (): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.Float64,
						key: 'kafka.producer.request_rate',
						id: 'kafka.producer.request_rate--float64--Gauge--true',
						type: 'Gauge',
					},
					aggregateOperator: 'avg',
					dataSource: DataSource.METRICS,
					disabled: false,
					expression: 'A',
					filters: { items: [], op: 'AND' },
					functions: [],
					groupBy: [],
					having: [],
					legend: 'Request Rate',
					limit: null,
					orderBy: [],
					queryName: 'A',
					reduceTo: ReduceOperators.AVG,
					spaceAggregation: 'avg',
					stepInterval: 60,
					timeAggregation: 'avg',
				},
				{
					aggregateAttribute: {
						dataType: DataTypes.Float64,
						key: 'kafka.producer.response_rate',
						id: 'kafka.producer.response_rate--float64--Gauge--true',
						type: 'Gauge',
					},
					aggregateOperator: 'avg',
					dataSource: DataSource.METRICS,
					disabled: false,
					expression: 'B',
					filters: { items: [], op: 'AND' },
					functions: [],
					groupBy: [],
					having: [],
					legend: 'Response Rate',
					limit: null,
					orderBy: [],
					queryName: 'B',
					reduceTo: ReduceOperators.AVG,
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

export const getAverageRequestLatencyWidgetData = (): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.Float64,
						key: 'kafka.producer.request_latency_avg',
						id: 'kafka.producer.request_latency_avg--float64--Gauge--true',
						type: 'Gauge',
					},
					aggregateOperator: 'avg',
					dataSource: DataSource.METRICS,
					disabled: false,
					expression: 'A',
					filters: { items: [], op: 'AND' },
					functions: [],
					groupBy: [],
					having: [],
					legend: 'Average Request Latency',
					limit: null,
					orderBy: [],
					queryName: 'A',
					reduceTo: ReduceOperators.AVG,
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

export const getKafkaProducerByteRateWidgetData = (): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.Float64,
						key: 'kafka.producer.byte_rate',
						id: 'kafka.producer.byte_rate--float64--Gauge--true',
						type: 'Gauge',
					},
					aggregateOperator: 'avg',
					dataSource: DataSource.METRICS,
					disabled: false,
					expression: 'A',
					filters: { items: [], op: 'AND' },
					functions: [],
					groupBy: [
						{
							dataType: DataTypes.String,
							id: 'topic--string--tag--false',
							key: 'topic',
							type: 'tag',
						},
					],
					having: [],
					legend: '',
					limit: null,
					orderBy: [],
					queryName: 'A',
					reduceTo: ReduceOperators.AVG,
					spaceAggregation: 'avg',
					stepInterval: 60,
					timeAggregation: 'avg',
				},
			],
			title: 'kafka.producer.byte_rate',
			description:
				'Helps measure the data output rate from the producer, indicating the load a producer is placing on Kafka brokers.',
		}),
	);

export const getBytesConsumedWidgetData = (): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.Float64,
						key: 'kafka.consumer.bytes_consumed_rate',
						id: 'kafka.consumer.bytes_consumed_rate--float64--Gauge--true',
						type: 'Gauge',
					},
					aggregateOperator: 'avg',
					dataSource: DataSource.METRICS,
					disabled: false,
					expression: 'A',
					filters: { items: [], op: 'AND' },
					functions: [],
					groupBy: [],
					having: [],
					legend: 'Bytes Consumed',
					limit: null,
					orderBy: [],
					queryName: 'A',
					reduceTo: ReduceOperators.AVG,
					spaceAggregation: 'avg',
					stepInterval: 60,
					timeAggregation: 'avg',
				},
			],
			// Use kebab-case title as requested
			title: 'Bytes Consumed',
			description:
				'Helps Kafka administrators monitor the data consumption rate of a consumer group, showing how much data (in bytes) is being read from the Kafka cluster over time.',
		}),
	);

export const getConsumerOffsetWidgetData = (): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.Float64,
						key: 'kafka.consumer_group.offset',
						id: 'kafka.consumer_group.offset--float64--Gauge--true',
						type: 'Gauge',
					},
					aggregateOperator: 'avg',
					dataSource: DataSource.METRICS,
					disabled: false,
					expression: 'A',
					filters: { items: [], op: 'AND' },
					functions: [],
					groupBy: [
						{
							dataType: DataTypes.String,
							id: 'group--string--tag--false',
							key: 'group',
							type: 'tag',
						},
						{
							dataType: DataTypes.String,
							id: 'topic--string--tag--false',
							key: 'topic',
							type: 'tag',
						},
						{
							dataType: DataTypes.String,
							id: 'partition--string--tag--false',
							key: 'partition',
							type: 'tag',
						},
					],
					having: [],
					legend: '',
					limit: null,
					orderBy: [],
					queryName: 'A',
					reduceTo: ReduceOperators.AVG,
					spaceAggregation: 'avg',
					stepInterval: 60,
					timeAggregation: 'avg',
				},
			],
			title: 'Consumer Offset',
			description:
				'Current offset of each consumer group for each topic partition',
		}),
	);

export const getConsumerGroupMemberWidgetData = (): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.Float64,
						key: 'kafka.consumer_group.members',
						id: 'kafka.consumer_group.members--float64--Gauge--true',
						type: 'Gauge',
					},
					aggregateOperator: 'sum',
					dataSource: DataSource.METRICS,
					disabled: false,
					expression: 'A',
					filters: { items: [], op: 'AND' },
					functions: [],
					groupBy: [
						{
							dataType: DataTypes.String,
							id: 'group--string--tag--false',
							key: 'group',
							type: 'tag',
						},
					],
					having: [],
					legend: '',
					limit: null,
					orderBy: [],
					queryName: 'A',
					reduceTo: ReduceOperators.AVG,
					spaceAggregation: 'sum',
					stepInterval: 60,
					timeAggregation: 'sum',
				},
			],
			title: 'Consumer Group Members',
			description: 'Number of active users in each group',
		}),
	);

export const getConsumerLagByGroupWidgetData = (): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.Float64,
						key: 'kafka.consumer_group.lag',
						id: 'kafka.consumer_group.lag--float64--Gauge--true',
						type: 'Gauge',
					},
					aggregateOperator: 'avg',
					dataSource: DataSource.METRICS,
					disabled: false,
					expression: 'A',
					filters: { items: [], op: 'AND' },
					functions: [],
					groupBy: [
						{
							dataType: DataTypes.String,
							id: 'group--string--tag--false',
							key: 'group',
							type: 'tag',
						},
						{
							dataType: DataTypes.String,
							id: 'topic--string--tag--false',
							key: 'topic',
							type: 'tag',
						},
						{
							dataType: DataTypes.String,
							id: 'partition--string--tag--false',
							key: 'partition',
							type: 'tag',
						},
					],
					having: [],
					legend: '',
					limit: null,
					orderBy: [],
					queryName: 'A',
					reduceTo: ReduceOperators.AVG,
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

export const getConsumerFetchRateWidgetData = (): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.Float64,
						key: 'kafka.consumer.fetch_rate',
						id: 'kafka.consumer.fetch_rate--float64--Gauge--true',
						type: 'Gauge',
					},
					aggregateOperator: 'avg',
					dataSource: DataSource.METRICS,
					disabled: false,
					expression: 'A',
					filters: { items: [], op: 'AND' },
					functions: [],
					groupBy: [
						{
							dataType: DataTypes.String,
							id: 'service_name--string--tag--false',
							key: 'service.name',
							type: 'tag',
						},
					],
					having: [],
					legend: '',
					limit: null,
					orderBy: [],
					queryName: 'A',
					reduceTo: ReduceOperators.AVG,
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

export const getMessagesConsumedWidgetData = (): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.Float64,
						key: 'kafka.consumer.records_consumed_rate',
						id: 'kafka.consumer.records_consumed_rate--float64--Gauge--true',
						type: 'Gauge',
					},
					aggregateOperator: 'avg',
					dataSource: DataSource.METRICS,
					disabled: false,
					expression: 'A',
					filters: { items: [], op: 'AND' },
					functions: [],
					groupBy: [],
					having: [],
					legend: 'Messages Consumed',
					limit: null,
					orderBy: [],
					queryName: 'A',
					reduceTo: ReduceOperators.AVG,
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

export const getJvmGCCountWidgetData = (): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.Float64,
						key: 'jvm.gc.collections.count',
						id: 'jvm.gc.collections.count--float64--Sum--true',
						type: 'Sum',
					},
					aggregateOperator: 'rate',
					dataSource: DataSource.METRICS,
					disabled: false,
					expression: 'A',
					filters: { items: [], op: 'AND' },
					functions: [],
					groupBy: [],
					having: [],
					legend: 'JVM GC Count',
					limit: null,
					orderBy: [],
					queryName: 'A',
					reduceTo: ReduceOperators.AVG,
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

export const getJvmGcCollectionsElapsedWidgetData = (): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.Float64,
						key: 'jvm.gc.collections.elapsed',
						id: 'jvm.gc.collections.elapsed--float64--Sum--true',
						type: 'Sum',
					},
					aggregateOperator: 'rate',
					dataSource: DataSource.METRICS,
					disabled: false,
					expression: 'A',
					filters: { items: [], op: 'AND' },
					functions: [],
					groupBy: [],
					having: [],
					legend: 'garbagecollector',
					limit: null,
					orderBy: [],
					queryName: 'A',
					reduceTo: ReduceOperators.AVG,
					spaceAggregation: 'sum',
					stepInterval: 60,
					timeAggregation: 'rate',
				},
			],
			title: 'jvm.gc.collections.elapsed',
			description:
				'Measures the total time (usually in milliseconds) spent on garbage collection (GC) events in the Java Virtual Machine (JVM).',
		}),
	);

export const getCpuRecentUtilizationWidgetData = (): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.Float64,
						key: 'jvm.cpu.recent_utilization',
						id: 'jvm.cpu.recent_utilization--float64--Gauge--true',
						type: 'Gauge',
					},
					aggregateOperator: 'avg',
					dataSource: DataSource.METRICS,
					disabled: false,
					expression: 'A',
					filters: { items: [], op: 'AND' },
					functions: [],
					groupBy: [],
					having: [],
					legend: 'CPU utilization',
					limit: null,
					orderBy: [],
					queryName: 'A',
					reduceTo: ReduceOperators.AVG,
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

export const getJvmMemoryHeapWidgetData = (): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.Float64,
						key: 'jvm.memory.heap.max',
						id: 'jvm.memory.heap.max--float64--Gauge--true',
						type: 'Gauge',
					},
					aggregateOperator: 'avg',
					dataSource: DataSource.METRICS,
					disabled: false,
					expression: 'A',
					filters: { items: [], op: 'AND' },
					functions: [],
					groupBy: [],
					having: [],
					legend: 'JVM memory heap',
					limit: null,
					orderBy: [],
					queryName: 'A',
					reduceTo: ReduceOperators.AVG,
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

export const getPartitionCountPerTopicWidgetData = (): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.Float64,
						key: 'kafka.topic.partitions',
						id: 'kafka.topic.partitions--float64--Gauge--true',
						type: 'Gauge',
					},
					aggregateOperator: 'sum',
					dataSource: DataSource.METRICS,
					disabled: false,
					expression: 'A',
					filters: { items: [], op: 'AND' },
					functions: [],
					groupBy: [
						{
							dataType: DataTypes.String,
							id: 'topic--string--tag--false',
							key: 'topic',
							type: 'tag',
						},
					],
					having: [],
					legend: '',
					limit: null,
					orderBy: [],
					queryName: 'A',
					reduceTo: ReduceOperators.AVG,
					spaceAggregation: 'sum',
					stepInterval: 60,
					timeAggregation: 'sum',
				},
			],
			title: 'Partition Count per Topic',
			description: 'Number of partitions for each topic',
		}),
	);

export const getCurrentOffsetPartitionWidgetData = (): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.Float64,
						key: 'kafka.partition.current_offset',
						id: 'kafka.partition.current_offset--float64--Gauge--true',
						type: 'Gauge',
					},
					aggregateOperator: 'avg',
					dataSource: DataSource.METRICS,
					disabled: false,
					expression: 'A',
					filters: { items: [], op: 'AND' },
					functions: [],
					groupBy: [
						{
							dataType: DataTypes.String,
							id: 'topic--string--tag--false',
							key: 'topic',
							type: 'tag',
						},
						{
							dataType: DataTypes.String,
							id: 'partition--string--tag--false',
							key: 'partition',
							type: 'tag',
						},
					],
					having: [],
					legend: '',
					limit: null,
					orderBy: [],
					queryName: 'A',
					reduceTo: ReduceOperators.AVG,
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

export const getOldestOffsetWidgetData = (): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.Float64,
						key: 'kafka.partition.oldest_offset',
						id: 'kafka.partition.oldest_offset--float64--Gauge--true',
						type: 'Gauge',
					},
					aggregateOperator: 'avg',
					dataSource: DataSource.METRICS,
					disabled: false,
					expression: 'A',
					filters: { items: [], op: 'AND' },
					functions: [],
					groupBy: [
						{
							dataType: DataTypes.String,
							id: 'topic--string--tag--false',
							key: 'topic',
							type: 'tag',
						},
						{
							dataType: DataTypes.String,
							id: 'partition--string--tag--false',
							key: 'partition',
							type: 'tag',
						},
					],
					having: [],
					legend: '',
					limit: null,
					orderBy: [],
					queryName: 'A',
					reduceTo: ReduceOperators.AVG,
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

export const getInsyncReplicasWidgetData = (): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.Float64,
						key: 'kafka.partition.replicas_in_sync',
						id: 'kafka.partition.replicas_in_sync--float64--Gauge--true',
						type: 'Gauge',
					},
					aggregateOperator: 'avg',
					dataSource: DataSource.METRICS,
					disabled: false,
					expression: 'A',
					filters: { items: [], op: 'AND' },
					functions: [],
					groupBy: [
						{
							dataType: DataTypes.String,
							id: 'topic--string--tag--false',
							key: 'topic',
							type: 'tag',
						},
						{
							dataType: DataTypes.String,
							id: 'partition--string--tag--false',
							key: 'partition',
							type: 'tag',
						},
					],
					having: [],
					legend: '',
					limit: null,
					orderBy: [],
					queryName: 'A',
					reduceTo: ReduceOperators.AVG,
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

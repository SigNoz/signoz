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
import { DataSource } from 'types/common/queryBuilder';
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

export const getRequestTimesWidgetData = (
	dotMetricsEnabled: boolean,
): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.Float64,
						// choose key based on flag
						key: dotMetricsEnabled
							? 'kafka.request.time.avg'
							: 'kafka_request_time_avg',
						// mirror into the id as well
						id: 'kafka_request_time_avg--float64--Gauge--true',
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

export const getBrokerCountWidgetData = (dotMetricsEnabled: boolean): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.Float64,
						key: dotMetricsEnabled ? 'kafka.brokers' : 'kafka_brokers',
						id: 'kafka_brokers--float64--Gauge--true',
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
					reduceTo: 'avg',
					spaceAggregation: 'avg',
					stepInterval: 60,
					timeAggregation: 'sum',
				},
			],
			title: 'Broker Count',
			description: 'Total number of active brokers in the Kafka cluster.',
		}),
	);

export const getProducerFetchRequestPurgatoryWidgetData = (
	dotMetricsEnabled: boolean,
): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.Float64,
						// inline ternary based on dotMetricsEnabled
						key: dotMetricsEnabled ? 'kafka.purgatory.size' : 'kafka_purgatory_size',
						id: `${
							dotMetricsEnabled ? 'kafka.purgatory.size' : 'kafka_purgatory_size'
						}--float64--Gauge--true`,
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

export const getBrokerNetworkThroughputWidgetData = (
	dotMetricsEnabled: boolean,
): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.Float64,
						// inline ternary based on dotMetricsEnabled
						key: dotMetricsEnabled
							? 'kafka_server_brokertopicmetrics_total_replicationbytesinpersec_oneminuterate'
							: 'kafka_server_brokertopicmetrics_bytesoutpersec_oneminuterate',
						id: `${
							dotMetricsEnabled
								? 'kafka_server_brokertopicmetrics_total_replicationbytesinpersec_oneminuterate'
								: 'kafka_server_brokertopicmetrics_bytesoutpersec_oneminuterate'
						}--float64--Gauge--true`,
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

export const getIoWaitTimeWidgetData = (dotMetricsEnabled: boolean): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.Float64,
						// inline ternary based on dotMetricsEnabled
						key: dotMetricsEnabled
							? 'kafka.producer.io_waittime_total'
							: 'kafka_producer_io_waittime_total',
						id: `${
							dotMetricsEnabled
								? 'kafka.producer.io_waittime_total'
								: 'kafka_producer_io_waittime_total'
						}--float64--Sum--true`,
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

export const getRequestResponseWidgetData = (
	dotMetricsEnabled: boolean,
): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.Float64,
						key: dotMetricsEnabled
							? 'kafka.producer.request_rate'
							: 'kafka_producer_request_rate',
						id: `${
							dotMetricsEnabled
								? 'kafka.producer.request_rate'
								: 'kafka_producer_request_rate'
						}--float64--Gauge--true`,
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
					reduceTo: 'avg',
					spaceAggregation: 'avg',
					stepInterval: 60,
					timeAggregation: 'avg',
				},
				{
					aggregateAttribute: {
						dataType: DataTypes.Float64,
						key: dotMetricsEnabled
							? 'kafka.producer.response_rate'
							: 'kafka_producer_response_rate',
						id: `${
							dotMetricsEnabled
								? 'kafka.producer.response_rate'
								: 'kafka_producer_response_rate'
						}--float64--Gauge--true`,
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

export const getAverageRequestLatencyWidgetData = (
	dotMetricsEnabled: boolean,
): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.Float64,
						key: dotMetricsEnabled
							? 'kafka.producer.request_latency_avg'
							: 'kafka_producer_request_latency_avg',
						id: `${
							dotMetricsEnabled
								? 'kafka.producer.request_latency_avg'
								: 'kafka_producer_request_latency_avg'
						}--float64--Gauge--true`,
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

export const getKafkaProducerByteRateWidgetData = (
	dotMetricsEnabled: boolean,
): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.Float64,
						key: dotMetricsEnabled
							? 'kafka.producer.byte_rate'
							: 'kafka_producer_byte_rate',
						id: `${
							dotMetricsEnabled
								? 'kafka.producer.byte_rate'
								: 'kafka_producer_byte_rate'
						}--float64--Gauge--true`,
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
					reduceTo: 'avg',
					spaceAggregation: 'avg',
					stepInterval: 60,
					timeAggregation: 'avg',
				},
			],
			title: dotMetricsEnabled
				? 'kafka.producer.byte_rate'
				: 'kafka_producer_byte_rate',
			description:
				'Helps measure the data output rate from the producer, indicating the load a producer is placing on Kafka brokers.',
		}),
	);

export const getBytesConsumedWidgetData = (
	dotMetricsEnabled: boolean,
): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.Float64,
						key: dotMetricsEnabled
							? 'kafka.consumer.bytes_consumed_rate'
							: 'kafka_consumer_bytes_consumed_rate',
						id: `${
							dotMetricsEnabled
								? 'kafka.consumer.bytes_consumed_rate'
								: 'kafka_consumer_bytes_consumed_rate'
						}--float64--Gauge--true`,
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
					reduceTo: 'avg',
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

export const getConsumerOffsetWidgetData = (
	dotMetricsEnabled: boolean,
): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.Float64,
						key: dotMetricsEnabled
							? 'kafka.consumer_group.offset'
							: 'kafka_consumer_group_offset',
						id: `${
							dotMetricsEnabled
								? 'kafka.consumer_group.offset'
								: 'kafka_consumer_group_offset'
						}--float64--Gauge--true`,
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
					reduceTo: 'avg',
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

export const getConsumerGroupMemberWidgetData = (
	dotMetricsEnabled: boolean,
): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.Float64,
						key: dotMetricsEnabled
							? 'kafka.consumer_group.members'
							: 'kafka_consumer_group_members',
						id: `${
							dotMetricsEnabled
								? 'kafka.consumer_group.members'
								: 'kafka_consumer_group_members'
						}--float64--Gauge--true`,
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

export const getConsumerLagByGroupWidgetData = (
	dotMetricsEnabled: boolean,
): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.Float64,
						key: dotMetricsEnabled
							? 'kafka.consumer_group.lag'
							: 'kafka_consumer_group_lag',
						id: `${
							dotMetricsEnabled
								? 'kafka.consumer_group.lag'
								: 'kafka_consumer_group_lag'
						}--float64--Gauge--true`,
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

export const getConsumerFetchRateWidgetData = (
	dotMetricsEnabled: boolean,
): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.Float64,
						key: dotMetricsEnabled
							? 'kafka.consumer.fetch_rate'
							: 'kafka_consumer_fetch_rate',
						id: `${
							dotMetricsEnabled
								? 'kafka.consumer.fetch_rate'
								: 'kafka_consumer_fetch_rate'
						}--float64--Gauge--true`,
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
							key: dotMetricsEnabled ? 'service.name' : 'service_name',
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

export const getMessagesConsumedWidgetData = (
	dotMetricsEnabled: boolean,
): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.Float64,
						key: dotMetricsEnabled
							? 'kafka.consumer.records_consumed_rate'
							: 'kafka_consumer_records_consumed_rate',
						id: `${
							dotMetricsEnabled
								? 'kafka.consumer.records_consumed_rate'
								: 'kafka_consumer_records_consumed_rate'
						}--float64--Gauge--true`,
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

export const getJvmGCCountWidgetData = (dotMetricsEnabled: boolean): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.Float64,
						key: dotMetricsEnabled
							? 'jvm.gc.collections.count'
							: 'jvm_gc_collections_count',
						id: `${
							dotMetricsEnabled
								? 'jvm.gc.collections.count'
								: 'jvm_gc_collections_count'
						}--float64--Sum--true`,
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

export const getJvmGcCollectionsElapsedWidgetData = (
	dotMetricsEnabled: boolean,
): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.Float64,
						key: dotMetricsEnabled
							? 'jvm.gc.collections.elapsed'
							: 'jvm_gc_collections_elapsed',
						id: `${
							dotMetricsEnabled
								? 'jvm.gc.collections.elapsed'
								: 'jvm_gc_collections_elapsed'
						}--float64--Sum--true`,
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
					reduceTo: 'avg',
					spaceAggregation: 'sum',
					stepInterval: 60,
					timeAggregation: 'rate',
				},
			],
			title: dotMetricsEnabled
				? 'jvm.gc.collections.elapsed'
				: 'jvm_gc_collections_elapsed',
			description:
				'Measures the total time (usually in milliseconds) spent on garbage collection (GC) events in the Java Virtual Machine (JVM).',
		}),
	);

export const getCpuRecentUtilizationWidgetData = (
	dotMetricsEnabled: boolean,
): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.Float64,
						key: dotMetricsEnabled
							? 'jvm.cpu.recent_utilization'
							: 'jvm_cpu_recent_utilization',
						id: `${
							dotMetricsEnabled
								? 'jvm.cpu.recent_utilization'
								: 'jvm_cpu_recent_utilization'
						}--float64--Gauge--true`,
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

export const getJvmMemoryHeapWidgetData = (
	dotMetricsEnabled: boolean,
): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.Float64,
						key: dotMetricsEnabled ? 'jvm.memory.heap.max' : 'jvm_memory_heap_max',
						id: `${
							dotMetricsEnabled ? 'jvm.memory.heap.max' : 'jvm_memory_heap_max'
						}--float64--Gauge--true`,
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

export const getPartitionCountPerTopicWidgetData = (
	dotMetricsEnabled: boolean,
): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.Float64,
						key: dotMetricsEnabled
							? 'kafka.topic.partitions'
							: 'kafka_topic_partitions',
						id: `${
							dotMetricsEnabled ? 'kafka.topic.partitions' : 'kafka_topic_partitions'
						}--float64--Gauge--true`,
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

export const getCurrentOffsetPartitionWidgetData = (
	dotMetricsEnabled: boolean,
): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.Float64,
						key: dotMetricsEnabled
							? 'kafka.partition.current_offset'
							: 'kafka_partition_current_offset',
						id: `${
							dotMetricsEnabled
								? 'kafka.partition.current_offset'
								: 'kafka_partition_current_offset'
						}--float64--Gauge--true`,
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

export const getOldestOffsetWidgetData = (
	dotMetricsEnabled: boolean,
): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.Float64,
						key: dotMetricsEnabled
							? 'kafka.partition.oldest_offset'
							: 'kafka_partition_oldest_offset',
						id: `${
							dotMetricsEnabled
								? 'kafka.partition.oldest_offset'
								: 'kafka_partition_oldest_offset'
						}--float64--Gauge--true`,
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

export const getInsyncReplicasWidgetData = (
	dotMetricsEnabled: boolean,
): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.Float64,
						key: dotMetricsEnabled
							? 'kafka.partition.replicas_in_sync'
							: 'kafka_partition_replicas_in_sync',
						id: `${
							dotMetricsEnabled
								? 'kafka.partition.replicas_in_sync'
								: 'kafka_partition_replicas_in_sync'
						}--float64--Gauge--true`,
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

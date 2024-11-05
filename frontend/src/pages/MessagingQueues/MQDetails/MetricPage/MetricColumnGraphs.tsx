import { Typography } from 'antd';
import cx from 'classnames';
import { CardContainer } from 'container/GridCardLayout/styles';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { Widgets } from 'types/api/dashboard/getAll';

import MetricPageGridGraph from './MetricPageGraph';
import {
	averageRequestLatencyWidgetData,
	brokerCountWidgetData,
	brokerNetworkThroughputWidgetData,
	bytesConsumedWidgetData,
	consumerFetchRateWidgetData,
	consumerGroupMemberWidgetData,
	consumerLagByGroupWidgetData,
	consumerOffsetWidgetData,
	ioWaitTimeWidgetData,
	kafkaProducerByteRateWidgetData,
	messagesConsumedWidgetData,
	producerFetchRequestPurgatoryWidgetData,
	requestResponseWidgetData,
	requestTimesWidgetData,
} from './MetricPageUtil';

interface MetricSectionProps {
	title: string;
	description: string;
	graphCount: Widgets[];
}

function MetricSection({
	title,
	description,
	graphCount,
}: MetricSectionProps): JSX.Element {
	const isDarkMode = useIsDarkMode();

	return (
		<div className="metric-column-graph">
			<CardContainer className="row-card" isDarkMode={isDarkMode}>
				<div className={cx('row-panel')}>
					<Typography.Text className="section-title">{title}</Typography.Text>
				</div>
			</CardContainer>
			<Typography.Text className="graph-description">
				{description}
			</Typography.Text>
			<div className="metric-page-grid">
				{graphCount.map((widgetData) => (
					<MetricPageGridGraph
						key={`graph-${widgetData.id}`}
						widgetData={widgetData}
					/>
				))}
			</div>
		</div>
	);
}

function MetricColumnGraphs(): JSX.Element {
	const metricsData = [
		{
			title: 'Broker Metrics',
			description:
				'The Kafka Broker metrics here inform you of data loss/delay through unclean leader elections and network throughputs, as well as request fails through request purgatories and timeouts metrics',
			graphCount: [
				brokerCountWidgetData,
				requestTimesWidgetData,
				producerFetchRequestPurgatoryWidgetData,
				brokerNetworkThroughputWidgetData,
			],
			id: 'broker-metrics',
		},
		{
			title: 'Producer Metrics',
			description:
				'Kafka Producers send messages to brokers for storage and distribution by topic. These metrics inform you of the volume and rate of data sent, and the success rate of message delivery.',
			graphCount: [
				ioWaitTimeWidgetData,
				requestResponseWidgetData,
				averageRequestLatencyWidgetData,
				kafkaProducerByteRateWidgetData,
				bytesConsumedWidgetData,
			],
			id: 'producer-metrics',
		},
		{
			title: 'Consumer Metrics',
			description:
				'Kafka Consumer metrics provide insights into lag between message production and consumption, success rates and latency of message delivery, and the volume of data consumed.',
			graphCount: [
				consumerOffsetWidgetData,
				consumerGroupMemberWidgetData,
				consumerLagByGroupWidgetData,
				consumerFetchRateWidgetData,
				messagesConsumedWidgetData,
			],
			id: 'consumer-metrics',
		},
	];

	return (
		<div className="metric-column-graph-container">
			{metricsData.map((metric) => (
				<MetricSection
					key={metric.id}
					title={metric.title}
					description={metric.description}
					graphCount={metric.graphCount}
				/>
			))}
		</div>
	);
}

export default MetricColumnGraphs;

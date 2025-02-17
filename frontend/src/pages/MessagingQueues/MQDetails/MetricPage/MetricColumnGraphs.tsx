import { Typography } from 'antd';
import { CardContainer } from 'container/GridCardLayout/styles';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useTranslation } from 'react-i18next';
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
	checkIfDataExists?: (isDataAvailable: boolean) => void;
}

function MetricSection({
	title,
	description,
	graphCount,
	checkIfDataExists,
}: MetricSectionProps): JSX.Element {
	const isDarkMode = useIsDarkMode();

	return (
		<div className="metric-column-graph">
			<CardContainer className="row-card" isDarkMode={isDarkMode}>
				<div className="row-panel">
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
						checkIfDataExists={checkIfDataExists}
					/>
				))}
			</div>
		</div>
	);
}

MetricSection.defaultProps = {
	checkIfDataExists: (): void => {},
};

function MetricColumnGraphs({
	checkIfDataExists,
}: {
	checkIfDataExists: (isDataAvailable: boolean) => void;
}): JSX.Element {
	const { t } = useTranslation('messagingQueues');

	const metricsData = [
		{
			title: t('metricGraphCategory.brokerMetrics.title'),
			description: t('metricGraphCategory.brokerMetrics.description'),
			graphCount: [
				brokerCountWidgetData,
				requestTimesWidgetData,
				producerFetchRequestPurgatoryWidgetData,
				brokerNetworkThroughputWidgetData,
			],
			id: 'broker-metrics',
		},
		{
			title: t('metricGraphCategory.producerMetrics.title'),
			description: t('metricGraphCategory.producerMetrics.description'),
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
			title: t('metricGraphCategory.consumerMetrics.title'),
			description: t('metricGraphCategory.consumerMetrics.description'),
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
					graphCount={metric?.graphCount || []}
					checkIfDataExists={checkIfDataExists}
				/>
			))}
		</div>
	);
}

export default MetricColumnGraphs;

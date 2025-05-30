import { Typography } from 'antd';
import { CardContainer } from 'container/GridCardLayout/styles';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useTranslation } from 'react-i18next';
import { Widgets } from 'types/api/dashboard/getAll';

import { FeatureKeys } from '../../../../constants/features';
import { useAppContext } from '../../../../providers/App/App';
import MetricPageGridGraph from './MetricPageGraph';
import {
	getAverageRequestLatencyWidgetData,
	getBrokerCountWidgetData,
	getBrokerNetworkThroughputWidgetData,
	getBytesConsumedWidgetData,
	getConsumerFetchRateWidgetData,
	getConsumerGroupMemberWidgetData,
	getConsumerLagByGroupWidgetData,
	getConsumerOffsetWidgetData,
	getIoWaitTimeWidgetData,
	getKafkaProducerByteRateWidgetData,
	getMessagesConsumedWidgetData,
	getProducerFetchRequestPurgatoryWidgetData,
	getRequestResponseWidgetData,
	getRequestTimesWidgetData,
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

	const { featureFlags } = useAppContext();
	const dotMetricsEnabled =
		featureFlags?.find((flag) => flag.name === FeatureKeys.DOT_METRICS_ENABLED)
			?.active || false;

	const metricsData = [
		{
			title: t('metricGraphCategory.brokerMetrics.title'),
			description: t('metricGraphCategory.brokerMetrics.description'),
			graphCount: [
				getBrokerCountWidgetData(dotMetricsEnabled),
				getRequestTimesWidgetData(dotMetricsEnabled),
				getProducerFetchRequestPurgatoryWidgetData(dotMetricsEnabled),
				getBrokerNetworkThroughputWidgetData(dotMetricsEnabled),
			],
			id: 'broker-metrics',
		},
		{
			title: t('metricGraphCategory.producerMetrics.title'),
			description: t('metricGraphCategory.producerMetrics.description'),
			graphCount: [
				getIoWaitTimeWidgetData(dotMetricsEnabled),
				getRequestResponseWidgetData(dotMetricsEnabled),
				getAverageRequestLatencyWidgetData(dotMetricsEnabled),
				getKafkaProducerByteRateWidgetData(dotMetricsEnabled),
				getBytesConsumedWidgetData(dotMetricsEnabled),
			],
			id: 'producer-metrics',
		},
		{
			title: t('metricGraphCategory.consumerMetrics.title'),
			description: t('metricGraphCategory.consumerMetrics.description'),
			graphCount: [
				getConsumerOffsetWidgetData(dotMetricsEnabled),
				getConsumerGroupMemberWidgetData(dotMetricsEnabled),
				getConsumerLagByGroupWidgetData(dotMetricsEnabled),
				getConsumerFetchRateWidgetData(dotMetricsEnabled),
				getMessagesConsumedWidgetData(dotMetricsEnabled),
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

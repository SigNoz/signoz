import './MetricPage.styles.scss';

import { Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import cx from 'classnames';
import { CardContainer } from 'container/GridCardLayout/styles';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Widgets } from 'types/api/dashboard/getAll';

import { FeatureKeys } from '../../../../constants/features';
import { useAppContext } from '../../../../providers/App/App';
import MetricColumnGraphs from './MetricColumnGraphs';
import MetricPageGridGraph from './MetricPageGraph';
import {
	getCpuRecentUtilizationWidgetData,
	getCurrentOffsetPartitionWidgetData,
	getInsyncReplicasWidgetData,
	getJvmGcCollectionsElapsedWidgetData,
	getJvmGCCountWidgetData,
	getJvmMemoryHeapWidgetData,
	getOldestOffsetWidgetData,
	getPartitionCountPerTopicWidgetData,
} from './MetricPageUtil';

interface CollapsibleMetricSectionProps {
	title: string;
	description: string;
	graphCount: Widgets[];
	isCollapsed: boolean;
	onToggle: () => void;
	checkIfDataExists?: (isDataAvailable: boolean) => void;
}

function CollapsibleMetricSection({
	title,
	description,
	graphCount,
	isCollapsed,
	onToggle,
	checkIfDataExists,
}: CollapsibleMetricSectionProps): JSX.Element {
	const isDarkMode = useIsDarkMode();

	return (
		<div className="metric-page-container">
			<CardContainer className="row-card" isDarkMode={isDarkMode}>
				<div className={cx('row-panel')}>
					<div className="row-panel-section">
						<Typography.Text className="section-title">{title}</Typography.Text>
						{isCollapsed ? (
							<ChevronDown size={14} onClick={onToggle} className="row-icon" />
						) : (
							<ChevronUp size={14} onClick={onToggle} className="row-icon" />
						)}
					</div>
				</div>
			</CardContainer>
			{!isCollapsed && (
				<>
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
				</>
			)}
		</div>
	);
}

CollapsibleMetricSection.defaultProps = {
	checkIfDataExists: undefined,
};

function MetricPage(): JSX.Element {
	const [collapsedSections, setCollapsedSections] = useState<{
		[key: string]: boolean;
	}>({
		producerMetrics: false,
		consumerMetrics: false,
	});

	const toggleCollapse = (key: string): void => {
		setCollapsedSections((prev) => ({
			...prev,
			[key]: !prev[key],
		}));
	};

	const { featureFlags } = useAppContext();
	const dotMetricsEnabled =
		featureFlags?.find((flag) => flag.name === FeatureKeys.DOT_METRICS_ENABLED)
			?.active || false;

	const { t } = useTranslation('messagingQueues');

	const metricSections = [
		{
			key: 'bokerJVMMetrics',
			title: t('metricGraphCategory.brokerJVMMetrics.title'),
			description: t('metricGraphCategory.brokerJVMMetrics.description'),
			graphCount: [
				getJvmGCCountWidgetData(dotMetricsEnabled),
				getJvmGcCollectionsElapsedWidgetData(dotMetricsEnabled),
				getCpuRecentUtilizationWidgetData(dotMetricsEnabled),
				getJvmMemoryHeapWidgetData(dotMetricsEnabled),
			],
		},
		{
			key: 'partitionMetrics',
			title: t('metricGraphCategory.partitionMetrics.title'),
			description: t('metricGraphCategory.partitionMetrics.description'),
			graphCount: [
				getPartitionCountPerTopicWidgetData(dotMetricsEnabled),
				getCurrentOffsetPartitionWidgetData(dotMetricsEnabled),
				getOldestOffsetWidgetData(dotMetricsEnabled),
				getInsyncReplicasWidgetData(dotMetricsEnabled),
			],
		},
	];

	const renderedGraphCountRef = useRef(0);
	const hasLoggedRef = useRef(false);

	const checkIfDataExists = useCallback((isDataAvailable: boolean): void => {
		if (isDataAvailable) {
			renderedGraphCountRef.current += 1;

			// Only log when first graph has rendered and we haven't logged yet
			if (renderedGraphCountRef.current === 1 && !hasLoggedRef.current) {
				logEvent('MQ Kafka: Metric view', {
					graphRendered: true,
				});
				hasLoggedRef.current = true;
			}
		}
	}, []);

	return (
		<div className="metric-page">
			<MetricColumnGraphs checkIfDataExists={checkIfDataExists} />
			{metricSections.map(({ key, title, description, graphCount }) => (
				<CollapsibleMetricSection
					key={key}
					title={title}
					description={description}
					graphCount={graphCount}
					isCollapsed={collapsedSections[key]}
					onToggle={(): void => toggleCollapse(key)}
					checkIfDataExists={checkIfDataExists}
				/>
			))}
		</div>
	);
}

export default MetricPage;

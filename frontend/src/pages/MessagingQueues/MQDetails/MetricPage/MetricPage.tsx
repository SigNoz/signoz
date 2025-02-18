import './MetricPage.styles.scss';

import { Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import cx from 'classnames';
import { CardContainer } from 'container/GridCardLayout/styles';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Widgets } from 'types/api/dashboard/getAll';

import MetricColumnGraphs from './MetricColumnGraphs';
import MetricPageGridGraph from './MetricPageGraph';
import {
	cpuRecentUtilizationWidgetData,
	currentOffsetPartitionWidgetData,
	insyncReplicasWidgetData,
	jvmGcCollectionsElapsedWidgetData,
	jvmGCCountWidgetData,
	jvmMemoryHeapWidgetData,
	oldestOffsetWidgetData,
	partitionCountPerTopicWidgetData,
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

	const { t } = useTranslation('messagingQueues');

	const metricSections = [
		{
			key: 'bokerJVMMetrics',
			title: t('metricGraphCategory.brokerJVMMetrics.title'),
			description: t('metricGraphCategory.brokerJVMMetrics.description'),
			graphCount: [
				jvmGCCountWidgetData,
				jvmGcCollectionsElapsedWidgetData,
				cpuRecentUtilizationWidgetData,
				jvmMemoryHeapWidgetData,
			],
		},
		{
			key: 'partitionMetrics',
			title: t('metricGraphCategory.partitionMetrics.title'),
			description: t('metricGraphCategory.partitionMetrics.description'),
			graphCount: [
				partitionCountPerTopicWidgetData,
				currentOffsetPartitionWidgetData,
				oldestOffsetWidgetData,
				insyncReplicasWidgetData,
			],
		},
	];

	const [renderedGraphCount, setRenderedGraphCount] = useState(0);
	const hasLoggedRef = useRef(false);

	const checkIfDataExists = (isDataAvailable: boolean): void => {
		if (isDataAvailable) {
			const newCount = renderedGraphCount + 1;
			setRenderedGraphCount(newCount);

			// Only log when first graph has rendered and we haven't logged yet
			if (newCount === 1 && !hasLoggedRef.current) {
				logEvent('MQ Kafka: Metric view', {
					graphRendered: true,
				});
				hasLoggedRef.current = true;
			}
		}
	};

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

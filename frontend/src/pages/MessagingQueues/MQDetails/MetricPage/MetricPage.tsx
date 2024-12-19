import './MetricPage.styles.scss';

import { Typography } from 'antd';
import cx from 'classnames';
import { CardContainer } from 'container/GridCardLayout/styles';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
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
}

function CollapsibleMetricSection({
	title,
	description,
	graphCount,
	isCollapsed,
	onToggle,
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
							/>
						))}
					</div>
				</>
			)}
		</div>
	);
}

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

	return (
		<div className="metric-page">
			<MetricColumnGraphs />
			{metricSections.map(({ key, title, description, graphCount }) => (
				<CollapsibleMetricSection
					key={key}
					title={title}
					description={description}
					graphCount={graphCount}
					isCollapsed={collapsedSections[key]}
					onToggle={(): void => toggleCollapse(key)}
				/>
			))}
		</div>
	);
}

export default MetricPage;

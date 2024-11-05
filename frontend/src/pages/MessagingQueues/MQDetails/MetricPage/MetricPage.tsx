import './MetricPage.styles.scss';

import { Typography } from 'antd';
import cx from 'classnames';
import { CardContainer } from 'container/GridCardLayout/styles';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
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

	const metricSections = [
		{
			key: 'bokerJVMMetrics',
			title: 'Broker JVM Metrics',
			description:
				"Kafka brokers are Java applications that expose JVM metrics to inform on the broker's system health. Garbage collection metrics like those below provide key insights into free memory, broker performance, and heap size. You need to enable new_gc_metrics for this section to populate.",
			graphCount: [
				jvmGCCountWidgetData,
				jvmGcCollectionsElapsedWidgetData,
				cpuRecentUtilizationWidgetData,
				jvmMemoryHeapWidgetData,
			],
		},
		{
			key: 'partitionMetrics',
			title: 'Partition Metrics',
			description:
				'Kafka partitions are the unit of parallelism in Kafka. These metrics inform you of the number of partitions per topic, the current offset of each partition, the oldest offset, and the number of in-sync replicas.',
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

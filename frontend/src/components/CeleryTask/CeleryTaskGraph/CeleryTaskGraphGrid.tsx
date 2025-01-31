import './CeleryTaskGraph.style.scss';

import { Card, Typography } from 'antd';
import { CardContainer } from 'container/GridCardLayout/styles';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { DataSource } from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';

import { CaptureDataProps } from '../CeleryTaskDetail/CeleryTaskDetail';
import { useCeleryFilterOptions } from '../useCeleryFilterOptions';
import CeleryTaskBar from './CeleryTaskBar';
import CeleryTaskGraph from './CeleryTaskGraph';
import {
	celeryActiveTasksWidgetData,
	celeryErrorByWorkerWidgetData,
	celeryLatencyByWorkerWidgetData,
	celeryTasksByWorkerWidgetData,
} from './CeleryTaskGraphUtils';
import CeleryTaskLatencyGraph from './CeleryTaskLatencyGraph';

export default function CeleryTaskGraphGrid({
	onClick,
	queryEnabled,
	configureOptionComponent,
}: {
	onClick: (task: CaptureDataProps) => void;
	queryEnabled: boolean;
	configureOptionComponent?: React.ReactNode;
}): JSX.Element {
	const { minTime, maxTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const celeryActiveTasksData = useMemo(
		() => celeryActiveTasksWidgetData(minTime, maxTime),
		[minTime, maxTime],
	);

	const celeryErrorByWorkerData = useMemo(
		() => celeryErrorByWorkerWidgetData(minTime, maxTime),
		[minTime, maxTime],
	);

	const celeryLatencyByWorkerData = useMemo(
		() => celeryLatencyByWorkerWidgetData(minTime, maxTime),
		[minTime, maxTime],
	);

	const celeryTasksByWorkerData = useMemo(
		() => celeryTasksByWorkerWidgetData(minTime, maxTime),
		[minTime, maxTime],
	);

	const bottomWidgetData = [
		celeryTasksByWorkerData,
		celeryErrorByWorkerData,
		celeryLatencyByWorkerData,
	];

	const rightPanelTitle = [
		'Tasks/s by worker',
		'Error% by worker',
		'Latency by worker',
	];

	const { options } = useCeleryFilterOptions(
		'worker',
		'rate',
		DataSource.METRICS,
		'flower_task_runtime_seconds_sum',
		DataTypes.String,
		'tag',
	);
	const isDarkMode = useIsDarkMode();

	const [collapsedSections, setCollapsedSections] = useState<{
		[key: string]: boolean;
	}>({
		metricBasedGraphs: false,
		traceBasedGraphs: false,
	});

	const toggleCollapse = (key: string): void => {
		setCollapsedSections((prev) => ({
			...prev,
			[key]: !prev[key],
		}));
	};

	return (
		<div className="celery-task-graph-grid-container">
			<div className="metric-based-graphs">
				<CardContainer className="row-card" isDarkMode={isDarkMode}>
					<div className="row-panel">
						<div className="row-panel-section">
							<Typography.Text className="section-title">
								Flower Metrics
							</Typography.Text>
							{collapsedSections.metricBasedGraphs ? (
								<ChevronDown
									size={14}
									onClick={(): void => toggleCollapse('metricBasedGraphs')}
									className="row-icon"
								/>
							) : (
								<ChevronUp
									size={14}
									onClick={(): void => toggleCollapse('metricBasedGraphs')}
									className="row-icon"
								/>
							)}
						</div>
					</div>
				</CardContainer>
				{!collapsedSections.metricBasedGraphs && (
					<div className="metric-page-grid">
						<CeleryTaskGraph
							key={celeryActiveTasksData.id}
							widgetData={celeryActiveTasksData}
							queryEnabled={queryEnabled}
						/>
						<Card className="celery-task-graph-worker-count">
							<div className="worker-count-header">
								<Typography.Text className="worker-count-header-text">
									Worker Count
								</Typography.Text>
							</div>
							<div className="worker-count-text-container">
								<Typography.Text className="celery-task-graph-worker-count-text">
									{options.filter((option) => option.value).length}
								</Typography.Text>
							</div>
						</Card>
					</div>
				)}
			</div>
			<div className="trace-based-graphs">
				<div className="trace-based-graphs-header">
					<CardContainer className="row-card" isDarkMode={isDarkMode}>
						<div className="row-panel">
							<div className="row-panel-section">
								<Typography.Text className="section-title">
									Span Based Stats
								</Typography.Text>
								{collapsedSections.traceBasedGraphs ? (
									<ChevronDown
										size={14}
										onClick={(): void => toggleCollapse('traceBasedGraphs')}
										className="row-icon"
									/>
								) : (
									<ChevronUp
										size={14}
										onClick={(): void => toggleCollapse('traceBasedGraphs')}
										className="row-icon"
									/>
								)}
							</div>
						</div>
					</CardContainer>
					<div className="configure-option-Info">
						{configureOptionComponent}
						<Typography.Text className="configure-option-Info-text">
							Click on a graph co-ordinate to see more details
						</Typography.Text>
					</div>
				</div>
				{!collapsedSections.traceBasedGraphs && (
					<>
						<CeleryTaskBar queryEnabled={queryEnabled} onClick={onClick} />
						<CeleryTaskLatencyGraph onClick={onClick} queryEnabled={queryEnabled} />
						<div className="celery-task-graph-grid-bottom">
							{bottomWidgetData.map((widgetData, index) => (
								<CeleryTaskGraph
									key={widgetData.id}
									widgetData={widgetData}
									onClick={onClick}
									queryEnabled={queryEnabled}
									rightPanelTitle={rightPanelTitle[index]}
									applyCeleryTaskFilter
								/>
							))}
						</div>
					</>
				)}
			</div>
		</div>
	);
}

CeleryTaskGraphGrid.defaultProps = {
	configureOptionComponent: null,
};

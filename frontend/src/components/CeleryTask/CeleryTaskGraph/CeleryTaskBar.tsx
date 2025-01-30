import './CeleryTaskGraph.style.scss';

import { Color } from '@signozhq/design-tokens';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { themeColors } from 'constants/theme';
import { ViewMenuAction } from 'container/GridCardLayout/config';
import GridCard from 'container/GridCardLayout/GridCard';
import { Card } from 'container/GridCardLayout/styles';
import { useIsDarkMode } from 'hooks/useDarkMode';
import useUrlQuery from 'hooks/useUrlQuery';
import getLabelName from 'lib/getLabelName';
import { generateColor } from 'lib/uPlotLib/utils/generateColor';
import { getStartAndEndTimesInMilliseconds } from 'pages/MessagingQueues/MessagingQueuesUtils';
import { useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory, useLocation } from 'react-router-dom';
import { UpdateTimeInterval } from 'store/actions';
import { AppState } from 'store/reducers';
import { Widgets } from 'types/api/dashboard/getAll';
import { QueryData } from 'types/api/widgets/getQuery';
import { GlobalReducer } from 'types/reducer/globalTime';

import { CaptureDataProps } from '../CeleryTaskDetail/CeleryTaskDetail';
import { paths } from '../CeleryUtils';
import {
	celeryAllStateWidgetData,
	celeryFailedStateWidgetData,
	celeryFailedTasksTableWidgetData,
	celeryRetryStateWidgetData,
	celeryRetryTasksTableWidgetData,
	celerySlowestTasksTableWidgetData,
	celerySuccessStateWidgetData,
	celerySuccessTasksTableWidgetData,
} from './CeleryTaskGraphUtils';
import {
	CeleryTaskState,
	CeleryTaskStateGraphConfig,
} from './CeleryTaskStateGraphConfig';

function CeleryTaskBar({
	onClick,
	queryEnabled,
}: {
	onClick?: (task: CaptureDataProps) => void;

	queryEnabled: boolean;
}): JSX.Element {
	const history = useHistory();
	const { pathname } = useLocation();
	const dispatch = useDispatch();
	const urlQuery = useUrlQuery();
	const isDarkMode = useIsDarkMode();

	const { minTime, maxTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const onDragSelect = useCallback(
		(start: number, end: number) => {
			const startTimestamp = Math.trunc(start);
			const endTimestamp = Math.trunc(end);

			urlQuery.set(QueryParams.startTime, startTimestamp.toString());
			urlQuery.set(QueryParams.endTime, endTimestamp.toString());
			const generatedUrl = `${pathname}?${urlQuery.toString()}`;
			history.push(generatedUrl);

			if (startTimestamp !== endTimestamp) {
				dispatch(UpdateTimeInterval('custom', [startTimestamp, endTimestamp]));
			}
		},
		[dispatch, history, pathname, urlQuery],
	);

	const [barState, setBarState] = useState<CeleryTaskState>(CeleryTaskState.All);

	const celeryAllStateData = useMemo(
		() => celeryAllStateWidgetData(minTime, maxTime),
		[minTime, maxTime],
	);

	const celeryFailedStateData = useMemo(
		() => celeryFailedStateWidgetData(minTime, maxTime),
		[minTime, maxTime],
	);

	const celeryRetryStateData = useMemo(
		() => celeryRetryStateWidgetData(minTime, maxTime),
		[minTime, maxTime],
	);

	const celerySuccessStateData = useMemo(
		() => celerySuccessStateWidgetData(minTime, maxTime),
		[minTime, maxTime],
	);

	const onGraphClick = (
		widgetData: Widgets,
		xValue: number,
		_yValue: number,
		_mouseX: number,
		_mouseY: number,
		data?: {
			[key: string]: string;
		},
	): void => {
		const { start, end } = getStartAndEndTimesInMilliseconds(xValue);

		// Extract entity and value from data
		const [firstDataPoint] = Object.entries(data || {});
		const [entity, value] = (firstDataPoint || ([] as unknown)) as [
			string,
			string,
		];

		onClick?.({
			entity,
			value,
			timeRange: [start, end],
			widgetData,
		});
	};

	const getGraphSeries = (color: string, label: string): any => ({
		drawStyle: 'bars',
		paths,
		lineInterpolation: 'spline',
		show: true,
		label,
		fill: `${color}90`,
		stroke: color,
		width: 2,
		spanGaps: true,
		points: {
			size: 5,
			show: false,
			stroke: color,
		},
	});

	const customSeries = (data: QueryData[]): uPlot.Series[] => {
		const configurations: uPlot.Series[] = [
			{ label: 'Timestamp', stroke: 'purple' },
		];
		for (let i = 0; i < data.length; i += 1) {
			const { metric = {}, queryName = '', legend = '' } = data[i] || {};
			const label = getLabelName(metric, queryName || '', legend || '');
			let color = generateColor(
				label,
				isDarkMode ? themeColors.chartcolors : themeColors.lightModeColor,
			);
			if (label === 'SUCCESS') {
				color = Color.BG_FOREST_500;
			}
			if (label === 'FAILURE') {
				color = Color.BG_CHERRY_500;
			}

			if (label === 'RETRY') {
				color = Color.BG_AMBER_400;
			}
			const series = getGraphSeries(color, label);
			configurations.push(series);
		}
		return configurations;
	};

	return (
		<Card
			isDarkMode={isDarkMode}
			$panelType={PANEL_TYPES.BAR}
			className="celery-task-graph-bar"
		>
			<CeleryTaskStateGraphConfig barState={barState} setBarState={setBarState} />
			<div className="celery-task-graph-grid-content">
				{barState === CeleryTaskState.All && (
					<GridCard
						widget={celeryAllStateData}
						headerMenuList={[...ViewMenuAction]}
						onDragSelect={onDragSelect}
						isQueryEnabled={queryEnabled}
						onClickHandler={(...args): void =>
							onGraphClick(celerySlowestTasksTableWidgetData, ...args)
						}
						customSeries={customSeries}
					/>
				)}
				{barState === CeleryTaskState.Failed && (
					<GridCard
						widget={celeryFailedStateData}
						headerMenuList={[...ViewMenuAction]}
						onDragSelect={onDragSelect}
						isQueryEnabled={queryEnabled}
						onClickHandler={(...args): void =>
							onGraphClick(celeryFailedTasksTableWidgetData, ...args)
						}
						customSeries={customSeries}
					/>
				)}
				{barState === CeleryTaskState.Retry && (
					<GridCard
						widget={celeryRetryStateData}
						headerMenuList={[...ViewMenuAction]}
						onDragSelect={onDragSelect}
						isQueryEnabled={queryEnabled}
						onClickHandler={(...args): void =>
							onGraphClick(celeryRetryTasksTableWidgetData, ...args)
						}
						customSeries={customSeries}
					/>
				)}
				{barState === CeleryTaskState.Successful && (
					<GridCard
						widget={celerySuccessStateData}
						headerMenuList={[...ViewMenuAction]}
						onDragSelect={onDragSelect}
						isQueryEnabled={queryEnabled}
						onClickHandler={(...args): void =>
							onGraphClick(celerySuccessTasksTableWidgetData, ...args)
						}
						customSeries={customSeries}
					/>
				)}
			</div>
		</Card>
	);
}

CeleryTaskBar.defaultProps = {
	onClick: (): void => {},
};

export default CeleryTaskBar;

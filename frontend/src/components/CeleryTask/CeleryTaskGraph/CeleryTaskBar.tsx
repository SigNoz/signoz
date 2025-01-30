import './CeleryTaskGraph.style.scss';

import { Color } from '@signozhq/design-tokens';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { ViewMenuAction } from 'container/GridCardLayout/config';
import GridCard from 'container/GridCardLayout/GridCard';
import { Card } from 'container/GridCardLayout/styles';
import { useIsDarkMode } from 'hooks/useDarkMode';
import useUrlQuery from 'hooks/useUrlQuery';
import { isEmpty } from 'lodash-es';
import { getStartAndEndTimesInMilliseconds } from 'pages/MessagingQueues/MessagingQueuesUtils';
import { useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory, useLocation } from 'react-router-dom';
import { UpdateTimeInterval } from 'store/actions';
import { AppState } from 'store/reducers';
import { Widgets } from 'types/api/dashboard/getAll';
import { GlobalReducer } from 'types/reducer/globalTime';

import { CaptureDataProps } from '../CeleryTaskDetail/CeleryTaskDetail';
import { useGetGraphCustomSeries } from '../useGetGraphCustomSeries';
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

		if (!isEmpty(entity) || !isEmpty(value)) {
			onClick?.({
				entity,
				value,
				timeRange: [start, end],
				widgetData,
			});
		}
	};

	const { getCustomSeries } = useGetGraphCustomSeries({
		isDarkMode,
		drawStyle: 'bars',
		colorMapping: {
			SUCCESS: Color.BG_FOREST_500,
			FAILURE: Color.BG_CHERRY_500,
			RETRY: Color.BG_AMBER_400,
		},
	});

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
						customSeries={getCustomSeries}
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
						customSeries={getCustomSeries}
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
						customSeries={getCustomSeries}
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
						customSeries={getCustomSeries}
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

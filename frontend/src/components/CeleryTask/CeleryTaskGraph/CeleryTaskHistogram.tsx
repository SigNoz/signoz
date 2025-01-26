import './CeleryTaskGraph.style.scss';

import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { ViewMenuAction } from 'container/GridCardLayout/config';
import GridCard from 'container/GridCardLayout/GridCard';
import { Card } from 'container/GridCardLayout/styles';
import { useIsDarkMode } from 'hooks/useDarkMode';
import useUrlQuery from 'hooks/useUrlQuery';
import { useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory, useLocation } from 'react-router-dom';
import { UpdateTimeInterval } from 'store/actions';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

// import { CaptureDataProps } from '../CeleryTaskDetail/CeleryTaskDetail';
import {
	celeryAllStateWidgetData,
	celeryFailedStateWidgetData,
	celeryRetryStateWidgetData,
	celerySuccessStateWidgetData,
} from './CeleryTaskGraphUtils';
import {
	CeleryTaskState,
	CeleryTaskStateGraphConfig,
} from './CeleryTaskStateGraphConfig';

function CeleryTaskHistogram({
	// onClick,
	queryEnabled,
}: {
	// onClick?: (task: CaptureDataProps) => void;

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

	const [histogramState, setHistogramState] = useState<CeleryTaskState>(
		CeleryTaskState.All,
	);

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

	return (
		<Card
			isDarkMode={isDarkMode}
			$panelType={PANEL_TYPES.HISTOGRAM}
			className="celery-task-graph-histogram"
		>
			<CeleryTaskStateGraphConfig
				histogramState={histogramState}
				setHistogramState={setHistogramState}
			/>
			<div className="celery-task-graph-grid-content">
				{histogramState === CeleryTaskState.All && (
					<GridCard
						widget={celeryAllStateData}
						headerMenuList={[...ViewMenuAction]}
						onDragSelect={onDragSelect}
						isQueryEnabled={queryEnabled}
					/>
				)}
				{histogramState === CeleryTaskState.Failed && (
					<GridCard
						widget={celeryFailedStateData}
						headerMenuList={[...ViewMenuAction]}
						onDragSelect={onDragSelect}
						isQueryEnabled={queryEnabled}
					/>
				)}
				{histogramState === CeleryTaskState.Retry && (
					<GridCard
						widget={celeryRetryStateData}
						headerMenuList={[...ViewMenuAction]}
						onDragSelect={onDragSelect}
						isQueryEnabled={queryEnabled}
					/>
				)}
				{histogramState === CeleryTaskState.Successful && (
					<GridCard
						widget={celerySuccessStateData}
						headerMenuList={[...ViewMenuAction]}
						onDragSelect={onDragSelect}
						isQueryEnabled={queryEnabled}
					/>
				)}
			</div>
		</Card>
	);
}

export default CeleryTaskHistogram;

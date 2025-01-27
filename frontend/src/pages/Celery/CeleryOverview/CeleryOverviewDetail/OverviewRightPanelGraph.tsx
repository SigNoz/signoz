import { Card } from 'antd';
import { QueryParams } from 'constants/query';
import { ViewMenuAction } from 'container/GridCardLayout/config';
import GridCard from 'container/GridCardLayout/GridCard';
import useUrlQuery from 'hooks/useUrlQuery';
import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory, useLocation } from 'react-router-dom';
import { UpdateTimeInterval } from 'store/actions';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

import {
	celeryOverviewAvgLatencyGraphData,
	celeryOverviewErrorRateGraphData,
	celeryOverviewRequestRateGraphData,
} from '../CeleryOverviewGraphUtils';

export default function OverviewRightPanelGraph(): JSX.Element {
	const history = useHistory();
	const { pathname } = useLocation();
	const dispatch = useDispatch();
	const urlQuery = useUrlQuery();

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

	const { minTime, maxTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const requestRateWidget = useMemo(
		() => celeryOverviewRequestRateGraphData(minTime, maxTime),
		[minTime, maxTime],
	);

	const errorRateWidget = useMemo(
		() => celeryOverviewErrorRateGraphData(minTime, maxTime),
		[minTime, maxTime],
	);

	const avgLatencyWidget = useMemo(
		() => celeryOverviewAvgLatencyGraphData(minTime, maxTime),
		[minTime, maxTime],
	);
	return (
		<Card className="overview-right-panel-graph-card">
			<div className="request-rate-card">
				<GridCard
					widget={requestRateWidget}
					headerMenuList={[...ViewMenuAction]}
					onDragSelect={onDragSelect}
					onClickHandler={(...args): void => console.log(...args)}
				/>
			</div>
			<div className="error-rate-card">
				<GridCard
					widget={errorRateWidget}
					headerMenuList={[...ViewMenuAction]}
					onDragSelect={onDragSelect}
					onClickHandler={(...args): void => console.log(...args)}
				/>
			</div>
			<div className="avg-latency-card">
				<GridCard
					widget={avgLatencyWidget}
					headerMenuList={[...ViewMenuAction]}
					onDragSelect={onDragSelect}
					onClickHandler={(...args): void => console.log(...args)}
				/>
			</div>
		</Card>
	);
}

import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { ViewMenuAction } from 'container/GridCardLayout/config';
import GridCard from 'container/GridCardLayout/GridCard';
import { Card } from 'container/GridCardLayout/styles';
import { useIsDarkMode } from 'hooks/useDarkMode';
import useUrlQuery from 'hooks/useUrlQuery';
import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useHistory, useLocation } from 'react-router-dom';
import { UpdateTimeInterval } from 'store/actions';
import { Widgets } from 'types/api/dashboard/getAll';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';

import { CeleryTaskData } from '../CeleryTaskDetail/CeleryTaskDetail';

function CeleryTaskGraph({
	widgetData,
	onClick,
	getGraphData,
	queryEnabled,
}: {
	widgetData: Widgets;
	onClick: (task: CeleryTaskData) => void;
	getGraphData?: (graphData?: MetricRangePayloadProps['data']) => void;
	queryEnabled: boolean;
}): JSX.Element {
	const history = useHistory();
	const { pathname } = useLocation();
	const dispatch = useDispatch();
	const urlQuery = useUrlQuery();
	const isDarkMode = useIsDarkMode();

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

	return (
		<Card
			isDarkMode={isDarkMode}
			$panelType={PANEL_TYPES.TIME_SERIES}
			className="celery-task-graph"
		>
			<GridCard
				widget={widgetData}
				headerMenuList={[...ViewMenuAction]}
				onDragSelect={onDragSelect}
				onClickHandler={(arg): void => {
					console.log('clicked', arg); // todo-sagar: add logic to handle click
					onClick(arg as any);
				}}
				getGraphData={getGraphData}
				isQueryEnabled={queryEnabled}
			/>
		</Card>
	);
}

CeleryTaskGraph.defaultProps = {
	getGraphData: undefined,
};

export default CeleryTaskGraph;

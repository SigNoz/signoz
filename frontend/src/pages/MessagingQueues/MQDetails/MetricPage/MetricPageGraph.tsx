import './MetricPage.styles.scss';

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

function MetricPageGridGraph({
	widgetData,
	checkIfDataExists,
}: {
	widgetData: Widgets;
	checkIfDataExists?: (isDataAvailable: boolean) => void;
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
			className="metric-graph"
		>
			<GridCard
				widget={widgetData}
				headerMenuList={[...ViewMenuAction]}
				onDragSelect={onDragSelect}
				dataAvailable={checkIfDataExists}
			/>
		</Card>
	);
}

MetricPageGridGraph.defaultProps = {
	checkIfDataExists: (): void => {},
};

export default MetricPageGridGraph;

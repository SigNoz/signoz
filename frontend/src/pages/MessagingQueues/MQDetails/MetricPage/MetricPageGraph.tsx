import { useCallback } from 'react';
// eslint-disable-next-line no-restricted-imports
import { useDispatch } from 'react-redux';
import { navigate } from 'lib/router/navigation';
import { useAppLocation } from 'lib/router/useAppLocation';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { ViewMenuAction } from 'container/WidgetCard/config';
import GridCard from 'container/WidgetCard/Card';
import { Card } from 'container/WidgetCard/styles';
import { useIsDarkMode } from 'hooks/useDarkMode';
import useUrlQuery from 'hooks/useUrlQuery';
import { UpdateTimeInterval } from 'store/actions';
import { Widgets } from 'types/api/widgets/widget';

import './MetricPage.styles.scss';

function MetricPageGridGraph({
	widgetData,
	checkIfDataExists,
}: {
	widgetData: Widgets;
	checkIfDataExists?: (isDataAvailable: boolean) => void;
}): JSX.Element {
	const { pathname } = useAppLocation();
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
			navigate(generatedUrl);

			if (startTimestamp !== endTimestamp) {
				dispatch(UpdateTimeInterval('custom', [startTimestamp, endTimestamp]));
			}
		},
		[dispatch, pathname, urlQuery],
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

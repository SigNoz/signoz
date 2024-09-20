import logEvent from 'api/common/logEvent';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { ViewMenuAction } from 'container/GridCardLayout/config';
import GridCard from 'container/GridCardLayout/GridCard';
import { Card } from 'container/GridCardLayout/styles';
import { getWidgetQueryBuilder } from 'container/MetricsApplication/MetricsApplication.factory';
import { useIsDarkMode } from 'hooks/useDarkMode';
import useUrlQuery from 'hooks/useUrlQuery';
import { useCallback, useMemo, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useHistory, useLocation } from 'react-router-dom';
import { UpdateTimeInterval } from 'store/actions';

import {
	getFiltersFromConfigOptions,
	getWidgetQuery,
	setSelectedTimelineQuery,
} from '../MessagingQueuesUtils';

function MessagingQueuesGraph(): JSX.Element {
	const isDarkMode = useIsDarkMode();

	const urlQuery = useUrlQuery();
	const consumerGrp = urlQuery.get(QueryParams.consumerGrp) || '';
	const topic = urlQuery.get(QueryParams.topic) || '';
	const partition = urlQuery.get(QueryParams.partition) || '';

	const filterItems = useMemo(
		() => getFiltersFromConfigOptions(consumerGrp, topic, partition),
		[consumerGrp, topic, partition],
	);

	const widgetData = useMemo(
		() => getWidgetQueryBuilder(getWidgetQuery({ filterItems })),
		[filterItems],
	);

	const history = useHistory();
	const location = useLocation();
	const isLogEventCalled = useRef<boolean>(false);

	const messagingQueueCustomTooltipText = (): HTMLDivElement => {
		const customText = document.createElement('div');
		customText.textContent = 'Click on co-ordinate to view details';
		customText.style.paddingTop = '8px';
		customText.style.paddingBottom = '2px';
		customText.style.color = '#fff';
		return customText;
	};

	const { pathname } = useLocation();
	const dispatch = useDispatch();

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

	const checkIfDataExists = (isDataAvailable: boolean): void => {
		if (!isLogEventCalled.current) {
			isLogEventCalled.current = true;
			logEvent('Messaging Queues: Graph data fetched', {
				isDataAvailable,
			});
		}
	};
	return (
		<Card
			isDarkMode={isDarkMode}
			$panelType={PANEL_TYPES.TIME_SERIES}
			className="mq-graph"
		>
			<GridCard
				widget={widgetData}
				headerMenuList={[...ViewMenuAction]}
				onClickHandler={(xValue, _yValue, _mouseX, _mouseY, data): void => {
					setSelectedTimelineQuery(urlQuery, xValue, location, history, data);
				}}
				onDragSelect={onDragSelect}
				customTooltipElement={messagingQueueCustomTooltipText()}
				dataAvailable={checkIfDataExists}
			/>
		</Card>
	);
}

export default MessagingQueuesGraph;

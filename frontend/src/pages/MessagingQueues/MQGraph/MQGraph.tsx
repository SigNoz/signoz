import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { ViewMenuAction } from 'container/GridCardLayout/config';
import GridCard from 'container/GridCardLayout/GridCard';
import { Card } from 'container/GridCardLayout/styles';
import { getWidgetQueryBuilder } from 'container/MetricsApplication/MetricsApplication.factory';
import { useIsDarkMode } from 'hooks/useDarkMode';
import useUrlQuery from 'hooks/useUrlQuery';
import { useMemo } from 'react';

import {
	getFiltersFromConfigOptions,
	getWidgetQuery,
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

	return (
		<Card
			isDarkMode={isDarkMode}
			$panelType={PANEL_TYPES.TIME_SERIES}
			className="mq-graph"
		>
			<GridCard
				widget={widgetData}
				headerMenuList={[...ViewMenuAction]}
				onClickHandler={(xValue, yValue, mouseX, mouseY, data): void =>
					console.log(xValue, yValue, mouseX, mouseY, data)
				}
			/>
		</Card>
	);
}

export default MessagingQueuesGraph;

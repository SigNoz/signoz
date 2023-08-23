import Spinner from 'components/Spinner';
import { FeatureKeys } from 'constants/features';
import { PANEL_TYPES } from 'constants/queryBuilder';
import Graph from 'container/GridCardLayout/GridCard';
import { GraphTitle } from 'container/MetricsApplication/constant';
import { getWidgetQueryBuilder } from 'container/MetricsApplication/MetricsApplication.factory';
import { latency } from 'container/MetricsApplication/MetricsPageQueries/OverviewQueries';
import { Card, GraphContainer } from 'container/MetricsApplication/styles';
import useFeatureFlag from 'hooks/useFeatureFlag';
import useResourceAttribute from 'hooks/useResourceAttribute';
import { resourceAttributesToTagFilterItems } from 'hooks/useResourceAttribute/utils';
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { EQueryType } from 'types/common/dashboard';
import { v4 as uuid } from 'uuid';

import { ClickHandlerType } from '../Overview';
import { Button } from '../styles';
import { IServiceName } from '../types';
import { handleNonInQueryRange, onViewTracePopupClick } from '../util';

function ServiceOverview({
	onDragSelect,
	handleGraphClick,
	selectedTraceTags,
	selectedTimeStamp,
	topLevelOperationsRoute,
	topLevelOperationsLoading,
}: ServiceOverviewProps): JSX.Element {
	const { servicename } = useParams<IServiceName>();

	const isSpanMetricEnable = useFeatureFlag(FeatureKeys.USE_SPAN_METRICS)
		?.active;

	const { queries } = useResourceAttribute();

	const tagFilterItems = useMemo(
		() =>
			handleNonInQueryRange(
				resourceAttributesToTagFilterItems(queries, !isSpanMetricEnable),
			) || [],
		[isSpanMetricEnable, queries],
	);

	const latencyWidget = useMemo(
		() =>
			getWidgetQueryBuilder({
				query: {
					queryType: EQueryType.QUERY_BUILDER,
					promql: [],
					builder: latency({
						servicename,
						tagFilterItems,
						isSpanMetricEnable,
						topLevelOperationsRoute,
					}),
					clickhouse_sql: [],
					id: uuid(),
				},
				title: GraphTitle.LATENCY,
				panelTypes: PANEL_TYPES.TIME_SERIES,
				yAxisUnit: 'ns',
			}),
		[servicename, isSpanMetricEnable, topLevelOperationsRoute, tagFilterItems],
	);

	const isQueryEnabled = topLevelOperationsRoute.length > 0;

	if (topLevelOperationsLoading) {
		return (
			<Card>
				<Spinner height="40vh" tip="Loading..." />
			</Card>
		);
	}

	return (
		<>
			<Button
				type="default"
				size="small"
				id="Service_button"
				onClick={onViewTracePopupClick({
					servicename,
					selectedTraceTags,
					timestamp: selectedTimeStamp,
				})}
			>
				View Traces
			</Button>
			<Card>
				<GraphContainer>
					<Graph
						name="service_latency"
						onDragSelect={onDragSelect}
						widget={latencyWidget}
						onClickHandler={handleGraphClick('Service')}
						isQueryEnabled={isQueryEnabled}
					/>
				</GraphContainer>
			</Card>
		</>
	);
}

interface ServiceOverviewProps {
	selectedTimeStamp: number;
	selectedTraceTags: string;
	onDragSelect: (start: number, end: number) => void;
	handleGraphClick: (type: string) => ClickHandlerType;
	topLevelOperationsRoute: string[];
	topLevelOperationsLoading: boolean;
}

export default ServiceOverview;

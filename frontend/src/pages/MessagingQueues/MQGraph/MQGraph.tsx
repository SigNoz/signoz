import { PANEL_TYPES } from 'constants/queryBuilder';
import { ViewMenuAction } from 'container/GridCardLayout/config';
import GridCard from 'container/GridCardLayout/GridCard';
import { Card } from 'container/GridCardLayout/styles';
import { getWidgetQueryBuilder } from 'container/MetricsApplication/MetricsApplication.factory';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useMemo } from 'react';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';
import { v4 as uuid } from 'uuid';

function MessagingQueuesGraph(): JSX.Element {
	const isDarkMode = useIsDarkMode();

	const widgetData = useMemo(
		() =>
			getWidgetQueryBuilder({
				title: 'Consumer Lag',
				panelTypes: PANEL_TYPES.TIME_SERIES,
				fillSpans: false,
				yAxisUnit: 'none',
				query: {
					queryType: EQueryType.QUERY_BUILDER,
					promql: [],
					builder: {
						queryData: [
							{
								aggregateAttribute: {
									dataType: DataTypes.Float64,
									id: 'kafka_consumer_group_lag--float64--Gauge--true',
									isColumn: true,
									isJSON: false,
									key: 'kafka_consumer_group_lag',
									type: 'Gauge',
								},
								aggregateOperator: 'count',
								dataSource: DataSource.METRICS,
								disabled: false,
								expression: 'A',
								filters: {
									items: [],
									op: 'AND',
								},
								functions: [],
								groupBy: [
									{
										dataType: DataTypes.String,
										id: 'group--string--tag--false',
										isColumn: false,
										isJSON: false,
										key: 'group',
										type: 'tag',
									},
									{
										dataType: DataTypes.String,
										id: 'topic--string--tag--false',
										isColumn: false,
										isJSON: false,
										key: 'topic',
										type: 'tag',
									},
									{
										dataType: DataTypes.String,
										id: 'partition--string--tag--false',
										isColumn: false,
										isJSON: false,
										key: 'partition',
										type: 'tag',
									},
								],
								having: [],
								legend: '{{group}}-{{topic}}-{{partition}}',
								limit: null,
								orderBy: [],
								queryName: 'A',
								reduceTo: 'avg',
								spaceAggregation: 'avg',
								stepInterval: 60,
								timeAggregation: 'count',
							},
						],
						queryFormulas: [],
					},
					clickhouse_sql: [],
					id: uuid(),
				},
			}),
		[],
	);

	return (
		<Card
			isDarkMode={isDarkMode}
			$panelType={PANEL_TYPES.TIME_SERIES}
			className="mq-graph"
		>
			<GridCard widget={widgetData} headerMenuList={[...ViewMenuAction]} />
		</Card>
	);
}

export default MessagingQueuesGraph;

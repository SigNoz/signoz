import { PANEL_TYPES } from 'constants/queryBuilder';
import { ViewMenuAction } from 'container/GridCardLayout/config';
import GridCard from 'container/GridCardLayout/GridCard';
import { Card } from 'container/GridCardLayout/styles';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { Widgets } from 'types/api/dashboard/getAll';

const currentWidget = {
	description: '',
	fillSpans: false,
	id: 'd3f2b435-27b2-4ba1-a4d2-8203bb3d8e10',
	isStacked: false,
	nullZeroValues: 'zero',
	opacity: '1',
	panelTypes: 'graph',
	query: {
		builder: {
			queryData: [
				{
					aggregateAttribute: {
						dataType: '',
						id: '------false',
						isColumn: false,
						isJSON: false,
						key: '',
						type: '',
					},
					aggregateOperator: 'count',
					dataSource: 'traces',
					disabled: false,
					expression: 'A',
					filters: {
						items: [],
						op: 'AND',
					},
					functions: [],
					groupBy: [],
					having: [],
					legend: 'test-ab',
					limit: null,
					orderBy: [],
					queryName: 'A',
					reduceTo: 'avg',
					spaceAggregation: 'sum',
					stepInterval: 60,
					timeAggregation: 'rate',
				},
			],
			queryFormulas: [],
		},
		clickhouse_sql: [
			{
				disabled: false,
				legend: '',
				name: 'A',
				query: '',
			},
		],
		id: '2a0aa4de-26fe-464b-ae6a-40eab4539b26',
		promql: [
			{
				disabled: false,
				legend: '',
				name: 'A',
				query: '',
			},
		],
		queryType: 'builder',
	},
	selectedLogFields: [
		{
			dataType: 'string',
			name: 'body',
			type: '',
		},
		{
			dataType: 'string',
			name: 'timestamp',
			type: '',
		},
	],
	selectedTracesFields: [
		{
			dataType: 'string',
			id: 'serviceName--string--tag--true',
			isColumn: true,
			isJSON: false,
			key: 'serviceName',
			type: 'tag',
		},
		{
			dataType: 'string',
			id: 'name--string--tag--true',
			isColumn: true,
			isJSON: false,
			key: 'name',
			type: 'tag',
		},
		{
			dataType: 'float64',
			id: 'durationNano--float64--tag--true',
			isColumn: true,
			isJSON: false,
			key: 'durationNano',
			type: 'tag',
		},
		{
			dataType: 'string',
			id: 'httpMethod--string--tag--true',
			isColumn: true,
			isJSON: false,
			key: 'httpMethod',
			type: 'tag',
		},
		{
			dataType: 'string',
			id: 'responseStatusCode--string--tag--true',
			isColumn: true,
			isJSON: false,
			key: 'responseStatusCode',
			type: 'tag',
		},
	],
	softMax: 0,
	softMin: 0,
	thresholds: [],
	timePreferance: 'GLOBAL_TIME',
	title: 'Title-dashboard',
	yAxisUnit: 'none',
};

function MessagingQueuesGraph(): JSX.Element {
	const isDarkMode = useIsDarkMode();

	return (
		<Card
			isDarkMode={isDarkMode}
			$panelType={PANEL_TYPES.TIME_SERIES}
			className="mq-graph"
		>
			<GridCard
				widget={currentWidget as Widgets}
				headerMenuList={[...ViewMenuAction]}
			/>
		</Card>
	);
}

export default MessagingQueuesGraph;

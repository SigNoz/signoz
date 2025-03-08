import { TabsProps } from 'antd';
import TabLabel from 'components/TabLabel';
import { PANEL_TYPES } from 'constants/queryBuilder';
import TimeSeriesView from 'container/TimeSeriesView';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';
import { v4 as uuid } from 'uuid';

export const TABS_ITEMS: TabsProps['items'] = [
	{
		label: <TabLabel label="Time Series" isDisabled={false} />,
		key: PANEL_TYPES.TIME_SERIES,
		children: (
			<TimeSeriesView dataSource={DataSource.TRACES} isFilterApplied={false} />
		),
	},
];

export const splitQueryIntoOneChartPerQuery = (query: Query): Query[] =>
	query.builder.queryData.map((currentQuery) => ({
		...query,
		id: uuid(),
		builder: {
			...query.builder,
			// builderQueries: [currentQuery],
			queryData: [currentQuery],
		},
	}));

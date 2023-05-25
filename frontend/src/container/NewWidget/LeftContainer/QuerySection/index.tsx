import { Button, Tabs, Typography } from 'antd';
import TextToolTip from 'components/TextToolTip';
import { COMPOSITE_QUERY } from 'constants/queryBuilderQueryNames';
import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import { QueryBuilder } from 'container/QueryBuilder';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import useUrlQuery from 'hooks/useUrlQuery';
import { useCallback, useEffect, useState } from 'react';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import {
	UpdateQuery,
	UpdateQueryProps,
} from 'store/actions/dashboard/updateQuery';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { Widgets } from 'types/api/dashboard/getAll';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import DashboardReducer from 'types/reducer/dashboards';

import ClickHouseQueryContainer from './QueryBuilder/clickHouse';
import PromQLQueryContainer from './QueryBuilder/promQL';

function QuerySection({ updateQuery, selectedGraph }: QueryProps): JSX.Element {
	const {
		currentQuery,
		queryType,
		handleSetQueryType,
		initQueryBuilderData,
	} = useQueryBuilder();
	const [stagedQuery, setStagedQuery] = useState<Query | null>(null);
	const urlQuery = useUrlQuery();

	const compositeQuery = urlQuery.get(COMPOSITE_QUERY);

	const { dashboards, isLoadingQueryResult } = useSelector<
		AppState,
		DashboardReducer
	>((state) => state.dashboards);

	const [selectedDashboards] = dashboards;
	const { widgets } = selectedDashboards.data;

	const getWidget = useCallback(() => {
		const widgetId = urlQuery.get('widgetId');
		return widgets?.find((e) => e.id === widgetId);
	}, [widgets, urlQuery]);

	const selectedWidget = getWidget() as Widgets;

	const { query } = selectedWidget || {};

	const handleStageQuery = useCallback(
		(updatedQuery: Query): void => {
			updateQuery({
				updatedQuery,
				widgetId: urlQuery.get('widgetId') || '',
				yAxisUnit: selectedWidget.yAxisUnit,
			});
		},
		[urlQuery, selectedWidget, updateQuery],
	);

	const handleQueryCategoryChange = (qCategory: string): void => {
		const currentQueryType = qCategory as EQueryType;

		handleSetQueryType(currentQueryType);

		handleStageQuery({ ...currentQuery, queryType: currentQueryType });
	};

	const handleRunQuery = (): void => {
		handleStageQuery({ ...currentQuery, queryType });
	};

	useEffect(() => {
		const actualQuery = (compositeQuery
			? JSON.parse(compositeQuery)
			: query) as Query;

		if (!stagedQuery) {
			initQueryBuilderData(actualQuery);
			handleStageQuery(actualQuery);
			setStagedQuery(actualQuery);
		}
	}, [
		query,
		selectedWidget,
		compositeQuery,
		stagedQuery,
		initQueryBuilderData,
		handleStageQuery,
	]);

	const items = [
		{
			key: EQueryType.QUERY_BUILDER,
			label: 'Query Builder',
			tab: <Typography>Query Builder</Typography>,
			children: <QueryBuilder panelType={selectedGraph} />,
		},
		{
			key: EQueryType.CLICKHOUSE,
			label: 'ClickHouse Query',
			tab: <Typography>ClickHouse Query</Typography>,
			children: <ClickHouseQueryContainer />,
		},
		{
			key: EQueryType.PROM,
			label: 'PromQL',
			tab: <Typography>PromQL</Typography>,
			children: <PromQLQueryContainer />,
		},
	];

	return (
		<Tabs
			type="card"
			style={{ width: '100%' }}
			defaultActiveKey={queryType}
			activeKey={queryType}
			onChange={handleQueryCategoryChange}
			tabBarExtraContent={
				<span style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
					<TextToolTip text="This will temporarily save the current query and graph state. This will persist across tab change" />
					<Button
						loading={isLoadingQueryResult}
						type="primary"
						onClick={handleRunQuery}
					>
						Stage & Run Query
					</Button>
				</span>
			}
			items={items}
		/>
	);
}

interface DispatchProps {
	updateQuery: (
		props: UpdateQueryProps,
	) => (dispatch: Dispatch<AppActions>) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	updateQuery: bindActionCreators(UpdateQuery, dispatch),
});

interface QueryProps extends DispatchProps {
	selectedGraph: GRAPH_TYPES;
}

export default connect(null, mapDispatchToProps)(QuerySection);

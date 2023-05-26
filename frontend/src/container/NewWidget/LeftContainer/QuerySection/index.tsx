import { Button, Tabs, Typography } from 'antd';
import TextToolTip from 'components/TextToolTip';
import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import { QueryBuilder } from 'container/QueryBuilder';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useCallback, useEffect, useMemo } from 'react';
import { connect, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import {
	UpdateQuery,
	UpdateQueryProps,
} from 'store/actions/dashboard/updateQuery';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { Widgets } from 'types/api/dashboard/getAll';
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

	const { dashboards, isLoadingQueryResult } = useSelector<
		AppState,
		DashboardReducer
	>((state) => state.dashboards);

	const [selectedDashboards] = dashboards;
	const { search } = useLocation();
	const { widgets } = selectedDashboards.data;

	const urlQuery = useMemo(() => new URLSearchParams(search), [search]);

	const getWidget = useCallback(() => {
		const widgetId = urlQuery.get('widgetId');
		return widgets?.find((e) => e.id === widgetId);
	}, [widgets, urlQuery]);

	const selectedWidget = getWidget() as Widgets;

	const { query } = selectedWidget || {};

	useEffect(() => {
		initQueryBuilderData(query, selectedWidget.query.queryType);
	}, [query, initQueryBuilderData, selectedWidget]);

	const handleStageQuery = (): void => {
		updateQuery({
			updatedQuery: {
				...currentQuery,
				queryType,
			},
			widgetId: urlQuery.get('widgetId') || '',
			yAxisUnit: selectedWidget.yAxisUnit,
		});
	};

	const handleQueryCategoryChange = (qCategory: string): void => {
		const currentQueryType = qCategory as EQueryType;

		handleSetQueryType(currentQueryType);
		updateQuery({
			updatedQuery: { ...currentQuery, queryType: currentQueryType },
			widgetId: urlQuery.get('widgetId') || '',
			yAxisUnit: selectedWidget.yAxisUnit,
		});
	};

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
						onClick={handleStageQuery}
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

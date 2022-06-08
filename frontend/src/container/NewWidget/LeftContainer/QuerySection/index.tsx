import { PlusOutlined } from '@ant-design/icons';
import { Button, Tabs } from 'antd';
import { getMetricsQueryRange } from 'api/metrics/getQueryRange';
import { timePreferance } from 'container/NewWidget/RightContainer/timeItems';
import { cloneDeep } from 'lodash-es';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { connect, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { CreateQuery, CreateQueryProps } from 'store/actions';
import {
	GetQueryResults,
	GetQueryResultsProps,
} from 'store/actions/dashboard/getQueryResults';
import {
	UpdateQuery,
	UpdateQueryProps,
} from 'store/actions/dashboard/updateQuery';
import {
	UpdateQueryType,
	UpdateQueryTypeProps,
} from 'store/actions/dashboard/updateQueryType';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { Widgets } from 'types/api/dashboard/getAll';
import { EQueryType } from 'types/common/dashboard';
import DashboardReducer from 'types/reducer/dashboards';
import { v4 as uuid } from 'uuid';

import {
	WIDGET_CLICKHOUSE_QUERY_KEY_NAME,
	WIDGET_PROMQL_QUERY_KEY_NAME,
	WIDGET_QUERY_BUILDER_QUERY_KEY_NAME,
} from './constants';
import Query from './Query';
import QueryBuilder from './QueryBuilder';
import ClickHouseQueryContainer from './QueryBuilder/clickHouse';
import PromQLQueryContainer from './QueryBuilder/promQL';
import QueryBuilderQueryContainer from './QueryBuilder/queryBuilder';
import { QueryButton } from './styles';
import { EQueryTypeToQueryKeyMapping, TQueryCategories } from './types';
import GetQueryName from './utils/GetQueryName';

const { TabPane } = Tabs;
function QuerySection({
	selectedTime,
	createQuery,
	updateQuery,
	getQueryResults,
	updateQueryType,
}: QueryProps): JSX.Element {
	const [localQueryChanges, setLocalQueryChanges] = useState({});

	const { dashboards } = useSelector<AppState, DashboardReducer>(
		(state) => state.dashboards,
	);
	const [selectedDashboards] = dashboards;
	const { search } = useLocation();
	const { widgets } = selectedDashboards.data;

	const urlQuery = useMemo(() => {
		return new URLSearchParams(search);
	}, [search]);

	const getWidget = useCallback(() => {
		const widgetId = urlQuery.get('widgetId');
		return widgets?.find((e) => e.id === widgetId);
	}, [widgets, urlQuery]);

	const selectedWidget = getWidget() as Widgets;
	const [queryCategory, setQueryCategory] = useState<EQueryType>(
		selectedWidget.query.queryType,
	);

	const { query = [] } = selectedWidget || {};
	useEffect(() => {
		setLocalQueryChanges(cloneDeep(query));
	}, [query]);

	const queryOnClickHandler = () => {
		setLocalQueryChanges([
			...localQueryChanges,
			// {
			// 	name: GetQueryName(localQueryChanges),
			// 	disabled: false,

			// 	promQL: {
			// 		query: '',
			// 		legend: '',
			// 	},
			// 	clickHouseQuery: '',
			// 	queryBuilder: {
			// 		metricName: null,
			// 		aggregateOperator: null,
			// 		tagFilters: {
			// 			op: 'AND',
			// 			items: [],
			// 		},
			// 		groupBy: [],
			// 	},
			// },
		]);
	};

	const handleQueryCategoryChange = (qCategory): void => {
		setQueryCategory(parseInt(qCategory));
		setLocalQueryChanges({
			...localQueryChanges,
			queryType: parseInt(qCategory),
		});
	};
	const handleLocalQueryUpdate = ({ updatedQuery }) => {
		setLocalQueryChanges(updatedQuery);
	};
	const handleStageQuery = () => {
		updateQuery({
			updatedQuery: localQueryChanges,
			widgetId: urlQuery.get('widgetId'),
			yAxisUnit: selectedWidget.yAxisUnit,
		});
	};
	const handleDeleteQuery = ({ currentIndex }) => {
		setLocalQueryChanges((prevState) => {
			prevState.splice(currentIndex, 1);
			return [...prevState];
		});
	};
	return (
		<>
			<div style={{ display: 'flex' }}>
				<Tabs
					type="card"
					style={{ width: '100%' }}
					defaultActiveKey={queryCategory.toString()}
					onChange={handleQueryCategoryChange}
					tabBarExtraContent={
						<Button type="primary" onClick={handleStageQuery}>
							Stage & Run Query
						</Button>
					}
				>
					<TabPane tab="Query Builder" key={EQueryType.QUERY_BUILDER.toString()}>
						<QueryBuilderQueryContainer
							queryData={localQueryChanges}
							updateQueryData={({ updatedQuery }) => {
								handleLocalQueryUpdate({ updatedQuery });
							}}
							metricsBuilderQueries={
								localQueryChanges[WIDGET_QUERY_BUILDER_QUERY_KEY_NAME]
							}
						/>
					</TabPane>
					<TabPane tab="ClickHouse Query" key={EQueryType.CLICKHOUSE.toString()}>
						<ClickHouseQueryContainer
							queryData={localQueryChanges}
							updateQueryData={({ updatedQuery }) => {
								handleLocalQueryUpdate({ updatedQuery });
							}}
							clickHouseQueries={localQueryChanges[WIDGET_CLICKHOUSE_QUERY_KEY_NAME]}
						/>
					</TabPane>
					<TabPane tab="PromQL" key={EQueryType.PROM.toString()}>
						<PromQLQueryContainer
							queryData={localQueryChanges}
							updateQueryData={({ updatedQuery }) => {
								handleLocalQueryUpdate({ updatedQuery });
							}}
							promQLQueries={localQueryChanges[WIDGET_PROMQL_QUERY_KEY_NAME]}
						/>
					</TabPane>
				</Tabs>
			</div>
			{/* {localQueryChanges.map((e, index) => (
				// <Query
				// 	name={e.name}
				// 	currentIndex={index}
				// 	selectedTime={selectedTime}
				// 	key={JSON.stringify(e)}
				// 	queryInput={e}
				// 	updatedLocalQuery={handleLocalQueryUpdate}
				// 	queryCategory={queryCategory}
				// />
				<QueryBuilder
					key={`${JSON.stringify(e)}`}
					name={e.name}
					updateQueryData={(updatedQuery) =>
						handleLocalQueryUpdate({ currentIndex: index, updatedQuery })
					}
					onDelete={() => handleDeleteQuery({ currentIndex: index })}
					queryData={e}
					queryCategory={queryCategory}
				/>
			))} */}
		</>
	);
}

interface DispatchProps {
	createQuery: ({
		widgetId,
	}: CreateQueryProps) => (dispatch: Dispatch<AppActions>) => void;
	updateQuery: (
		props: UpdateQueryProps,
	) => (dispatch: Dispatch<AppActions>) => void;
	getQueryResults: (
		props: GetQueryResultsProps,
	) => (dispatch: Dispatch<AppActions>) => void;
	updateQueryType: (
		props: UpdateQueryTypeProps,
	) => (dispatch: Dispatch<AppActions>) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	createQuery: bindActionCreators(CreateQuery, dispatch),
	updateQuery: bindActionCreators(UpdateQuery, dispatch),
	getQueryResults: bindActionCreators(GetQueryResults, dispatch),
	updateQueryType: bindActionCreators(UpdateQueryType, dispatch),
});

interface QueryProps extends DispatchProps {
	selectedTime: timePreferance;
}

export default connect(null, mapDispatchToProps)(QuerySection);

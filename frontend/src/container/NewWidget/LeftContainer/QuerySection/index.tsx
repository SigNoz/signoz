/* eslint-disable  */
//@ts-nocheck

import { Button, Tabs } from 'antd';
import TextToolTip from 'components/TextToolTip';
import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import { timePreferance } from 'container/NewWidget/RightContainer/timeItems';
import { cloneDeep, isEqual } from 'lodash-es';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Query, Widgets } from 'types/api/dashboard/getAll';
import { EQueryType } from 'types/common/dashboard';
import DashboardReducer from 'types/reducer/dashboards';
import { v4 as uuid } from 'uuid';

import {
	WIDGET_CLICKHOUSE_QUERY_KEY_NAME,
	WIDGET_PROMQL_QUERY_KEY_NAME,
	WIDGET_QUERY_BUILDER_QUERY_KEY_NAME,
} from './constants';
import ClickHouseQueryContainer from './QueryBuilder/clickHouse';
import PromQLQueryContainer from './QueryBuilder/promQL';
import QueryBuilderQueryContainer from './QueryBuilder/queryBuilder';
import TabHeader from './TabHeader';
import { getQueryKey } from './utils/getQueryKey';
import { showUnstagedStashConfirmBox } from './utils/userSettings';

function QuerySection({
	handleUnstagedChanges,
	updateQuery,
	selectedGraph,
}: QueryProps): JSX.Element {
	const [localQueryChanges, setLocalQueryChanges] = useState<Query>({} as Query);
	const [rctTabKey, setRctTabKey] = useState<
		Record<keyof typeof EQueryType, string>
	>({
		QUERY_BUILDER: uuid(),
		CLICKHOUSE: uuid(),
		PROM: uuid(),
	});
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

	const { query } = selectedWidget || {};
	useEffect(() => {
		setLocalQueryChanges(cloneDeep(query) as Query);
	}, [query]);

	const queryDiff = (
		queryA: Query,
		queryB: Query,
		queryCategory: EQueryType,
	): boolean => {
		const keyOfConcern = getQueryKey(queryCategory);
		return !isEqual(queryA[keyOfConcern], queryB[keyOfConcern]);
	};

	useEffect(() => {
		handleUnstagedChanges(
			queryDiff(query, localQueryChanges, parseInt(`${queryCategory}`, 10)),
		);
	}, [handleUnstagedChanges, localQueryChanges, query, queryCategory]);

	const regenRctKeys = (): void => {
		setRctTabKey((prevState) => {
			const newState = prevState;
			Object.keys(newState).forEach((key) => {
				newState[key as keyof typeof EQueryType] = uuid();
			});

			return cloneDeep(newState);
		});
	};

	const handleStageQuery = (): void => {
		updateQuery({
			updatedQuery: localQueryChanges,
			widgetId: urlQuery.get('widgetId') || '',
			yAxisUnit: selectedWidget.yAxisUnit,
		});
	};

	const handleQueryCategoryChange = (qCategory: string): void => {
		// If true, then it means that the user has made some changes and haven't staged them
		const unstagedChanges = queryDiff(
			query,
			localQueryChanges,
			parseInt(`${queryCategory}`, 10),
		);

		if (unstagedChanges && showUnstagedStashConfirmBox()) {
			// eslint-disable-next-line no-alert
			window.confirm(
				"You are trying to navigate to different tab with unstaged changes. Your current changes will be purged. Press 'Stage & Run Query' to stage them.",
			);
			return;
		}

		setQueryCategory(parseInt(`${qCategory}`, 10));
		const newLocalQuery = {
			...cloneDeep(query),
			queryType: parseInt(`${qCategory}`, 10),
		};
		setLocalQueryChanges(newLocalQuery);
		regenRctKeys();
		updateQuery({
			updatedQuery: newLocalQuery,
			widgetId: urlQuery.get('widgetId') || '',
			yAxisUnit: selectedWidget.yAxisUnit,
		});
	};

	const handleLocalQueryUpdate = ({
		updatedQuery,
	}: IHandleUpdatedQuery): void => {
		setLocalQueryChanges(cloneDeep(updatedQuery));
	};

	const items = [
		{
			key: EQueryType.QUERY_BUILDER.toString(),
			label: 'Query Builder',
			tab: (
				<TabHeader
					tabName="Query Builder"
					hasUnstagedChanges={queryDiff(
						query,
						localQueryChanges,
						EQueryType.QUERY_BUILDER,
					)}
				/>
			),
			children: (
				<QueryBuilderQueryContainer
					key={rctTabKey.QUERY_BUILDER}
					queryData={localQueryChanges}
					updateQueryData={({ updatedQuery }: IHandleUpdatedQuery): void => {
						handleLocalQueryUpdate({ updatedQuery });
					}}
					metricsBuilderQueries={
						localQueryChanges[WIDGET_QUERY_BUILDER_QUERY_KEY_NAME]
					}
					selectedGraph={selectedGraph}
				/>
			),
		},
		{
			key: EQueryType.CLICKHOUSE.toString(),
			label: 'ClickHouse Query',
			tab: (
				<TabHeader
					tabName="ClickHouse Query"
					hasUnstagedChanges={queryDiff(
						query,
						localQueryChanges,
						EQueryType.CLICKHOUSE,
					)}
				/>
			),
			children: (
				<ClickHouseQueryContainer
					key={rctTabKey.CLICKHOUSE}
					queryData={localQueryChanges}
					updateQueryData={({ updatedQuery }: IHandleUpdatedQuery): void => {
						handleLocalQueryUpdate({ updatedQuery });
					}}
					clickHouseQueries={localQueryChanges[WIDGET_CLICKHOUSE_QUERY_KEY_NAME]}
				/>
			),
		},
		{
			key: EQueryType.PROM.toString(),
			label: 'PromQL',
			tab: (
				<TabHeader
					tabName="PromQL"
					hasUnstagedChanges={queryDiff(query, localQueryChanges, EQueryType.PROM)}
				/>
			),
			children: (
				<PromQLQueryContainer
					key={rctTabKey.PROM}
					queryData={localQueryChanges}
					updateQueryData={({ updatedQuery }: IHandleUpdatedQuery): void => {
						handleLocalQueryUpdate({ updatedQuery });
					}}
					promQLQueries={localQueryChanges[WIDGET_PROMQL_QUERY_KEY_NAME]}
				/>
			),
		},
	];

	return (
		<>
			<div style={{ display: 'flex' }}>
				<Tabs
					type="card"
					style={{ width: '100%' }}
					defaultActiveKey={queryCategory.toString()}
					activeKey={queryCategory.toString()}
					onChange={handleQueryCategoryChange}
					tabBarExtraContent={
						<span style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
							<TextToolTip
								{...{
									text: `This will temporarily save the current query and graph state. This will persist across tab change`,
								}}
							/>
							<Button type="primary" onClick={handleStageQuery}>
								Stage & Run Query
							</Button>
						</span>
					}
					items={items}
				/>
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
	// createQuery: ({
	// 	widgetId,
	// }: CreateQueryProps) => (dispatch: Dispatch<AppActions>) => void;
	updateQuery: (
		props: UpdateQueryProps,
	) => (dispatch: Dispatch<AppActions>) => void;
	// getQueryResults: (
	// 	props: GetQueryResultsProps,
	// ) => (dispatch: Dispatch<AppActions>) => void;
	// updateQueryType: (
	// 	props: UpdateQueryTypeProps,
	// ) => (dispatch: Dispatch<AppActions>) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	// createQuery: bindActionCreators(CreateQuery, dispatch),
	updateQuery: bindActionCreators(UpdateQuery, dispatch),
	// getQueryResults: bindActionCreators(GetQueryResults, dispatch),
	// updateQueryType: bindActionCreators(UpdateQueryType, dispatch),
});

interface QueryProps extends DispatchProps {
	selectedGraph: GRAPH_TYPES;
	selectedTime: timePreferance;
	handleUnstagedChanges: (arg0: boolean) => void;
}

export default connect(null, mapDispatchToProps)(QuerySection);

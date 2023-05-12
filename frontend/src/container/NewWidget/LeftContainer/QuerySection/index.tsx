import { Button, Tabs, Typography } from 'antd';
import TextToolTip from 'components/TextToolTip';
import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import { QueryBuilder } from 'container/QueryBuilder';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { cloneDeep } from 'lodash-es';
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

import ClickHouseQueryContainer from './QueryBuilder/clickHouse';
import PromQLQueryContainer from './QueryBuilder/promQL';
import { IHandleUpdatedQuery } from './types';

function QuerySection({ updateQuery, selectedGraph }: QueryProps): JSX.Element {
	const { queryBuilderData, initQueryBuilderData } = useQueryBuilder();
	const [localQueryChanges, setLocalQueryChanges] = useState<Query>({} as Query);
	const [rctTabKey, setRctTabKey] = useState<
		Record<keyof typeof EQueryType, string>
	>({
		QUERY_BUILDER: uuid(),
		CLICKHOUSE: uuid(),
		PROM: uuid(),
	});
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
	const [queryCategory, setQueryCategory] = useState<EQueryType>(
		selectedWidget.query.queryType,
	);

	const { query } = selectedWidget || {};

	useEffect(() => {
		initQueryBuilderData(query.builder);
		setLocalQueryChanges(cloneDeep(query) as Query);
	}, [query, initQueryBuilderData]);

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
			updatedQuery: {
				...localQueryChanges,
				builder: queryBuilderData,
			},
			widgetId: urlQuery.get('widgetId') || '',
			yAxisUnit: selectedWidget.yAxisUnit,
		});
	};

	const handleQueryCategoryChange = (qCategory: string): void => {
		setQueryCategory(qCategory as EQueryType);
		const newLocalQuery = {
			...cloneDeep(query),
			queryType: qCategory as EQueryType,
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
			key: EQueryType.QUERY_BUILDER,
			label: 'Query Builder',
			tab: <Typography>Query Builder</Typography>,
			children: <QueryBuilder panelType={selectedGraph} />,
		},
		{
			key: EQueryType.CLICKHOUSE,
			label: 'ClickHouse Query',
			tab: <Typography>ClickHouse Query</Typography>,
			children: (
				<ClickHouseQueryContainer
					key={rctTabKey.CLICKHOUSE}
					queryData={localQueryChanges}
					updateQueryData={({ updatedQuery }: IHandleUpdatedQuery): void => {
						handleLocalQueryUpdate({ updatedQuery });
					}}
					clickHouseQueries={localQueryChanges[EQueryType.CLICKHOUSE]}
				/>
			),
		},
		{
			key: EQueryType.PROM,
			label: 'PromQL',
			tab: <Typography>PromQL</Typography>,
			children: (
				<PromQLQueryContainer
					key={rctTabKey.PROM}
					queryData={localQueryChanges}
					updateQueryData={({ updatedQuery }: IHandleUpdatedQuery): void => {
						handleLocalQueryUpdate({ updatedQuery });
					}}
					promQLQueries={localQueryChanges[EQueryType.PROM]}
				/>
			),
		},
	];

	return (
		<Tabs
			type="card"
			style={{ width: '100%' }}
			defaultActiveKey={queryCategory}
			activeKey={queryCategory}
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

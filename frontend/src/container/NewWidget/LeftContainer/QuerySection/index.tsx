import { PlusOutlined } from '@ant-design/icons';
import { Button, Tabs } from 'antd';
import { timePreferance } from 'container/NewWidget/RightContainer/timeItems';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { connect, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { CreateQuery, CreateQueryProps } from 'store/actions';
import {
	UpdateQuery,
	UpdateQueryProps,
} from 'store/actions/dashboard/updateQuery';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { Widgets } from 'types/api/dashboard/getAll';
import DashboardReducer from 'types/reducer/dashboards';

import Query from './Query';
import { QueryButton } from './styles';
import { TQueryCategories } from './types';
import GetQueryName from './utils/GetQueryName';

const { TabPane } = Tabs;
function QuerySection({
	selectedTime,
	createQuery,
	updateQuery,
}: QueryProps): JSX.Element {
	const [queryCategory, setQueryCategory] = useState<TQueryCategories>(
		'query_builder',
	);
	const [localQueryChanges, setLocalQueryChanges] = useState([]);

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

	const { query = [] } = selectedWidget || {};

	useEffect(() => {
		setLocalQueryChanges(query);
	}, [query]);

	const queryOnClickHandler = () => {
		setLocalQueryChanges([
			...localQueryChanges,
			{
				name: GetQueryName(localQueryChanges),
				formulas: [],
				promQL: {
					query: '',
					legend: '',
				},
				clickHouseQuery: '',
				queryBuilder: {
					metricName: null,
					aggregateOperator: null,
					tagFilters: {
						items: [],
					},
					groupBy: [],
				},
			},
		]);
	};

	const handleQueryCategoryChange = (qCategory: TQueryCategories): void => {
		setQueryCategory(qCategory);
	};
	const handleLocalQueryUpdate = ({ currentIndex, updatedQuery }) => {
		setLocalQueryChanges((prevState) => {
			// prevState = [...prevState]
			prevState[currentIndex] = updatedQuery;
			return prevState;
		});
		// console.log(localQueryChanges)
	};
	const handleStageQuery = () => {
		updateQuery({
			updatedQuery: localQueryChanges,
			widgetId: urlQuery.get('widgetId'),
			yAxisUnit: selectedWidget.yAxisUnit,
		});
	};
	return (
		<>
			<Button onClick={handleStageQuery}>Stage & Run Query</Button>
			<Tabs
				type="card"
				style={{ width: '100%' }}
				defaultActiveKey={queryCategory}
				onChange={handleQueryCategoryChange}
			>
				<TabPane tab="Query Builder" key={'query_builder' as TQueryCategories} />
				<TabPane
					tab="ClickHouse Query"
					key={'clickhouse_query' as TQueryCategories}
				/>
				<TabPane tab="PromQL" key={'promql' as TQueryCategories} />
			</Tabs>
			{localQueryChanges.map((e, index) => (
				<Query
					name={e.name}
					currentIndex={index}
					selectedTime={selectedTime}
					key={JSON.stringify(e)}
					queryInput={e}
					updatedLocalQuery={handleLocalQueryUpdate}
					queryCategory={queryCategory}
				/>
			))}

			<QueryButton onClick={queryOnClickHandler} icon={<PlusOutlined />}>
				Query
			</QueryButton>
			<QueryButton onClick={queryOnClickHandler} icon={<PlusOutlined />}>
				Formula
			</QueryButton>
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
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	createQuery: bindActionCreators(CreateQuery, dispatch),
	updateQuery: bindActionCreators(UpdateQuery, dispatch),
});

interface QueryProps extends DispatchProps {
	selectedTime: timePreferance;
}

export default connect(null, mapDispatchToProps)(QuerySection);

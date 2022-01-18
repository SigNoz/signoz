import React, { useEffect } from 'react';

import Table, { ColumnsType } from 'antd/lib/table';
import { TableProps } from 'antd';

import { connect, useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { TraceReducer } from 'types/reducer/trace';
import { bindActionCreators } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import AppActions from 'types/actions';
import {
	GetInitialSpansAggregate,
	GetInitialSpansAggregateProps,
} from 'store/actions/trace/getInitialSpansAggregate';
import { GlobalReducer } from 'types/reducer/globalTime';
import { useLocation } from 'react-router-dom';

const TraceTable = ({ getInitialSpansAggregate }: TraceProps) => {
	const { selectedTags, spansAggregate } = useSelector<AppState, TraceReducer>(
		(state) => state.traces,
	);
	const { search } = useLocation();

	const globalTime = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const { loading, total } = spansAggregate;

	type TableType = FlatArray<TraceReducer['spansAggregate']['data'], 1>;

	const columns: ColumnsType<TableType> = [
		{
			title: 'Date',
			dataIndex: 'timestamp',
			key: 'timestamp',
		},
		{
			title: 'Service',
			dataIndex: 'serviceName',
			key: 'serviceName',
		},
		{
			title: 'Resource',
			dataIndex: 'errorRate',
			key: 'errorRate',
		},
		{
			title: 'Duration',
			dataIndex: 'durationNano',
			key: 'durationNano',
		},
		{
			title: 'Method',
			dataIndex: 'httpMethod',
			key: 'httpMethod',
		},
		{
			title: 'Status Code',
			dataIndex: 'httpCode',
			key: 'httpCode',
		},
	];

	const onChangeHandler: TableProps<TableType>['onChange'] = (props) => {
		getInitialSpansAggregate({
			maxTime: globalTime.maxTime,
			minTime: globalTime.minTime,
			selectedTags,
			current: props.current || 0,
			query: search,
		});
	};

	useEffect(() => {
		getInitialSpansAggregate({
			maxTime: globalTime.maxTime,
			minTime: globalTime.minTime,
			selectedTags,
			current: spansAggregate.currentPage,
			query: search,
		});
	}, [globalTime.maxTime, globalTime.minTime, selectedTags]);

	return (
		<Table
			onChange={onChangeHandler}
			dataSource={spansAggregate.data}
			loading={loading}
			columns={columns}
			rowKey={'timestamp'}
			pagination={{
				current: spansAggregate.currentPage,
				pageSize: 10,
				responsive: true,
				position: ['bottomLeft'],
				total: total,
			}}
		/>
	);
};

interface DispatchProps {
	getInitialSpansAggregate: (props: GetInitialSpansAggregateProps) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	getInitialSpansAggregate: bindActionCreators(
		GetInitialSpansAggregate,
		dispatch,
	),
});

type TraceProps = DispatchProps;

export default connect(null, mapDispatchToProps)(TraceTable);

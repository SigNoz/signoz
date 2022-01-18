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

const TraceTable = ({ getInitialSpansAggregate }: TraceProps) => {
	const { selectedTags, spansAggregate } = useSelector<AppState, TraceReducer>(
		(state) => state.traces,
	);

	const globalTime = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const { loading } = spansAggregate;

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
		console.log('asd', props);
	};

	useEffect(() => {
		getInitialSpansAggregate({
			maxTime: globalTime.maxTime,
			minTime: globalTime.minTime,
			selectedTags,
			current: spansAggregate.currentPage,
		});
	}, [
		globalTime.maxTime,
		globalTime.minTime,
		selectedTags,
		spansAggregate.currentPage,
	]);

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
				total: Infinity,
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

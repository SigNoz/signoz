import React from 'react';

import Table, { ColumnsType } from 'antd/lib/table';
import { TableProps, Tag } from 'antd';

import { connect, useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { TraceReducer } from 'types/reducer/trace';
import { bindActionCreators } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import AppActions from 'types/actions';
import {
	GetSpansAggregate,
	GetSpansAggregateProps,
} from 'store/actions/trace/getInitialSpansAggregate';
import { GlobalReducer } from 'types/reducer/globalTime';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import history from 'lib/history';
import ROUTES from 'constants/routes';
dayjs.extend(duration);

const TraceTable = ({ getSpansAggregate }: TraceProps) => {
	const {
		spansAggregate,
		selectedFilter,
		selectedTags,
		filterLoading,
	} = useSelector<AppState, TraceReducer>((state) => state.traces);

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
			render: (value: TableType['timestamp']) => {
				const day = dayjs(value);
				return <div>{day.format('DD/MM/YYYY hh:mm:ss A')}</div>;
			},
			sorter: (a, b) =>
				dayjs(a.timestamp).toDate().getTime() -
				dayjs(b.timestamp).toDate().getTime(),
		},
		{
			title: 'Service',
			dataIndex: 'serviceName',
			key: 'serviceName',
			sorter: (a, b) => a.serviceName.length - b.serviceName.length,
		},
		{
			title: 'Operation',
			dataIndex: 'operation',
			key: 'operation',
		},
		{
			title: 'Duration',
			dataIndex: 'durationNano',
			key: 'durationNano',
			sorter: (a, b) => a.durationNano - b.durationNano,
			render: (value: TableType['durationNano']) => {
				return (
					<div>
						{`${dayjs
							.duration({ milliseconds: value / 1000000 })
							.asMilliseconds()} ms`}
					</div>
				);
			},
		},
		{
			title: 'Method',
			dataIndex: 'httpMethod',
			key: 'httpMethod',
			render: (value: TableType['httpMethod']) => {
				if (value.length === 0) {
					return <div>-</div>;
				}
				return <Tag color="magenta">{value}</Tag>;
			},
		},
		{
			title: 'Status Code',
			dataIndex: 'httpCode',
			key: 'httpCode',
			sorter: (a, b) => a.httpCode.length - b.httpCode.length,
			render: (value: TableType['httpCode']) => {
				if (value.length === 0) {
					return <div>-</div>;
				}
				return <Tag color="magenta">{value}</Tag>;
			},
		},
	];

	const onChangeHandler: TableProps<TableType>['onChange'] = (props) => {
		if (props.current && props.pageSize) {
			getSpansAggregate({
				maxTime: globalTime.maxTime,
				minTime: globalTime.minTime,
				selectedFilter,
				current: props.current,
				pageSize: props.pageSize,
				selectedTags,
			});
		}
	};

	return (
		<Table
			onChange={onChangeHandler}
			dataSource={spansAggregate.data}
			loading={loading || filterLoading}
			columns={columns}
			onRow={(record) => ({
				onClick: () => {
					history.push({
						pathname: ROUTES.TRACE + '/' + record.traceID,
						state: {
							spanId: record.spanID,
						},
					});
				},
			})}
			size="middle"
			rowKey={'timestamp'}
			style={{
				cursor: 'pointer',
			}}
			pagination={{
				current: spansAggregate.currentPage,
				pageSize: spansAggregate.pageSize,
				responsive: true,
				position: ['bottomLeft'],
				total: total,
			}}
		/>
	);
};

interface DispatchProps {
	getSpansAggregate: (props: GetSpansAggregateProps) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	getSpansAggregate: bindActionCreators(GetSpansAggregate, dispatch),
});

type TraceProps = DispatchProps;

export default connect(null, mapDispatchToProps)(TraceTable);

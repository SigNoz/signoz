import { TableProps, Tag } from 'antd';
import Table, { ColumnsType } from 'antd/lib/table';
import ROUTES from 'constants/routes';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import history from 'lib/history';
import React from 'react';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import {
	GetSpansAggregate,
	GetSpansAggregateProps,
} from 'store/actions/trace/getInitialSpansAggregate';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { GlobalReducer } from 'types/reducer/globalTime';
import { TraceReducer } from 'types/reducer/trace';
dayjs.extend(duration);

const TraceTable = ({ getSpansAggregate }: TraceProps): JSX.Element => {
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
			sorter: true,
			render: (value: TableType['timestamp']): JSX.Element => {
				const day = dayjs(value);
				return <div>{day.format('DD/MM/YYYY hh:mm:ss A')}</div>;
			},
		},
		{
			title: 'Service',
			dataIndex: 'serviceName',
			key: 'serviceName',
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
			render: (value: TableType['durationNano']): JSX.Element => (
				<div>
					{`${dayjs
						.duration({ milliseconds: value / 1000000 })
						.asMilliseconds()} ms`}
				</div>
			),
		},
		{
			title: 'Method',
			dataIndex: 'httpMethod',
			key: 'httpMethod',
			render: (value: TableType['httpMethod']): JSX.Element => {
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
			render: (value: TableType['httpCode']): JSX.Element => {
				if (value.length === 0) {
					return <div>-</div>;
				}
				return <Tag color="magenta">{value}</Tag>;
			},
		},
	];

	const onChangeHandler: TableProps<TableType>['onChange'] = (
		props,
		_,
		sort,
	) => {
		const { order = 'ascend' } = sort;

		if (props.current && props.pageSize) {
			getSpansAggregate({
				maxTime: globalTime.maxTime,
				minTime: globalTime.minTime,
				selectedFilter,
				current: props.current,
				pageSize: props.pageSize,
				selectedTags,
				order: order === 'ascend' ? 'ascending' : 'descending',
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
				onClick: (): void => {
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

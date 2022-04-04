import { TableProps, Tag, Typography } from 'antd';
import Table, { ColumnsType } from 'antd/lib/table';
import ROUTES from 'constants/routes';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import React from 'react';
import { connect, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
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

function TraceTable({ getSpansAggregate }: TraceProps): JSX.Element {
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

	const getLink = (record: TableType): string => {
		return `${ROUTES.TRACE}/${record.traceID}?spanId=${record.spanID}`;
	};

	const getValue = (value: string, record: TableType): JSX.Element => {
		return (
			<Link to={getLink(record)}>
				<Typography>{value}</Typography>
			</Link>
		);
	};

	const getHttpMethodOrStatus = (
		value: TableType['httpMethod'],
		record: TableType,
	): JSX.Element => {
		if (value.length === 0) {
			return (
				<Link to={getLink(record)}>
					<Typography>-</Typography>
				</Link>
			);
		}
		return (
			<Link to={getLink(record)}>
				<Tag color="magenta">{value}</Tag>
			</Link>
		);
	};

	const columns: ColumnsType<TableType> = [
		{
			title: 'Date',
			dataIndex: 'timestamp',
			key: 'timestamp',
			sorter: true,
			render: (value: TableType['timestamp'], record): JSX.Element => {
				const day = dayjs(value);
				return (
					<Link to={getLink(record)}>
						<Typography>{day.format('YYYY/MM/DD HH:mm:ss')}</Typography>
					</Link>
				);
			},
		},
		{
			title: 'Service',
			dataIndex: 'serviceName',
			key: 'serviceName',
			render: getValue,
		},
		{
			title: 'Operation',
			dataIndex: 'operation',
			key: 'operation',
			render: getValue,
		},
		{
			title: 'Duration',
			dataIndex: 'durationNano',
			key: 'durationNano',
			render: (value: TableType['durationNano'], record): JSX.Element => (
				<Link to={getLink(record)}>
					<Typography>
						{`${dayjs
							.duration({ milliseconds: value / 1000000 })
							.asMilliseconds()} ms`}
					</Typography>
				</Link>
			),
		},
		{
			title: 'Method',
			dataIndex: 'httpMethod',
			key: 'httpMethod',
			render: getHttpMethodOrStatus,
		},
		{
			title: 'Status Code',
			dataIndex: 'httpCode',
			key: 'httpCode',
			render: getHttpMethodOrStatus,
		},
	];

	const onChangeHandler: TableProps<TableType>['onChange'] = (
		props,
		_,
		sort,
	) => {
		if (!Array.isArray(sort)) {
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
		}
	};

	return (
		<Table
			onChange={onChangeHandler}
			dataSource={spansAggregate.data}
			loading={loading || filterLoading}
			columns={columns}
			rowKey="timestamp"
			style={{
				cursor: 'pointer',
			}}
			pagination={{
				current: spansAggregate.currentPage,
				pageSize: spansAggregate.pageSize,
				responsive: true,
				position: ['bottomLeft'],
				total,
			}}
		/>
	);
}

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

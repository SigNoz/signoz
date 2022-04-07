import { TableProps, Tag, Typography } from 'antd';
import Table, { ColumnsType } from 'antd/lib/table';
import ROUTES from 'constants/routes';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { Dispatch } from 'redux';
import { updateURL } from 'store/actions/trace/util';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import {
	UPDATE_SPAN_ORDER,
	UPDATE_SPANS_AGGREGATE_PAGE_NUMBER,
} from 'types/actions/trace';
import { TraceReducer } from 'types/reducer/trace';

dayjs.extend(duration);

function TraceTable(): JSX.Element {
	const {
		spansAggregate,
		selectedFilter,
		selectedTags,
		filterLoading,
		userSelectedFilter,
		filter,
		isFilterExclude,
		filterToFetchData,
	} = useSelector<AppState, TraceReducer>((state) => state.traces);

	const dispatch = useDispatch<Dispatch<AppActions>>();

	const { loading, total, order: spansAggregateOrder } = spansAggregate;

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
							.asMilliseconds()
							.toFixed(2)} ms`}
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
			const { order = spansAggregateOrder } = sort;
			if (props.current && props.pageSize) {
				const spanOrder = order || spansAggregateOrder;

				dispatch({
					type: UPDATE_SPAN_ORDER,
					payload: {
						order: spanOrder,
					},
				});

				dispatch({
					type: UPDATE_SPANS_AGGREGATE_PAGE_NUMBER,
					payload: {
						currentPage: props.current,
					},
				});

				updateURL(
					selectedFilter,
					filterToFetchData,
					props.current,
					selectedTags,
					isFilterExclude,
					userSelectedFilter,
					spanOrder,
				);
			}
		}
	};

	return (
		<Table
			onChange={onChangeHandler}
			dataSource={spansAggregate.data}
			loading={loading || filterLoading}
			columns={columns}
			rowKey={(record): string => `${record.traceID}-${record.spanID}`}
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
			sortDirections={['ascend', 'descend']}
		/>
	);
}

export default TraceTable;

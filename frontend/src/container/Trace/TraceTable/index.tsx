import { TableProps, Tag, Typography } from 'antd';
import Table, { ColumnsType } from 'antd/lib/table';
import ROUTES from 'constants/routes';
import {
	getSpanOrder,
	getSpanOrderParam,
} from 'container/Trace/TraceTable/util';
import { formUrlParams } from 'container/TraceDetail/utils';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import history from 'lib/history';
import omit from 'lodash-es/omit';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Dispatch } from 'redux';
import { updateURL } from 'store/actions/trace/util';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import {
	UPDATE_SPAN_ORDER,
	UPDATE_SPAN_ORDER_PARAMS,
	UPDATE_SPANS_AGGREGATE_PAGE_NUMBER,
	UPDATE_SPANS_AGGREGATE_PAGE_SIZE,
} from 'types/actions/trace';
import { TraceReducer } from 'types/reducer/trace';
import { v4 } from 'uuid';

dayjs.extend(duration);

function TraceTable(): JSX.Element {
	const {
		spansAggregate,
		selectedFilter,
		selectedTags,
		filterLoading,
		userSelectedFilter,
		isFilterExclude,
		filterToFetchData,
		filter,
	} = useSelector<AppState, TraceReducer>((state) => state.traces);

	const statusFilter = filter.get('status');
	const selectedStatusFilter = selectedFilter.get('status');

	const dispatch = useDispatch<Dispatch<AppActions>>();

	const { loading, order: spansAggregateOrder } = spansAggregate;

	type TableType = FlatArray<TraceReducer['spansAggregate']['data'], 1>;

	const getLink = (record: TableType): string => {
		return `${ROUTES.TRACE}/${record.traceID}${formUrlParams({
			spanId: record.spanID,
			levelUp: 0,
			levelDown: 0,
		})}`;
	};

	const getValue = (value: string): JSX.Element => {
		return <Typography>{value}</Typography>;
	};

	const getHttpMethodOrStatus = (
		value: TableType['statusCode'],
	): JSX.Element => {
		if (value.length === 0) {
			return <Typography>-</Typography>;
		}
		return <Tag color="magenta">{value}</Tag>;
	};

	const columns: ColumnsType<TableType> = [
		{
			title: 'Date',
			dataIndex: 'timestamp',
			key: 'timestamp',
			sorter: true,
			render: (value: TableType['timestamp']): JSX.Element => {
				const day = dayjs(value);
				return <Typography>{day.format('YYYY/MM/DD HH:mm:ss')}</Typography>;
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
			sorter: true,
			render: (value: TableType['durationNano']): JSX.Element => (
				<Typography>
					{`${dayjs
						.duration({ milliseconds: value / 1000000 })
						.asMilliseconds()
						.toFixed(2)} ms`}
				</Typography>
			),
		},
		{
			title: 'Method',
			dataIndex: 'method',
			key: 'method',
			render: getHttpMethodOrStatus,
		},
		{
			title: 'Status Code',
			dataIndex: 'statusCode',
			key: 'statusCode',
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
				const spanOrder = getSpanOrder(order || '');
				const orderParam = getSpanOrderParam(sort.field as string);

				dispatch({
					type: UPDATE_SPAN_ORDER,
					payload: {
						order: spanOrder,
					},
				});

				dispatch({
					type: UPDATE_SPAN_ORDER_PARAMS,
					payload: {
						orderParam,
					},
				});

				dispatch({
					type: UPDATE_SPANS_AGGREGATE_PAGE_SIZE,
					payload: {
						pageSize: props.pageSize,
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
					props.pageSize,
					orderParam,
				);
			}
		}
	};

	const totalObject = omit(statusFilter, [...(selectedStatusFilter || [])]);
	const totalCount = Object.values(totalObject).reduce(
		(a, b) => parseInt(String(a), 10) + parseInt(String(b), 10),
		0,
	) as number;

	return (
		<Table
			onChange={onChangeHandler}
			dataSource={spansAggregate.data}
			loading={loading || filterLoading}
			columns={columns}
			rowKey={(record): string => `${record.traceID}-${record.spanID}-${v4()}`}
			style={{
				cursor: 'pointer',
			}}
			onRow={(record): React.HTMLAttributes<TableType> => ({
				onClick: (event): void => {
					event.preventDefault();
					event.stopPropagation();
					if (event.metaKey || event.ctrlKey) {
						window.open(getLink(record), '_blank');
					} else {
						history.push(getLink(record));
					}
				},
			})}
			pagination={{
				current: spansAggregate.currentPage,
				pageSize: spansAggregate.pageSize,
				responsive: true,
				position: ['bottomLeft'],
				total: totalCount,
			}}
		/>
	);
}

export default TraceTable;

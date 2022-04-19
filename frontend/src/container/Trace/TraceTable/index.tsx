import { TableProps, Tag, Typography } from 'antd';
import Table, { ColumnsType } from 'antd/lib/table';
import ROUTES from 'constants/routes';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import history from 'lib/history';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
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
		isFilterExclude,
		filterToFetchData,
	} = useSelector<AppState, TraceReducer>((state) => state.traces);

	const dispatch = useDispatch<Dispatch<AppActions>>();

	const { loading, total, order: spansAggregateOrder } = spansAggregate;

	type TableType = FlatArray<TraceReducer['spansAggregate']['data'], 1>;

	const getLink = (record: TableType): string => {
		return `${ROUTES.TRACE}/${record.traceID}?spanId=${record.spanID}`;
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
			onRow={(record): React.HTMLAttributes<TableType> => ({
				onClick: (event): void => {
					event.preventDefault();
					event.stopPropagation();
					history.push(getLink(record));
				},
			})}
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

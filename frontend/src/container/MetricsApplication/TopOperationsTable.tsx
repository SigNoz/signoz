import { Table, Tooltip, Typography } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import { METRICS_PAGE_QUERY_PARAM } from 'constants/query';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import { convertRawQueriesToTraceSelectedTags } from 'lib/resourceAttributes';
import React from 'react';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';
import MetricReducer from 'types/reducer/metrics';

function TopOperationsTable(props: TopOperationsTableProps): JSX.Element {
	const { minTime, maxTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);
	const { resourceAttributeQueries } = useSelector<AppState, MetricReducer>(
		(state) => state.metrics,
	);

	const selectedTraceTags: string = JSON.stringify(
		convertRawQueriesToTraceSelectedTags(resourceAttributeQueries) || [],
	);

	const { data } = props;

	const params = useParams<{ servicename: string }>();

	const handleOnClick = (operation: string): void => {
		const urlParams = new URLSearchParams();
		const { servicename } = params;
		urlParams.set(
			METRICS_PAGE_QUERY_PARAM.startTime,
			(minTime / 1000000).toString(),
		);
		urlParams.set(
			METRICS_PAGE_QUERY_PARAM.endTime,
			(maxTime / 1000000).toString(),
		);

		history.push(
			`${
				ROUTES.TRACE
			}?${urlParams.toString()}&selected={"serviceName":["${servicename}"],"operation":["${operation}"]}&filterToFetchData=["duration","status","serviceName","operation"]&spanAggregateCurrentPage=1&selectedTags=${selectedTraceTags}&&isFilterExclude={"serviceName":false,"operation":false}&userSelectedFilter={"status":["error","ok"],"serviceName":["${servicename}"],"operation":["${operation}"]}&spanAggregateCurrentPage=1`,
		);
	};

	const columns: ColumnsType<DataProps> = [
		{
			title: 'Name',
			dataIndex: 'name',
			key: 'name',
			ellipsis: true,
			render: (text: string): JSX.Element => (
				<Tooltip placement="topLeft" title={text}>
					<Typography.Link onClick={(): void => handleOnClick(text)}>
						{text}
					</Typography.Link>
				</Tooltip>
			),
		},
		{
			title: 'P50  (in ms)',
			dataIndex: 'p50',
			key: 'p50',
			sorter: (a: DataProps, b: DataProps): number => a.p50 - b.p50,
			render: (value: number): string => (value / 1000000).toFixed(2),
		},
		{
			title: 'P95  (in ms)',
			dataIndex: 'p95',
			key: 'p95',
			sorter: (a: DataProps, b: DataProps): number => a.p95 - b.p95,
			render: (value: number): string => (value / 1000000).toFixed(2),
		},
		{
			title: 'P99  (in ms)',
			dataIndex: 'p99',
			key: 'p99',
			sorter: (a: DataProps, b: DataProps): number => a.p99 - b.p99,
			render: (value: number): string => (value / 1000000).toFixed(2),
		},
		{
			title: 'Number of Calls',
			dataIndex: 'numCalls',
			key: 'numCalls',
			sorter: (a: TopOperationListItem, b: TopOperationListItem): number =>
				a.numCalls - b.numCalls,
		},
	];

	return (
		<Table
			showHeader
			title={(): string => {
				return 'Key Operations';
			}}
			tableLayout="fixed"
			dataSource={data}
			columns={columns}
			rowKey="name"
		/>
	);
}

interface TopOperationListItem {
	p50: number;
	p95: number;
	p99: number;
	numCalls: number;
	name: string;
}

type DataProps = TopOperationListItem;

interface TopOperationsTableProps {
	data: TopOperationListItem[];
}

export default TopOperationsTable;

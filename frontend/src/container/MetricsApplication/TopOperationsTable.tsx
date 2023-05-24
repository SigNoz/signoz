import { Tooltip, Typography } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import { ResizeTable } from 'components/ResizeTable';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import useResourceAttribute from 'hooks/useResourceAttribute';
import { convertRawQueriesToTraceSelectedTags } from 'hooks/useResourceAttribute/utils';
import history from 'lib/history';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

function TopOperationsTable(props: TopOperationsTableProps): JSX.Element {
	const { minTime, maxTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);
	const { queries } = useResourceAttribute();

	const selectedTraceTags: string = JSON.stringify(
		convertRawQueriesToTraceSelectedTags(queries) || [],
	);

	const { data } = props;

	const params = useParams<{ servicename: string }>();

	const handleOnClick = (operation: string): void => {
		const urlParams = new URLSearchParams();
		const { servicename } = params;
		urlParams.set(QueryParams.startTime, (minTime / 1000000).toString());
		urlParams.set(QueryParams.endTime, (maxTime / 1000000).toString());

		history.push(
			`${
				ROUTES.TRACE
			}?${urlParams.toString()}&selected={"serviceName":["${servicename}"],"operation":["${operation}"]}&filterToFetchData=["duration","status","serviceName","operation"]&spanAggregateCurrentPage=1&selectedTags=${selectedTraceTags}&&isFilterExclude={"serviceName":false,"operation":false}&userSelectedFilter={"status":["error","ok"],"serviceName":["${servicename}"],"operation":["${operation}"]}&spanAggregateCurrentPage=1`,
		);
	};

	const columns: ColumnsType<TopOperationList> = [
		{
			title: 'Name',
			dataIndex: 'name',
			key: 'name',
			width: 100,
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
			width: 50,
			sorter: (a: TopOperationList, b: TopOperationList): number => a.p50 - b.p50,
			render: (value: number): string => (value || 0 / 1000000).toFixed(2),
		},
		{
			title: 'P95  (in ms)',
			dataIndex: 'p95',
			key: 'p95',
			width: 50,
			sorter: (a: TopOperationList, b: TopOperationList): number => a.p95 - b.p95,
			render: (value: number): string => (value || 0 / 1000000).toFixed(2),
		},
		{
			title: 'P99  (in ms)',
			dataIndex: 'p99',
			key: 'p99',
			width: 50,
			sorter: (a: TopOperationList, b: TopOperationList): number => a.p99 - b.p99,
			render: (value: number): string => (value || 0 / 1000000).toFixed(2),
		},
		{
			title: 'Number of Calls',
			dataIndex: 'numCalls',
			key: 'numCalls',
			width: 50,
			sorter: (a: TopOperationList, b: TopOperationList): number =>
				a.numCalls - b.numCalls,
		},
		{
			title: 'Error Rate',
			dataIndex: 'errorCount',
			key: 'errorCount',
			width: 50,
			sorter: (a: TopOperationList, b: TopOperationList): number =>
				a.errorCount - b.errorCount,
			render: (value: number, record: TopOperationList): string =>
				`${((value || 0 / record.numCalls) * 100).toFixed(2)} %`,
		},
	];

	return (
		<ResizeTable
			columns={columns}
			showHeader
			title={(): string => 'Key Operations'}
			tableLayout="fixed"
			dataSource={data}
			rowKey="name"
		/>
	);
}

export interface TopOperationList {
	p50: number;
	p95: number;
	p99: number;
	numCalls: number;
	name: string;
	errorCount: number;
}

interface TopOperationsTableProps {
	data: TopOperationList[];
}

export default TopOperationsTable;

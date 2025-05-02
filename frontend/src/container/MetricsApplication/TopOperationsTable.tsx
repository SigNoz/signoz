import './TopOperationsTable.styles.scss';

import { SearchOutlined } from '@ant-design/icons';
import { InputRef, Tooltip, Typography } from 'antd';
import { ColumnsType, ColumnType } from 'antd/lib/table';
import { ResizeTable } from 'components/ResizeTable';
import Download from 'container/Download/Download';
import { filterDropdown } from 'container/ServiceApplication/Filter/FilterDropdown';
import useResourceAttribute from 'hooks/useResourceAttribute';
import { convertRawQueriesToTraceSelectedTags } from 'hooks/useResourceAttribute/utils';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { useRef } from 'react';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { Query, TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import { GlobalReducer } from 'types/reducer/globalTime';
import { v4 as uuid } from 'uuid';

import { IServiceName } from './Tabs/types';
import { useGetAPMToTracesQueries } from './Tabs/util';
import {
	convertedTracesToDownloadData,
	getErrorRate,
	navigateToTrace,
} from './utils';

function TopOperationsTable({
	data,
	isLoading,
}: TopOperationsTableProps): JSX.Element {
	const searchInput = useRef<InputRef>(null);
	const { servicename: encodedServiceName } = useParams<IServiceName>();
	const { safeNavigate } = useSafeNavigate();
	const servicename = decodeURIComponent(encodedServiceName);
	const { minTime, maxTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);
	const { queries } = useResourceAttribute();

	const selectedTraceTags: string = JSON.stringify(
		convertRawQueriesToTraceSelectedTags(queries) || [],
	);

	const apmToTraceQuery = useGetAPMToTracesQueries({ servicename });

	const params = useParams<{ servicename: string }>();

	const handleOnClick = (operation: string): void => {
		const { servicename: encodedServiceName } = params;
		const servicename = decodeURIComponent(encodedServiceName);

		const opFilters: TagFilterItem[] = [
			{
				id: uuid().slice(0, 8),
				key: {
					key: 'name',
					dataType: DataTypes.String,
					type: 'tag',
					isColumn: true,
					isJSON: false,
					id: 'name--string--tag--true',
				},
				op: 'in',
				value: [operation],
			},
		];

		const preparedQuery: Query = {
			...apmToTraceQuery,
			builder: {
				...apmToTraceQuery.builder,
				queryData: apmToTraceQuery.builder.queryData?.map((item) => ({
					...item,
					filters: {
						...item.filters,
						items: [...item.filters.items, ...opFilters],
					},
				})),
			},
		};

		navigateToTrace({
			servicename,
			operation,
			minTime,
			maxTime,
			selectedTraceTags,
			apmToTraceQuery: preparedQuery,
			safeNavigate,
		});
	};

	const getSearchOption = (): ColumnType<TopOperationList> => ({
		filterDropdown,
		filterIcon: <SearchOutlined />,
		onFilter: (value, record): boolean =>
			record.name
				.toString()
				.toLowerCase()
				.includes((value as string).toLowerCase()),
		onFilterDropdownOpenChange: (visible): void => {
			if (visible) {
				setTimeout(() => searchInput.current?.select(), 100);
			}
		},
		render: (text: string): JSX.Element => (
			<Tooltip placement="topLeft" title={text}>
				<Typography.Link onClick={(): void => handleOnClick(text)}>
					{text}
				</Typography.Link>
			</Tooltip>
		),
	});

	const columns: ColumnsType<TopOperationList> = [
		{
			title: 'Name',
			dataIndex: 'name',
			key: 'name',
			width: 100,
			...getSearchOption(),
		},
		{
			title: 'P50  (in ms)',
			dataIndex: 'p50',
			key: 'p50',
			width: 50,
			sorter: (a: TopOperationList, b: TopOperationList): number => a.p50 - b.p50,
			render: (value: number): string => (value / 1_000_000).toFixed(2),
		},
		{
			title: 'P95  (in ms)',
			dataIndex: 'p95',
			key: 'p95',
			width: 50,
			sorter: (a: TopOperationList, b: TopOperationList): number => a.p95 - b.p95,
			render: (value: number): string => (value / 1_000_000).toFixed(2),
		},
		{
			title: 'P99  (in ms)',
			dataIndex: 'p99',
			key: 'p99',
			width: 50,
			sorter: (a: TopOperationList, b: TopOperationList): number => a.p99 - b.p99,
			render: (value: number): string => (value / 1_000_000).toFixed(2),
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
			sorter: (first: TopOperationList, second: TopOperationList): number =>
				getErrorRate(first) - getErrorRate(second),
			render: (_, record: TopOperationList): string =>
				`${getErrorRate(record).toFixed(2)} %`,
		},
	];

	const downloadableData = convertedTracesToDownloadData(data);

	const paginationConfig = {
		pageSize: 10,
		showSizeChanger: false,
		hideOnSinglePage: true,
	};

	return (
		<div className="top-operation">
			<div className="top-operation--download">
				<Download
					data={downloadableData}
					isLoading={isLoading}
					fileName={`top-operations-${servicename}`}
				/>
			</div>
			<ResizeTable
				columns={columns}
				loading={isLoading}
				showHeader
				title={(): string => 'Key Operations'}
				tableLayout="fixed"
				dataSource={data}
				rowKey="name"
				pagination={paginationConfig}
			/>
		</div>
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
	isLoading: boolean;
}

export default TopOperationsTable;

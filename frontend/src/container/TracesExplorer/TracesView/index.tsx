import { ColumnsType } from 'antd/es/table';
import { ResizeTable } from 'components/ResizeTable';
import { Pagination, URL_PAGINATION } from 'hooks/queryPagination';
import useUrlQueryData from 'hooks/useUrlQueryData';
import { useMemo } from 'react';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { QueryDataV3 } from 'types/api/widgets/getQuery';

import TraceExplorerControls from '../Controls';
import { useGetTracesExplorerQueryRange } from '../useGetTracesExplorerQueryRange';
import { Container } from './styles';

function TracesView({ query }: TracesViewProps): JSX.Element {
	//! add the data validation checker
	const { queryData: paginationQueryData } = useUrlQueryData<Pagination>(
		URL_PAGINATION,
	);

	const paginatedQuery: Query = useMemo(
		() => ({
			...query,
			builder: {
				...query.builder,
				queryData: query.builder.queryData.map((builderQuery) => ({
					...builderQuery,
					limit: paginationQueryData?.limit || 25,
					offset: paginationQueryData?.offset || 0,
				})),
			},
		}),
		[query, paginationQueryData],
	);

	const { isLoading, data } = useGetTracesExplorerQueryRange(
		paginatedQuery,
		'traces',
	);

	//! remove any types
	/* eslint-disable @typescript-eslint/no-explicit-any */
	const transformedData = useMemo(
		() =>
			data?.payload?.data?.result?.reduce((acc: any, cur: QueryDataV3) => {
				const items = cur.list.map((listItem: any) => ({ ...listItem.data }));
				return [...acc, ...items];
			}, []) || [],
		[data],
	);

	//! move titles to translation files
	const columns: ColumnsType<any> = [
		{
			title: 'Root Service Name',
			dataIndex: 'subQuery.name',
			key: 'serviceName',
		},
		{
			title: 'Root Operation Name',
			dataIndex: 'subQuery.serviceName',
			key: 'operationName',
		},
		{
			title: 'Root Duration (in ms)',
			dataIndex: 'subQuery.durationNano',
			key: 'rootDuration',
		},
		{
			title: 'No of Spans',
			dataIndex: 'span_count',
			key: 'noSpans',
		},
		{
			title: 'TraceID',
			dataIndex: 'traceID',
			key: 'traceId',
		},
	];

	return (
		<Container>
			<TraceExplorerControls
				isLoading={isLoading}
				totalCount={transformedData?.length}
			/>
			<ResizeTable
				columns={columns}
				dataSource={transformedData}
				rowKey="id"
				pagination={false}
			/>
		</Container>
	);
}

interface TracesViewProps {
	query: Query;
}

export default TracesView;

import './SpanList.styles.scss';

import { ENTITY_VERSION_V5 } from 'constants/app';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';
import { useCallback, useMemo } from 'react';
import { Span } from 'types/api/trace/getTraceV2';
import { DataSource } from 'types/common/queryBuilder';

import SpanTable from './SpanTable';
import { SpanDataRow } from './types';
import { transformEntrySpansToHierarchy } from './utils';

interface SpanListProps {
	traceId?: string;
	setSelectedSpan?: (span: Span) => void;
}

function SpanList({ traceId, setSelectedSpan }: SpanListProps): JSX.Element {
	const urlQuery = useUrlQuery();
	const { safeNavigate } = useSafeNavigate();
	const payload = initialQueriesMap.traces;

	// Entry spans pagination
	const entryPage = parseInt(urlQuery.get('entryPage') || '1', 10);
	const entryPageSize = 5;

	const { data, isLoading, isFetching } = useGetQueryRange(
		{
			graphType: PANEL_TYPES.LIST,
			selectedTime: 'GLOBAL_TIME',
			query: {
				...payload,
				builder: {
					...payload.builder,
					queryData: [
						{
							...payload.builder.queryData[0],
							...{
								queryName: 'A',
								dataSource: DataSource.TRACES,
								stepInterval: null,
								disabled: false,
								filter: {
									expression: `trace_id = '${traceId}' isEntryPoint = 'true'`,
								},
								aggregateOperator: 'count',
								timeAggregation: 'rate',
								spaceAggregation: 'sum',
								aggregations: [
									{
										expression: 'count() ',
									},
								],
								expression: 'A',
								orderBy: [
									{
										columnName: 'timestamp',
										order: 'desc',
									},
								],
								having: {
									expression: '',
								},

								reduceTo: 'avg',
							},
						},
					],
				},
			},
			tableParams: {
				pagination: {
					limit: entryPageSize,
					offset: (entryPage - 1) * entryPageSize,
				},
				selectColumns: [
					{
						name: 'service.name',
						fieldDataType: 'string',
						signal: 'traces',
						fieldContext: 'resource',
					},
					{
						name: 'name',
						fieldDataType: 'string',
						signal: 'traces',
					},
					{
						name: 'duration_nano',
						fieldDataType: '',
						signal: 'traces',
						fieldContext: 'span',
					},
					{
						name: 'http_method',
						fieldDataType: '',
						signal: 'traces',
						fieldContext: 'span',
					},
					{
						name: 'response_status_code',
						fieldDataType: '',
						signal: 'traces',
						fieldContext: 'span',
					},
				],
			},
		},
		// version,
		ENTITY_VERSION_V5,
	);

	const handleEntryPageChange = useCallback(
		(newPage: number) => {
			const params = new URLSearchParams(window.location.search);
			params.set('entryPage', newPage.toString());
			safeNavigate({ search: params.toString() });
		},
		[safeNavigate],
	);

	const hierarchicalData = useMemo(
		() =>
			// TODO(shaheer): properly fix the type
			transformEntrySpansToHierarchy(
				(data?.payload.data.newResult.data.result[0].list as unknown) as
					| SpanDataRow[]
					| undefined,
			),
		[data?.payload.data.newResult.data.result],
	);
	console.log(data);

	return (
		<div className="span-list">
			<div className="span-list__content">
				<SpanTable
					data={hierarchicalData}
					isLoading={isLoading || isFetching}
					traceId={traceId}
					setSelectedSpan={setSelectedSpan}
					entryPagination={{
						currentPage: entryPage,
						totalCount: entryPageSize,
						pageSize: entryPageSize,
						onPageChange: handleEntryPageChange,
						isLoading: isLoading || isFetching,
					}}
				/>
			</div>
		</div>
	);
}

SpanList.defaultProps = {
	traceId: undefined,
	setSelectedSpan: (): void => {},
};

export default SpanList;

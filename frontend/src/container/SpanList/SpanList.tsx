import './SpanList.styles.scss';

import { ENTITY_VERSION_V5 } from 'constants/app';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { useMemo } from 'react';
import { Span } from 'types/api/trace/getTraceV2';

import SearchFilters from './SearchFilters';
import SpanTable from './SpanTable';
import { SpanDataRow } from './types';
import { transformEntrySpansToHierarchy } from './utils';

interface SpanListProps {
	traceId?: string;
	setSelectedSpan?: (span: Span) => void;
}

function SpanList({ traceId, setSelectedSpan }: SpanListProps): JSX.Element {
	const payload = initialQueriesMap.traces;

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
								name: 'A',
								signal: 'traces',
								stepInterval: null,
								disabled: false,
								filter: {
									expression: `trace_id = '${traceId}' isEntryPoint = 'true'`,
								},
								limit: 10,
								offset: 0,
								order: [
									{
										key: {
											name: 'timestamp',
										},
										direction: 'desc',
									},
								],
								having: {
									expression: '',
								},
								selectFields: [
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
					],
				},
			},
		},
		// version,
		ENTITY_VERSION_V5,
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

	return (
		<div className="span-list">
			<div className="span-list__header">
				<SearchFilters />
			</div>
			<div className="span-list__content">
				<SpanTable
					data={hierarchicalData}
					isLoading={isLoading || isFetching}
					traceId={traceId}
					setSelectedSpan={setSelectedSpan}
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

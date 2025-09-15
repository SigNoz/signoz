import { ENTITY_VERSION_V5 } from 'constants/app';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { GetMetricQueryRange } from 'lib/dashboard/getQueryResults';
import { uniqBy } from 'lodash-es';

import { HierarchicalSpanData, ServiceEntrySpan, SpanDataRow } from './types';

export function transformEntrySpansToHierarchy(
	entrySpans?: SpanDataRow[],
): HierarchicalSpanData {
	let totalTraceTime = 0;

	if (!entrySpans) {
		return { entrySpans: [], totalTraceTime: 0 };
	}

	const uniqueEntrySpans = uniqBy(entrySpans, 'data.span_id');

	// Calculate total trace time from all entry spans
	uniqueEntrySpans.forEach((span) => {
		totalTraceTime += span.data.duration_nano;
	});

	// Transform entry spans to ServiceEntrySpan structure
	const entrySpansList: ServiceEntrySpan[] = uniqueEntrySpans.map((span) => ({
		spanData: span,
		serviceName: span.data['service.name'],
		isExpanded: false,
		serviceSpans: undefined,
		isLoadingServiceSpans: false,
	}));

	return {
		entrySpans: entrySpansList,
		totalTraceTime,
	};
}

export async function fetchServiceSpans(
	traceId: string,
	serviceName: string,
	pageSize = 10,
	offset = 0,
): Promise<SpanDataRow[]> {
	// Use the same payload structure as in SpanList component but with service-specific filter
	const payload = initialQueriesMap.traces;

	try {
		const response = await GetMetricQueryRange(
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
										expression: `trace_id = '${traceId}' and service.name = '${serviceName}'`,
									},
									limit: pageSize,
									offset,
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
			ENTITY_VERSION_V5,
		);

		// Extract spans from the API response using the same path as SpanList component
		const spans =
			response?.payload?.data?.newResult?.data?.result?.[0]?.list || [];

		// Transform the API response to SpanDataRow format if needed
		// The API should return the correct format for traces, but we'll handle any potential transformation
		return (spans as unknown) as SpanDataRow[];
	} catch (error) {
		console.error('Failed to fetch service spans:', error);
		return [];
	}
}

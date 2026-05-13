import { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import { Skeleton } from 'antd';
import useGetTraceFlamegraph from 'hooks/trace/useGetTraceFlamegraph';
import useUrlQuery from 'hooks/useUrlQuery';
import { TraceDetailFlamegraphURLProps } from 'types/api/trace/getTraceFlamegraph';
import { SpanV3 } from 'types/api/trace/getTraceV3';

import { COLOR_BY_FIELDS } from '../constants';
import { useTraceStore } from '../stores/traceStore';
import Error from '../TraceWaterfall/TraceWaterfallStates/Error/Error';
import {
	mergeTelemetryFieldKeys,
	toTelemetryFieldKey,
} from '../utils/previewFields';
import { FLAMEGRAPH_SPAN_LIMIT } from './constants';
import FlamegraphCanvas from './FlamegraphCanvas';
import { useVisualLayoutWorker } from './hooks/useVisualLayoutWorker';

interface TraceFlamegraphProps {
	filteredSpanIds: string[];
	isFilterActive: boolean;
	selectedSpan: SpanV3 | undefined;
	totalSpansCount: number;
}

function TraceFlamegraph({
	filteredSpanIds,
	isFilterActive,
	selectedSpan,
	totalSpansCount,
}: TraceFlamegraphProps): JSX.Element {
	const { id: traceId } = useParams<TraceDetailFlamegraphURLProps>();
	const urlQuery = useUrlQuery();
	const history = useHistory();
	const { search } = useLocation();
	const [firstSpanAtFetchLevel, setFirstSpanAtFetchLevel] = useState<string>(
		urlQuery.get('spanId') || '',
	);

	useEffect(() => {
		setFirstSpanAtFetchLevel(urlQuery.get('spanId') || '');
	}, [urlQuery]);

	const handleSpanClick = useCallback(
		(spanId: string): void => {
			setFirstSpanAtFetchLevel(spanId);
			const searchParams = new URLSearchParams(search);
			//tood: use from query params constants
			if (searchParams.get('spanId') !== spanId) {
				searchParams.set('spanId', spanId);
				history.replace({ search: searchParams.toString() });
			}
		},
		[history, search],
	);

	const previewFields = useTraceStore((s) => s.previewFields);

	// Color-by fields baseline + user-picked preview fields. De-duped by `name`,
	// color-by entries first so their canonical metadata wins on collision.
	const flamegraphSelectFields = useMemo(
		() =>
			mergeTelemetryFieldKeys(
				COLOR_BY_FIELDS,
				previewFields.map(toTelemetryFieldKey),
			),
		[previewFields],
	);

	// Only pass selectedSpanId in sampled mode — for full traces, the span is
	// already in the loaded flamegraph data and no refetch is needed.
	const isSampled = totalSpansCount > FLAMEGRAPH_SPAN_LIMIT;
	const selectedSpanIdForFetch = isSampled ? selectedSpan?.span_id : undefined;

	const {
		data,
		isFetching,
		error: fetchError,
	} = useGetTraceFlamegraph({
		traceId,
		selectedSpanId: selectedSpanIdForFetch,
		limit: FLAMEGRAPH_SPAN_LIMIT,
		selectFields: flamegraphSelectFields,
	});

	const spans = useMemo(
		() => data?.payload?.spans || [],
		[data?.payload?.spans],
	);

	const {
		layout,
		isComputing,
		error: workerError,
	} = useVisualLayoutWorker(spans);

	const content = useMemo(() => {
		// Loading: fetching data or worker computing layout
		if (isFetching || isComputing) {
			if (layout.totalVisualRows > 0) {
				return (
					<FlamegraphCanvas
						layout={layout}
						firstSpanAtFetchLevel={firstSpanAtFetchLevel}
						setFirstSpanAtFetchLevel={setFirstSpanAtFetchLevel}
						onSpanClick={handleSpanClick}
						traceMetadata={{
							startTime: data?.payload?.startTimestampMillis || 0,
							endTime: data?.payload?.endTimestampMillis || 0,
						}}
						filteredSpanIds={filteredSpanIds}
						isFilterActive={isFilterActive}
					/>
				);
			}
			return (
				<div style={{ width: '100%', height: '100%', padding: '8px 12px' }}>
					<Skeleton
						active
						paragraph={{
							rows: 8,
							width: ['100%', '95%', '85%', '70%', '50%', '35%', '20%', '10%'],
						}}
						title={false}
					/>
				</div>
			);
		}
		// Error: network or worker failure
		if (fetchError || workerError) {
			return <Error error={(fetchError || workerError) as any} />;
		}
		if (data?.payload?.spans && data.payload.spans.length === 0) {
			return <div>No data found for trace {traceId}</div>;
		}
		return (
			<FlamegraphCanvas
				layout={layout}
				firstSpanAtFetchLevel={firstSpanAtFetchLevel}
				setFirstSpanAtFetchLevel={setFirstSpanAtFetchLevel}
				onSpanClick={handleSpanClick}
				traceMetadata={{
					startTime: data?.payload?.startTimestampMillis || 0,
					endTime: data?.payload?.endTimestampMillis || 0,
				}}
				filteredSpanIds={filteredSpanIds}
				isFilterActive={isFilterActive}
			/>
		);
	}, [
		data?.payload?.endTimestampMillis,
		data?.payload?.startTimestampMillis,
		data?.payload?.spans,
		fetchError,
		filteredSpanIds,
		firstSpanAtFetchLevel,
		handleSpanClick,
		isComputing,
		isFilterActive,
		isFetching,
		layout,
		traceId,
		workerError,
	]);

	return <>{content}</>;
}

export default TraceFlamegraph;

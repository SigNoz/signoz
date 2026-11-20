import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { useAppParams } from 'lib/router/useAppParams';
import { Skeleton } from 'antd';
import useGetTraceFlamegraphV3 from 'hooks/trace/useGetTraceFlamegraphV3';
import { SpanV3 } from 'types/api/trace/getTraceV3';

import { COLOR_BY_FIELDS } from '../constants';
import { useSelectedSpanId } from '../hooks/useSelectedSpanId';
import { useTraceStore } from '../stores/traceStore';
import Error from '../TraceWaterfall/TraceWaterfallStates/Error/Error';
import { mergeTelemetryFieldKeys } from '../utils/previewFields';
import { FLAMEGRAPH_SPAN_LIMIT } from './constants';
import FlamegraphCanvas from './FlamegraphCanvas';
import { useVisualLayoutWorker } from './hooks/useVisualLayoutWorker';

interface TraceFlamegraphProps {
	filteredSpanIds: string[];
	isFilterActive: boolean;
	selectedSpan: SpanV3 | undefined;
	totalSpansCount: number;
	/** Defaults to the trace in the route. */
	traceId?: string;
	/** Replaces the loading skeleton. */
	loadingFallback?: ReactNode;
}

function TraceFlamegraph({
	filteredSpanIds,
	isFilterActive,
	selectedSpan,
	totalSpansCount,
	traceId: traceIdProp,
	loadingFallback,
}: TraceFlamegraphProps): JSX.Element {
	const { id: routeTraceId } = useAppParams<'id'>();
	const traceId = traceIdProp ?? routeTraceId;
	const [selectedSpanId, setSelectedSpanId] = useSelectedSpanId();
	const [firstSpanAtFetchLevel, setFirstSpanAtFetchLevel] = useState<string>(
		selectedSpanId || '',
	);

	useEffect(() => {
		setFirstSpanAtFetchLevel(selectedSpanId || '');
	}, [selectedSpanId]);

	const handleSpanClick = useCallback(
		(spanId: string): void => {
			setFirstSpanAtFetchLevel(spanId);
			if (selectedSpanId !== spanId) {
				setSelectedSpanId(spanId);
			}
		},
		[selectedSpanId, setSelectedSpanId],
	);

	const previewFields = useTraceStore((s) => s.previewFields);
	// Gate the fetch until prefs load, else selectFields (in the query key)
	// repopulates and triggers a second fetch.
	const userPrefsReady = useTraceStore((s) => s.userPreferences !== null);

	// Color-by fields baseline + user-picked preview fields. De-duped by `name`,
	// color-by entries first so their canonical metadata wins on collision.
	const flamegraphSelectFields = useMemo(
		() => mergeTelemetryFieldKeys(COLOR_BY_FIELDS, previewFields),
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
	} = useGetTraceFlamegraphV3({
		traceId: traceId || '',
		selectedSpanId: selectedSpanIdForFetch,
		selectFields: flamegraphSelectFields,
		enabled: !!traceId && userPrefsReady,
	});

	const spans = useMemo(() => data?.spans || [], [data?.spans]);

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
							startTime: data?.startTimestampMillis || 0,
							endTime: data?.endTimestampMillis || 0,
						}}
						filteredSpanIds={filteredSpanIds}
						isFilterActive={isFilterActive}
					/>
				);
			}
			if (loadingFallback) {
				return loadingFallback;
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
		if (data?.spans && data.spans.length === 0) {
			return <div>No data found for trace {traceId}</div>;
		}
		return (
			<FlamegraphCanvas
				layout={layout}
				firstSpanAtFetchLevel={firstSpanAtFetchLevel}
				setFirstSpanAtFetchLevel={setFirstSpanAtFetchLevel}
				onSpanClick={handleSpanClick}
				traceMetadata={{
					startTime: data?.startTimestampMillis || 0,
					endTime: data?.endTimestampMillis || 0,
				}}
				filteredSpanIds={filteredSpanIds}
				isFilterActive={isFilterActive}
			/>
		);
	}, [
		data?.endTimestampMillis,
		data?.startTimestampMillis,
		data?.spans,
		fetchError,
		filteredSpanIds,
		firstSpanAtFetchLevel,
		handleSpanClick,
		isComputing,
		isFilterActive,
		isFetching,
		layout,
		loadingFallback,
		traceId,
		workerError,
	]);

	return <>{content}</>;
}

export default TraceFlamegraph;

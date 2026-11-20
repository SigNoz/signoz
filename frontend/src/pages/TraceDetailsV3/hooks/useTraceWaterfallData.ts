import {
	Dispatch,
	SetStateAction,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { useQueryClient } from 'react-query';
import useGetTraceV4 from 'hooks/trace/useGetTraceV4';
import { SpanV3 } from 'types/api/trace/getTraceV3';

import { setTraceStoreAvailableColorByFields } from '../stores/traceStore';
import { useSelectedSpanId } from './useSelectedSpanId';
import { IInterestedSpan } from '../TraceWaterfall/types';
import { getAncestorSpanIds } from '../TraceWaterfall/utils';
import { getAvailableColorByFieldNames } from '../utils';
import {
	getCachedFullWaterfallParams,
	WaterfallQueryParams,
} from './getCachedFullWaterfallParams';

type TraceV4Result = ReturnType<typeof useGetTraceV4>;

export interface UseTraceWaterfallDataResult {
	traceData: TraceV4Result['data'];
	isFetchingTraceData: boolean;
	errorFetchingTraceData: unknown;
	allSpans: SpanV3[];
	totalSpansCount: number;
	isFullDataLoaded: boolean;
	interestedSpanId: IInterestedSpan;
	setInterestedSpanId: Dispatch<SetStateAction<IInterestedSpan>>;
	uncollapsedNodes: string[];
	localUncollapsedNodes: Set<string>;
	setLocalUncollapsedNodes: Dispatch<SetStateAction<Set<string>>>;
	selectedSpan: SpanV3 | undefined;
	setSelectedSpan: Dispatch<SetStateAction<SpanV3 | undefined>>;
	selectedSpanId: string | undefined;
}

type UseTraceWaterfallDataOptions = {
	/** False skips the request; cached data for the trace is still returned. */
	enabled?: boolean;
};

/** Waterfall data and collapse state for `traceId`; the selected span is the `spanId` URL param. */
export function useTraceWaterfallData(
	traceId: string,
	{ enabled = true }: UseTraceWaterfallDataOptions = {},
): UseTraceWaterfallDataResult {
	const [urlSpanId] = useSelectedSpanId();
	const [interestedSpanId, setInterestedSpanId] = useState<IInterestedSpan>(
		() => ({
			spanId: urlSpanId || '',
			isUncollapsed: urlSpanId !== '',
		}),
	);
	const [uncollapsedNodes, setUncollapsedNodes] = useState<string[]>([]);
	const [localUncollapsedNodes, setLocalUncollapsedNodes] = useState<
		Set<string>
	>(new Set());
	const [selectedSpan, setSelectedSpan] = useState<SpanV3>();

	const selectedSpanId = urlSpanId || undefined;

	const allSpansRef = useRef<SpanV3[]>([]);
	const deepLinkResolvedRef = useRef(false);

	// Once all spans are loaded (frontend mode), freeze query params so
	// subsequent interestedSpanId changes don't trigger unnecessary refetches.
	const fullDataLoadedRef = useRef(false);
	const frozenParamsRef = useRef<WaterfallQueryParams>({
		selectedSpanId: interestedSpanId.spanId,
		isSelectedSpanIDUnCollapsed: interestedSpanId.isUncollapsed,
		uncollapsedSpans: uncollapsedNodes,
	});

	// A trace already cached in full is reused whichever span it is opened on.
	const queryClient = useQueryClient();
	const reuseCachedFullData = (id: string): void => {
		const cachedParams = getCachedFullWaterfallParams(queryClient, id);
		fullDataLoadedRef.current = !!cachedParams;
		if (cachedParams) {
			frozenParamsRef.current = cachedParams;
		}
	};
	const isCacheCheckedRef = useRef(false);
	if (!isCacheCheckedRef.current) {
		isCacheCheckedRef.current = true;
		reuseCachedFullData(traceId);
	}

	// A host that stays mounted across traces starts each trace from scratch.
	const traceIdRef = useRef(traceId);
	if (traceIdRef.current !== traceId) {
		traceIdRef.current = traceId;
		allSpansRef.current = [];
		deepLinkResolvedRef.current = false;
		reuseCachedFullData(traceId);
		const spanId = urlSpanId || '';
		setInterestedSpanId({ spanId, isUncollapsed: spanId !== '' });
		setUncollapsedNodes([]);
		setLocalUncollapsedNodes(new Set());
		setSelectedSpan(undefined);
	}

	// Refetch only when the URL target isn't already loaded. Keeps row clicks
	// and other in-window URL navigation from triggering a backend window slide.
	useEffect(() => {
		if (!urlSpanId) {
			return;
		}
		const idx = allSpansRef.current.findIndex((s) => s.span_id === urlSpanId);
		if (idx !== -1) {
			setSelectedSpan(allSpansRef.current[idx]);
			return;
		}
		setInterestedSpanId({ spanId: urlSpanId, isUncollapsed: true });
	}, [urlSpanId]);

	const queryParams = fullDataLoadedRef.current
		? frozenParamsRef.current
		: {
				selectedSpanId: interestedSpanId.spanId,
				isSelectedSpanIDUnCollapsed: interestedSpanId.isUncollapsed,
				uncollapsedSpans: uncollapsedNodes,
			};

	const {
		data,
		isPreviousData,
		isFetching: isFetchingTraceData,
		error: errorFetchingTraceData,
	} = useGetTraceV4(
		{
			traceId,
			uncollapsedSpans: queryParams.uncollapsedSpans,
			selectedSpanId: queryParams.selectedSpanId,
			isSelectedSpanIDUnCollapsed: queryParams.isSelectedSpanIDUnCollapsed,
		},
		{ enabled },
	);

	// keepPreviousData would otherwise show the last trace while the next loads.
	const dataTraceIdRef = useRef<string>();
	if (data && !isPreviousData) {
		dataTraceIdRef.current = traceId;
	}
	const traceData = dataTraceIdRef.current === traceId ? data : undefined;

	const allSpans = useMemo(
		() => traceData?.payload?.spans || [],
		[traceData?.payload?.spans],
	);
	const totalSpansCount = traceData?.payload?.totalSpansCount || 0;

	const isFullDataLoaded =
		totalSpansCount > 0 && totalSpansCount <= allSpans.length;

	// Color-by options, gated on fields in loaded spans. Resource attrs are
	// trace-wide, so any window has the full set — no need to accumulate.
	const availableColorByFields = useMemo(
		() => (allSpans.length ? getAvailableColorByFieldNames(allSpans) : undefined),
		[allSpans],
	);

	useEffect(() => {
		setTraceStoreAvailableColorByFields(availableColorByFields);
	}, [availableColorByFields]);

	// Lock the ref once we confirm all data is loaded
	if (isFullDataLoaded && !fullDataLoadedRef.current) {
		fullDataLoadedRef.current = true;
		frozenParamsRef.current = {
			selectedSpanId: interestedSpanId.spanId,
			isSelectedSpanIDUnCollapsed: interestedSpanId.isUncollapsed,
			uncollapsedSpans: uncollapsedNodes,
		};
	}

	useEffect(() => {
		allSpansRef.current = allSpans;
	}, [allSpans]);

	// Frontend mode: expand all parents by default when full data arrives
	useEffect(() => {
		if (isFullDataLoaded && allSpans.length > 0) {
			const parentIds = new Set(
				allSpans.filter((s) => s.has_children).map((s) => s.span_id),
			);
			setLocalUncollapsedNodes(parentIds);
		}
	}, [isFullDataLoaded, allSpans]);

	// Backend mode: sync uncollapsed state from API response
	useEffect(() => {
		if (
			!isFullDataLoaded &&
			traceData &&
			traceData.payload &&
			traceData.payload.uncollapsedSpans
		) {
			setUncollapsedNodes(traceData.payload.uncollapsedSpans);
		}
	}, [traceData, isFullDataLoaded]);

	// Tracks whether we've already done the initial URL→selectedSpan handoff
	//Lets `interestedSpanId` stay purely as the refetch trigger in frontend mode.
	useEffect(() => {
		if (deepLinkResolvedRef.current) {
			return;
		}
		if (allSpans.length === 0) {
			return;
		}
		if (selectedSpanId) {
			const span = allSpans.find((s) => s.span_id === selectedSpanId);
			if (!span) {
				// Span not in the current window — wait for more data (backend
				// pagination) before marking resolved.
				return;
			}
			setSelectedSpan(span);
		} else {
			setSelectedSpan((prev) => prev ?? allSpans[0]);
		}
		deepLinkResolvedRef.current = true;
	}, [selectedSpanId, allSpans]);

	// Frontend mode: auto-expand ancestors of the URL-targeted span so it's
	// visible. Keyed on URL `spanId`(selectedSpanId).
	useEffect(() => {
		if (!isFullDataLoaded || !selectedSpanId || allSpans.length === 0) {
			return;
		}
		const ancestors = getAncestorSpanIds(allSpans, selectedSpanId);
		if (ancestors.size === 0) {
			return;
		}
		setLocalUncollapsedNodes((prev) => {
			// Check if all ancestors are already expanded — avoid unnecessary state update
			let allPresent = true;
			for (const id of ancestors) {
				if (!prev.has(id)) {
					allPresent = false;
					break;
				}
			}
			if (allPresent) {
				return prev;
			}

			const next = new Set(prev);
			for (const id of ancestors) {
				next.add(id);
			}
			return next;
		});
	}, [isFullDataLoaded, selectedSpanId, allSpans]);

	return {
		traceData,
		isFetchingTraceData,
		errorFetchingTraceData,
		allSpans,
		totalSpansCount,
		isFullDataLoaded,
		interestedSpanId,
		setInterestedSpanId,
		uncollapsedNodes,
		localUncollapsedNodes,
		setLocalUncollapsedNodes,
		selectedSpan,
		setSelectedSpan,
		selectedSpanId,
	};
}

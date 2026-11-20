import { useCallback, useState } from 'react';
import getLocalStorageKey from 'api/browser/localstorage/get';
import setLocalStorageKey from 'api/browser/localstorage/set';
import { LOCALSTORAGE } from 'constants/localStorage';

export type TraceView = 'waterfall' | 'flamegraph';

export type DrawerTraceLayout = {
	/** The open trace's span count hasn't loaded, so no view is mounted yet. */
	isPending: boolean;
	/** Split layout: false until a span count has loaded since the drawer opened. */
	areTabsShown: boolean;
	/** False above the flame graph limit; only the waterfall is offered. */
	hasFlamegraph: boolean;
	isSplitLayout: boolean;
	toggleLayout: () => void;
	/** Split layout: the one view shown in the pane. */
	splitView: TraceView;
	setSplitView: (view: TraceView) => void;
	/** Stacked layout: which sections are expanded. */
	isWaterfallOpen: boolean;
	toggleWaterfallOpen: () => void;
	isFlamegraphOpen: boolean;
	toggleFlamegraphOpen: () => void;
	/** The waterfall is on screen in the current layout. */
	isWaterfallShown: boolean;
};

type UseDrawerTraceLayoutArgs = {
	traceId: string | null;
	/** Undefined until the open trace's span count has loaded. */
	hasFlamegraph: boolean | undefined;
};

/** POC: the stacked sections vs the split pane, and what each shows. */
export function useDrawerTraceLayout({
	traceId,
	hasFlamegraph,
}: UseDrawerTraceLayoutArgs): DrawerTraceLayout {
	const [isSplitLayout, setIsSplitLayout] = useState(
		() => getLocalStorageKey(LOCALSTORAGE.SPAN_DRAWER_TRACE_LAYOUT) === 'split',
	);
	const [splitView, setSplitView] = useState<TraceView>('flamegraph');
	const [isWaterfallOpen, setIsWaterfallOpen] = useState(true);
	const [isFlamegraphOpen, setIsFlamegraphOpen] = useState(false);

	// Moving to another trace keeps the last trace's tabs until its count loads.
	const [lastHasFlamegraph, setLastHasFlamegraph] = useState(hasFlamegraph);
	const nextLastHasFlamegraph = traceId
		? (hasFlamegraph ?? lastHasFlamegraph)
		: undefined;
	if (nextLastHasFlamegraph !== lastHasFlamegraph) {
		setLastHasFlamegraph(nextLastHasFlamegraph);
	}

	const toggleLayout = useCallback((): void => {
		const next = !isSplitLayout;
		setLocalStorageKey(
			LOCALSTORAGE.SPAN_DRAWER_TRACE_LAYOUT,
			next ? 'split' : 'stacked',
		);
		setIsSplitLayout(next);
	}, [isSplitLayout]);

	const isPending = !!traceId && hasFlamegraph === undefined;
	const shownHasFlamegraph = nextLastHasFlamegraph ?? true;
	const shownSplitView: TraceView = shownHasFlamegraph ? splitView : 'waterfall';
	const isWaterfallShown =
		!isPending &&
		(isSplitLayout ? shownSplitView === 'waterfall' : isWaterfallOpen);

	return {
		isPending,
		areTabsShown: nextLastHasFlamegraph !== undefined,
		hasFlamegraph: shownHasFlamegraph,
		isSplitLayout,
		toggleLayout,
		splitView: shownSplitView,
		setSplitView,
		isWaterfallOpen,
		toggleWaterfallOpen: (): void => setIsWaterfallOpen((open) => !open),
		isFlamegraphOpen: shownHasFlamegraph && isFlamegraphOpen,
		toggleFlamegraphOpen: (): void => setIsFlamegraphOpen((open) => !open),
		isWaterfallShown,
	};
}

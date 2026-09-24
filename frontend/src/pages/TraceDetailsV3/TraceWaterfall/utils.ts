import { SpanV3 } from 'types/api/trace/getTraceV3';

type TraceWaterfallSidebarWidthOptions = {
	indentWidthPerLevel: number;
};

const TREE_ARROW_SLOT_WIDTH = 18;
const TREE_SUBTREE_COUNT_SLOT_WIDTH = 34;
const TREE_ICON_TOTAL_WIDTH = 19;
const TREE_SERVICE_NAME_GAP_WIDTH = 18;
const TREE_ROW_ACTIONS_WIDTH = 64;
const TREE_CONTENT_PADDING_WIDTH = 32;
const TREE_FALLBACK_CHAR_WIDTH = 7.5;

function measureTraceWaterfallTextWidth(text: string): number {
	if (!text) {
		return 0;
	}

	if (typeof document === 'undefined') {
		return text.length * TREE_FALLBACK_CHAR_WIDTH;
	}

	const canvas = document.createElement('canvas');
	const context = canvas.getContext('2d');

	if (!context) {
		return text.length * TREE_FALLBACK_CHAR_WIDTH;
	}

	context.font = '400 13px Inter';

	return context.measureText(text).width;
}

/**
 * Computes the visible spans from a complete span list based on collapse state.
 *
 * Relies on spans being in DFS pre-order (as returned by the backend).
 * When a collapsed span is encountered, all its descendants (level > collapsed span's level)
 * are skipped until we reach a sibling or ancestor (level <= collapsed span's level).
 *
 * The strict `>` comparison means "skip children, not siblings" — a span at the same
 * level as the collapsed span passes through because DFS order guarantees all descendants
 * appear contiguously before the next sibling.
 */
export function getVisibleSpans(
	allSpans: SpanV3[],
	uncollapsedNodes: Set<string>,
): SpanV3[] {
	const visible: SpanV3[] = [];
	let skipBelowLevel = Infinity;

	for (const span of allSpans) {
		if (span.level > skipBelowLevel) {
			continue;
		}
		skipBelowLevel = Infinity;
		visible.push(span);

		if (span.has_children && !uncollapsedNodes.has(span.span_id)) {
			skipBelowLevel = span.level;
		}
	}

	return visible;
}

/**
 * Returns the set of ancestor span IDs for a given span.
 * Walks up the tree via parent_span_id until reaching the root.
 */
export function getAncestorSpanIds(
	allSpans: SpanV3[],
	targetSpanId: string,
): Set<string> {
	const spanMap = new Map<string, SpanV3>();
	for (const span of allSpans) {
		spanMap.set(span.span_id, span);
	}

	const ancestors = new Set<string>();
	let current = spanMap.get(targetSpanId);

	while (current && current.parent_span_id) {
		const parent = spanMap.get(current.parent_span_id);
		if (!parent) {
			break;
		}
		ancestors.add(parent.span_id);
		current = parent;
	}

	return ancestors;
}

export function getTraceWaterfallSidebarContentWidth(
	allSpans: SpanV3[],
	sidebarWidth: number,
	{ indentWidthPerLevel }: TraceWaterfallSidebarWidthOptions,
): number {
	if (allSpans.length === 0) {
		return sidebarWidth;
	}

	const maxSpanWidth = allSpans.reduce((currentMax, span) => {
		const baseWidth =
			span.level * indentWidthPerLevel +
			TREE_ARROW_SLOT_WIDTH +
			TREE_SUBTREE_COUNT_SLOT_WIDTH +
			TREE_ICON_TOTAL_WIDTH +
			TREE_ROW_ACTIONS_WIDTH +
			TREE_CONTENT_PADDING_WIDTH;

		const labelWidth = measureTraceWaterfallTextWidth(span.name);
		const serviceNameWidth = span['service.name']
			? TREE_SERVICE_NAME_GAP_WIDTH +
				measureTraceWaterfallTextWidth(span['service.name'])
			: 0;

		return Math.max(currentMax, Math.ceil(baseWidth + labelWidth + serviceNameWidth));
	}, sidebarWidth);

	return Math.max(sidebarWidth, maxSpanWidth);
}

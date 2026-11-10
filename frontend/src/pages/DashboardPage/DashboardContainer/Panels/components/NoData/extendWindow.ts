import type { ZoomOutResult } from 'lib/zoomOutUtils';

export interface ExtendTimeWindow {
	canExtend: boolean;
	/** Button copy; null when the window can't be widened further. */
	actionLabel: string | null;
	extend: () => void;
}

const EXTEND_ACTION_LABEL = 'Extend time range';

/**
 * Adapts a zoom-out ladder result (`getNextZoomOutRange`) plus its apply callback
 * into the panel empty-state extender. A `null` result means the window is already
 * at the widest ladder step, so there is nothing to extend to.
 */
export function buildExtendWindow(
	result: ZoomOutResult | null,
	extend: () => void,
): ExtendTimeWindow {
	return {
		canExtend: result !== null,
		actionLabel: result ? EXTEND_ACTION_LABEL : null,
		extend,
	};
}

import type { ReactNode } from 'react';

let held = false;

/** Set from the Tooltips control, through `globals/tooltipMocks.ts`. */
export const holdTooltipsOpen = (value: boolean): void => {
	held = value;
};

/**
 * The `open` a tooltip renders with while the control is on.
 *
 * A tooltip the page opens itself keeps its own state: only the page knows what
 * the popup is anchored to, and holding it open renders whatever it carries
 * while closed. An empty title has no popup to show, only the padding of one.
 */
export const heldOpenState = (
	own: boolean | undefined,
	title: ReactNode,
): boolean | undefined => {
	if (own !== undefined || !held) {
		return own;
	}

	return title === undefined || title === null || title === '' ? own : true;
};

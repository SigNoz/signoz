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
 * while closed. An empty title is held open too: it renders no popup unless a
 * nested tooltip (a `Button`'s `disabledTooltip`) stacks into it, and that popup
 * must not switch from uncontrolled to controlled once the title fills in.
 */
export const heldOpenState = (own: boolean | undefined): boolean | undefined =>
	own !== undefined || !held ? own : true;

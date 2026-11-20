let held = false;

/** Set from the Tooltips control, through `globals/tooltipMocks.ts`. */
export const holdTooltipsOpen = (value: boolean): void => {
	held = value;
};

/** Whether the Tooltips control is holding popups open. */
export const areTooltipsHeldOpen = (): boolean => held;

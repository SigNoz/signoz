import { screen } from 'storybook/test';

type FindByText = typeof screen.findByText;
type Text = Parameters<FindByText>[0];
type WaitForOptions = Parameters<FindByText>[2];

// A `danger` toast is announced through a visually hidden `role="alert"` copy of
// its title and description, so a bare text query matches it twice. The toast
// itself is `aria-hidden` until focused, so a role query misses its button.
const TOAST_TEXT = '[data-slot="toast-title"], [data-slot="toast-description"]';
const TOAST_ACTION = '[data-slot="toast-action"]';

/** The visible title or description of a toast. */
export const findToastText = (
	text: Text,
	waitForOptions?: WaitForOptions,
): Promise<HTMLElement> =>
	screen.findByText(text, { selector: TOAST_TEXT }, waitForOptions);

/** `findToastText` without the wait, for use inside `waitFor`. */
export const getToastText = (text: Text): HTMLElement =>
	screen.getByText(text, { selector: TOAST_TEXT });

/** The action button of a toast, by its label. */
export const findToastAction = (
	label: Text,
	waitForOptions?: WaitForOptions,
): Promise<HTMLElement> =>
	screen.findByText(label, { selector: TOAST_ACTION }, waitForOptions);

/** `findToastAction` without the wait, for use inside `waitFor`. */
export const getToastAction = (label: Text): HTMLElement =>
	screen.getByText(label, { selector: TOAST_ACTION });

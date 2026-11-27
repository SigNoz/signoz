import { userEvent } from 'storybook/test';

/**
 * Hovers an element whose tooltip is switched on by the hover that finds it
 * cut off. `userEvent` dispatches the whole hover before React renders, and a
 * production build, which has no `act` to render between its events, leaves the
 * tooltip off for all of it. A second pass finds it on.
 */
export const hoverTruncated = async (element: HTMLElement): Promise<void> => {
	await userEvent.hover(element);
	await userEvent.unhover(element);
	await userEvent.hover(element);
};

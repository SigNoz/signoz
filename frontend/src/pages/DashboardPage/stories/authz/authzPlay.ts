import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

// The permission check resolves after the dashboard document loads.
const PAGE_LOAD = { timeout: 10000 };

/**
 * A denied control stays on screen, disabled. Buttons say so through
 * `disabled` or `aria-disabled` depending on the Button, menu rows through
 * `data-disabled`.
 */
const isDisabled = (element: HTMLElement): boolean =>
	element.hasAttribute('disabled') ||
	element.getAttribute('aria-disabled') === 'true' ||
	element.hasAttribute('data-disabled');

export const expectDisabled = (
	element: HTMLElement,
	disabled = true,
): Promise<void> =>
	waitFor(() => expect(isDisabled(element)).toBe(disabled), PAGE_LOAD);

export const toolbarButton = (
	canvasElement: HTMLElement,
	name: string,
): Promise<HTMLElement> =>
	within(canvasElement).findByRole('button', { name }, PAGE_LOAD);

export const openActionsMenu = async (
	canvasElement: HTMLElement,
): Promise<void> => {
	// The dropdown trigger's Slot merge drops the button's own test id.
	await userEvent.click(await toolbarButton(canvasElement, 'Actions'));
	await screen.findByText('Clone dashboard');
};

// Not by test id: the Actions menu only carries them on some Dropdown versions.
export const menuItem = (name: string): HTMLElement =>
	screen.getByRole('menuitem', { name });

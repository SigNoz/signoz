import { expect, waitFor } from 'storybook/test';

export const LIST = 'list:notification-channel';
export const CREATE = 'create:notification-channel';
export const READ = 'read:notification-channel';
export const UPDATE = 'update:notification-channel';
export const DELETE = 'delete:notification-channel';

export const NOTIFICATION_CHANNEL = [LIST, CREATE, READ, UPDATE, DELETE];

/** The page loads its data and its permission check before anything settles. */
export const PAGE_LOAD = { timeout: 15_000 };

/**
 * A locked control can say so as `disabled`, `aria-disabled` or, on a dropdown
 * row, `data-disabled`. A field inside a disabled fieldset carries none of
 * them: the browser turns it off without touching its attributes.
 */
const isDisabled = (element: HTMLElement): boolean =>
	element.hasAttribute('disabled') ||
	element.getAttribute('aria-disabled') === 'true' ||
	element.hasAttribute('data-disabled') ||
	element.closest('[data-disabled]') !== null ||
	element.closest('fieldset[disabled]') !== null;

export const expectDisabled = (
	element: HTMLElement,
	disabled = true,
): Promise<void> =>
	waitFor(() => expect(isDisabled(element)).toBe(disabled), PAGE_LOAD);

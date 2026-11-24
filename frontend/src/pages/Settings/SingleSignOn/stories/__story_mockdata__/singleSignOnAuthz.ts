/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { expect, waitFor } from 'storybook/test';

export const LIST_AUTH_DOMAIN = 'list:auth-domain';
export const DELETE_AUTH_DOMAIN = 'delete:auth-domain';
export const READ_ORGANIZATION = 'read:organization';
export const UPDATE_ORGANIZATION = 'update:organization';

const isDisabled = (element: HTMLElement): boolean =>
	element.hasAttribute('disabled') ||
	element.getAttribute('aria-disabled') === 'true';

export const expectDenied = (
	element: HTMLElement,
	denied = true,
): Promise<void> =>
	waitFor(() => expect(isDisabled(element)).toBe(denied), {
		timeout: 15_000,
	});

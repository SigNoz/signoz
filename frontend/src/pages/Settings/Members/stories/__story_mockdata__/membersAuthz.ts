/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { expect, screen, waitFor, within } from 'storybook/test';

import { openMember, untilLoaded } from '../Members.stories.mocks';

export const LIST_USER = 'list:user';
export const CREATE_USER = 'create:user';
export const READ_USER = 'read:user';
export const UPDATE_USER = 'update:user';
export const DELETE_USER = 'delete:user';
export const ATTACH_USER = 'attach:user';
export const CREATE_PASSWORD = 'create:factor-password';

const isDisabled = (element: HTMLElement): boolean =>
	element.hasAttribute('disabled') ||
	element.getAttribute('aria-disabled') === 'true';

export const expectDenied = (
	element: HTMLElement,
	denied = true,
): Promise<void> =>
	waitFor(() => expect(isDisabled(element)).toBe(denied), untilLoaded);

export const openMemberDrawer = async (
	canvasElement: HTMLElement,
	name = /jon snow/i,
): Promise<void> => {
	await openMember(canvasElement, name);
	await screen.findByTestId('member-save-btn', undefined, untilLoaded);
};

export const findInCanvas = (
	canvasElement: HTMLElement,
	testId: string,
): Promise<HTMLElement> =>
	within(canvasElement).findByTestId(testId, undefined, untilLoaded);

export const findInDrawer = (testId: string): Promise<HTMLElement> =>
	screen.findByTestId(testId, undefined, untilLoaded);

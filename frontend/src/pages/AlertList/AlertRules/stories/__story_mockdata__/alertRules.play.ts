/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { DEFAULT_RULE_VIEW } from 'container/ListAlertRules/list.config';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import {
	alertRulesMocks,
	runRowAction,
	untilLoaded,
} from '../AlertRules.stories.mocks';

import { expectDisabled } from '../../../stories/channelAuthz';

interface PlayContext {
	canvasElement: HTMLElement;
	args: PageStoryArgs<typeof alertRulesMocks>;
}

// A row's rename and delete only take the pointer while the row is hovered,
// which a play cannot put the real cursor on.
const hoverActions = userEvent.setup({ pointerEventsCheck: 0 });

export const openQuerySuggestions = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	const canvas = within(canvasElement);
	// The labels come with the rule list, so the box is opened once rows are in.
	await canvas.findAllByTestId('alert-actions', undefined, untilLoaded);
	const search = canvas.getByTestId('alert-rules-list-search');
	await userEvent.click(search.querySelector('.cm-content') ?? search);
	await screen.findByText('labels.team');
};

export const openSaveViewPopover = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await userEvent.click(
		await within(canvasElement).findByTestId(
			'alert-rules-view-save-trigger',
			undefined,
			untilLoaded,
		),
	);
	await screen.findByText('Save as view');
};

export const openRenameViewPopover = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await hoverActions.click(
		await within(canvasElement).findByTestId(
			'alert-rules-view-rename-view-1',
			undefined,
			untilLoaded,
		),
	);
	await screen.findByText('Rename view');
};

export const openDeleteViewConfirm = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await hoverActions.click(
		await within(canvasElement).findByTestId(
			'alert-rules-view-delete-view-1',
			undefined,
			untilLoaded,
		),
	);
	await screen.findByText(/shared across your organization/i);
};

export const openRowActions = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	const [actions] = await within(canvasElement).findAllByTestId(
		'alert-actions',
		undefined,
		untilLoaded,
	);

	await userEvent.click(actions);
	await screen.findByText(/clone/i);
};

export const openDisabledRuleActions = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	const [actions] = await within(canvasElement).findAllByTestId(
		'alert-actions',
		undefined,
		untilLoaded,
	);

	await userEvent.click(actions);
	await screen.findByText(/^enable$/i);
};

export const openColumnPicker = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await userEvent.click(
		await within(canvasElement).findByTestId(
			'alert-columns-button',
			undefined,
			untilLoaded,
		),
	);
	await screen.findByText(/toggle columns/i);
};

export const openStatesFilter = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (
		args.rules === 0 &&
		args.view === DEFAULT_RULE_VIEW &&
		args.dataState === 'loaded'
	) {
		return;
	}

	const filter = await within(canvasElement).findByTestId(
		'alert-rules-filter-states',
		undefined,
		untilLoaded,
	);

	await userEvent.click(filter.querySelector('.ant-select-selector') ?? filter);
	const option = (await screen.findAllByText('Firing')).find((node) =>
		node.closest('.ant-select-dropdown'),
	);
	if (screen.queryAllByRole('checkbox', { checked: true }).length === 0) {
		await userEvent.click(option ?? filter);
	}
	await screen.findAllByRole('checkbox', { checked: true });
};

export const toggleAlert = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	await runRowAction(canvasElement, /^(enable|disable)$/i);
	if (args.toggleState === 'success') {
		await expect(
			await screen.findByText(/alert (enabled|disabled)/i),
		).toBeVisible();
	}
};

export const cloneAlert = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	await runRowAction(canvasElement, /^clone$/i);
	if (args.cloneState === 'success') {
		await expect(
			await screen.findByText(/alert cloned successfully/i),
		).toBeVisible();
	}
};

export const deleteAlert = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	await runRowAction(canvasElement, /^delete$/i);
	if (args.deleteState === 'success') {
		await expect(
			await screen.findByText(/alert deleted successfully/i),
		).toBeVisible();
	}
};

export const copyLabel = async (): Promise<void> => {
	const [copy] = await screen.findAllByRole(
		'button',
		{ name: 'Copy to clipboard' },
		untilLoaded,
	);

	await userEvent.click(copy);
	await expect(await screen.findByText(/copied! use in search/i)).toBeVisible();
};

/**
 * A control is also disabled while its permission check is pending, so a denial
 * is only read once the check has answered.
 */
const expectLocked = async (
	element: HTMLElement,
	locked = true,
): Promise<void> => {
	await waitFor(
		() =>
			expect(
				element.getAttribute('aria-busy') !== 'true' &&
					!element.hasAttribute('data-loading'),
			).toBe(true),
		untilLoaded,
	);
	await expectDisabled(element, locked);
};

const expectButtonDenied = async (
	canvasElement: HTMLElement,
	testId: string,
): Promise<void> => {
	const button = await within(canvasElement).findByTestId(
		testId,
		undefined,
		untilLoaded,
	);
	// The button names what it was denied, which a pending check never does.
	await waitFor(
		() => expect(button).toHaveAttribute('data-denied-permissions'),
		untilLoaded,
	);
	await expectLocked(button);
};

const openFirstRowMenu = async (canvasElement: HTMLElement): Promise<void> => {
	const [actions] = await within(canvasElement).findAllByTestId(
		'alert-actions',
		undefined,
		untilLoaded,
	);
	await userEvent.click(actions);
};

const rowItem = (testId: string): Promise<HTMLElement> =>
	screen.findByTestId(testId, undefined, untilLoaded);

export const expectListDenied = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await within(canvasElement).findByText(
		/is not authorized/,
		undefined,
		untilLoaded,
	);
	await expect(
		within(canvasElement).queryAllByTestId('alert-actions'),
	).toHaveLength(0);
};

export const expectNewAlertLocked = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await expectButtonDenied(canvasElement, 'list-alerts-new-alert-button');
};

export const expectEmptyStateCreateLocked = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await expectButtonDenied(canvasElement, 'add-alert');
};

export const expectNewAlertOpen = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await expectLocked(
		await within(canvasElement).findByTestId(
			'list-alerts-new-alert-button',
			undefined,
			untilLoaded,
		),
		false,
	);
};

export const expectUpdateLocked = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await openFirstRowMenu(canvasElement);
	await expectLocked(await rowItem('alert-action-toggle'));
	await expectLocked(await rowItem('alert-action-edit'));
	await expectLocked(await rowItem('alert-action-clone'), false);
	await expectLocked(await rowItem('alert-action-delete'), false);
};

export const expectReadLocked = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await openFirstRowMenu(canvasElement);
	await expectLocked(await rowItem('alert-action-edit'));
	await expectLocked(await rowItem('alert-action-clone'));
	await expectLocked(await rowItem('alert-action-toggle'), false);
};

export const expectCloneLocked = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await openFirstRowMenu(canvasElement);
	await expectLocked(await rowItem('alert-action-clone'));
	await expectLocked(await rowItem('alert-action-edit'), false);
};

export const expectDeleteLocked = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await openFirstRowMenu(canvasElement);
	await expectLocked(await rowItem('alert-action-delete'));
	await expectLocked(await rowItem('alert-action-toggle'), false);
};

export const expectCreateLocked = async (
	context: PlayContext,
): Promise<void> => {
	await expectNewAlertLocked(context);
	await expectCloneLocked(context);
};

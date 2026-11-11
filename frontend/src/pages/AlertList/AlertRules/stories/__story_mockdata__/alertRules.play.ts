/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { expect, screen, userEvent, within } from 'storybook/test';

import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import {
	alertRulesMocks,
	runRowAction,
	untilLoaded,
} from '../AlertRules.stories.mocks';

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

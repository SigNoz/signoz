/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { RuletypesAlertStateDTO } from 'api/generated/services/sigNoz.schemas';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import {
	type AlertRulesArgs,
	hasRowMenu,
	listedRules,
	listsSavedViews,
	runRowAction,
	showsNoRulesPage,
	untilLoaded,
} from '../AlertRules.stories.mocks';

interface PlayContext {
	canvasElement: HTMLElement;
	args: AlertRulesArgs;
}

// A row's rename and delete only take the pointer while the row is hovered,
// which a play cannot put the real cursor on.
const hoverActions = userEvent.setup({ pointerEventsCheck: 0 });

export const openQuerySuggestions = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (listedRules(args).length === 0) {
		return;
	}

	const canvas = within(canvasElement);
	// The labels come with the rule list, so the box is opened once rows are in.
	await canvas.findAllByTestId(/^alert-row-.+-name$/, undefined, untilLoaded);
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
	args,
}: PlayContext): Promise<void> => {
	if (!listsSavedViews(args)) {
		return;
	}

	await hoverActions.click(
		await within(canvasElement).findByTestId(
			'alert-rules-view-rename-view-1',
			undefined,
			untilLoaded,
		),
	);
	await screen.findAllByText('Rename view');
};

export const openDeleteViewConfirm = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!listsSavedViews(args)) {
		return;
	}

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
	args,
}: PlayContext): Promise<void> => {
	if (!hasRowMenu(args)) {
		return;
	}

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
	args,
}: PlayContext): Promise<void> => {
	if (!hasRowMenu(args)) {
		return;
	}

	const [actions] = await within(canvasElement).findAllByTestId(
		'alert-actions',
		undefined,
		untilLoaded,
	);

	await userEvent.click(actions);
	await screen.findByText(
		listedRules(args)[0].state === RuletypesAlertStateDTO.disabled
			? /^enable$/i
			: /^disable$/i,
	);
};

export const openColumnPicker = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (showsNoRulesPage(args)) {
		return;
	}

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
	if (showsNoRulesPage(args)) {
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
	if (!hasRowMenu(args)) {
		return;
	}

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
	if (!hasRowMenu(args)) {
		return;
	}

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
	if (!hasRowMenu(args)) {
		return;
	}

	await runRowAction(canvasElement, /^delete$/i);
	if (args.deleteState === 'success') {
		await expect(
			await screen.findByText(/alert deleted successfully/i),
		).toBeVisible();
	}
};

export const copyLabel = async ({ args }: PlayContext): Promise<void> => {
	if (!args.tooltipsOpen || listedRules(args).length === 0) {
		return;
	}

	const [copy] = await screen.findAllByRole(
		'button',
		{ name: 'Copy to clipboard' },
		untilLoaded,
	);

	await userEvent.click(copy);
	await waitFor(() =>
		expect(screen.getByText(/copied! use in search/i)).toBeVisible(),
	);
};

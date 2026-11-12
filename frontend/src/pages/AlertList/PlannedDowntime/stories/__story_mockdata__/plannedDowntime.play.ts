/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { FIRST_DOWNTIME_NAME } from './plannedDowntime';
import {
	clickFirstRowAction,
	plannedDowntimeMocks,
	untilLoaded,
} from '../PlannedDowntime.stories.mocks';
import { expectDisabled } from '../../../stories/channelAuthz';

interface PlayContext {
	canvasElement: HTMLElement;
	args: PageStoryArgs<typeof plannedDowntimeMocks>;
}

/** Silenced by the first schedule, and offered at the default rule count. */
const LINKED_RULE_ID = 'rule-1';
/** Offered at the default rule count, but not silenced by the first schedule. */
const UNLINKED_RULE = 'Ingest pipeline dropped logs';

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

const createButton = (canvasElement: HTMLElement): Promise<HTMLElement> =>
	within(canvasElement).findByTestId(
		'planned-downtime-create',
		undefined,
		untilLoaded,
	);

const openRowMenu = async (canvasElement: HTMLElement): Promise<void> => {
	await userEvent.click(
		await within(canvasElement).findByRole(
			'button',
			{ name: `Actions for ${FIRST_DOWNTIME_NAME}` },
			untilLoaded,
		),
	);
};

const rowAction = (label: string): Promise<HTMLElement> =>
	screen.findByRole('menuitem', { name: label }, untilLoaded);

const openFirstSchedule = async (canvasElement: HTMLElement): Promise<void> => {
	await userEvent.click(
		await within(canvasElement).findByText(
			FIRST_DOWNTIME_NAME,
			undefined,
			untilLoaded,
		),
	);
	await screen.findByText(/edit planned downtime/i);
};

const openRulePicker = async (): Promise<void> => {
	const picker = await screen.findByTestId('downtime-alert-rules');
	await userEvent.click(picker.querySelector('.ant-select-selector') ?? picker);
};

const ruleOption = async (name: string): Promise<HTMLElement> => {
	await openRulePicker();
	const option = (await screen.findAllByText(name))
		.map((element) => element.closest<HTMLElement>('.ant-select-item-option'))
		.find(Boolean);
	if (!option) {
		throw new Error(`No picker option for ${name}`);
	}
	return option;
};

const saveButton = (): Promise<HTMLElement> =>
	screen.findByTestId('downtime-save', undefined, untilLoaded);

export const openFromRow = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await openFirstSchedule(canvasElement);
};

export const openNewDowntime = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	const create = await createButton(canvasElement);
	await expectLocked(create, false);
	await userEvent.click(create);
	await screen.findByText(/new planned downtime/i);
};

export const openDeleteConfirm = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await clickFirstRowAction(canvasElement, 'delete');
	// The modal titles itself and its confirm button the same.
	await screen.findByRole('button', { name: 'Delete Schedule' });
};

export const openEditDowntime = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await clickFirstRowAction(canvasElement, 'edit');
	await screen.findByText(/edit planned downtime/i);
	await within(await screen.findByRole('dialog')).findByText(
		/^Postgres connections/,
	);
};

export const openRecurringNewDowntime = async (
	context: PlayContext,
): Promise<void> => {
	await openNewDowntime(context);
	await userEvent.click(
		await screen.findByRole('combobox', { name: 'Repeats every' }),
	);
	await userEvent.click(await screen.findByText('Weekly'));
	await within(await screen.findByRole('dialog')).findByText('Duration');
};

export const searchWithNoResults = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	const canvas = within(canvasElement);
	const search = await canvas.findByPlaceholderText(
		'Search by name',
		undefined,
		untilLoaded,
	);

	await waitFor(
		() => expect(search).not.toHaveAttribute('disabled'),
		untilLoaded,
	);
	await userEvent.type(search, 'no matching downtime');
	await canvas.findByText('No matching planned downtime');
};

export const submitEmptyForm = async (context: PlayContext): Promise<void> => {
	await openNewDowntime(context);
	const save = await saveButton();
	await expectLocked(save, false);
	await userEvent.click(save);
	await screen.findByText('Please enter Name');
};

export const expectListDenied = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	const canvas = within(canvasElement);

	await canvas.findByText(/is not authorized/, undefined, untilLoaded);
	await expectLocked(await canvas.findByTestId('planned-downtime-search'));
};

export const expectCreateLocked = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	const create = await createButton(canvasElement);
	// The button names what it was denied, which a pending check never does.
	await waitFor(
		() => expect(create).toHaveAttribute('data-denied-permissions'),
		untilLoaded,
	);
	await expectLocked(create);
};

export const expectCreateOpen = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await expectLocked(await createButton(canvasElement), false);
};

export const expectEditLocked = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await openRowMenu(canvasElement);
	await expectLocked(await rowAction('Edit'));
	await expectLocked(await rowAction('Delete'), false);
};

export const expectDeleteLocked = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await openRowMenu(canvasElement);
	await expectLocked(await rowAction('Delete'));
	await expectLocked(await rowAction('Edit'), false);
};

export const expectFormReadOnly = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await openFirstSchedule(canvasElement);
	await expectLocked(await screen.findByDisplayValue(FIRST_DOWNTIME_NAME));
	await expectLocked(await saveButton());
};

export const expectRuleAttachLocked = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await openFirstSchedule(canvasElement);
	await expectLocked(await saveButton(), false);
	const option = await ruleOption(UNLINKED_RULE);
	await waitFor(
		() => expect(option).toHaveClass('ant-select-item-option-disabled'),
		untilLoaded,
	);
};

export const expectRuleDetachLocked = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await openFirstSchedule(canvasElement);
	await expect(
		screen.findByTestId(
			`alert-rule-tag-locked-${LINKED_RULE_ID}`,
			undefined,
			untilLoaded,
		),
	).resolves.toBeInTheDocument();
};

export const expectRuleListDenied = async (
	context: PlayContext,
): Promise<void> => {
	await openNewDowntime(context);
	await expectLocked(await saveButton(), false);
	await openRulePicker();
	await expect(
		screen.findByTestId('downtime-rules-denied', undefined, untilLoaded),
	).resolves.toHaveTextContent('list:rule:*');
};

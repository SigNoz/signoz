/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { FIRST_POLICY_NAME } from './routingPolicies';
import {
	fillNewPolicy,
	openEditPolicy,
	routingPoliciesMocks,
	untilLoaded,
} from '../RoutingPolicies.stories.mocks';
import { expectDisabled } from '../../../stories/channelAuthz';

interface PlayContext {
	canvasElement: HTMLElement;
	args: PageStoryArgs<typeof routingPoliciesMocks>;
}

/** Links only `ops-slack`, so the picker holds linked and unlinked channels. */
const SINGLE_CHANNEL_POLICY = 'Payments team ownership';
const LINKED_CHANNEL = 'ops-slack';
const UNLINKED_CHANNEL = 'oncall-pagerduty';

const openPolicy = async (
	canvasElement: HTMLElement,
	name: string,
): Promise<void> => {
	await userEvent.click(
		await within(canvasElement).findByText(name, undefined, untilLoaded),
	);
	await screen.findByText(/edit routing policy/i);
};

const openRowMenu = async (canvasElement: HTMLElement): Promise<void> => {
	const [firstRowActions] = await within(canvasElement).findAllByRole(
		'button',
		{ name: /^Actions for / },
		untilLoaded,
	);
	await userEvent.click(firstRowActions);
};

const rowAction = (label: string): Promise<HTMLElement> =>
	screen.findByRole('menuitem', { name: label }, untilLoaded);

/** The picker row for a channel; antd renders it outside the page's markup. */
const channelOption = async (name: string): Promise<HTMLElement> => {
	await userEvent.click(await screen.findByRole('combobox'));
	const option = (await screen.findAllByText(name))
		.map((element) => element.closest<HTMLElement>('.ant-select-item-option'))
		.find(Boolean);
	if (!option) {
		throw new Error(`No picker option for ${name}`);
	}
	return option;
};

const expectOptionDisabled = (
	option: HTMLElement,
	disabled = true,
): Promise<void> =>
	waitFor(
		() =>
			expect(option.classList.contains('ant-select-item-option-disabled')).toBe(
				disabled,
			),
		untilLoaded,
	);

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
		'routing-policies-create',
		undefined,
		untilLoaded,
	);

const expectToast = async (text: RegExp): Promise<void> => {
	await waitFor(() => expect(screen.getByText(text)).toBeVisible());
};

export const openFirstPolicy = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await openPolicy(canvasElement, FIRST_POLICY_NAME);
};

export const openNewPolicy = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	const create = await createButton(canvasElement);
	await expectDisabled(create, false);
	await userEvent.click(create);
	await screen.findByText(/create routing policy/i);
};

export const openDeleteConfirm = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await openRowMenu(canvasElement);
	const remove = await rowAction('Delete');
	await expectDisabled(remove, false);
	await userEvent.click(remove);
	// The modal titles itself and its confirm button the same.
	await screen.findByRole('button', { name: 'Delete Routing Policy' });
};

export const searchWithNoResults = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	const canvas = within(canvasElement);
	const search = await canvas.findByPlaceholderText(
		'Search by name or description',
		undefined,
		untilLoaded,
	);

	await waitFor(() => expect(search).not.toHaveAttribute('disabled'));
	await userEvent.type(search, 'no matching policy');
	await canvas.findByText('No matching routing policies');
};

export const submitEmptyForm = async (context: PlayContext): Promise<void> => {
	await openNewPolicy(context);
	const save = await screen.findByTestId('routing-policy-save');
	await expectDisabled(save, false);
	await userEvent.click(save);
	await screen.findByText('Please provide a name for the routing policy');
};

export const createPolicy = async (context: PlayContext): Promise<void> => {
	await openNewPolicy(context);
	await fillNewPolicy();
	await expectToast(
		context.args.createState === 'success'
			? /routing policy created successfully/i
			: /Policy name already exists/i,
	);
};

export const updatePolicy = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	await openEditPolicy(canvasElement);
	await expectToast(
		args.updateState === 'success'
			? /routing policy updated successfully/i
			: /failed to update routing policy/i,
	);
};

export const deletePolicy = async (context: PlayContext): Promise<void> => {
	await openDeleteConfirm(context);
	await userEvent.click(
		await screen.findByRole('button', { name: 'Delete Routing Policy' }),
	);
	await expectToast(
		context.args.deleteState === 'success'
			? /routing policy deleted successfully/i
			: /failed to delete routing policy/i,
	);
};

export const expectListDenied = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	const canvas = within(canvasElement);

	await canvas.findByText(/is not authorized/, undefined, untilLoaded);
	await expectLocked(await canvas.findByTestId('routing-policies-search'));
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
	await openPolicy(canvasElement, FIRST_POLICY_NAME);
	await expectLocked(await screen.findByDisplayValue(FIRST_POLICY_NAME));
	await expectLocked(await screen.findByTestId('routing-policy-save'));
};

export const expectChannelAttachLocked = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await openPolicy(canvasElement, SINGLE_CHANNEL_POLICY);
	await expectOptionDisabled(await channelOption(UNLINKED_CHANNEL));
	await expectOptionDisabled(await channelOption(LINKED_CHANNEL), false);
};

export const expectChannelDetachLocked = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await openPolicy(canvasElement, SINGLE_CHANNEL_POLICY);
	await expectOptionDisabled(await channelOption(LINKED_CHANNEL));
	await expectOptionDisabled(await channelOption(UNLINKED_CHANNEL), false);
};

export const expectNoChannelCreateLink = async (
	context: PlayContext,
): Promise<void> => {
	await openNewPolicy(context);
	// The channel check answers with Save's; until then the picker reads as denied.
	await expectLocked(await screen.findByTestId('routing-policy-save'), false);
	await userEvent.click(await screen.findByRole('combobox'));
	await screen.findByText(
		'Please ask your admin to create one.',
		undefined,
		untilLoaded,
	);
	await expect(screen.queryByText('Create one')).not.toBeInTheDocument();
};

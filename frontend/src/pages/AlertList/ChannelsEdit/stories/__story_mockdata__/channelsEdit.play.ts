/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { expect, userEvent, waitFor, within } from 'storybook/test';

import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { channelSpec } from '../../../stories/__story_mockdata__/alerts';
import { PAGE_LOAD } from '../../../stories/channelAuthz';
import type { channelsEditMocks } from '../ChannelsEdit.stories.mocks';
import { channelTestRequests } from './channelsEdit';

interface PlayContext {
	canvasElement: HTMLElement;
	args: PageStoryArgs<typeof channelsEditMocks>;
}

/** Native text controls only: the switches and radios keep a hidden input of their own. */
const FIELD_SELECTOR =
	'form input:not([aria-hidden="true"]):not([type="hidden"]), form textarea';

const allFields = (canvasElement: HTMLElement): HTMLElement[] =>
	Array.from(canvasElement.querySelectorAll<HTMLElement>(FIELD_SELECTOR));

/** A saved channel's name is fixed, so it is off whether or not the form is. */
const editableFields = (canvasElement: HTMLElement): HTMLElement[] =>
	allFields(canvasElement).filter((field) => field.id !== 'channel-name');

const SLACK_ROW_BUTTONS = /^slack-(field|action)-(remove-\d+|add)$/;

const slackRowButtons = (canvasElement: HTMLElement): HTMLElement[] =>
	within(canvasElement).queryAllByTestId(SLACK_ROW_BUTTONS);

export const expectEditableForm = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	const save = await within(canvasElement).findByTestId(
		'save-channel-button',
		undefined,
		PAGE_LOAD,
	);

	await waitFor(
		() => expect(editableFields(canvasElement).length).toBeGreaterThan(0),
		PAGE_LOAD,
	);
	for (const field of editableFields(canvasElement)) {
		await expect(field).toBeEnabled();
	}

	await expect(save).toHaveAttribute('aria-disabled', 'true');
	await userEvent.type(editableFields(canvasElement)[0], 'x');
	await waitFor(
		() => expect(save).toHaveAttribute('aria-disabled', 'false'),
		PAGE_LOAD,
	);
};

/**
 * The permission check answers after the form has mounted editable, so the
 * fields are polled until they lock rather than read once.
 */
export const expectReadOnlyForm = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	const canvas = within(canvasElement);
	const save = await canvas.findByTestId(
		'save-channel-button',
		undefined,
		PAGE_LOAD,
	);

	await waitFor(() => {
		const fields = allFields(canvasElement);

		void expect(fields.length).toBeGreaterThan(1);
		fields.forEach((field) => {
			void expect(field).toBeDisabled();
		});
	}, PAGE_LOAD);
	await expect(save).toHaveAttribute('aria-disabled', 'true');

	if (args.channelType === 'slack') {
		const buttons = slackRowButtons(canvasElement);
		const fieldCount = allFields(canvasElement).length;

		// two field rows, one action row, and an add button for each list
		await expect(buttons).toHaveLength(5);
		for (const button of buttons) {
			await userEvent.click(button);
		}

		await expect(slackRowButtons(canvasElement)).toHaveLength(5);
		await expect(allFields(canvasElement)).toHaveLength(fieldCount);
	}
};

/**
 * Switching the mode swaps which credential fields render, so a click that
 * landed would change how many fields the form holds.
 */
export const expectModeRadioLocked = async (
	context: PlayContext,
	radio: RegExp,
): Promise<void> => {
	await expectReadOnlyForm(context);

	const { canvasElement } = context;
	const fieldCount = allFields(canvasElement).length;

	await userEvent.click(
		within(canvasElement).getByRole('radio', { name: radio }),
	);

	await expect(allFields(canvasElement)).toHaveLength(fieldCount);
};

export const expectWebhookAuthLocked = (context: PlayContext): Promise<void> =>
	expectModeRadioLocked(context, /bearer/i);

export const expectJiraDeploymentLocked = (
	context: PlayContext,
): Promise<void> => expectModeRadioLocked(context, /self-hosted/i);

export const sendSavedConfig = async (context: PlayContext): Promise<void> => {
	const { canvasElement, args } = context;

	await expectReadOnlyForm(context);

	const test = await within(canvasElement).findByTestId('test-channel-button');

	await waitFor(
		() => expect(test).toHaveAttribute('aria-disabled', 'false'),
		PAGE_LOAD,
	);
	await userEvent.click(test);
	await waitFor(() => expect(channelTestRequests()).toHaveLength(1), PAGE_LOAD);

	await expect(channelTestRequests()[0].config).toMatchObject({
		kind: args.channelType,
		spec: channelSpec(args.channelType, args.webhookAuth, args.jiraDeployment),
	});
};

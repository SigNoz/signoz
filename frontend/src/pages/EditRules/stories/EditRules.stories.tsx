import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { editRulesMocks } from './EditRules.stories.mocks';

import EditRules from '../index';

type EditRulesArgs = PageStoryArgs<typeof editRulesMocks>;

const pageStory = storyMocks(editRulesMocks, { layout: 'app' });

/**
 * An existing rule in the builder that created it, loaded from
 * `/api/v2/rules/:id`.
 *
 * Route: `/alerts/edit?ruleId=...`.
 */
const meta = {
	title: 'Pages/Alerts/Edit',
	tags: ['play'],
	component: EditRules,
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<EditRulesArgs>;

export default meta;

type Story = StoryObj<EditRulesArgs>;

/**
 * The alert form on its own route, without the alert-details tabs around it.
 * Metrics Explorer and the assistant link here when they send someone to a rule.
 * The rule is on the classic schema, which is the only one this route renders:
 * see the Alert schema control for what a current-schema rule does here.
 */
export const Default: Story = {};

/** The rule id in the URL does not resolve, so the page offers the way back. */
export const RuleNotFound: Story = {
	args: { dataState: 'error' },
	// The mocked rule request intentionally fails; the resulting console error is
	// the point of the story, not a regression.
	parameters: { allowConsoleErrors: true },
};

/**
 * The preview chart's legend, one tooltip per series carrying the full label a
 * truncated legend entry falls back to. The Preview series control is turned up
 * to its maximum so the legend wraps to a second row, which is where a label
 * gets clipped.
 */
export const Tooltips: Story = {
	args: { tooltipsOpen: true, previewSeries: 6 },
};

/** The page fetches the rule before it renders the form, which outlasts the 1s default. */
const untilLoaded = { timeout: 15_000 };

const LABEL_INPUT = 'alert-labels-input-v1';

/** The labels field, scrolled into view once the rule has loaded. */
const findLabelInput = async (
	canvasElement: HTMLElement,
): Promise<HTMLElement> => {
	const input = await within(canvasElement).findByTestId(
		LABEL_INPUT,
		undefined,
		untilLoaded,
	);
	input.scrollIntoView({ block: 'center' });
	return input;
};

const removeLabel = async (
	canvasElement: HTMLElement,
	label: string,
): Promise<void> => {
	const chip = within(canvasElement)
		.getByText(label)
		.closest<HTMLElement>('[data-slot="badge"]');

	if (!chip) {
		throw new Error(`Label ${label} did not render`);
	}

	await userEvent.click(within(chip).getByRole('button'));
};

/** The rule's own labels, each with its remove button, above the empty input. */
export const Labels: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await findLabelInput(canvasElement);
		const canvas = within(canvasElement);
		await canvas.findByText('team: platform');
		await canvas.findByText('env: prod');
	},
};

/** A key typed and confirmed: it waits as its own chip while the input asks for its value. */
export const LabelKeyEntered: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		const input = await findLabelInput(canvasElement);
		await userEvent.type(input, 'region{enter}');
		await within(canvasElement).findByPlaceholderText(
			'Enter a value for label key(region) then press ENTER.',
		);
	},
};

/** A key and its value confirmed, added after the rule's own labels. */
export const LabelAdded: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		const input = await findLabelInput(canvasElement);
		await userEvent.type(input, 'region{enter}');
		await userEvent.type(input, 'us-east-1{enter}');
		await within(canvasElement).findByText('region: us-east-1');
	},
};

/** One of the rule's labels removed, the other left in place. */
export const LabelRemoved: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await findLabelInput(canvasElement);
		await within(canvasElement).findByText('team: platform');
		await removeLabel(canvasElement, 'team: platform');
		await waitFor(() =>
			expect(within(canvasElement).queryByText('team: platform')).toBeNull(),
		);
		await expect(within(canvasElement).getByText('env: prod')).toBeVisible();
	},
};

/** Every label removed: the input is back to its prompt and the clear-all button is gone. */
export const NoLabels: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		const input = await findLabelInput(canvasElement);
		await within(canvasElement).findByText('team: platform');
		await removeLabel(canvasElement, 'team: platform');
		await removeLabel(canvasElement, 'env: prod');
		await within(canvasElement).findByPlaceholderText(
			'Click here to enter a label (key value pairs)',
		);
		await expect(input.parentElement?.querySelector('button')).toBeNull();
	},
};

/** The confirmation the clear-all button opens before it drops every label. */
export const ClearLabelsConfirm: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		const input = await findLabelInput(canvasElement);
		await within(canvasElement).findByText('team: platform');
		const clearAll = input.parentElement?.querySelector('button');

		if (!clearAll) {
			throw new Error('Clear-all labels button did not render');
		}

		await userEvent.click(clearAll);
		await screen.findByText(
			'This action will remove all the labels. Do you want to proceed?',
		);
	},
};

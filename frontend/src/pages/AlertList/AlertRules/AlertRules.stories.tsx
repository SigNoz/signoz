import type { Meta, StoryObj } from '@storybook/react-vite';
import { screen, userEvent, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { alertRulesMocks } from './AlertRules.stories.mocks';

import AlertList from '../index';

type AlertRulesArgs = PageStoryArgs<typeof alertRulesMocks>;

const pageStory = storyMocks(alertRulesMocks);

/**
 * The rule list tab: every rule with its severity, state and channels. Creating
 * and editing follow the legacy editor role.
 *
 * Route: `/alerts?tab=AlertRules`.
 */
const meta = {
	title: 'Pages/Alerts/Rules',
	tags: ['role-gated', 'play'],
	component: AlertList,
	decorators: [withAppLayout],
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<AlertRulesArgs>;

export default meta;

type Story = StoryObj<AlertRulesArgs>;

/** The page fetches before it renders a row, which outlasts the 1s default. */
const untilLoaded = { timeout: 15_000 };

/**
 * Every alert rule the org has configured, with the state each one evaluated to
 * on its last run and the severity it fires at.
 */
export const Default: Story = {};

/** A workspace with no rule yet, which is where the tab explains itself. */
export const NoRules: Story = {
	args: { rules: 0 },
};

/**
 * A viewer: the row actions and the New Alert button are gone, so the tab is
 * read-only.
 */
export const Viewer: Story = {
	args: { access: 'viewer' },
};

/** The per-rule actions: enable or disable, edit, clone and delete. */
export const RowActions: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		const [actions] = await within(canvasElement).findAllByTestId(
			'alert-actions',
			undefined,
			untilLoaded,
		);

		await userEvent.click(actions);
		await screen.findByText(/clone/i);
	},
};

/** The columns the table can show, including the audit ones it hides by default. */
export const ColumnPicker: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await userEvent.click(
			await within(canvasElement).findByTestId(
				'alert-columns-button',
				undefined,
				untilLoaded,
			),
		);
		await screen.findByText(/toggle columns/i);
	},
};

import type { Meta, StoryObj } from '@storybook/react-vite';
import { screen, userEvent, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { alertRulesMocks } from './AlertRules.stories.mocks';

import AlertList from '../../index';
import { RULE_MAX } from '../../stories/__story_mockdata__/alerts';

type AlertRulesArgs = PageStoryArgs<typeof alertRulesMocks>;

const pageStory = storyMocks(alertRulesMocks, { layout: 'app' });

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

/** Search: an unmatched query retains the filters and renders the no-results branch. */
export const SearchNoResults: Story = {
	parameters: {
		signoz: { route: '/alerts?tab=AlertRules&search=no-matching-alert-rule' },
	},
};

/** Data: the list remains mounted while its initial request is pending. */
export const Loading: Story = {
	args: { dataState: 'loading' },
};

/** Data: the table's retryable error state after the rule request fails. */
export const LoadError: Story = {
	args: { dataState: 'error' },
	// The mocked rule request intentionally fails; the resulting console error is
	// the point of the story, not a regression.
	parameters: { allowConsoleErrors: true },
};

/** Density: a second page of rules with the shared pagination controls visible. */
export const Paginated: Story = {
	args: { rules: RULE_MAX },
	parameters: {
		signoz: { route: '/alerts?tab=AlertRules&page=2&limit=10' },
	},
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

/** Interaction: a disabled rule exposes Enable in its real row-action menu. */
export const RowActionsDisabledRule: Story = {
	args: { ruleState: 'disabled' },
	play: async ({ canvasElement }): Promise<void> => {
		const [actions] = await within(canvasElement).findAllByTestId(
			'alert-actions',
			undefined,
			untilLoaded,
		);

		await userEvent.click(actions);
		await screen.findByText(/^enable$/i);
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

/**
 * Every label badge in the Labels column, held open: each one repeats its own
 * `key: value` with a copy button. The rules carry two labels apiece, which fit
 * the column, so the overflow chip and its list are on the Triggered tab
 * instead.
 */
export const Tooltips: Story = {
	args: { tooltipsOpen: true },
};

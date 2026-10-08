import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

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

/**
 * The rule count in the bottom strip, in place of the build version: the rows on
 * the page against the total, the same pair the table's own footer prints.
 */
export const BottomStrip: Story = {
	args: { bottomStrip: true },
};

/** The same count on a second page, where the two numbers come apart. */
export const BottomStripPaginated: Story = {
	args: { bottomStrip: true, rules: RULE_MAX },
	parameters: {
		signoz: { route: '/alerts?tab=AlertRules&page=2&limit=10' },
	},
};

const runRowAction = async (
	canvasElement: HTMLElement,
	name: RegExp,
): Promise<void> => {
	const [actions] = await within(canvasElement).findAllByTestId(
		'alert-actions',
		undefined,
		untilLoaded,
	);

	await userEvent.click(actions);
	await userEvent.click(await screen.findByRole('menuitem', { name }));
};

/** Enable or Disable from the row menu: the promise toast, pending then settled. */
export const ToggleAlertToast: Story = {
	play: async ({ canvasElement, args }): Promise<void> => {
		await runRowAction(canvasElement, /^(enable|disable)$/i);
		if (args.toggleState === 'success') {
			await waitFor(() =>
				expect(screen.getByText(/alert (enabled|disabled)/i)).toBeVisible(),
			);
		}
	},
};

/** The PATCH never answers: the "Enabling or Disabling alert..." toast stays pending. */
export const ToggleAlertLoadingToast: Story = {
	args: { toggleState: 'loading' },
	play: ToggleAlertToast.play,
};

/** The PATCH failed: the promise toast settles with the server message. */
export const ToggleAlertErrorToast: Story = {
	args: { toggleState: 'error' },
	parameters: { allowConsoleErrors: true },
	play: ToggleAlertToast.play,
};

/** Clone from the row menu. */
export const CloneAlertToast: Story = {
	play: async ({ canvasElement, args }): Promise<void> => {
		await runRowAction(canvasElement, /^clone$/i);
		if (args.cloneState === 'success') {
			await waitFor(() =>
				expect(screen.getByText(/alert cloned successfully/i)).toBeVisible(),
			);
		}
	},
};

/** The POST never answers: "Cloning alert..." stays pending. */
export const CloneAlertLoadingToast: Story = {
	args: { cloneState: 'loading' },
	play: CloneAlertToast.play,
};

/** The POST failed. */
export const CloneAlertErrorToast: Story = {
	args: { cloneState: 'error' },
	parameters: { allowConsoleErrors: true },
	play: CloneAlertToast.play,
};

/** Delete from the row menu. */
export const DeleteAlertToast: Story = {
	play: async ({ canvasElement, args }): Promise<void> => {
		await runRowAction(canvasElement, /^delete$/i);
		if (args.deleteState === 'success') {
			await waitFor(() =>
				expect(screen.getByText(/alert deleted successfully/i)).toBeVisible(),
			);
		}
	},
};

/** The DELETE never answers: "Deleting alert..." stays pending. */
export const DeleteAlertLoadingToast: Story = {
	args: { deleteState: 'loading' },
	play: DeleteAlertToast.play,
};

/** The DELETE failed. */
export const DeleteAlertErrorToast: Story = {
	args: { deleteState: 'error' },
	parameters: { allowConsoleErrors: true },
	play: DeleteAlertToast.play,
};

/** The copy button in a label badge's tooltip, clicked. */
export const LabelCopiedToast: Story = {
	args: { tooltipsOpen: true },
	play: async (): Promise<void> => {
		const [copy] = await screen.findAllByRole(
			'button',
			{ name: 'Copy to clipboard' },
			untilLoaded,
		);

		await userEvent.click(copy);
		await waitFor(() =>
			expect(screen.getByText(/copied! use in search/i)).toBeVisible(),
		);
	},
};

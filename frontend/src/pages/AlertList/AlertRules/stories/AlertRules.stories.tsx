import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import {
	alertRulesMocks,
	runRowAction,
	untilLoaded,
} from './AlertRules.stories.mocks';

import AlertList from '../../index';
import { RULE_MAX } from '../../stories/__story_mockdata__/alerts';

type AlertRulesArgs = PageStoryArgs<typeof alertRulesMocks>;

const pageStory = storyMocks(alertRulesMocks, { layout: 'app' });

/**
 * The rule list tab: the views rail beside every rule with its severity, state
 * and channels, filtered server-side by a DSL query, a state set and the table
 * sort, which org-shared saved views capture and restore. Creating and editing
 * follow the legacy editor role.
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

// A row's rename and delete only take the pointer while the row is hovered,
// which a play cannot put the real cursor on.
const hoverActions = userEvent.setup({ pointerEventsCheck: 0 });

/**
 * Every alert rule the org has configured, with the state each one evaluated to
 * on its last run and the severity it fires at.
 */
export const Default: Story = {};

/** A workspace with no rule yet, which is where the tab explains itself. */
export const NoRules: Story = {
	args: { rules: 0 },
};

/** A state filter no rule is in: the filters stay and the no-results branch renders. */
export const NoMatchingRules: Story = {
	parameters: {
		signoz: { route: '/alerts?tab=AlertRules&states=recovering' },
	},
};

/** The query the list was asked for does not parse: the server's message sits under the search box. */
export const InvalidQuery: Story = {
	args: { invalidQuery: 'rule_list_filter_invalid' },
	parameters: {
		allowConsoleErrors: true,
		signoz: {
			route: "/alerts?tab=AlertRules&query=name%20CONTAINS%20'prod'%20AND",
		},
	},
};

/**
 * The query box's suggestions, opened: the rule fields first, then every
 * `labels.<key>` the org's rules carry.
 */
export const QuerySuggestions: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		const canvas = within(canvasElement);
		// The labels come with the rule list, so the box is opened once rows are in.
		await canvas.findAllByTestId('alert-actions', undefined, untilLoaded);
		const search = canvas.getByTestId('alert-rules-list-search');
		await userEvent.click(search.querySelector('.cm-content') ?? search);
		await screen.findByText('labels.team');
	},
};

/** A workspace with no saved view yet, where the rail says how to make one. */
export const NoSavedViews: Story = {
	args: { ruleViews: 0 },
};

/** A shared link carrying only the view id: the view's query and states are applied once the views load. */
export const ViewApplied: Story = {
	parameters: {
		signoz: { route: '/alerts?tab=AlertRules&view=view-1' },
	},
};

/**
 * The filters changed after the view was applied: the dirty dot on the rail
 * entry and the header, and Save, Save as and Reset at the foot of the rail.
 */
export const ViewModified: Story = {
	parameters: {
		signoz: {
			route:
				'/alerts?tab=AlertRules&view=view-2&query=team%20%3D%20%27infra%27&states=firing',
		},
	},
};

/** Filters set with no saved view selected: the rail offers to save them as a new one. */
export const UnsavedFilters: Story = {
	parameters: {
		signoz: { route: '/alerts?tab=AlertRules&states=firing' },
	},
};

/** The rail folded away from the status bar, leaving the list the full width. */
export const RailCollapsed: Story = {
	args: { railCollapsed: true },
};

/** The popover that names the current filters as a new saved view. */
export const SaveViewPopover: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await userEvent.click(
			await within(canvasElement).findByTestId(
				'alert-rules-view-save-trigger',
				undefined,
				untilLoaded,
			),
		);
		await screen.findByText('Save as view');
	},
};

/** A saved view's rename popover, opened from its row. */
export const RenameViewPopover: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await hoverActions.click(
			await within(canvasElement).findByTestId(
				'alert-rules-view-rename-view-1',
				undefined,
				untilLoaded,
			),
		);
		await screen.findByText('Rename view');
	},
};

/** Deleting a saved view asks first, because every teammate loses it too. */
export const DeleteViewConfirm: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await hoverActions.click(
			await within(canvasElement).findByTestId(
				'alert-rules-view-delete-view-1',
				undefined,
				untilLoaded,
			),
		);
		await screen.findByText(/shared across your organization/i);
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
 * The rule count in the bottom strip on a second page, where the rows on the
 * page and the total come apart.
 */
export const BottomStripPaginated: Story = {
	args: { rules: RULE_MAX },
	parameters: {
		signoz: { route: '/alerts?tab=AlertRules&page=2&limit=10' },
	},
};

/** Enable or Disable from the row menu: the promise toast, pending then settled. */
export const ToggleAlertToast: Story = {
	play: async ({ canvasElement, args }): Promise<void> => {
		await runRowAction(canvasElement, /^(enable|disable)$/i);
		if (args.toggleState === 'success') {
			await expect(
				await screen.findByText(/alert (enabled|disabled)/i),
			).toBeVisible();
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
			await expect(
				await screen.findByText(/alert cloned successfully/i),
			).toBeVisible();
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
			await expect(
				await screen.findByText(/alert deleted successfully/i),
			).toBeVisible();
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
		await expect(await screen.findByText(/copied! use in search/i)).toBeVisible();
	},
};

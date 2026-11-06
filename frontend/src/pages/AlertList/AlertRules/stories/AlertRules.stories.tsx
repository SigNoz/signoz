import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { alertRulesMocks } from './AlertRules.stories.mocks';
import {
	cloneAlert,
	copyLabel,
	deleteAlert,
	openColumnPicker,
	openDeleteViewConfirm,
	openDisabledRuleActions,
	openQuerySuggestions,
	openRenameViewPopover,
	openRowActions,
	openSaveViewPopover,
	toggleAlert,
} from './__story_mockdata__/alertRules.play';

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
	play: openQuerySuggestions,
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
	play: openSaveViewPopover,
};

/** A saved view's rename popover, opened from its row. */
export const RenameViewPopover: Story = {
	play: openRenameViewPopover,
};

/** Deleting a saved view asks first, because every teammate loses it too. */
export const DeleteViewConfirm: Story = {
	play: openDeleteViewConfirm,
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
	play: openRowActions,
};

/** Interaction: a disabled rule exposes Enable in its real row-action menu. */
export const RowActionsDisabledRule: Story = {
	args: { ruleState: 'disabled' },
	play: openDisabledRuleActions,
};

/** The columns the table can show, including the audit ones it hides by default. */
export const ColumnPicker: Story = {
	play: openColumnPicker,
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
	play: toggleAlert,
};

/** The PATCH never answers: the "Enabling or Disabling alert..." toast stays pending. */
export const ToggleAlertLoadingToast: Story = {
	args: { toggleState: 'loading' },
	play: toggleAlert,
};

/** The PATCH failed: the promise toast settles with the server message. */
export const ToggleAlertErrorToast: Story = {
	args: { toggleState: 'error' },
	parameters: { allowConsoleErrors: true },
	play: toggleAlert,
};

/** Clone from the row menu. */
export const CloneAlertToast: Story = {
	play: cloneAlert,
};

/** The POST never answers: "Cloning alert..." stays pending. */
export const CloneAlertLoadingToast: Story = {
	args: { cloneState: 'loading' },
	play: cloneAlert,
};

/** The POST failed. */
export const CloneAlertErrorToast: Story = {
	args: { cloneState: 'error' },
	parameters: { allowConsoleErrors: true },
	play: cloneAlert,
};

/** Delete from the row menu. */
export const DeleteAlertToast: Story = {
	play: deleteAlert,
};

/** The DELETE never answers: "Deleting alert..." stays pending. */
export const DeleteAlertLoadingToast: Story = {
	args: { deleteState: 'loading' },
	play: deleteAlert,
};

/** The DELETE failed. */
export const DeleteAlertErrorToast: Story = {
	args: { deleteState: 'error' },
	parameters: { allowConsoleErrors: true },
	play: deleteAlert,
};

/** The copy button in a label badge's tooltip, clicked. */
export const LabelCopiedToast: Story = {
	args: { tooltipsOpen: true },
	play: copyLabel,
};

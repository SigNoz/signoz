import type { ComponentType } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Route } from 'react-router-dom';
import ROUTES from 'constants/routes';
import { screen, userEvent } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { dashboardMocks } from '../DashboardPage.stories.mocks';
import {
	clickRowAction,
	openSettings,
	openVariableEditor,
	typeVariableName,
	variableRow,
} from './settingsPlay';

import DashboardPage from '../../DashboardPage';

type DashboardArgs = PageStoryArgs<typeof dashboardMocks>;

const pageStory = storyMocks(dashboardMocks, { layout: 'app' });

/**
 * The Variables tab of dashboard settings: the variables in the order the bar
 * shows them, and what deleting, renaming or applying one does to the panels
 * that read it. Every panel filters on `$environment`, and `$service` reads it
 * too; nothing reads `$namespace` or `$owner`.
 *
 * Route: `/dashboard/:dashboardId`.
 */
const meta = {
	title: 'Pages/Dashboards/Detail/Variables',
	tags: ['authz', 'play'],
	component: DashboardPage as ComponentType<DashboardArgs>,
	render: (): JSX.Element => (
		<Route path={ROUTES.DASHBOARD} component={DashboardPage} />
	),
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<DashboardArgs>;

export default meta;

type Story = StoryObj<DashboardArgs>;

/** One variable of each type, listed by name and description. */
export const Default: Story = {
	play: async ({ canvasElement }) => {
		await openSettings(canvasElement, 'Variables');
		await variableRow('owner');
	},
};

/** A dashboard without variables, where the tab is its add-variable prompt. */
export const Empty: Story = {
	args: { variables: [] },
	play: async ({ canvasElement }) => {
		await openSettings(canvasElement, 'Variables');
		await screen.findByText('No variables yet');
	},
};

/**
 * A dynamic variable's Apply to all says whether it is already a filter on
 * every panel. The row keeps its actions invisible until it is hovered, which
 * the story does first.
 */
export const TooltipsInVariables: Story = {
	args: { tooltipsOpen: true },
	play: async ({ canvasElement }) => {
		await openSettings(canvasElement, 'Variables');

		// The tooltip trigger's Slot merge drops the button's own test id.
		await userEvent.hover(
			await screen.findByRole(
				'button',
				{ name: 'Apply to all' },
				{ timeout: 10000 },
			),
		);
		await screen.findByText(
			'Add this variable as a filter to every panel',
			undefined,
			{ timeout: 10000 },
		);
	},
};

/** Deleting a variable nothing reads, which the row confirms inline. */
export const DeleteConfirm: Story = {
	play: async ({ canvasElement }) => {
		await openSettings(canvasElement, 'Variables');
		await clickRowAction('owner', 'delete');
		await screen.findByText('Delete?');
	},
};

/**
 * Deleting `$environment`, which the panels and `$service` read, so each usage
 * is listed for review before anything is removed.
 */
export const DeleteReferenced: Story = {
	play: async ({ canvasElement }) => {
		await openSettings(canvasElement, 'Variables');
		await clickRowAction('environment', 'delete');
		await screen.findByText('Delete $environment');
	},
};

/** Apply to all on `$namespace`: the filter it would add to every panel query. */
export const ApplyToAll: Story = {
	play: async ({ canvasElement }) => {
		await openSettings(canvasElement, 'Variables');
		await clickRowAction('namespace', 'apply-all');
		await screen.findByText('Apply $namespace to panels');
	},
};

/**
 * Renaming `$environment` to `$env`: saving the editor holds the rename until
 * the rewritten queries are reviewed.
 */
export const RenameReferenced: Story = {
	play: async ({ canvasElement }) => {
		await openVariableEditor(canvasElement, 'environment');
		await typeVariableName('env');
		await userEvent.click(screen.getByTestId('variable-save'));
		await screen.findByText('Rename $environment');
	},
};

const confirmImpact = async (): Promise<void> => {
	await userEvent.click(await screen.findByTestId('variable-impact-confirm'));
};

/** Deleting a variable nothing reads, confirmed: the toast raised once the patch answers. */
export const VariablesUpdatedToast: Story = {
	play: async ({ canvasElement, args }) => {
		await openSettings(canvasElement, 'Variables');
		await clickRowAction('owner', 'delete');
		await userEvent.click(
			await screen.findByRole('button', { name: 'Confirm delete' }),
		);
		if (args.dashboardPatch === 'success') {
			await screen.findByText('Variables updated');
		}
	},
};

/** Deleting `$environment` after reviewing its usages: the toast raised once the patch answers. */
export const VariableDeletedToast: Story = {
	play: async ({ canvasElement, args }) => {
		await openSettings(canvasElement, 'Variables');
		await clickRowAction('environment', 'delete');
		await screen.findByText('Delete $environment');
		await confirmImpact();
		if (args.dashboardPatch === 'success') {
			await screen.findByText('Deleted $environment');
		}
	},
};

/** Deleting `$environment` whose patch is refused. */
export const VariableDeleteFailedToast: Story = {
	args: { dashboardPatch: 'error' },
	// The refused patch is the state under test.
	parameters: { allowConsoleErrors: true },
	play: async (context) => {
		await VariableDeletedToast.play?.(context);
		await screen.findByText('Could not delete the variable');
	},
};

/** Renaming `$environment` to `$env` after reviewing the rewritten queries. */
export const VariableRenamedToast: Story = {
	play: async ({ canvasElement, args }) => {
		await openVariableEditor(canvasElement, 'environment');
		await typeVariableName('env');
		await userEvent.click(screen.getByTestId('variable-save'));
		await screen.findByText('Rename $environment');
		await confirmImpact();
		if (args.dashboardPatch === 'success') {
			await screen.findByText('Renamed to $env');
		}
	},
};

/** Renaming `$environment` whose patch is refused. */
export const VariableRenameFailedToast: Story = {
	args: { dashboardPatch: 'error' },
	// The refused patch is the state under test.
	parameters: { allowConsoleErrors: true },
	play: async (context) => {
		await VariableRenamedToast.play?.(context);
		await screen.findByText('Could not rename the variable');
	},
};

/** Apply to all on `$namespace`, confirmed after the review. */
export const VariableAppliedToast: Story = {
	play: async ({ canvasElement, args }) => {
		await openSettings(canvasElement, 'Variables');
		await clickRowAction('namespace', 'apply-all');
		await screen.findByText('Apply $namespace to panels');
		await confirmImpact();
		if (args.dashboardPatch === 'success') {
			await screen.findByText('Applied $namespace to panels');
		}
	},
};

/** Apply to all on `$namespace` whose patch is refused. */
export const VariableApplyFailedToast: Story = {
	args: { dashboardPatch: 'error' },
	// The refused patch is the state under test.
	parameters: { allowConsoleErrors: true },
	play: async (context) => {
		await VariableAppliedToast.play?.(context);
		await screen.findByText('Could not apply the variable to panels');
	},
};

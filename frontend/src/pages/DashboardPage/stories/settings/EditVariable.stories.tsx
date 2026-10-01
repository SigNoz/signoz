import type { ComponentType } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Route } from 'react-router-dom';
import ROUTES from 'constants/routes';
import { expect, screen, userEvent, waitFor } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import {
	cyclicVariablesDashboardHandler,
	dashboardMocks,
} from '../DashboardPage.stories.mocks';
import {
	findPreviewValue,
	openVariableEditor,
	openVariableSelect,
} from './settingsPlay';

import DashboardPage from '../../DashboardPage';

type DashboardArgs = PageStoryArgs<typeof dashboardMocks>;

const pageStory = storyMocks(dashboardMocks, { layout: 'app' });

/**
 * The variable editor on each of the dashboard's variables, reached from a
 * row's edit action in the Variables tab: what every type saved, the values it
 * resolves to, and the query failures and dependency loops it reports.
 *
 * Route: `/dashboard/:dashboardId`.
 */
const meta = {
	title: 'Pages/Dashboards/Detail/Edit Variable',
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

/**
 * `$environment`: a comma-separated list with one value by default. The preview
 * stays empty until the options are edited.
 */
export const Custom: Story = {
	play: async ({ canvasElement }) => {
		await openVariableEditor(canvasElement, 'environment');
		await screen.findByDisplayValue('production,staging,development');
	},
};

/**
 * `$service`: a ClickHouse query that reads `$environment`, run once on open so
 * the preview and default value have its values.
 */
export const Query: Story = {
	play: async ({ canvasElement }) => {
		await openVariableEditor(canvasElement, 'service');
		await findPreviewValue('inventory');
	},
};

/** `$service` with its query failing, which the preview reports in its place. */
export const QueryFailed: Story = {
	args: { variableQueryFails: true },
	// The failed variable query is the state under test.
	parameters: { allowConsoleErrors: true },
	play: async ({ canvasElement }) => {
		await openVariableEditor(canvasElement, 'service');
		await screen.findByText(
			'Please make sure query is valid and dependent variables are selected',
			undefined,
			{ timeout: 10000 },
		);
	},
};

/** The sort picker, open over the previewed values it reorders. */
export const SortOpen: Story = {
	play: async (context) => {
		await Query.play?.(context);
		await openVariableSelect('variable-sort-select');
		await screen.findByTitle('Alphabetical (descending)');
	},
};

/**
 * `$namespace`: a dynamic variable reading `k8s.namespace.name` from metrics,
 * with the panels it could be applied to.
 */
export const Dynamic: Story = {
	play: async ({ canvasElement }) => {
		await openVariableEditor(canvasElement, 'namespace');
		await findPreviewValue('payments-prod');
	},
};

/** `$owner`: a Textbox variable with its default value. */
export const Textbox: Story = {
	play: async ({ canvasElement }) => {
		await openVariableEditor(canvasElement, 'owner');
		await waitFor(() =>
			expect(screen.getByTestId('variable-text-input')).toHaveValue(
				'platform-team',
			),
		);
	},
};

/**
 * `$environment` and `$service` reading each other, as an imported dashboard
 * can arrive: saving either one is refused and names the loop.
 *
 * The document is answered by the story, so the Panels, Sections, Variables and
 * Locked controls do not reach it.
 */
export const CircularDependency: Story = {
	parameters: { msw: { handlers: [cyclicVariablesDashboardHandler] } },
	play: async ({ canvasElement }) => {
		await openVariableEditor(canvasElement, 'service');
		await userEvent.click(screen.getByTestId('variable-save'));
		await screen.findByText(/circular dependency detected/);
	},
};

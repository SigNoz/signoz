import type { ComponentType } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Route } from 'react-router-dom';
import ROUTES from 'constants/routes';
import { screen, userEvent, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import {
	dashboardMocks,
	desyncedDashboardHandler,
	metricsListHandler,
	tooltipDashboardHandler,
	tooltipRoute,
	warnedPanelQueryHandler,
} from './DashboardPage.stories.mocks';
import { TOOLTIP_PANEL_NAME } from './__story_mockdata__/tooltipDashboard';

import DashboardPage from '../DashboardPage';

type DashboardArgs = PageStoryArgs<typeof dashboardMocks>;

const pageStory = storyMocks(dashboardMocks, { layout: 'app' });

/**
 * One dashboard: its variables, its sections and every panel querying
 * `query_range`, plus the lock, clone and publish actions in the header.
 *
 * Route: `/dashboard/:dashboardId`.
 */
const meta = {
	title: 'Pages/Dashboards/Detail',
	tags: ['role-gated', 'play'],
	// The page is wrapped in `withAuthZPage`, which types its props as an index
	// signature; the story's args are what the controls resolve to.
	component: DashboardPage as ComponentType<DashboardArgs>,
	// The page reads the dashboard id out of the pathname, so it renders under
	// its own route rather than being mounted on its own.
	render: (): JSX.Element => (
		<Route path={ROUTES.DASHBOARD} component={DashboardPage} />
	),
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<DashboardArgs>;

export default meta;

type Story = StoryObj<DashboardArgs>;

/**
 * A service dashboard with data: the variable bar over two titled sections, and
 * the panel kinds all drawn from the same query endpoint: time series, single
 * numbers, a table, a bar chart, a pie and a log list.
 */
export const Default: Story = {};

/**
 * The blank dashboard a freshly created one starts as, with the two steps that
 * populate it. A titled section renders its own add-panel state instead, so this
 * needs both no panels and no sections.
 */
export const Empty: Story = {
	args: { panels: 0, sectioned: false },
};

/**
 * A locked dashboard: the lock indicator sits over the grid and the edit
 * affordances are gone even for an admin.
 */
export const Locked: Story = {
	args: { locked: true },
};

/**
 * A viewer: the panels and the variable bar work, but nothing that would change
 * the dashboard is offered.
 */
export const Viewer: Story = {
	args: { access: 'viewer' },
};

/**
 * Every query ran and matched nothing, which each panel kind draws as its own
 * no-data state.
 */
export const NoData: Story = {
	args: { noData: true },
};

/** A partial data failure: the dashboard remains visible while panel queries fail. */
export const PanelQueryError: Story = {
	args: { dataState: 'error' },
};

/** The panels mid-fetch, with the header, variable bar and grid already laid out. */
export const Loading: Story = {
	args: { dataState: 'loading' },
};

/**
 * Every tooltip the dashboard itself carries, held open at once: the title, the
 * description with its link, the public-page globe, the `+N` of tags that did
 * not fit, two panel descriptions, a panel's time-preference pill, the
 * collapsed panel search, the warning one panel's query came back with, the
 * `+N` of variables the bar hid, the values a multi-select pill stands for, the
 * add-variable `+`, and a legend's copy buttons.
 *
 * The document and one panel's query are answered by the story, so the Panels,
 * Sections, Variables and Locked controls do not reach it; the Variable options
 * control still does, and the selection comes from the route.
 */
export const Tooltips: Story = {
	args: { tooltipsOpen: true, variableValues: 12 },
	parameters: {
		signoz: { route: tooltipRoute() },
		msw: { handlers: [tooltipDashboardHandler, warnedPanelQueryHandler] },
	},
};

/**
 * What a locked dashboard refuses, with the Actions menu open: the padlock
 * offering to unlock, the disabled Configure and New Panel buttons, and the
 * menu rows saying why they cannot be picked.
 */
export const TooltipsWhenLocked: Story = {
	args: { tooltipsOpen: true, locked: true },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		// The dropdown trigger's Slot merge drops the button's own test id.
		await userEvent.click(
			await canvas.findByRole('button', { name: 'Actions' }, { timeout: 10000 }),
		);
		await screen.findByText('Clone dashboard');
	},
};

/**
 * The JSON editor's two warnings, held open: the panels the layout places
 * nowhere and the layout slots pointing at panels the spec no longer has, each
 * listing the ids behind it.
 *
 * The document is answered by the story, so the Panels, Sections, Variables and
 * Locked controls do not reach it.
 */
export const TooltipsInJsonDrawer: Story = {
	args: { tooltipsOpen: true },
	parameters: { msw: { handlers: [desyncedDashboardHandler] } },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await userEvent.click(
			await canvas.findByTestId('edit-json', {}, { timeout: 10000 }),
		);
		await screen.findByTestId('json-editor-dangling-warning');
	},
};

/**
 * The Overview tab of dashboard settings, where Cross-Panel Sync explains what
 * syncing the crosshair does and links out to the docs.
 */
export const TooltipsInSettings: Story = {
	args: { tooltipsOpen: true },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await userEvent.click(
			await canvas.findByTestId('show-drawer', {}, { timeout: 10000 }),
		);
		await screen.findByText('Sync Mode');
	},
};

/**
 * The Variables tab of dashboard settings, where a dynamic variable's Apply to
 * all says whether it is already a filter on every panel. The row keeps its
 * actions invisible until it is hovered, which the story does first.
 */
export const TooltipsInVariableSettings: Story = {
	args: { tooltipsOpen: true },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await userEvent.click(
			await canvas.findByTestId('show-drawer', {}, { timeout: 10000 }),
		);
		await userEvent.click(await screen.findByRole('tab', { name: 'Variables' }));

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

/**
 * A panel expanded into view mode, whose header carries the full panel name its
 * title truncates, over the dashboard's own tooltips behind the dialog.
 *
 * The document is answered by the story, so the Panels, Sections, Variables and
 * Locked controls do not reach it.
 */
export const TooltipsInViewPanelModal: Story = {
	args: { tooltipsOpen: true },
	parameters: {
		msw: { handlers: [tooltipDashboardHandler, metricsListHandler] },
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await userEvent.click(
			await canvas.findByTestId(
				'panel-actions-request-rate',
				{},
				{ timeout: 10000 },
			),
		);
		await userEvent.click(await screen.findByText('View'));
		await screen.findByText(`${TOOLTIP_PANEL_NAME} - (View mode)`);
	},
};

/**
 * A dashboard id nobody has, which is what a deleted or mistyped link opens on.
 *
 * Kept last: test-runner shares one page across a file's stories, and the 404
 * this story is about can settle after the next story has already started,
 * which fails that one instead.
 */
export const NotFound: Story = {
	args: { notFound: true },
	// The deliberate 404 is the state under test.
	parameters: { allowConsoleErrors: true },
};

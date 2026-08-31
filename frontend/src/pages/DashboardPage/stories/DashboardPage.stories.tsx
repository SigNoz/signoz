import type { Meta, StoryObj } from '@storybook/react-vite';
import { rest } from 'msw';
import { Route } from 'react-router-dom';
import ROUTES from 'constants/routes';
import { screen, userEvent, within } from 'storybook/test';
import {
	DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesTimeSeriesPanelSpecDTOKind as TimeSeriesKind,
	DashboardtypesTimePreferenceDTO as TimePreference,
	type DashboardtypesDashboardSpecDTOPanels,
	type DashboardtypesGettableDashboardV2DTO,
} from 'api/generated/services/sigNoz.schemas';
import type { QueryRangeRequestV5 } from 'types/api/v5/queryRange';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { queryRangeV5ScalarResponse } from '@/storybook/msw/__story_mockdata__/queryRange';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { dashboardMocks, dashboardRoute } from './DashboardPage.stories.mocks';
import {
	dashboardResponse,
	PANEL_IDS,
	VARIABLE_KINDS,
} from './__story_mockdata__/dashboard';

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
	component: DashboardPage,
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

/** A dashboard id nobody has, which is what a deleted or mistyped link opens on. */
export const NotFound: Story = {
	args: { notFound: true },
};

const DASHBOARD_NAME =
	'Checkout service overview across every production region, by service and owner';

const DASHBOARD_DESCRIPTION =
	'Traffic, errors and latency for the checkout path, broken down by service, region and deployment channel. Owned by the platform observability team; the runbook is at https://signoz.io/docs/dashboards/ and the rotation is in PagerDuty.';

// Two fit beside the title; the rest fall behind the `+N` badge.
const DASHBOARD_TAGS = [
	{ key: 'env', value: 'production-eu-central-1' },
	{ key: 'team', value: 'platform-observability' },
	{ key: 'component', value: 'otel-collector' },
	{ key: 'owner', value: 'sre-oncall-primary' },
	{ key: 'tier', value: 'tier-0-revenue-critical' },
	{ key: 'compliance', value: 'soc2-in-scope' },
];

const PANEL_NAME =
	'Request rate by service, region and deployment channel, excluding synthetic traffic';

const PANEL_DESCRIPTIONS: Record<string, string> = {
	'request-rate':
		'Requests per second per service, taken from `signoz_calls_total` and filtered to the selected environment. Synthetic and health-check traffic is excluded, so this reads lower than the load balancer count.',
	'error-rate':
		'Share of 5xx responses over the selected window, rated against the error budget for the quarter.',
};

const SELECTED_SERVICES = [
	'checkout',
	'payments',
	'inventory',
	'notifications',
	'checkout-2',
	'payments-2',
	'inventory-2',
	'notifications-2',
];

const tooltipRoute = `${dashboardRoute()}?variables=${encodeURIComponent(
	JSON.stringify({ service: SELECTED_SERVICES }),
)}`;

const WARNED_METRIC = 'signoz_apdex';

/**
 * One panel's query answered with a warning beside its value, so its header
 * carries the status indicator while the rest of the dashboard is untouched.
 * Every other query falls through to the page's own handler.
 */
const warnedPanelQuery = rest.post(
	'http://localhost/api/v5/query_range',
	async (req, res, ctx) => {
		const body = (await req.json()) as QueryRangeRequestV5;
		const spec = body.compositeQuery?.queries?.[0]?.spec as
			| { aggregations?: { metricName?: string }[] }
			| undefined;

		if (spec?.aggregations?.[0]?.metricName !== WARNED_METRIC) {
			return undefined;
		}

		return res(
			ctx.status(200),
			ctx.json(
				queryRangeV5ScalarResponse(0.94, 'A', {
					warning: {
						code: 'partial_data',
						message: `Some series for ${WARNED_METRIC} were dropped: the metric changed temporality partway through the selected window.`,
						url: 'https://signoz.io/docs/metrics-management/types-and-aggregation/',
						warnings: [
							{
								message:
									'Narrow the window to a period with one temporality, or re-record the metric as a delta.',
							},
						],
					},
				}),
			),
		);
	},
);

/**
 * The page's own document, rewritten to the lengths the fixture is too tame to
 * show: a title and a description that overflow, six tags, panel descriptions
 * that run past a line, and a panel on its own time preference.
 */
const tooltipDocument = (): DashboardtypesGettableDashboardV2DTO => {
	const document = dashboardResponse({
		panels: PANEL_IDS.length,
		sectioned: true,
		variables: [...VARIABLE_KINDS],
		locked: false,
	}).data;

	const panels = Object.fromEntries(
		Object.entries(document.spec.panels ?? {}).map(([id, panel]) => [
			id,
			{
				...panel,
				spec: {
					...panel.spec,
					display: {
						...panel.spec.display,
						name: id === 'request-rate' ? PANEL_NAME : panel.spec.display.name,
						description: PANEL_DESCRIPTIONS[id] ?? panel.spec.display.description,
					},
					plugin:
						id === 'error-rate' &&
						panel.spec.plugin.kind === TimeSeriesKind['signoz/TimeSeriesPanel']
							? {
									...panel.spec.plugin,
									spec: {
										...panel.spec.plugin.spec,
										visualization: { timePreference: TimePreference.last_1_month },
									},
								}
							: panel.spec.plugin,
				},
			},
		]),
	) as DashboardtypesDashboardSpecDTOPanels;

	return {
		...document,
		name: DASHBOARD_NAME,
		tags: DASHBOARD_TAGS,
		spec: {
			...document.spec,
			display: { name: DASHBOARD_NAME, description: DASHBOARD_DESCRIPTION },
			panels,
		},
	};
};

const tooltipDashboard = rest.get(
	'http://localhost/api/v2/dashboards/:id',
	(_req, res, ctx) =>
		res(
			ctx.status(200),
			ctx.json({ status: 'success', data: tooltipDocument() }),
		),
);

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
		signoz: { route: tooltipRoute },
		msw: { handlers: [tooltipDashboard, warnedPanelQuery] },
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

const desyncedDashboard = rest.get(
	'http://localhost/api/v2/dashboards/:id',
	(_req, res, ctx) => {
		const document = tooltipDocument();
		const [firstGrid, ...rest] = document.spec.layouts ?? [];

		return res(
			ctx.status(200),
			ctx.json({
				status: 'success',
				data: {
					...document,
					spec: {
						...document.spec,
						// The second grid goes, orphaning the panels it placed, and the
						// first gains slots for panels that are not in the spec: the two
						// ways a hand-edited document desyncs panels and layouts.
						layouts: [
							{
								...firstGrid,
								spec: {
									...firstGrid.spec,
									items: [
										...(firstGrid.spec?.items ?? []),
										{
											x: 0,
											y: 24,
											width: 6,
											height: 6,
											content: { $ref: '#/spec/panels/checkout-saturation' },
										},
										{
											x: 6,
											y: 24,
											width: 6,
											height: 6,
											content: { $ref: '#/spec/panels/payment-gateway-latency' },
										},
									],
								},
							},
							...rest.slice(1),
						],
					},
				},
			}),
		);
	},
);

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
	parameters: { msw: { handlers: [desyncedDashboard] } },
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

// The view modal mounts a query builder, which lists metrics before it renders.
const metricsList = rest.get(
	'http://localhost/api/v2/metrics',
	(_req, res, ctx) =>
		res(ctx.status(200), ctx.json({ status: 'success', data: { metrics: [] } })),
);

/**
 * A panel expanded into view mode, whose header carries the full panel name its
 * title truncates, over the dashboard's own tooltips behind the dialog.
 *
 * The document is answered by the story, so the Panels, Sections, Variables and
 * Locked controls do not reach it.
 */
export const TooltipsInViewPanelModal: Story = {
	args: { tooltipsOpen: true },
	parameters: { msw: { handlers: [tooltipDashboard, metricsList] } },
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
		await screen.findByText(`${PANEL_NAME} - (View mode)`);
	},
};

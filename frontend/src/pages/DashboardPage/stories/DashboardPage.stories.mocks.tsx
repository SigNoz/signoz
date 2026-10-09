/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { rest } from 'msw';
import { generatePath } from 'react-router-dom';
import ROUTES from 'constants/routes';
import type { GetPublicDashboard200 } from 'api/generated/services/sigNoz.schemas';
import { useDashboardPreferencesStore } from 'hooks/dashboard/useDashboardPreference';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';
import type { QueryRangeRequestV5 } from 'types/api/v5/queryRange';

import {
	choiceControl,
	countControl,
	multiChoiceControl,
	toggleControl,
} from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';
import {
	fieldKeysResponse,
	fieldValuesResponse,
} from '@/storybook/msw/__story_mockdata__/fields';
import { queryRangeV5ScalarResponse } from '@/storybook/msw/__story_mockdata__/queryRange';

import {
	currentDashboardDocument,
	cyclicVariablesDashboardResponse,
	patchDashboardDocument,
	PANEL_IDS,
	seedDashboardDocument,
	STORY_DASHBOARD_ID,
	VARIABLE_KINDS,
	type DashboardArgs,
	type VariableKind,
} from './__story_mockdata__/dashboard';
import {
	API_RESULTS,
	settle,
	type ApiResult,
} from './__story_mockdata__/settled';
import {
	attributeValues,
	emptyPanelResponse,
	VARIABLE_ATTRIBUTES,
	panelResponse,
	serviceVariableValues,
} from './__story_mockdata__/panelData';
import {
	desyncedDashboardResponse,
	TOOLTIP_SELECTED_SERVICES,
	TOOLTIP_WARNED_METRIC,
	tooltipDashboardResponse,
} from './__story_mockdata__/tooltipDashboard';

const LAYOUT = 'Dashboard · layout';
const DATA = 'Dashboard · panels';
const SHARING = 'Dashboard · sharing';
const REQUESTS = 'Dashboard · requests';

export const dashboardRoute = (): string =>
	generatePath(ROUTES.DASHBOARD, { dashboardId: STORY_DASHBOARD_ID });

export const tooltipRoute = (): string =>
	`${dashboardRoute()}?variables=${encodeURIComponent(
		JSON.stringify({ service: TOOLTIP_SELECTED_SERVICES }),
	)}`;

const NOT_FOUND = {
	status: 'error',
	error: {
		code: 'not_found',
		message: `dashboard with id ${STORY_DASHBOARD_ID} not found`,
		url: '',
		errors: [],
	},
};

const ok = { status: 'success', data: null };

// The editor rewrites any `Syntax error:` into its own hint, so the ClickHouse
// wording only shows through the variable bar.
const VARIABLE_QUERY_ERROR = {
	status: 'error',
	error:
		"Code: 62. DB::Exception: Syntax error: failed at position 58 ('$environment'). (SYNTAX_ERROR)",
};

const publicMeta = (): GetPublicDashboard200 => ({
	status: 'success',
	data: {
		timeRangeEnabled: true,
		defaultTimeRange: '30m',
		publicPath: `/public/dashboard/${STORY_DASHBOARD_ID}`,
	},
});

const NOT_PUBLIC = {
	status: 'error',
	error: {
		code: 'public_dashboard_not_found',
		message: `dashboard with id ${STORY_DASHBOARD_ID} isn't public`,
		url: '',
		errors: [],
	},
};

interface PanelQuerySpec {
	signal?: string;
	aggregations?: { metricName?: string }[];
	groupBy?: { name?: string }[];
}

const readPanelQuery = (
	body: QueryRangeRequestV5,
): { metricName?: string; groupBy?: string } => {
	const spec = body.compositeQuery?.queries?.[0]?.spec as
		| PanelQuerySpec
		| undefined;

	return {
		metricName: spec?.aggregations?.[0]?.metricName,
		groupBy: spec?.groupBy?.[0]?.name,
	};
};

export const dashboardMocks = defineStoryMocks({
	controls: {
		panels: countControl('Panels', {
			group: LAYOUT,
			description:
				'Panels the dashboard holds, taken in layout order. Zero is the blank dashboard a fresh one starts as.',
			value: PANEL_IDS.length,
			max: PANEL_IDS.length,
		}),
		sectioned: toggleControl('Sections', {
			group: LAYOUT,
			description:
				'Titled, collapsible, reorderable sections. Off is the single untitled grid a dashboard without sections renders.',
			value: true,
		}),
		locked: toggleControl('Locked', {
			group: LAYOUT,
			description:
				'A locked dashboard is read-only: the lock indicator shows and the edit affordances go.',
			value: false,
		}),
		variables: multiChoiceControl<VariableKind>('Variables', {
			group: LAYOUT,
			description:
				'The variable bar above the panels, one control per kind: a custom list, a query-backed list, a dynamic attribute and a free-text value.',
			options: VARIABLE_KINDS,
			value: [...VARIABLE_KINDS],
		}),
		variableValues: countControl('Variable options', {
			group: DATA,
			description: 'Values the query-backed `service` variable resolves to.',
			value: 4,
			max: 12,
		}),
		variableQueryFails: toggleControl('Variable query fails', {
			group: DATA,
			description:
				"The query-backed `service` variable answers with a ClickHouse syntax error, which the variable bar and the editor's Test Run both report.",
			value: false,
		}),
		noData: toggleControl('Panels return nothing', {
			group: DATA,
			description:
				'Every panel query answers with an empty result, which is the no-data state each renderer draws on its own.',
			value: false,
		}),
		notFound: toggleControl('Dashboard not found', {
			group: LAYOUT,
			description:
				'Answers the dashboard document with a 404, which is the page-level failure the shell renders around.',
			value: false,
		}),
		dashboardPatch: choiceControl<ApiResult>('Dashboard edit', {
			group: REQUESTS,
			description:
				'How the JSON Patch behind every spec edit answers: rename, settings, variables, clone panel or section and the variable review. `loading` never answers, `error` answers 500.',
			options: API_RESULTS,
			value: 'success',
		}),
		dashboardUpdate: choiceControl<ApiResult>('Dashboard replace', {
			group: REQUESTS,
			description: "How the PUT behind the JSON editor's Apply changes answers.",
			options: API_RESULTS,
			value: 'success',
		}),
		dashboardClone: choiceControl<ApiResult>('Dashboard clone', {
			group: REQUESTS,
			description: 'How the endpoint behind Actions, Clone dashboard answers.',
			options: API_RESULTS,
			value: 'success',
		}),
		dashboardDelete: choiceControl<ApiResult>('Dashboard delete', {
			group: REQUESTS,
			description: 'How the endpoint behind Actions, Delete dashboard answers.',
			options: API_RESULTS,
			value: 'success',
		}),
		publicWrite: choiceControl<ApiResult>('Public link change', {
			group: REQUESTS,
			description: 'How publish, update and unpublish on the Publish tab answer.',
			options: API_RESULTS,
			value: 'success',
		}),
		substituteVars: choiceControl<ApiResult>('Variable substitution', {
			group: REQUESTS,
			description:
				'How the endpoint that resolves variables before Create Alerts answers.',
			options: API_RESULTS,
			value: 'success',
		}),
		published: toggleControl('Published publicly', {
			group: SHARING,
			description:
				'Whether this dashboard has a public link, which is what the header globe reports. Turning it off is the 404 the endpoint answers for a dashboard nobody published.',
			value: true,
		}),
	},
	handlers: (values, response) => {
		const document: DashboardArgs = {
			panels: values.panels,
			sectioned: values.sectioned,
			variables: values.variables,
			locked: values.locked,
		};

		return [
			// The document is what the page renders from, so it answers on its own
			// rather than through the Data control: the panels are what that holds in
			// the loading and failed states, with the dashboard already laid out.
			rest.get('http://localhost/api/v2/dashboards/:id', (_req, res, ctx) =>
				values.notFound
					? res(ctx.status(404), ctx.json(NOT_FOUND))
					: res(ctx.status(200), ctx.json(currentDashboardDocument(document))),
			),

			// Every spec edit travels as a JSON Patch, and its response is what
			// replaces the cache, so the ops are applied to the story's document
			// rather than answered away.
			rest.patch('http://localhost/api/v2/dashboards/:id', (req, res, ctx) =>
				settle(values.dashboardPatch, req, res, ctx, async () => {
					const ops = (await req.json()) as Parameters<
						typeof patchDashboardDocument
					>[1];

					return patchDashboardDocument(document, ops);
				}),
			),

			rest.put('http://localhost/api/v2/dashboards/:id', (req, res, ctx) =>
				settle(values.dashboardUpdate, req, res, ctx, () =>
					currentDashboardDocument(document),
				),
			),

			rest.post('http://localhost/api/v2/dashboards/:id/clone', (req, res, ctx) =>
				settle(values.dashboardClone, req, res, ctx, () =>
					currentDashboardDocument(document),
				),
			),

			rest.delete('http://localhost/api/v2/dashboards/:id', (req, res, ctx) =>
				settle(values.dashboardDelete, req, res, ctx, () => ok),
			),

			rest.post('http://localhost/api/v5/substitute_vars', (req, res, ctx) =>
				settle(values.substituteVars, req, res, ctx, async () => ({
					status: 'success',
					data: await req.json(),
				})),
			),

			rest.put('http://localhost/api/v2/dashboards/:id/lock', (_req, res, ctx) =>
				res(ctx.status(200), ctx.json(ok)),
			),

			rest.delete(
				'http://localhost/api/v2/dashboards/:id/lock',
				(_req, res, ctx) => res(ctx.status(200), ctx.json(ok)),
			),

			rest.post(
				'http://localhost/api/v5/query_range',
				response.json(async (req) => {
					if (values.noData) {
						return emptyPanelResponse();
					}

					const body = (await req.json()) as QueryRangeRequestV5;

					return panelResponse({
						requestType: body.requestType,
						window: { start: body.start, end: body.end },
						...readPanelQuery(body),
					});
				}),
			),

			// The variable bar resolves before the panels and stays laid out while
			// they load or fail, so its two endpoints answer on their own rather
			// than through the Data control.
			values.variableQueryFails
				? rest.post('http://localhost/api/v2/variables/query', (_req, res, ctx) =>
						res(ctx.status(400), ctx.json(VARIABLE_QUERY_ERROR)),
					)
				: rest.post('http://localhost/api/v2/variables/query', (_req, res, ctx) =>
						res(
							ctx.status(200),
							ctx.json({
								status: 'success',
								data: {
									variableValues: serviceVariableValues(values.variableValues),
								},
							}),
						),
					),

			rest.get('http://localhost/api/v1/fields/values', (req, res, ctx) =>
				res(
					ctx.status(200),
					ctx.json(
						fieldValuesResponse(attributeValues(req.url.searchParams.get('name'))),
					),
				),
			),

			// The dynamic variable editor lists the attributes a variable can read.
			rest.get(
				'http://localhost/api/v1/fields/keys',
				response.json(() => fieldKeysResponse(VARIABLE_ATTRIBUTES)),
			),

			// The header reads the public link on every load, so it answers even while
			// the panels are held in the loading or failed state.
			rest.get('http://localhost/api/v1/dashboards/:id/public', (_req, res, ctx) =>
				values.published
					? res(ctx.status(200), ctx.json(publicMeta()))
					: res(ctx.status(404), ctx.json(NOT_PUBLIC)),
			),

			rest.post('http://localhost/api/v1/dashboards/:id/public', (req, res, ctx) =>
				settle(values.publicWrite, req, res, ctx, publicMeta),
			),

			rest.put('http://localhost/api/v1/dashboards/:id/public', (req, res, ctx) =>
				settle(values.publicWrite, req, res, ctx, publicMeta),
			),

			rest.delete(
				'http://localhost/api/v1/dashboards/:id/public',
				(req, res, ctx) => settle(values.publicWrite, req, res, ctx, () => ok),
			),
		];
	},
	config: () => ({ route: dashboardRoute() }),
	effect: (values) => {
		seedDashboardDocument({
			panels: values.panels,
			sectioned: values.sectioned,
			variables: values.variables,
			locked: values.locked,
		});
		// The sync mode persists per dashboard, so one story's pick would open the
		// next one on it.
		useDashboardPreferencesStore.setState({ preferences: {} });
	},
});

/**
 * One panel's query answered with a warning beside its value, so its header
 * carries the status indicator while the rest of the dashboard is untouched.
 * Every other query falls through to the page's own handler.
 */
export const warnedPanelQueryHandler = rest.post(
	'http://localhost/api/v5/query_range',
	async (req, res, ctx) => {
		const body = (await req.json()) as QueryRangeRequestV5;
		const spec = body.compositeQuery?.queries?.[0]?.spec as
			| { aggregations?: { metricName?: string }[] }
			| undefined;

		if (spec?.aggregations?.[0]?.metricName !== TOOLTIP_WARNED_METRIC) {
			return undefined;
		}

		return res(
			ctx.status(200),
			ctx.json(
				queryRangeV5ScalarResponse(0.94, 'A', {
					warning: {
						code: 'partial_data',
						message: `Some series for ${TOOLTIP_WARNED_METRIC} were dropped: the metric changed temporality partway through the selected window.`,
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

export const tooltipDashboardHandler = rest.get(
	'http://localhost/api/v2/dashboards/:id',
	(_req, res, ctx) => res(ctx.status(200), ctx.json(tooltipDashboardResponse())),
);

export const desyncedDashboardHandler = rest.get(
	'http://localhost/api/v2/dashboards/:id',
	(_req, res, ctx) =>
		res(ctx.status(200), ctx.json(desyncedDashboardResponse())),
);

// The view modal mounts a query builder, which lists metrics before it renders.
export const metricsListHandler = rest.get(
	'http://localhost/api/v2/metrics',
	(_req, res, ctx) =>
		res(ctx.status(200), ctx.json({ status: 'success', data: { metrics: [] } })),
);

export const cyclicVariablesDashboardHandler = rest.get(
	'http://localhost/api/v2/dashboards/:id',
	(_req, res, ctx) =>
		res(ctx.status(200), ctx.json(cyclicVariablesDashboardResponse())),
);

// The dashboard document loads before the toolbar renders.
export const PAGE_LOAD = { timeout: 10000 };

export const clickAction = async (
	canvasElement: HTMLElement,
	label: string,
): Promise<void> => {
	// The dropdown trigger's Slot merge drops the button's own test id.
	await userEvent.click(
		await within(canvasElement).findByRole(
			'button',
			{ name: 'Actions' },
			PAGE_LOAD,
		),
	);
	const item = await screen.findByText(label);
	const menuItem = item.closest('[role="menuitem"]') ?? item;

	await waitFor(() => {
		expect(menuItem).not.toHaveAttribute('aria-disabled', 'true');
		expect(menuItem).not.toHaveAttribute('data-disabled');
	});
	await userEvent.click(menuItem);
};

export const clickPanelAction = async (
	canvasElement: HTMLElement,
	panelId: string,
	label: string,
): Promise<void> => {
	await userEvent.click(
		await within(canvasElement).findByTestId(
			`panel-actions-${panelId}`,
			{},
			PAGE_LOAD,
		),
	);
	await userEvent.click(await screen.findByText(label));
};

export const clickSectionAction = async (
	canvasElement: HTMLElement,
	label: string,
): Promise<void> => {
	const [firstSection] = await within(canvasElement).findAllByRole(
		'button',
		{ name: 'Section actions' },
		PAGE_LOAD,
	);
	await userEvent.click(firstSection);
	await userEvent.click(await screen.findByText(label));
};

export const expectToast = (text: string | RegExp): Promise<HTMLElement> =>
	screen.findByText(text, undefined, PAGE_LOAD);

export const openJsonEditor = async (
	canvasElement: HTMLElement,
): Promise<void> => {
	await userEvent.click(
		await within(canvasElement).findByTestId('edit-json', {}, PAGE_LOAD),
	);
	await screen.findByTestId('json-editor-copy', {}, PAGE_LOAD);
};

export const confirmImpact = async (): Promise<void> => {
	await userEvent.click(await screen.findByTestId('variable-impact-confirm'));
};

/**
 * A denied control stays on screen, disabled. Buttons say so through
 * `disabled` or `aria-disabled` depending on the Button, menu rows through
 * `data-disabled`.
 */
const isDisabled = (element: HTMLElement): boolean =>
	element.hasAttribute('disabled') ||
	element.getAttribute('aria-disabled') === 'true' ||
	element.hasAttribute('data-disabled');

export const expectDisabled = (
	element: HTMLElement,
	disabled = true,
): Promise<void> =>
	waitFor(() => expect(isDisabled(element)).toBe(disabled), PAGE_LOAD);

export const toolbarButton = (
	canvasElement: HTMLElement,
	name: string,
): Promise<HTMLElement> =>
	within(canvasElement).findByRole('button', { name }, PAGE_LOAD);

export const openActionsMenu = async (
	canvasElement: HTMLElement,
): Promise<void> => {
	// The dropdown trigger's Slot merge drops the button's own test id.
	await userEvent.click(await toolbarButton(canvasElement, 'Actions'));
	await screen.findByText('Clone dashboard');
};

// Not by test id: the Actions menu only carries them on some Dropdown versions.
export const menuItem = (name: string): HTMLElement =>
	screen.getByRole('menuitem', { name });

export type SettingsTab = 'Overview' | 'Variables' | 'Publish';

export type VariableType = 'dynamic' | 'textbox' | 'custom' | 'query';

type RowAction = 'edit' | 'delete' | 'apply-all';

/** Opens the settings drawer from the toolbar and returns the tab's panel. */
export const openSettings = async (
	canvasElement: HTMLElement,
	tab: SettingsTab = 'Overview',
): Promise<HTMLElement> => {
	await userEvent.click(
		await within(canvasElement).findByTestId('show-drawer', {}, PAGE_LOAD),
	);

	if (tab !== 'Overview') {
		await userEvent.click(await screen.findByRole('tab', { name: tab }));
	}

	return screen.findByRole('tabpanel');
};

export const variableRow = (name: string): Promise<HTMLElement> =>
	screen.findByTestId(`variable-row-${name}`, {}, PAGE_LOAD);

/** Row actions render once the edit permission resolves. */
export const clickRowAction = async (
	name: string,
	action: RowAction,
): Promise<void> => {
	const row = await variableRow(name);

	await userEvent.click(
		action === 'apply-all'
			? // The tooltip trigger's Slot merge drops this button's test id.
				await within(row).findByRole('button', { name: 'Apply to all' }, PAGE_LOAD)
			: await within(row).findByTestId(
					`variable-${action}-${name}`,
					{},
					PAGE_LOAD,
				),
	);
};

/** A new variable's editor, which opens on the Dynamic type. */
export const openNewVariable = async (
	canvasElement: HTMLElement,
): Promise<void> => {
	const panel = await openSettings(canvasElement, 'Variables');
	const add = await within(panel).findByTestId('add-variable', {}, PAGE_LOAD);

	// Disabled until its permission check resolves: through `disabled` or
	// `aria-disabled`, depending on the Button.
	await waitFor(() => expect(add).toBeEnabled(), PAGE_LOAD);
	await waitFor(
		() => expect(add).not.toHaveAttribute('aria-disabled', 'true'),
		PAGE_LOAD,
	);
	await userEvent.click(add);
	await screen.findByText('Variable Type');
};

export const openVariableEditor = async (
	canvasElement: HTMLElement,
	name: string,
): Promise<void> => {
	await openSettings(canvasElement, 'Variables');
	await clickRowAction(name, 'edit');
	await screen.findByText('Variable Type');
};

/**
 * A value in the editor's preview. The toolbar's selector for the same variable
 * resolves to its first value too, whenever its own query returns.
 */
export const findPreviewValue = async (value: string): Promise<HTMLElement> => {
	const label = await screen.findByText('Preview of Values');

	return within(label.parentElement as HTMLElement).findByText(
		value,
		undefined,
		PAGE_LOAD,
	);
};

export const pickVariableType = async (type: VariableType): Promise<void> => {
	await userEvent.click(await screen.findByTestId(`variable-type-${type}`));
};

export const typeVariableName = async (name: string): Promise<void> => {
	const input = await screen.findByTestId('variable-name');

	await userEvent.clear(input);
	await userEvent.type(input, name);
};

/**
 * The editor's pickers are antd Selects: the element carrying the test id does
 * nothing on click, the combobox inside it is what opens the list.
 */
export const openVariableSelect = async (testId: string): Promise<void> => {
	const select = await screen.findByTestId(testId);

	await userEvent.click(within(select).getByRole('combobox'));
};

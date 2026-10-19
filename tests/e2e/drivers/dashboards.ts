import {
	expect,
	type Locator,
	type Page,
	type Request,
} from '@playwright/test';

import type {
	DashboardtypesGettableDashboardV2DTO,
	DashboardtypesJSONPatchOperationDTO,
	DashboardtypesPanelDTO,
	DashboardtypesPatchOpDTO,
} from './schemas';

import { antdDriver } from './antd';
import { apiDriver } from './api';
import { asAdmin, driver, kit, type Layer } from './kit';

/**
 * The v2 dashboards surface: the list page and one dashboard's detail page.
 *
 * The v2 API's own contract — schema version, name rules, tag limits, layout
 * validation, the create/update/delete lifecycle — is covered headless by
 * `tests/integration/tests/dashboard/03_v2_dashboard.py`, and the list and panel
 * components are covered by jest under `src/pages/Dashboard*Page/`. What is left
 * for a browser is the round trip: a flow driven through the UI reaching the
 * real API and coming back.
 */

export const DASHBOARDS_LIST_PATH = '/dashboard';

/** The only schema version `POST /api/v2/dashboards` accepts. */
const SCHEMA_VERSION = 'v6';

export interface DashboardSeed {
	id: string;
	/** DNS-label name, which the API requires and the URL carries. */
	name: string;
	/** Human title, which is what the list and the detail header render. */
	title: string;
}

export type PanelKind =
	| 'signoz/TimeSeriesPanel'
	| 'signoz/BarChartPanel'
	| 'signoz/AreaChartPanel';

/** A panel kind's renderer, as its `<renderer>-renderer` testid names it. */
export type PanelRenderer = 'time-series' | 'area-chart' | 'bar-panel';

export interface PanelSeed {
	kind?: PanelKind;
	title: string;
	metricName: string;
	filter?: string;
	pluginSpec?: Record<string, unknown>;
}

/** A single-select custom variable. */
export interface CustomVariableSeed {
	/** Also the metric attribute the seeded panel filters on. */
	name: string;
	/** Comma-separated, as the variable editor takes them. */
	values: string;
}

export type PatchOp = Omit<DashboardtypesJSONPatchOperationDTO, 'op'> & {
	op: `${DashboardtypesPatchOpDTO}`;
};

export type PanelRead = DashboardtypesPanelDTO;

export type DashboardSpecRead = DashboardtypesGettableDashboardV2DTO['spec'];

export type PanelAction =
	| 'view-panel'
	| 'edit-panel'
	| 'clone-panel'
	| 'delete-panel';

/** One Grid layout to seed: untitled is the root, titled is a section. */
export interface LayoutSeed {
	title?: string;
	/** Panel ids. Each becomes a table panel named after its id. */
	panels: string[];
}

/** The slice of `GET /api/v2/dashboards/{id}` the specs assert on. */
export interface StoredDashboard {
	name: string;
	tags: { key: string; value: string }[] | null;
	spec: {
		display: { name: string };
		panels: Record<string, unknown>;
		layouts: {
			kind: string;
			spec: {
				display?: { title?: string };
				items: { content?: { $ref?: string } }[];
			};
		}[];
	};
}

export interface Dashboards {
	/** Seed a dashboard through the v2 API. Returns its id, name and title. */
	create(
		title: string,
		tags?: string[],
		layouts?: LayoutSeed[],
	): Promise<DashboardSeed>;
	fetch(id: string): Promise<StoredDashboard>;
	/** Run `body` against this driver bound to an admin page, for seeding as a viewer. */
	asAdmin<T>(body: (admin: Dashboards) => Promise<T>): Promise<T>;
	remove(id: string): Promise<void>;
	/** Delete every dashboard whose title matches, for best-effort teardown. */
	removeByTitle(title: string): Promise<void>;

	gotoList(): Promise<void>;
	goto(id: string): Promise<void>;
	search(): Locator;
	searchFor(text: string): Promise<void>;
	/** The list row carrying `title`. */
	row(title: string): Locator;
	rowTitles(): Promise<string[]>;
	openRowActions(title: string): Promise<void>;
	action(name: string): Locator;

	/** Confirm the list row's delete prompt. */
	confirmListDelete(): Promise<void>;
	/** Rename through the list row's modal. */
	renameFromList(title: string): Promise<void>;
	/** Replace the row's tags through its modal, `key:value` each. */
	editTagsFromList(tags: string[]): Promise<void>;

	newDashboardButton(): Locator;
	/** Drive the New dashboard modal through to a created dashboard. */
	createThroughUi(title: string, description?: string): Promise<void>;

	title(): Locator;
	rename(title: string): Promise<void>;
	/** The click-to-edit title's input, present only while editing. */
	titleInput(): Locator;
	/** The inline lock toggle. It only renders once the dashboard is locked. */
	lockButton(): Locator;
	/** Lock or unlock through the Actions menu, the entry point while unlocked. */
	toggleLockFromActions(): Promise<void>;
	optionsButton(): Locator;
	editJsonButton(): Locator;
	jsonApplyButton(): Locator;
	/** The JSON editor's text, Monaco or CodeMirror. */
	jsonEditor(): Locator;
	addPanelButton(): Locator;
	addVariableButton(): Locator;
	/** The panel editor's primary action. */
	savePanelButton(): Locator;

	/** Seed a dashboard with one panel querying `panel.metricName`. */
	createWithPanel(
		title: string,
		panel: PanelSeed,
	): Promise<DashboardSeed & { panelId: string }>;
	/** Seed a dashboard with `variable` and one panel filtered by `service.name = $<name>`. */
	createWithVariable(
		title: string,
		variable: CustomVariableSeed,
		panel: PanelSeed,
	): Promise<DashboardSeed & { panelId: string }>;
	getSpec(id: string): Promise<DashboardSpecRead>;

	/** Open the new-panel modal and pick `kind`; lands in the panel editor. */
	addPanel(kind: PanelKind): Promise<void>;
	panel(panelId: string): Locator;
	panelTitle(panelId: string): Locator;
	panelRenderer(panelId: string, renderer: PanelRenderer): Locator;
	panelRendererCanvas(panelId: string, renderer: PanelRenderer): Locator;
	panelCanvas(panelId: string): Locator;
	panelError(panelId: string): Locator;
	panelAction(panelId: string, action: PanelAction): Promise<void>;
	panelIds(): Promise<string[]>;
	variableSelect(name: string): Locator;
	/** Options of the open variable dropdown. */
	variableOptions(): Locator;
	pickVariable(name: string, value: string): Promise<void>;
	confirmDeleteButton(): Locator;
	/** Delete in the list's confirm dialog, an antd confirm with no testid. */
	listDeleteConfirmButton(): Locator;
	/** Run `act` and resolve the dashboard PATCH it sends, as its ops. */
	patched(act: () => Promise<unknown>): Promise<PatchOp[]>;
	/** The next `query_range` whose `variables[name].value` contains `value`. */
	nextQueryWithVariable(name: string, value: string): Promise<Request>;
	viewPanel: {
		typeSelector(): Locator;
		canvas(): Locator;
		switchToEdit(): Locator;
	};

	/** The tooltip a hovered menu row shows, which carries a disabled row's reason. */
	hoverReason(row: Locator): Promise<Locator>;

	openPanelMenu(panelId: string): Promise<void>;
	/** `view-panel`, `edit-panel`, `delete-panel`, … */
	panelMenuItem(panelId: string, value: string): Locator;
	viewPanelModal(): Locator;

	section(title: string): Locator;
	openSectionMenu(title: string): Promise<void>;
	/** `rename`, `clone-section`, `delete-section`, `add-panel`. */
	sectionAction(value: string): Locator;
	submitSectionTitle(title: string): Promise<void>;
	confirmDelete(): Promise<void>;
}

const tablePanel = (name: string): unknown => ({
	kind: 'Panel',
	spec: {
		display: { name },
		links: [],
		plugin: { kind: 'signoz/TablePanel', spec: {} },
		queries: [
			{
				kind: 'time_series',
				spec: {
					plugin: {
						kind: 'signoz/BuilderQuery',
						spec: {
							name: 'A',
							signal: 'logs',
							aggregations: [{ expression: 'count()' }],
						},
					},
				},
			},
		],
	},
});

export function dashboardsDriver(page: Page): Dashboards {
	const api = apiDriver(page);

	/** `name` is a DNS label: lowercase, digits and dashes only. */
	const dnsLabel = (title: string): string =>
		title
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.slice(0, 60);

	const withPanel = async (
		title: string,
		panel: PanelSeed,
		variables: unknown[],
	): Promise<DashboardSeed & { panelId: string }> => {
		const panelId = SEEDED_PANEL_ID;
		const name = dnsLabel(`${title}-${Date.now()}`);
		const id = await api.create('/api/v2/dashboards', {
			schemaVersion: SCHEMA_VERSION,
			name,
			tags: [],
			spec: {
				display: { name: title },
				variables,
				panels: { [panelId]: panelBody(panel) },
				layouts: [
					{
						kind: 'Grid',
						spec: {
							items: [
								{
									x: 0,
									y: 0,
									width: 6,
									height: 6,
									content: { $ref: `#/spec/panels/${panelId}` },
								},
							],
						},
					},
				],
				links: [],
			},
		});
		return { id, name, title, panelId };
	};

	const dashboards: Dashboards = {
		create: async (title, tags = [], layouts = []) => {
			const name = dnsLabel(`${title}-${Date.now()}`);
			const panels = Object.fromEntries(
				layouts
					.flatMap((layout) => layout.panels)
					.map((id) => [id, tablePanel(id)]),
			);
			const id = await api.create('/api/v2/dashboards', {
				schemaVersion: SCHEMA_VERSION,
				name,
				tags,
				spec: {
					display: { name: title },
					variables: [],
					panels,
					layouts: layouts.map((layout) => ({
						kind: 'Grid',
						spec: {
							...(layout.title ? { display: { title: layout.title } } : {}),
							items: layout.panels.map((panelId, index) => ({
								x: (index % 2) * 6,
								y: Math.floor(index / 2) * 6,
								width: 6,
								height: 6,
								content: { $ref: `#/spec/panels/${panelId}` },
							})),
						},
					})),
					links: [],
				},
			});
			return { id, name, title };
		},

		fetch: async (id) =>
			(await api.get<{ data: StoredDashboard }>(`/api/v2/dashboards/${id}`)).data,

		asAdmin: (body) => asAdmin(page, dashboardsDriver, body),

		remove: (id) => api.tryDel(`/api/v2/dashboards/${id}`),

		removeByTitle: async (title) => {
			const body = await api.get<{
				data?: {
					dashboards?: { id: string; spec?: { display?: { name?: string } } }[];
				};
			}>('/api/v2/dashboards?limit=200');
			await Promise.all(
				(body.data?.dashboards ?? [])
					.filter((entry) => entry.spec?.display?.name === title)
					.map((entry) => dashboards.remove(entry.id)),
			);
		},

		gotoList: async () => {
			await page.goto(DASHBOARDS_LIST_PATH);
			await expect(dashboards.search()).toBeVisible();
		},

		goto: async (id) => {
			await page.goto(`${DASHBOARDS_LIST_PATH}/${id}`);
			await expect(dashboards.title()).toBeVisible();
		},

		search: () => page.getByTestId('dashboards-list-search'),

		// The search box is a CodeMirror editor over the list-filter DSL, so the
		// text goes in as a `name CONTAINS` clause. `insertText` skips the
		// autocomplete, which would otherwise rewrite what is typed.
		searchFor: async (text) => {
			await dashboards.search().locator('.cm-content').click();
			await page.keyboard.press('ControlOrMeta+a');
			await page.keyboard.press('Delete');
			await page.keyboard.insertText(`name CONTAINS '${text}'`);
			await page.keyboard.press('Escape');
			await page.getByTestId('dashboards-list-search-submit').click();
		},

		// The row's title cell carries an index-suffixed testid, so the row is
		// reached through its text and then widened to the row container.
		row: (title) =>
			page
				.locator('[data-testid^="dashboard-title-"]')
				.filter({ hasText: title })
				.first(),

		rowTitles: () =>
			page.locator('[data-testid^="dashboard-title-"]').allInnerTexts(),

		openRowActions: async (title) => {
			await dashboards
				.row(title)
				.locator('xpath=ancestor::*[.//*[@data-testid="dashboard-action-icon"]][1]')
				.getByTestId('dashboard-action-icon')
				.click();
		},

		action: (name) => page.getByTestId(`dashboard-action-${name}`),

		confirmListDelete: async () => {
			await page
				.getByRole('dialog')
				.getByRole('button', { name: 'Delete', exact: true })
				.click();
		},

		renameFromList: async (title) => {
			const input = page.getByTestId('rename-dashboard-input');
			await input.fill(title);
			await page.getByTestId('rename-dashboard-submit').click();
			await expect(input).toHaveCount(0);
		},

		editTagsFromList: async (tags) => {
			const input = page.getByTestId('edit-dashboard-tags');
			// Closing a chip removes the tag; the modal opens with the current ones.
			const chips = page.locator(
				'[data-testid^="edit-dashboard-tags-chip"] button',
			);
			while ((await chips.count()) > 0) {
				await chips.first().click();
			}
			for (const tag of tags) {
				await input.fill(tag);
				await input.press('Enter');
			}
			await page.getByTestId('edit-tags-submit').click();
			await expect(input).toHaveCount(0);
		},

		newDashboardButton: () => page.getByTestId('new-dashboard-cta'),

		createThroughUi: async (title, description) => {
			await dashboards.newDashboardButton().click();
			await page.getByTestId('create-dashboard-name').fill(title);
			if (description) {
				await page.getByTestId('create-dashboard-description').fill(description);
			}
			await page.getByTestId('create-dashboard-submit').click();
		},

		title: () => page.getByTestId('dashboard-title'),

		// The title is a click-to-edit field: committing with Enter matches what
		// the Save button does, and a blur outside the editor commits too.
		rename: async (title) => {
			await dashboards.title().click();
			const input = page.getByTestId('dashboard-title-input');
			await input.fill(title);
			await page.getByTestId('dashboard-title-save').click();
			await expect(input).toHaveCount(0);
		},

		titleInput: () => page.getByTestId('dashboard-title-input'),

		lockButton: () => page.getByTestId('dashboard-lock'),
		toggleLockFromActions: async () => {
			await dashboards.optionsButton().click();
			await page.getByTestId('dashboard-action-lock').click();
		},
		optionsButton: () => page.getByTestId('options'),
		editJsonButton: () => page.getByTestId('edit-json'),
		jsonApplyButton: () => page.getByTestId('json-editor-apply'),
		jsonEditor: () => page.locator('.monaco-editor, .cm-content').first(),
		addPanelButton: () =>
			page.getByTestId('add-panel').or(page.getByTestId('add-panel-header')),
		addVariableButton: () =>
			page
				.getByTestId('dashboard-variables-add')
				.or(page.getByTestId('add-variable')),
		savePanelButton: () => page.getByTestId('panel-editor-v2-save'),

		createWithPanel: (title, panel) => withPanel(title, panel, []),

		createWithVariable: (title, variable, panel) =>
			withPanel(
				title,
				{ ...panel, filter: `${variable.name} = $${variable.name}` },
				[
					{
						kind: 'ListVariable',
						spec: {
							name: variable.name,
							display: { name: variable.name },
							allowMultiple: false,
							allowAllValue: false,
							plugin: {
								kind: 'signoz/CustomVariable',
								spec: { customValue: variable.values },
							},
						},
					},
				],
			),

		getSpec: async (id) =>
			(
				await api.get<{ data: { spec: DashboardSpecRead } }>(
					`/api/v2/dashboards/${id}`,
				)
			).data.spec,

		// With more than one section the modal asks for a target section and a
		// confirm; with one or none a tile click creates the panel outright.
		addPanel: async (kind) => {
			await dashboards.addPanelButton().first().click();
			await page.getByTestId(`panel-type-${kind}`).click();
			const confirm = page.getByTestId('panel-type-confirm');
			if (await confirm.isVisible()) {
				await confirm.click();
			}
			await expect(page).toHaveURL(/\/panel\/new\?panelKind=/);
		},

		panel: (panelId) => page.getByTestId(`panel-${panelId}`),

		panelTitle: (panelId) => dashboards.panel(panelId).getByTestId('panel-title'),
		panelRenderer: (panelId, renderer) =>
			dashboards.panel(panelId).getByTestId(`${renderer}-renderer`),
		panelRendererCanvas: (panelId, renderer) =>
			dashboards.panelRenderer(panelId, renderer).locator('canvas').first(),
		panelCanvas: (panelId) => dashboards.panel(panelId).locator('canvas').first(),
		panelError: (panelId) => dashboards.panel(panelId).getByTestId('panel-error'),

		panelAction: async (panelId, action) => {
			const trigger = page.getByTestId(`panel-actions-${panelId}`);
			await dashboards.panel(panelId).hover();
			await trigger.click();
			await page.getByTestId(`panel-actions-${panelId}-item-${action}`).click();
		},

		panelIds: async () => {
			const roots = page.locator('[data-panel-root]');
			const ids = await roots.evaluateAll((nodes) =>
				nodes.map((node) => node.getAttribute('data-panel-root') ?? ''),
			);
			return ids.filter(Boolean);
		},

		variableSelect: (name) => page.getByTestId(`variable-select-${name}`),

		variableOptions: () =>
			page
				.locator(
					'.custom-select-dropdown-container:not(.ant-select-dropdown-hidden)',
				)
				.getByRole('option'),

		pickVariable: async (name, value) => {
			await dashboards.variableSelect(name).click();
			await dashboards
				.variableOptions()
				.filter({ has: page.getByText(value, { exact: true }) })
				.click();
			await expect(dashboards.variableSelect(name)).toContainText(value);
		},

		confirmDeleteButton: () => page.getByTestId('confirm-delete'),
		listDeleteConfirmButton: () =>
			page
				.getByRole('dialog')
				.getByRole('button', { name: 'Delete', exact: true }),

		patched: (act) =>
			patchOps(page, async () => {
				await act();
			}),

		nextQueryWithVariable: (name, value) =>
			page.waitForRequest((req) => {
				if (req.method() !== 'POST' || !req.url().includes('/api/v5/query_range')) {
					return false;
				}
				const body = req.postDataJSON() as {
					variables?: Record<string, { value?: unknown }>;
				};
				return JSON.stringify(body.variables?.[name]?.value ?? '').includes(value);
			}),

		viewPanel: {
			typeSelector: () => page.getByTestId('view-panel-type-selector'),
			canvas: () =>
				page.getByTestId('view-panel-modal-content').locator('canvas').first(),
			switchToEdit: () => page.getByTestId('view-panel-switch-to-edit'),
		},

		// The previous row's tooltip can still be fading out, so take the newest.
		hoverReason: async (row) => {
			await row.hover();
			return page.getByRole('tooltip').last();
		},

		openPanelMenu: async (panelId) => {
			await page.getByTestId(`panel-actions-${panelId}`).click();
		},
		panelMenuItem: (panelId, value) =>
			page.getByTestId(`panel-actions-${panelId}-item-${value}`),
		viewPanelModal: () => page.getByTestId('view-panel-modal-content'),

		section: (title) =>
			page
				.locator('[data-section-layout-index]')
				.filter({ has: page.getByText(title, { exact: true }) }),
		openSectionMenu: async (title) => {
			await dashboards
				.section(title)
				.getByRole('button', { name: 'Section actions' })
				.click();
		},
		sectionAction: (value) =>
			page.locator(
				`[data-testid^="dashboard-section-actions-"][data-testid$="-item-${value}"]`,
			),
		submitSectionTitle: async (title) => {
			const input = page.getByTestId('section-title-input');
			await input.fill(title);
			await page.getByTestId('section-title-submit').click();
			await expect(input).toHaveCount(0);
		},
		confirmDelete: async () => {
			await page.getByTestId('confirm-delete').click();
		},
	};

	return dashboards;
}

/** Fixed key for the one panel a seed creates; ids are per dashboard. */
const SEEDED_PANEL_ID = 'e2e-panel-1';

function panelBody(panel: PanelSeed): Record<string, unknown> {
	return {
		kind: 'Panel',
		spec: {
			display: { name: panel.title },
			links: [],
			plugin: {
				kind: panel.kind ?? 'signoz/TimeSeriesPanel',
				spec: panel.pluginSpec ?? {},
			},
			queries: [
				{
					kind: 'time_series',
					spec: {
						plugin: {
							kind: 'signoz/BuilderQuery',
							spec: {
								name: 'A',
								signal: 'metrics',
								aggregations: [
									{
										metricName: panel.metricName,
										timeAggregation: 'rate',
										spaceAggregation: 'sum',
									},
								],
								...(panel.filter ? { filter: { expression: panel.filter } } : {}),
							},
						},
					},
				},
			],
		},
	};
}

export const withDashboards: Layer<{ dashboards: Dashboards }> = driver(
	'dashboards',
	({ page }) => dashboardsDriver(page),
);

export type StackMode = 'none' | 'normal' | 'percent';

export interface VariableEditor {
	/** Open the Variables settings with the add form primed. */
	open(): Promise<void>;
	/** Fill and save a custom variable; resolves the PATCH ops. */
	create(variable: CustomVariableSeed): Promise<PatchOp[]>;
	row(name: string): Locator;
}

export interface PanelEditor {
	goto(dashboardId: string, panelId: string): Promise<void>;
	root(): Locator;
	title(): Locator;
	setTitle(title: string): Promise<void>;
	/** Pick a panel type by its display name ("Area Chart"). */
	setType(label: string): Promise<void>;
	/** Expand a config section by its title ("Thresholds"); no-op when open. */
	openSection(title: string): Promise<void>;
	metricInput(index?: number): Locator;
	pickMetric(name: string, index?: number): Promise<void>;
	/** Press Run and resolve the `query_range` request it sends. */
	run(): Promise<Request>;
	preview(): Locator;
	previewCanvas(): Locator;
	previewRenderer(renderer: PanelRenderer): Locator;
	/** Add a label threshold through the section's header quick-add and save the row. */
	addThreshold(threshold: { value: number; label: string }): Promise<void>;
	thresholdEdit(index: number): Locator;
	thresholdValue(index: number): Locator;
	setStackMode(mode: StackMode): Promise<void>;
	stackedBar(): Locator;
	setStackedBar(on: boolean): Promise<void>;
	/** Save, resolve the PATCH ops, and wait for the editor to leave. */
	save(): Promise<PatchOp[]>;
	/** The toast a successful save raises on the dashboard. */
	savedToast(): Locator;
	close(): Promise<void>;
	discardDialog(): Locator;
	variables: VariableEditor;
}

const isDashboardPatch = (request: Request): boolean =>
	request.method() === 'PATCH' &&
	/\/api\/v2\/dashboards\/[^/?]+$/.test(new URL(request.url()).pathname);

async function patchOps(
	page: Page,
	act: () => Promise<void>,
): Promise<PatchOp[]> {
	const response = page.waitForResponse((res) =>
		isDashboardPatch(res.request()),
	);
	await act();
	const res = await response;
	expect(res.ok(), `PATCH ${res.url()} ${res.status()}`).toBe(true);
	return res.request().postDataJSON() as PatchOp[];
}

export function panelEditorDriver(page: Page): PanelEditor {
	const antd = antdDriver(page);
	// ResizablePanelGroup mirrors its `id` into `data-testid`, so the bare testid
	// also matches the group inside the page.
	const root = (): Locator =>
		page.locator('[data-testid="panel-editor-v2"]:not([data-group])');

	const editor: PanelEditor = {
		goto: async (dashboardId, panelId) => {
			await page.goto(`${DASHBOARDS_LIST_PATH}/${dashboardId}/panel/${panelId}`);
			await expect(root()).toBeVisible();
		},

		root,
		title: () => page.getByTestId('panel-editor-v2-title'),

		setTitle: async (title) => {
			await editor.title().fill(title);
		},

		// ConfigSelect has no search box, so the option is clicked in the select's
		// own dropdown rather than through `antd.pickByName`.
		setType: async (label) => {
			const trigger = page.getByTestId('panel-editor-v2-type-switcher');
			await trigger.click();
			const drawer = page.getByTestId('panel-type-switcher-drawer');
			await drawer
				.locator('[data-testid^="panel-type-"]')
				.filter({ has: page.getByText(label, { exact: true }) })
				.click();
			await expect(drawer).toBeHidden();
			await expect(trigger).toContainText(label);
		},

		openSection: async (title) => {
			const toggle = page.getByTestId(
				`config-section-${title.toLowerCase().replace(/\s+/g, '-')}`,
			);
			if ((await toggle.getAttribute('aria-expanded')) !== 'true') {
				await toggle.click();
			}
			await expect(toggle).toHaveAttribute('aria-expanded', 'true');
		},

		metricInput: (index = 0) =>
			root().getByTestId(`metric-name-selector-${index}`).locator('input'),

		pickMetric: async (name, index = 0) => {
			const input = editor.metricInput(index);
			await input.click();
			await input.fill(name);
			await antd
				.openDropdown()
				.locator('.ant-select-item-option')
				.filter({ has: page.getByText(name, { exact: true }) })
				.first()
				.click();
			await expect(input).toHaveValue(name);
		},

		run: async () => {
			const request = page.waitForRequest(
				(req) =>
					req.method() === 'POST' && req.url().includes('/api/v5/query_range'),
			);
			await page.getByTestId('panel-editor-v2-run-query').click();
			return request;
		},

		preview: () => page.getByTestId('panel-editor-v2-preview'),
		previewCanvas: () =>
			editor.preview().getByTestId('uplot-main-div').locator('canvas').first(),
		previewRenderer: (renderer) =>
			editor.preview().getByTestId(`${renderer}-renderer`),

		addThreshold: async ({ value, label }) => {
			await page.getByTestId('panel-editor-v2-add-threshold-header').click();
			await editor.thresholdValue(0).fill(String(value));
			await page.getByTestId('threshold-label-0').fill(label);
			await page.getByTestId('threshold-save-0').click();
			await expect(editor.thresholdEdit(0)).toBeVisible();
		},

		thresholdEdit: (index) => page.getByTestId(`threshold-edit-${index}`),
		thresholdValue: (index) => page.getByTestId(`threshold-value-${index}`),

		setStackMode: async (mode) => {
			const tile = page.getByTestId(`panel-editor-v2-stack-mode-${mode}`);
			await tile.click();
			await expect(tile.getByRole('radio')).toBeChecked();
		},

		stackedBar: () => page.getByTestId('panel-editor-v2-stacked-bar-chart'),

		setStackedBar: async (on) => {
			const tile = editor
				.stackedBar()
				.getByTestId(
					`panel-editor-v2-stacked-bar-chart-${on ? 'stacked' : 'side'}`,
				);
			await tile.click();
			await expect(tile.getByRole('radio')).toBeChecked();
		},

		save: async () => {
			const ops = await patchOps(page, () =>
				page.getByTestId('panel-editor-v2-save').click(),
			);
			await expect(page).not.toHaveURL(/\/panel\//);
			return ops;
		},

		savedToast: () => page.getByText('Panel saved'),

		close: async () => {
			await page.getByTestId('panel-editor-v2-close').click();
		},

		discardDialog: () => page.getByTestId('panel-editor-v2-discard-modal'),

		variables: {
			open: async () => {
				await page
					.getByTestId('dashboard-variables-add')
					.or(page.getByTestId('add-variable'))
					.first()
					.click();
				await expect(page.getByTestId('variable-name')).toBeVisible();
			},

			create: async ({ name, values }) => {
				await page.getByTestId('variable-name').fill(name);
				await page.getByTestId('variable-type-custom').click();
				await page.getByTestId('variable-custom-input').fill(values);
				return patchOps(page, () => page.getByTestId('variable-save').click());
			},

			row: (name) => page.getByTestId(`variable-row-${name}`),
		},
	};

	return editor;
}

export const withPanelEditor: Layer<{ panelEditor: PanelEditor }> = driver(
	'panelEditor',
	({ page }) => panelEditorDriver(page),
);

/** The dashboards `test`. */
export const test = withPanelEditor(withDashboards(kit));
export { expect, SEEDED_DATA_TIMEOUT } from './kit';

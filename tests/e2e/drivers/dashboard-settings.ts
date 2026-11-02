/**
 * AI-owned. Generated and maintained by coding agents alongside the specs that
 * use it. Do not hand-edit: regenerate it with the spec that needs the change.
 */
import { expect, type Locator, type Page } from '@playwright/test';

import { buildDashboard, panel, PanelKind } from '../helpers/dashboard-spec';
import type {
	PostableDashboard,
	Signal,
	Variable,
} from '../helpers/dashboard-spec.types';

import { toolbarAt } from './dashboard-page';
import { boxOf, dragBy, openSelectOption } from './panels/dom';
import { PATH } from './dashboards';
import { driver } from './kit';
import { test as panelsTest } from './panels';

// The dashboard toolbar: time picker, variables bar and the Configure drawer.

// ─── Variable fixtures ───────────────────────────────────────────────────

export function textVariable(name: string, value: string): Variable {
	return { kind: 'TextVariable', spec: { name, display: { name }, value } };
}

export function customVariable(
	name: string,
	values: string[],
	options: { multi?: boolean; all?: boolean } = {},
): Variable {
	return listVariable(name, options, {
		kind: 'signoz/CustomVariable',
		spec: { customValue: values.join(',') },
	});
}

/** `queryValue` is ClickHouse SQL; `{{.name}}` references another variable. */
export function queryVariable(
	name: string,
	queryValue: string,
	options: { multi?: boolean; all?: boolean } = {},
): Variable {
	return listVariable(name, options, {
		kind: 'signoz/QueryVariable',
		spec: { queryValue },
	});
}

export function dynamicVariable(
	name: string,
	attribute: string,
	signal: Signal,
): Variable {
	return listVariable(
		name,
		{ multi: true, all: true },
		{ kind: 'signoz/DynamicVariable', spec: { name: attribute, signal } },
		'alphabetical-asc',
	);
}

function listVariable(
	name: string,
	options: { multi?: boolean; all?: boolean },
	plugin: Extract<Variable, { kind: 'ListVariable' }>['spec']['plugin'],
	sort: 'none' | 'alphabetical-asc' = 'none',
): Variable {
	return {
		kind: 'ListVariable',
		spec: {
			name,
			display: { name },
			allowAllValue: options.all ?? false,
			allowMultiple: options.multi ?? false,
			sort,
			plugin,
		},
	};
}

export const EMPTY_VARIABLE_QUERY = "SELECT 'none' WHERE 1 = 0";

export const BAR_VARIABLES = {
	textEnv: 'tb_env',
	textService: 'tb_service',
	single: 'cu_single',
	all: 'cu_all',
	multi: 'cu_multi',
	queryParent: 'q_env',
	queryChild: 'q_service',
	queryEmpty: 'q_empty',
	dynamic: 'd_service',
} as const;

export const BAR_VALUES = {
	textEnv: 'otel-demo',
	textService: 'frontend',
	envs: ['otel-demo', 'mq-kafka', 'production'],
	services: ['adservice', 'frontend', 'checkout'],
	// Short enough that the child's chip is not truncated.
	queryEnvs: ['prod', 'stage'],
} as const;

/** Each child option is its parent's value plus this suffix. */
export const QUERY_CHILD_SUFFIX = '-svc';

/** One variable per control the bar renders, in spec order. */
export function variablesBarDashboard(
	options: { dynamicAttribute?: string } = {},
): PostableDashboard {
	const v = BAR_VARIABLES;
	return buildDashboard({
		title: `e2e-variables-bar-${Date.now()}-${process.pid}`,
		variables: [
			textVariable(v.textEnv, BAR_VALUES.textEnv),
			textVariable(v.textService, BAR_VALUES.textService),
			customVariable(v.single, [...BAR_VALUES.envs]),
			customVariable(v.all, [...BAR_VALUES.envs], { multi: true, all: true }),
			customVariable(v.multi, [...BAR_VALUES.services], { multi: true }),
			queryVariable(
				v.queryParent,
				`SELECT arrayJoin(['${BAR_VALUES.queryEnvs.join("', '")}'])`,
			),
			queryVariable(
				v.queryChild,
				`SELECT concat({{.${v.queryParent}}}, '${QUERY_CHILD_SUFFIX}')`,
				{ multi: true },
			),
			queryVariable(v.queryEmpty, EMPTY_VARIABLE_QUERY, { multi: true }),
			dynamicVariable(
				v.dynamic,
				options.dynamicAttribute ?? 'service.name',
				'metrics',
			),
		],
		// Queryless, so opening the dashboard issues no panel query.
		sections: [
			{
				title: 'Notes',
				panels: { notes: panel(PanelKind.Text, { name: 'Notes' }) },
			},
		],
	});
}

// ─── Time picker ─────────────────────────────────────────────────────────

export const REFRESH_INTERVALS = [
	'5 seconds',
	'10 seconds',
	'30 seconds',
	'1 minute',
	'5 minutes',
	'10 minutes',
	'30 minutes',
	'1 hour',
	'2 hours',
	'1 day',
] as const;

export type RefreshInterval = (typeof REFRESH_INTERVALS)[number];

export interface TimePicker {
	/** Its accessible name is the selected range's label. */
	input(): Locator;
	/** The offset badge, e.g. 'UTC + 9:00'. */
	timezoneBadge(): Locator;
	open(): Promise<void>;
	/** `value` is the preset's key, e.g. '1h'. */
	selectPreset(value: string): Promise<void>;
	/** Picks two days of the previous month, then applies. */
	selectPreviousMonthRange(fromDay: number, toDay: number): Promise<void>;
	/** Picks the first zone matching `search`. */
	selectTimezone(search: string, name: string): Promise<void>;
	refresh(): Locator;
	autoRefresh: {
		open(): Promise<void>;
		checkbox(): Locator;
		interval(label: RefreshInterval): Locator;
		/** The interval carrying the check mark. */
		selected(): Locator;
	};
}

function ordinal(day: number): string {
	const tens = day % 100;
	if (tens >= 11 && tens <= 13) {
		return `${day}th`;
	}
	const suffix = { 1: 'st', 2: 'nd', 3: 'rd' }[day % 10] ?? 'th';
	return `${day}${suffix}`;
}

function timePickerDriver(page: Page): TimePicker {
	const toolbar = toolbarAt(page);
	const input = (): Locator => toolbar.timePicker();
	const options = (): Locator => page.locator('.date-time-popover');
	// The timezone footer sits outside `.date-time-popover`.
	const popover = (): Locator => page.locator('.date-time-root');
	const autoRefreshMenu = (): Locator => page.locator('.auto-refresh-menu');

	const picker: TimePicker = {
		input,
		timezoneBadge: () => page.locator('.timezone-badge'),
		async open() {
			// A click before the picker is interactive is dropped silently.
			await expect(async () => {
				if (!(await options().isVisible())) {
					await input().click();
				}
				await expect(options()).toBeVisible({ timeout: 3_000 });
			}).toPass({ timeout: 30_000 });
		},
		async selectPreset(value) {
			const option = page.getByTestId(`time-option-${value}`);
			// A click on a popover still animating closed is dropped, so retry.
			await expect(async () => {
				await picker.open();
				await option.click();
				await expect(option).toBeHidden({ timeout: 3_000 });
			}).toPass({ timeout: 30_000 });
		},
		async selectPreviousMonthRange(fromDay, toDay) {
			await picker.open();
			await page.getByTestId('time-option-custom').click();
			await popover()
				.getByRole('button', { name: 'Go to the Previous Month' })
				.click();
			const day = (n: number): Locator =>
				popover()
					.getByRole('gridcell', { name: new RegExp(`\\b${ordinal(n)}\\b`) })
					.first();
			await day(fromDay).click();
			await day(toDay).click();
			await popover().getByRole('button', { name: 'Apply' }).click();
			await expect(options()).toBeHidden();
		},
		async selectTimezone(search, name) {
			await picker.open();
			await popover().getByRole('button', { name: 'Change Timezone' }).click();
			await popover().getByPlaceholder('Search timezones...').fill(search);
			await popover()
				.getByRole('button', { name: new RegExp(`^${name}\\b`) })
				.click();
		},
		refresh: () => toolbar.refresh(),
		autoRefresh: {
			async open() {
				await toolbar.autoRefresh().click();
				await expect(autoRefreshMenu()).toBeVisible();
			},
			checkbox: () =>
				autoRefreshMenu().getByRole('checkbox', { name: 'Auto Refresh' }),
			interval: (label) =>
				autoRefreshMenu().getByRole('button', { name: label, exact: true }),
			selected: () =>
				autoRefreshMenu()
					.locator('.refresh-interval-btns')
					.filter({
						has: page.locator('svg'),
					}),
		},
	};
	return picker;
}

// ─── Variables bar ───────────────────────────────────────────────────────

export type SharedSelection = Record<string, string | string[]>;

export interface VariablesBar {
	root(): Locator;
	/** Overflowing variables stay hidden until the bar is expanded. */
	expand(): Promise<void>;
	/**
	 * Opens the dashboard through a share link's `?variables=`, as a returning
	 * visitor: on a first visit the auto-selected defaults overwrite the link's
	 * values (see `firstVisitWith`).
	 */
	openWith(id: string, selection: SharedSelection): Promise<void>;
	/** The share link as a first-time visitor opens it. */
	firstVisitWith(id: string, selection: SharedSelection): Promise<void>;
	/** The `$name` labels in render order. */
	names(): Promise<string[]>;
	label(name: string): Locator;
	variable(name: string): Locator;
	textbox(name: string): Locator;
	/** Commits on Enter. */
	type(name: string, value: string): Promise<void>;
	select(name: string): Locator;
	open(name: string): Promise<void>;
	/** Multi-selects commit when the dropdown closes. */
	close(name: string): Promise<void>;
	listbox(): Locator;
	option(label: string): Locator;
	/** Hovers the variable's info icon and returns its tooltip. */
	info(name: string): Promise<Locator>;
	/** Resolves once a query variable's options for `query` come back. */
	optionsFetched(query: string): Promise<void>;
	/** Single-select: picks one option. */
	pick(name: string, value: string): Promise<void>;
	/** Multi-select: toggles each value, then closes to commit. */
	toggle(name: string, values: string[]): Promise<void>;
	chip(name: string, value: string): Locator;
	/** The selection a share link carries when variables are included. */
	shared(): Promise<SharedSelection>;
	/**
	 * Writes one sample per value under a metric label, for a dynamic variable
	 * to resolve. The golden dataset leaves the attribute metadata empty.
	 */
	seedMetricLabel(label: string, values: string[]): Promise<void>;
}

function variablesBarDriver(page: Page): VariablesBar {
	const root = (): Locator => page.getByTestId('dashboard-variables-bar');
	const variable = (name: string): Locator =>
		page.getByTestId(`variable-${name}`);
	const select = (name: string): Locator =>
		page.getByTestId(`variable-select-${name}`);
	const listbox = (): Locator =>
		page.getByRole('listbox').locator('visible=true');
	const more = (): Locator => page.getByTestId('dashboard-variables-more');

	const bar: VariablesBar = {
		root,
		async expand() {
			await expect(root()).toBeVisible();
			if ((await more().getAttribute('aria-expanded')) !== 'true') {
				await more().click();
			}
			await expect(more()).toHaveAttribute('aria-expanded', 'true');
		},
		async openWith(id, selection) {
			await page.goto(PATH.dashboard(id));
			await expect(root()).toBeVisible();
			await bar.firstVisitWith(id, selection);
		},
		async firstVisitWith(id, selection) {
			const search = new URLSearchParams({
				relativeTime: '30m',
				variables: JSON.stringify(selection),
			});
			await page.goto(`${PATH.dashboard(id)}?${search.toString()}`);
			await expect(root()).toBeVisible();
		},
		async names() {
			await expect(root()).toBeVisible();
			return root().locator('[title^="$"]').allTextContents();
		},
		label: (name) => variable(name).getByTitle(`$${name}`, { exact: true }),
		variable,
		textbox: (name) => page.getByTestId(`variable-input-${name}`),
		async type(name, value) {
			const input = bar.textbox(name);
			await input.fill(value);
			await input.press('Enter');
		},
		select,
		async open(name) {
			await select(name).click();
			await expect(listbox()).toBeVisible();
		},
		async close(name) {
			// The multi-select swallows Escape, so click outside it.
			await bar.label(name).click();
			await expect(listbox()).toBeHidden();
		},
		listbox,
		option: (label) =>
			listbox().getByRole('option', { name: label, exact: true }),
		async info(name) {
			// The icon is a bare lucide svg: no testid or accessible name.
			await variable(name).locator('svg[class*="infoIcon"]').hover();
			const tooltip = page.getByRole('tooltip');
			await expect(tooltip).toBeVisible();
			return tooltip;
		},
		async optionsFetched(query) {
			await page.waitForResponse(
				(r) =>
					r.url().includes('/variables/query') &&
					(r.request().postDataJSON() as { query?: string } | null)?.query === query,
			);
		},
		async pick(name, value) {
			await bar.open(name);
			await bar.option(value).click();
			await expect(listbox()).toBeHidden();
		},
		async toggle(name, values) {
			await bar.open(name);
			for (const value of values) {
				await bar.option(value).click();
			}
			await bar.close(name);
		},
		chip: (name, value) =>
			variable(name).getByRole('button', {
				name: `Remove tag ${value}`,
				exact: true,
			}),
		async shared() {
			// The link is copied through a transient selection, never shown.
			await page.evaluate(() => {
				document.addEventListener(
					'copy',
					() => {
						(globalThis as { e2eCopied?: string }).e2eCopied = String(
							globalThis.getSelection(),
						);
					},
					{ capture: true, once: true },
				);
			});
			await toolbarAt(page).share().click();
			const modal = page.locator('.share-modal-content');
			const include = modal
				.locator('.absolute-relative-time-toggler-container')
				.filter({ hasText: 'Include variables' })
				.getByRole('switch');
			await include.click();
			await expect(include).toBeChecked();
			await modal.getByRole('button', { name: 'Copy page link' }).click();
			const link = await page.evaluate(
				() => (globalThis as { e2eCopied?: string }).e2eCopied ?? '',
			);
			const raw = new URL(link).searchParams.get('variables');
			expect(raw, `no variables in the shared link ${link}`).not.toBeNull();
			return JSON.parse(raw as string) as SharedSelection;
		},
		async seedMetricLabel(label, values) {
			const timestamp = new Date(Date.now() - 60_000).toISOString();
			const seeder = process.env.SIGNOZ_E2E_SEEDER_URL;
			expect(seeder, 'SIGNOZ_E2E_SEEDER_URL is not set').toBeTruthy();
			const res = await page.request.post(`${seeder}/telemetry/metrics`, {
				data: values.map((value) => ({
					metric_name: 'e2e_dynamic_variable',
					labels: { [label]: value },
					timestamp,
					value: 1,
					temporality: 'Cumulative',
					type_: 'Sum',
					is_monotonic: true,
				})),
			});
			expect(res.ok(), `seeder POST ${res.status()}`).toBe(true);
		},
	};
	return bar;
}

// ─── Configure drawer ────────────────────────────────────────────────────

export type SettingsTab = 'Overview' | 'Variables' | 'Publish';
export type VariableTypeTab = 'dynamic' | 'textbox' | 'custom' | 'query';

export interface DashboardSettings {
	configure(): Locator;
	open(): Promise<void>;
	close(): Promise<void>;
	dialog(): Locator;
	heading(): Locator;
	tab(name: SettingsTab): Locator;
	openTab(name: SettingsTab): Promise<void>;
	panel(): Locator;
	overview: {
		name(): Locator;
		description(): Locator;
		tagInput(): Locator;
		addTag(tag: string): Promise<void>;
		unsaved(): Locator;
		save(): Locator;
		discard(): Locator;
	};
	variables: {
		list(): Locator;
		row(name: string): Locator;
		add(): Locator;
		edit(name: string): Promise<void>;
		/** Confirms inline. */
		remove(name: string): Promise<void>;
		/** Drags `name`'s grip onto `target`'s row. */
		reorder(name: string, target: string): Promise<void>;
	};
	form: {
		name(): Locator;
		type(type: VariableTypeTab): Locator;
		customValues(): Locator;
		/** Searches the dynamic variable's field select and picks `field`. */
		dynamicField(field: string): Promise<void>;
		textDefault(): Locator;
		queryEditor(): Locator;
		error(text: string): Locator;
		save(): Locator;
		discard(): Locator;
	};
	publish: {
		text(text: string): Locator;
		timeRange(): Locator;
		publish(): Locator;
	};
}

function settingsDriver(page: Page): DashboardSettings {
	const dialog = (): Locator =>
		page.getByRole('dialog').filter({ hasText: 'Dashboard Configuration' });
	const panelLocator = (): Locator => dialog().getByRole('tabpanel').first();

	const settings: DashboardSettings = {
		configure: () => toolbarAt(page).configure(),
		async open() {
			await settings.configure().click();
			await expect(dialog()).toBeVisible();
		},
		async close() {
			await dialog().getByRole('button', { name: 'Close' }).click();
			await expect(dialog()).toBeHidden();
		},
		dialog,
		heading: () => dialog().getByText('Dashboard Configuration'),
		tab: (name) => dialog().getByRole('tab', { name, exact: true }),
		async openTab(name) {
			await settings.tab(name).click();
			await expect(settings.tab(name)).toHaveAttribute('aria-selected', 'true');
		},
		panel: panelLocator,
		overview: {
			name: () => dialog().getByTestId('dashboard-name'),
			description: () => dialog().getByTestId('dashboard-desc'),
			tagInput: () => dialog().getByTestId('tag-key-value-input'),
			async addTag(tag) {
				const input = settings.overview.tagInput();
				await input.fill(tag);
				await input.press('Enter');
				await expect(
					dialog().getByTestId('tag-key-value-input-chip').filter({ hasText: tag }),
				).toBeVisible();
			},
			unsaved: () => dialog().getByText(/unsaved changes?$/),
			save: () => dialog().getByTestId('save-dashboard-config'),
			discard: () => dialog().getByRole('button', { name: 'Discard' }),
		},
		variables: {
			list: () => dialog().getByTestId('variables-list'),
			row: (name) => dialog().getByTestId(`variable-row-${name}`),
			add: () => dialog().getByTestId('add-variable'),
			async edit(name) {
				await dialog().getByTestId(`variable-edit-${name}`).click();
				await expect(settings.form.name()).toBeVisible();
			},
			async remove(name) {
				await dialog().getByTestId(`variable-delete-${name}`).click();
				await dialog().getByTestId(`variable-delete-confirm-${name}`).click();
				await expect(settings.variables.row(name)).toHaveCount(0);
			},
			async reorder(name, target) {
				const grip = await boxOf(
					settings.variables
						.row(name)
						.getByRole('button', { name: 'Reorder variable' }),
					'the reorder grip',
				);
				const to = await boxOf(settings.variables.row(target), 'the target row');
				// dnd-kit's pointer sensor activates on the first move.
				await dragBy(
					page,
					{ x: grip.x + grip.width / 2, y: grip.y + grip.height / 2 },
					{ x: grip.x + grip.width / 2, y: to.y + to.height / 4 },
					20,
				);
			},
		},
		form: {
			name: () => dialog().getByTestId('variable-name'),
			type: (type) => dialog().getByTestId(`variable-type-${type}`),
			customValues: () => dialog().getByTestId('variable-custom-input'),
			async dynamicField(field) {
				const select = dialog().getByTestId('variable-field-select');
				await select.click();
				await page.keyboard.type(field);
				await openSelectOption(page, field).click();
				await expect(select).toContainText(field);
			},
			textDefault: () => dialog().getByTestId('variable-text-input'),
			// Monaco renders a textbox named "Editor content" with no test id.
			queryEditor: () => dialog().locator('.monaco-editor'),
			error: (text) => dialog().getByText(text),
			save: () => dialog().getByTestId('variable-save'),
			discard: () => dialog().getByRole('button', { name: 'Discard' }),
		},
		publish: {
			text: (text) => panelLocator().getByText(text),
			timeRange: () =>
				panelLocator().getByRole('switch', { name: 'Enable time range' }),
			publish: () =>
				panelLocator().getByRole('button', { name: 'Publish Dashboard' }),
		},
	};
	return settings;
}

const withTimePicker = driver('timePicker', ({ page }) =>
	timePickerDriver(page),
);
const withVariablesBar = driver('variablesBar', ({ page }) =>
	variablesBarDriver(page),
);
const withSettings = driver('settings', ({ page }) => settingsDriver(page));

export const test = withSettings(withVariablesBar(withTimePicker(panelsTest)));

export * from './panels';

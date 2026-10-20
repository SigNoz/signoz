import { expect, type Locator, type Page } from '@playwright/test';

import { driver, SEEDED_DATA_TIMEOUT, type Layer } from '../kit';
import {
	expressionParams,
	querySearchDriver,
	type QuerySearch,
} from '../querysearch';
import { resetKeys } from '../storage';
import { columnStorageKey } from '../storage';
import { tanstackDriver, type Tanstack } from '../tanstack';

import { K8S_PATH, type EntityDef, type K8sCategory } from './entities';

/**
 * Driving infra monitoring: the list, the drawer, and the state they share.
 *
 * Two details are load-bearing and were paid for in flake. Locators are
 * table-scoped, because an entity's name also appears as a quick-filter checkbox
 * in the left rail and clicking that only applies a filter. And row clicks are
 * retried, because the list re-renders as the counts and list requests settle,
 * so a single click can land on a detaching row.
 */

const TOOLBAR = {
	groupBySelect: 'k8s-table-group-by-select',
	optionsButton: 'k8s-table-options-button',
	runQuery: 'list-run-query-btn',
} as const;

export const EMPTY_STATE = {
	empty: 'k8s-empty-state',
	retention: 'k8s-empty-state-retention',
	error: 'k8s-error-state',
} as const;

export const NO_RESULTS_TEXT =
	'This query had no results. Edit your query and try again!';

/** Global table preferences: font size and line clamp, shared by every entity. */
export const TABLE_PREFERENCES_KEY =
	'@signoz/infra-monitoring-table-preferences';

export const DRAWER = {
	wrapper: 'drawer-wrapper',
	close: 'close-drawer-button',
	copyId: 'copy-id-button',
	tabBar: 'drawer-tab-bar',
	timeSelection: 'drawer-time-selection',
	resetToListTime: 'reset-to-list-time-button',
} as const;

export const DRAWER_TAB = {
	overview: 'overview',
	metrics: 'metrics',
	logs: 'logs',
	traces: 'traces',
	events: 'events',
	podMetrics: 'pod_metrics',
} as const;

export type DrawerView = (typeof DRAWER_TAB)[keyof typeof DRAWER_TAB];

export const DRAWER_STATE = {
	emptyState: 'entity-empty-state',
	errorState: 'entity-error-state',
	eventsNotConfigured: 'events-not-configured',
} as const;

export const METRICS = {
	chartHeader: 'chart-header',
	table: 'metrics-table',
	/** The panel body. Carries `data-has-data`, so an empty panel is observable. */
	chart: 'entity-metrics-chart',
} as const;

export const EXPLORER_LINK = {
	logs: 'open-logs-explorer',
	traces: 'open-traces-explorer',
} as const;

/** The tab labels, for reading back which views the bar rendered. */
const TAB_LABEL: Record<DrawerView, string> = {
	[DRAWER_TAB.overview]: 'Overview',
	[DRAWER_TAB.metrics]: 'Metrics',
	[DRAWER_TAB.logs]: 'Logs',
	[DRAWER_TAB.traces]: 'Traces',
	[DRAWER_TAB.events]: 'Events',
	[DRAWER_TAB.podMetrics]: 'Pod Metrics',
};

export interface InfraList {
	url(entity: EntityDef, params?: Record<string, string>): string;
	goto(entity: EntityDef, params?: Record<string, string>): Promise<void>;
	/**
	 * Open `entity`'s list showing only `names`.
	 *
	 * Seeding is additive and the stack is shared across workers, so an unscoped
	 * list can push the row under test onto page 3 the moment a sibling spec
	 * seeds the same entity.
	 */
	gotoScoped(
		entity: EntityDef,
		names: string[],
		params?: Record<string, string>,
	): Promise<void>;
	/**
	 * Open `entity`'s list scoped to one group label. The grouped page size is
	 * viewport-derived, so on an unscoped grouped list the group under test is
	 * regularly not on page one.
	 */
	gotoGroupScoped(
		entity: EntityDef,
		groupLabel: string,
		params?: Record<string, string>,
	): Promise<void>;
	/**
	 * Load the kubernetes route, or `entity`'s list, without waiting for the list
	 * to answer: for assertions on the shell and the URL.
	 */
	load(entity?: EntityDef): Promise<void>;
	switchCategory(category: K8sCategory): Promise<void>;
	expectCategoryActive(category: K8sCategory): Promise<void>;
	/** Every category rail button, in render order. */
	categoryTabs(): Locator;
	/** A status toggle on the hosts list, e.g. `inactive`. */
	statusFilter(value: string): Locator;
	/** A table driver bound to `entity`'s storage keys and row testids. */
	table(entity: EntityDef): Tanstack;
	search: QuerySearch;
	optionsButton(): Locator;
	emptyState(): Locator;
	retentionState(): Locator;
	errorState(): Locator;
	noResults(): Locator;
	/** Clear every persisted table key for `entity`, once, before navigating. */
	resetState(entity: EntityDef): Promise<void>;
	/** Whether a URL is the entity *list* request, not the instrumentation check. */
	isListRequest(url: string): boolean;
	quickFiltersToggle(): Locator;
	quickFilterSections(): Locator;
	/** Assert a set of URL params, `null` meaning "absent". */
	expectUrlParams(expected: Record<string, string | null>): Promise<void>;
	/** The grouped list's row for `groupLabel`. */
	groupRow(groupLabel: string): Locator;
	expandGroup(groupLabel: string): Promise<Locator>;
	collapseGroup(groupLabel: string): Promise<void>;
	expandedTable(): Locator;
	expandedRows(): Locator;
	expectExpandedVisible(): Promise<void>;
	/** The expanded group's way past `EXPANDED_ROW_LIMIT`. */
	viewAllButton(): Locator;
}

export interface InfraDrawer {
	panel(): Locator;
	title(): Locator;
	open(rowKey: string): Promise<Locator>;
	openInNewTab(rowKey: string): Promise<Page>;
	/** Click a compass link; the explorer opens in a new tab, which is returned. */
	openExplorer(
		link: (typeof EXPLORER_LINK)[keyof typeof EXPLORER_LINK],
	): Promise<Page>;
	/** Wait for the drawer shell. Proves only that it opened. */
	expectVisible(): Promise<Locator>;
	/**
	 * Wait for the body — the part gated behind the entity-details query.
	 * Required before any absence assertion about drawer content, which would
	 * otherwise pass against a still-loading drawer.
	 */
	expectBodyReady(): Promise<Locator>;
	close(): Promise<void>;
	tabBar(): Locator;
	tab(view: DrawerView): Locator;
	switchTab(view: DrawerView): Promise<void>;
	renderedTabs(): Promise<string[]>;
	renderedViews(): Promise<DrawerView[]>;
	viewFromUrl(): string | null;
	/** The `selectedItem*` params `entity` writes for its sample row. */
	selectedItemParams(entity: EntityDef): Record<string, string>;
	charts(): Locator;
	chartHeaders(): Locator;
	countCard(label: string): Locator;
	countCardNavLink(label: string): Locator;
	emptyState(): Locator;
	errorState(): Locator;
	eventsNotConfigured(): Locator;
	timePicker(): Locator;
	setTime(option: string): Promise<void>;
	resetTimeToList(): Promise<void>;
	timeParams(): {
		relative: string | null;
		start: string | null;
		end: string | null;
	};
}

export interface Infra {
	list: InfraList;
	drawer: InfraDrawer;
}

/** `EntityCountsSection` derives its testids from the label this way. */
export function slug(label: string): string {
	return label.toLowerCase().replace(/\s+/g, '-');
}

export function infraDriver(page: Page): Infra {
	const search = querySearchDriver(page, { runTestId: TOOLBAR.runQuery });

	const list: InfraList = {
		search,

		url: (entity, params = {}) => {
			const query = new URLSearchParams(params);
			if (entity.categoryTestId) {
				query.set('category', entity.key);
			}
			const search_ = query.toString();
			return search_ ? `${entity.route}?${search_}` : entity.route;
		},

		goto: async (entity, params = {}) => {
			await page.goto(list.url(entity, params));
			// The editor mounts with the list's first response, not with the shell,
			// so the default expect budget is a coin flip under six workers.
			await expect(search.editor()).toBeVisible({ timeout: SEEDED_DATA_TIMEOUT });
		},

		gotoScoped: async (entity, names, params = {}) => {
			const values = names.map((name) => `'${name}'`).join(', ');
			await list.goto(entity, {
				...params,
				...expressionParams(`${entity.nameColumnId} IN (${values})`),
			});
		},

		gotoGroupScoped: async (entity, groupLabel, params = {}) => {
			await list.goto(entity, {
				...params,
				...expressionParams(`${entity.groupByAttribute} = '${groupLabel}'`),
			});
			await list.table(entity).waitForRows();
		},

		load: async (entity) => {
			await page.goto(entity ? list.url(entity) : K8S_PATH);
		},

		switchCategory: async (category) => {
			if (!category.categoryTestId) {
				throw new Error(`${category.key} has no category rail button`);
			}
			await page.getByTestId(category.categoryTestId).click();
			// `clearOnDefault: false`, so even the default category is written.
			await expect(page).toHaveURL(new RegExp(`category=${category.key}\\b`));
			await list.expectCategoryActive(category);
		},

		expectCategoryActive: async (category) => {
			if (!category.categoryTestId) {
				throw new Error(`${category.key} has no category rail button`);
			}
			// The rail buttons carry no pressed state, only the selected one's
			// CSS-module class, whose generated name keeps the local name.
			await expect(page.getByTestId(category.categoryTestId)).toHaveClass(
				/categoryItemSelected/,
			);
		},

		categoryTabs: () => page.locator('[data-testid^="category-"]'),

		statusFilter: (value) => page.getByTestId(`status-filter-${value}`),

		table: (entity) =>
			tanstackDriver(page, {
				rowTestIdPrefix: 'row-',
				tableKey: entity.columnStorageKey,
				groupBySelectTestId: TOOLBAR.groupBySelect,
				extraStorageKeys: [
					columnStorageKey(entity.expandedColumnStorageKey),
					columnStorageKey(entity.pageSizeStorageKey),
					TABLE_PREFERENCES_KEY,
				],
			}),

		optionsButton: () => page.getByTestId(TOOLBAR.optionsButton),
		emptyState: () => page.getByTestId(EMPTY_STATE.empty),
		retentionState: () => page.getByTestId(EMPTY_STATE.retention),
		errorState: () => page.getByTestId(EMPTY_STATE.error),
		noResults: () => page.getByText(NO_RESULTS_TEXT),

		resetState: (entity) =>
			resetKeys(page, [
				columnStorageKey(entity.columnStorageKey),
				columnStorageKey(entity.expandedColumnStorageKey),
				columnStorageKey(entity.pageSizeStorageKey),
				TABLE_PREFERENCES_KEY,
			]),

		// `/api/v1/infra_monitoring/checks` shares the prefix and fires alongside
		// every list load, so a bare match counts the instrumentation callout's
		// request as the list's.
		isListRequest: (url) =>
			/\/api\/v\d+\/infra_monitoring\//.test(url) && !url.includes('/checks'),

		quickFiltersToggle: () => page.getByTestId('quick-filters-toggle'),
		quickFilterSections: () =>
			page.locator('.quick-filters').getByTestId('checkbox-filter-v2'),

		expectUrlParams: async (expected) => {
			await expect(async () => {
				const params = new URL(page.url()).searchParams;
				for (const [key, value] of Object.entries(expected)) {
					expect(params.get(key), `param ${key}`).toBe(value);
				}
			}).toPass();
		},

		/**
		 * Exact-matched against the group cell's badge and scoped to the outer
		 * table's own rows: `hasText` is a substring match over every row on the
		 * page, so a loose version also matches the header, any expanded member row
		 * and — for hosts, whose sample group is `linux` — every hostname
		 * containing the label.
		 */
		groupRow: (groupLabel) =>
			page
				.locator('table')
				.first()
				.locator('> tbody > tr')
				.filter({ has: page.getByText(groupLabel, { exact: true }) }),

		/**
		 * Expand a group row, retrying because it can detach while the list
		 * settles. The button is a **toggle**, so an unguarded retry collapses what
		 * the previous attempt opened and the loop never converges.
		 */
		expandGroup: async (groupLabel) => {
			const row = list.groupRow(groupLabel);
			await expect(row).toBeVisible();
			const container = list.expandedTable();

			await expect(async () => {
				const button = row.getByTestId('expand-row-button');
				if ((await button.getAttribute('aria-expanded')) !== 'true') {
					// Playwright's auto-scroll aligns to the nearest edge, which parks a
					// low row under the sticky pagination bar; centring clears both
					// sticky edges, as a user's own scroll would.
					await button.evaluate((element) =>
						element.scrollIntoView({ block: 'center', inline: 'nearest' }),
					);
					await button.click({ timeout: 5_000 });
				}
				await expect(container).toBeVisible({ timeout: 3_000 });
			}).toPass({ timeout: 15_000 });

			return container;
		},

		collapseGroup: async (groupLabel) => {
			const button = list.groupRow(groupLabel).getByTestId('expand-row-button');
			if ((await button.getAttribute('aria-expanded')) === 'true') {
				await button.evaluate((element) =>
					element.scrollIntoView({ block: 'center', inline: 'nearest' }),
				);
				await button.click({ timeout: 5_000 });
			}
			await expect(button).toHaveAttribute('aria-expanded', 'false');
			await expect(list.expandedTable()).toHaveCount(0);
		},

		viewAllButton: () => page.getByRole('button', { name: /view all/i }),

		expandedTable: () => page.getByTestId('expanded-table-container'),
		expandedRows: () =>
			list.expandedTable().locator('tbody tr[data-testid^="row-"]'),

		// The container mounts with the expanded fetch, not with the click or with
		// the reload that restores `expanded` from the URL, so it inherits the same
		// ingestion-bound budget as the rows themselves.
		expectExpandedVisible: async () => {
			await expect(list.expandedTable()).toBeVisible({
				timeout: SEEDED_DATA_TIMEOUT,
			});
		},
	};

	// Under load the list refetches and re-renders a row between mousedown and
	// mouseup, which loses the click. Click again until a tab arrives, and only
	// while none has, so a slow tab is not opened twice.
	const clickForNewTab = async (
		target: Locator,
		modifiers: 'ControlOrMeta'[] = [],
	): Promise<Page> => {
		const tabs: Page[] = [];
		const onPage = (tab: Page): void => {
			tabs.push(tab);
		};
		page.context().on('page', onPage);
		try {
			await expect(async () => {
				if (tabs.length === 0) {
					await target.click({ modifiers, timeout: 5_000 });
				}
				await expect.poll(() => tabs.length, { timeout: 3_000 }).toBeGreaterThan(0);
			}).toPass({ timeout: 20_000 });
		} finally {
			page.context().off('page', onPage);
		}
		const [tab] = tabs;
		await tab.waitForLoadState();
		return tab;
	};

	const drawerPanel = (): Locator =>
		// An exiting drawer keeps its node mounted for the slide-out animation,
		// marked `aria-hidden`, so during a transition two dialogs are in the DOM
		// and a bare testid is a strict-mode violation. The hidden node is out of
		// the accessibility tree, so excluding it is also semantically right.
		page.locator(`[data-testid="${DRAWER.wrapper}"]:not([aria-hidden="true"])`);

	const drawer: InfraDrawer = {
		panel: drawerPanel,
		title: () => drawerPanel().getByRole('heading').first(),
		tabBar: () => page.getByTestId(DRAWER.tabBar),
		charts: () => page.getByTestId(METRICS.chart),
		chartHeaders: () => page.getByTestId(METRICS.chartHeader),
		countCard: (label) => page.getByTestId(`count-card-${slug(label)}`),
		countCardNavLink: (label) => page.getByTestId(`navigate-${slug(label)}`),
		emptyState: () => page.getByTestId(DRAWER_STATE.emptyState),
		errorState: () => page.getByTestId(DRAWER_STATE.errorState),
		eventsNotConfigured: () => page.getByTestId(DRAWER_STATE.eventsNotConfigured),
		timePicker: () => page.getByTestId(DRAWER.timeSelection),

		// The toggle group names each button `<bar testId>-button-<value>`.
		tab: (view) => page.getByTestId(`${DRAWER.tabBar}-button-${view}`),

		open: async (rowKey) => {
			const row = page.getByTestId(`row-${rowKey}`);
			await expect(row).toBeVisible();

			// The click needs its own timeout: `toPass` awaits the callback to
			// completion before checking its deadline, so an unbounded click cannot
			// be interrupted — and once the drawer is up, a retried click is behind
			// its modal mask and blocks on actionability forever.
			await expect(async () => {
				if (!(await drawerPanel().isVisible())) {
					// The header row is `position: sticky`, so a row scrolled "just into
					// view" lands under it and the click is swallowed by a header cell.
					await row.evaluate((element) =>
						element.scrollIntoView({ block: 'center' }),
					);
					await row.click({ timeout: 5_000 });
				}
				await expect(page.getByTestId(DRAWER.close)).toBeVisible({
					timeout: 3_000,
				});
			}).toPass({ timeout: 20_000 });

			const panel = drawerPanel();
			await expect(panel).toBeVisible();
			return panel;
		},

		openInNewTab: (rowKey) =>
			clickForNewTab(page.getByTestId(`row-${rowKey}`), ['ControlOrMeta']),

		openExplorer: (link) => clickForNewTab(page.getByTestId(link)),

		expectVisible: async () => {
			const panel = drawerPanel();
			await expect(panel).toBeVisible({ timeout: 30_000 });
			return panel;
		},

		/**
		 * `drawer-time-selection` is the signal because `EntityDateTimeSelector` is
		 * rendered by all four tab bodies and by nothing in the shell — including on
		 * volumes, which has no tab bar but still renders the Metrics body.
		 */
		expectBodyReady: async () => {
			const panel = await drawer.expectVisible();
			await expect(drawer.timePicker()).toBeVisible({ timeout: 30_000 });
			return panel;
		},

		close: async () => {
			await page.getByTestId(DRAWER.close).click();
			await expect(async () => {
				expect(new URL(page.url()).searchParams.get('selectedItem')).toBeNull();
			}).toPass();
		},

		renderedTabs: async () => {
			const labels = await drawer.tabBar().locator('button').allInnerTexts();
			return labels.map((label) => label.trim()).filter(Boolean);
		},

		renderedViews: async () => {
			const byLabel = new Map(
				Object.entries(TAB_LABEL).map(([view, label]) => [
					label,
					view as DrawerView,
				]),
			);
			const labels = await drawer.renderedTabs();
			return labels
				.map((label) => byLabel.get(label))
				.filter((view): view is DrawerView => Boolean(view));
		},

		viewFromUrl: () => new URL(page.url()).searchParams.get('view'),

		switchTab: async (view) => {
			await drawer.tab(view).click();
			await expect(async () => {
				expect(drawer.viewFromUrl()).toBe(view);
			}).toPass();
			// The tab bar is the authority on what rendered; the URL alone cannot
			// tell "switched to Metrics" from "never wrote a view".
			await expect(drawer.tab(view)).toHaveAttribute('aria-pressed', 'true');
		},

		/**
		 * Throws rather than defaulting a missing registry value to `''`: a deep
		 * link with an empty extra opens a drawer titled `-` with empty panels,
		 * which is indistinguishable from a slow one.
		 */
		selectedItemParams: (entity) => {
			const params: Record<string, string> = {
				selectedItem: entity.seed.sampleItemKey,
			};
			const required = (value: string | undefined, field: string): string => {
				if (!value) {
					throw new Error(
						`${entity.key}: seed.${field} is required because selectedItemExtraParams asks for it`,
					);
				}
				return value;
			};
			if (entity.selectedItemExtraParams.includes('clusterName')) {
				params.selectedItemClusterName = required(
					entity.seed.sampleClusterName,
					'sampleClusterName',
				);
			}
			if (entity.selectedItemExtraParams.includes('namespaceName')) {
				params.selectedItemNamespaceName = required(
					entity.seed.sampleNamespaceName,
					'sampleNamespaceName',
				);
			}
			return params;
		},

		setTime: async (option) => {
			await drawer.timePicker().click();
			await page.getByText(option, { exact: true }).click();
			await expect(async () => {
				expect(drawer.timeParams().relative).not.toBeNull();
			}).toPass();
		},

		resetTimeToList: async () => {
			await page.getByTestId(DRAWER.resetToListTime).click();
			await expect(async () => {
				expect(drawer.timeParams().relative).toBeNull();
			}).toPass();
		},

		timeParams: () => {
			const params = new URL(page.url()).searchParams;
			return {
				relative: params.get('detailRelativeTime'),
				start: params.get('detailStartTime'),
				end: params.get('detailEndTime'),
			};
		},
	};

	return { list, drawer };
}

export const withInfraMonitoring: Layer<{ infra: Infra }> = driver(
	'infra',
	({ page }) => infraDriver(page),
);

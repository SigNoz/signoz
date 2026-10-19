import { expect, type Locator, type Page } from '@playwright/test';

import { apiDriver } from './api';

/**
 * Saved views, shared by every explorer that has them (logs, traces, metrics,
 * meter): the ExplorerOptions toolbar, the `/<signal>/saved-views` page, and API
 * seeds. Feature drivers call {@link savedViewsDriver} with their source page.
 *
 * Views are org-wide, so every name a spec creates carries its own stamp and is
 * removed by prefix.
 */

export type ViewSource = 'logs' | 'traces' | 'metrics' | 'meter';

const VIEWS_PAGE: Record<ViewSource, string> = {
	logs: '/logs/saved-views',
	traces: '/traces/saved-views',
	metrics: '/metrics-explorer/views',
	meter: '/meter/explorer/views',
};

const VIEWS_API = '/api/v1/explorer/views';

/** `/api/v1/explorer/views` is not in `docs/api/openapi.yml`, so these are local. */
interface ExplorerView {
	id: string;
	name: string;
	sourcePage: string;
	compositeQuery: Record<string, unknown>;
}

export interface ViewSeed {
	expression: string;
	panelType?: 'list' | 'trace' | 'table' | 'graph';
	/** Defaults to the view's source (`meter` views query `metrics`). */
	dataSource?: 'logs' | 'traces' | 'metrics';
	/** Merged into the v5 query spec, e.g. `aggregations` for a metrics view. */
	spec?: Record<string, unknown>;
}

export interface SavedViews {
	/** The explorer's view picker. */
	select(): Locator;
	/** Pick `name` in the explorer's picker and wait for `viewName` in the URL. */
	pick(name: string): Promise<void>;
	/** Save the current explorer query as a new view. */
	saveAs(name: string): Promise<void>;
	/** "Update this view" — only rendered once the query differs from the view. */
	update(): Promise<void>;
	clear(): Promise<void>;

	gotoPage(): Promise<void>;
	search(text: string): Promise<void>;
	/** The row for `name` on the views page. Search first: the page size is small. */
	row(name: string): Locator;
	rename(name: string, next: string): Promise<void>;
	remove(name: string): Promise<void>;
	/** Open the view in its explorer from the views page. */
	open(name: string): Promise<void>;

	create(name: string, seed: ViewSeed): Promise<string>;
	list(): Promise<ExplorerView[]>;
	removeByPrefix(prefix: string): Promise<void>;
}

const isViewsCall =
	(method: string) =>
	(response: { url(): string; request(): { method(): string } }): boolean =>
		response.url().includes(VIEWS_API) && response.request().method() === method;

/** List and trace panels return rows; every other panel needs an aggregation. */
const isRawPanel = (seed: ViewSeed): boolean =>
	(seed.panelType ?? 'list') === 'list' || seed.panelType === 'trace';

export function savedViewsDriver(page: Page, source: ViewSource): SavedViews {
	const api = apiDriver(page);
	const dataSource = (seed: ViewSeed): string =>
		seed.dataSource ?? (source === 'meter' ? 'metrics' : source);

	const views: SavedViews = {
		select: () => page.getByTestId('explorer-views-select'),

		pick: async (name) => {
			const select = views.select();
			const box = await select.boundingBox();
			await select.click({ position: { x: (box?.width ?? 40) - 8, y: 10 } });
			await select.locator('input[role="combobox"]').fill(name);
			await page
				.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')
				.locator('.ant-select-item-option')
				.filter({ hasText: name })
				.first()
				.click();
			await expect(page).toHaveURL(/viewName=/);
			await expect(select).toContainText(name);
		},

		saveAs: async (name) => {
			await page.getByTestId('explorer-save-view-open').click();
			await page.getByTestId('save-view-name-input').fill(name);
			const saved = page.waitForResponse(isViewsCall('POST'));
			await page.getByTestId('save-view-btn').click();
			expect((await saved).ok()).toBe(true);
			await expect(page).toHaveURL(/viewName=/);
		},

		update: async () => {
			const updated = page.waitForResponse(isViewsCall('PUT'));
			await page.getByTestId('explorer-update-view').dispatchEvent('click');
			expect((await updated).ok()).toBe(true);
		},

		clear: async () => {
			await page.getByTestId('explorer-clear-view').dispatchEvent('click');
			await expect(page).not.toHaveURL(/viewName=/);
		},

		gotoPage: async () => {
			await page.goto(VIEWS_PAGE[source]);
			await expect(page.getByTestId('saved-views-search')).toBeVisible();
		},

		search: async (text) => {
			await page.getByTestId('saved-views-search').fill(text);
		},

		row: (name) =>
			page.locator('[data-testid^="saved-view-row-"]').filter({
				has: page.getByTestId('saved-view-name').getByText(name, { exact: true }),
			}),

		rename: async (name, next) => {
			await views.row(name).getByTestId('edit-view').click();
			await page.getByTestId('view-name').fill(next);
			const updated = page.waitForResponse(isViewsCall('PUT'));
			await page.getByTestId('save-view').click();
			expect((await updated).ok()).toBe(true);
		},

		remove: async (name) => {
			await views.row(name).getByTestId('delete-view').click();
			const deleted = page.waitForResponse(isViewsCall('DELETE'));
			await page.getByTestId('confirm-delete').click();
			expect((await deleted).ok()).toBe(true);
			await expect(views.row(name)).toHaveCount(0);
		},

		open: async (name) => {
			await views.row(name).getByTestId('go-to-explorer').click();
			await expect(page).toHaveURL(/viewName=/);
		},

		create: async (name, seed) => {
			const body = await api.post<{ data: string }>(VIEWS_API, {
				name,
				sourcePage: source,
				extraData: JSON.stringify({ color: '#4E74F8' }),
				compositeQuery: {
					queryType: 'builder',
					panelType: seed.panelType ?? 'list',
					builderQueries: {
						A: {
							queryName: 'A',
							dataSource: dataSource(seed),
							aggregateOperator: 'noop',
							expression: 'A',
							disabled: false,
							stepInterval: 60,
							filter: { expression: seed.expression },
							filters: { op: 'AND', items: [] },
							groupBy: [],
							orderBy: [{ columnName: 'timestamp', order: 'desc' }],
							limit: 0,
							offset: 0,
							pageSize: 0,
						},
					},
					queries: [
						{
							type: 'builder_query',
							spec: {
								name: 'A',
								signal: dataSource(seed),
								disabled: false,
								stepInterval: 60,
								filter: { expression: seed.expression },
								...(isRawPanel(seed)
									? { order: [{ key: { name: 'timestamp' }, direction: 'desc' }] }
									: { aggregations: [{ expression: 'count()' }] }),
								...seed.spec,
							},
						},
					],
				},
			});
			return body.data;
		},

		list: async () =>
			(
				await api.get<{ data: ExplorerView[] | null }>(
					`${VIEWS_API}?sourcePage=${source}`,
				)
			).data ?? [],

		removeByPrefix: async (prefix) => {
			const all = await views.list();
			await Promise.all(
				all
					.filter((view) => view.name.startsWith(prefix))
					.map((view) => api.tryDel(`${VIEWS_API}/${view.id}`)),
			);
		},
	};

	return views;
}

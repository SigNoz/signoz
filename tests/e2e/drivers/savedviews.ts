import { expect, type Locator, type Page } from '@playwright/test';

import type {
	Querybuildertypesv5RequestTypeDTO,
	SavedviewtypesPanelTypeDTO,
	SavedviewtypesPostableSavedViewDTO,
	SavedviewtypesSavedViewDTO,
	SavedviewtypesSchemaVersionDTO,
	SavedviewtypesSourceDTO,
} from './schemas';
import { apiDriver, type Envelope } from './api';

/**
 * Saved views, shared by every explorer that has them (logs, traces, metrics,
 * meter): the header and views list in the explorer's sidebar, and API seeds.
 * Feature drivers call {@link savedViewsDriver} with their source.
 *
 * Views are org-wide, so every name a spec creates carries its own stamp and is
 * removed by prefix.
 */

export type ViewSource = 'logs' | 'traces' | 'metrics' | 'meter';

const VIEWS_API = '/api/v2/saved_views';

type PanelType = `${SavedviewtypesPanelTypeDTO}`;

const REQUEST_TYPE: Record<PanelType, `${Querybuildertypesv5RequestTypeDTO}`> =
	{
		list: 'raw',
		trace: 'trace',
		table: 'scalar',
		value: 'scalar',
		graph: 'time_series',
	};

export interface ViewSeed {
	expression: string;
	panelType?: 'list' | 'trace' | 'table' | 'graph';
	/** Defaults to the view's source (`meter` views query `metrics`). */
	dataSource?: 'logs' | 'traces' | 'metrics';
	/** Merged into the v5 query spec, e.g. `aggregations` for a metrics view. */
	spec?: Record<string, unknown>;
}

export interface SavedViews {
	/** The header's view name, "My view" while none is selected. */
	current(): Locator;
	/** Open the views list. The metrics explorer keeps it pinned. */
	openList(): Promise<void>;
	search(text: string): Promise<void>;
	/** The list row for `name`. Search first. */
	row(name: string): Locator;
	/** Select `name` from the list and wait for its `viewKey` in the URL. */
	pick(name: string): Promise<void>;
	/** Save the current query as a new view, with no view selected. */
	saveAs(name: string): Promise<void>;
	/** "Update selected view", only rendered once the query differs from the view. */
	update(): Promise<void>;
	clear(): Promise<void>;
	rename(name: string, next: string): Promise<void>;
	remove(name: string): Promise<void>;

	create(name: string, seed: ViewSeed): Promise<string>;
	list(): Promise<SavedviewtypesSavedViewDTO[]>;
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

	const header = (): Locator => page.getByTestId('saved-views-header');
	const panel = (): Locator => page.getByTestId('saved-views-panel');

	// The row menu has no width until its row is hovered.
	const openRowMenu = async (name: string): Promise<void> => {
		const row = views.row(name);
		await row.hover();
		await row.getByTestId('saved-views-row-menu').click();
	};

	const views: SavedViews = {
		current: () => header().getByTestId('saved-views-name'),

		openList: async () => {
			await expect(header()).toBeVisible();
			const open = header().getByTestId('saved-views-open');
			if (await open.isVisible()) {
				await open.click();
			}
			await expect(panel().getByTestId('saved-views-search')).toBeVisible();
		},

		search: async (text) => {
			await views.openList();
			await panel().getByTestId('saved-views-search').fill(text);
		},

		row: (name) =>
			panel()
				.getByTestId('saved-views-row')
				.filter({
					has: page.getByTestId('saved-views-row-name').getByText(name, {
						exact: true,
					}),
				}),

		pick: async (name) => {
			await views.search(name);
			await views.row(name).getByTestId('saved-views-row-name').click();
			await expect(page).toHaveURL(/viewKey=/);
			await expect(views.current()).toContainText(name);
		},

		saveAs: async (name) => {
			await header().getByTestId('saved-views-create').click();
			await page.getByTestId('save-view-name').fill(name);
			const saved = page.waitForResponse(isViewsCall('POST'));
			await page.getByTestId('save-view-submit').click();
			expect((await saved).ok()).toBe(true);
			await expect(page).toHaveURL(/viewKey=/);
			await expect(views.current()).toContainText(name);
		},

		update: async () => {
			await header().getByTestId('saved-views-save-changes').click();
			const updated = page.waitForResponse(isViewsCall('PUT'));
			await page.getByTestId('saved-views-save-changes-item-update').click();
			expect((await updated).ok()).toBe(true);
		},

		clear: async () => {
			await header().getByTestId('saved-views-clear').click();
			await expect(page).not.toHaveURL(/viewKey=/);
		},

		rename: async (name, next) => {
			await openRowMenu(name);
			await page.getByTestId('saved-views-row-menu-item-editDetails').click();
			await page.getByTestId('save-view-name').fill(next);
			const updated = page.waitForResponse(isViewsCall('PUT'));
			await page.getByTestId('save-view-submit').click();
			expect((await updated).ok()).toBe(true);
		},

		remove: async (name) => {
			await openRowMenu(name);
			await page.getByTestId('saved-views-row-menu-item-delete').click();
			const deleted = page.waitForResponse(isViewsCall('DELETE'));
			await page.getByTestId('delete-saved-view-confirm').click();
			expect((await deleted).ok()).toBe(true);
			await expect(views.row(name)).toHaveCount(0);
		},

		create: async (name, seed) => {
			const panelType = seed.panelType ?? 'list';
			const view = {
				generateName: true,
				source: source as SavedviewtypesSourceDTO,
				schemaVersion: 'v2' as SavedviewtypesSchemaVersionDTO,
				spec: {
					displayName: name,
					panelType: panelType as SavedviewtypesPanelTypeDTO,
					requestType: REQUEST_TYPE[panelType] as Querybuildertypesv5RequestTypeDTO,
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
			} as SavedviewtypesPostableSavedViewDTO;
			return api.create(VIEWS_API, view);
		},

		list: async () =>
			(
				await api.get<Envelope<SavedviewtypesSavedViewDTO[] | null>>(
					`${VIEWS_API}?source=${source}`,
				)
			).data ?? [],

		removeByPrefix: async (prefix) => {
			const all = await views.list();
			await Promise.all(
				all
					.filter((view) => view.spec.displayName.startsWith(prefix))
					.map((view) => api.tryDel(`${VIEWS_API}/${view.id}`)),
			);
		},
	};

	return views;
}

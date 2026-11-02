/**
 * AI-owned. Generated and maintained by coding agents alongside the specs that
 * use it. Do not hand-edit: regenerate it with the spec that needs the change.
 */
import { randomBytes } from 'crypto';

import { expect, type Locator, type Page } from '@playwright/test';

import { BASE_PATH } from '../helpers/base-path';
import { buildDashboard } from '../helpers/dashboard-spec';
import type { PostableDashboard, Tag } from '../helpers/dashboard-spec.types';

import {
	DASHBOARDS_API,
	removeTrackedDashboards,
	trackDashboard,
} from './dashboards';
import { driver } from './kit';
import { test as editorTest } from './panel-editor';

// The dashboards list page (`/dashboard`): the DSL search, sort, the New
// dashboard modal and the per-row actions menu.

const LIST_PATH = '/dashboard';

/** The list route, with or without a query string. */
export const LIST_URL = /\/dashboard(\?|$)/;

/** Workers and browser projects share one backend, so names carry a random suffix. */
export function uniqueName(label: string): string {
	return `e2e list ${label} ${randomBytes(4).toString('hex')}`;
}

/** The list filter DSL, which the search box and the `query` param carry. */
export function nameContains(text: string): string {
	return `name CONTAINS '${text}'`;
}

/** A panel-less dashboard: the list only needs its name and tags. */
export function listDashboard(
	title: string,
	tags: Tag[] = [],
): PostableDashboard {
	return buildDashboard({ title, sections: [], tags });
}

export type SortColumn = 'name' | 'created' | 'updated';
export type SortOrder = 'asc' | 'desc';

const SORT_OPTION: Record<SortColumn, string> = {
	name: 'sort-by-name',
	created: 'sort-by-last-created',
	updated: 'sort-by-last-updated',
};

/** Row-menu items by the suffix of their `dashboard-action-<id>` test id. */
export type RowAction =
	| 'view'
	| 'open-new-tab'
	| 'copy-link'
	| 'rename'
	| 'edit-tags'
	| 'duplicate'
	| 'lock'
	| 'delete';

export type NewDashboardTab = 'Blank' | 'From a template' | 'Import JSON';

/** A dashboard route, not the list or an editor route. */
const DASHBOARD_ROUTE = /\/dashboard\/([^/?#]+)(?:[?#]|$)/;

export interface NewDashboardFields {
	name: string;
	description?: string;
	/** `key:value`, each committed with Enter. */
	tags?: string[];
}

export interface DashboardList {
	/** Narrowed by the `query` param to one name, since the list is paged. */
	open(
		name?: string,
		sort?: { sort?: 'name' | 'created_at' | 'updated_at'; order?: SortOrder },
	): Promise<void>;
	newDashboardButton(): Locator;
	nameInput(): Locator;
	descriptionInput(): Locator;
	tagsInput(): Locator;
	tagChips(): Locator;
	submit(): Locator;
	/**
	 * Fills and submits the Blank tab, then returns the id from the route it
	 * lands on. The dashboard is deleted when the test ends.
	 */
	create(fields: NewDashboardFields): Promise<string>;
	/**
	 * Uploads `dashboard` as a .json file on the Import JSON tab and submits it,
	 * returning the id from the route it lands on. Deleted when the test ends.
	 */
	importJson(dashboard: PostableDashboard): Promise<string>;
	/** Rows render titles in `dashboard-title-<index>`, not by id. */
	rowTitle(name: string): Locator;
	/** Opens the row's actions menu and confirms Delete. */
	delete(name: string): Promise<void>;

	/** The page's own heading, named after the active view. */
	heading(): Locator;
	feedbackButton(): Locator;
	shareButton(): Locator;
	/** The search box's editable content (a CodeMirror editor). */
	search(): Locator;
	/** Shown only while the search box is empty. */
	searchPlaceholder(): Locator;
	/** Replaces the draft and runs it, as Run query does. */
	runSearch(query: string): Promise<void>;
	clearFilters(): Locator;
	noResults(): Locator;
	rows(): Locator;
	/** Clicks the row's title and waits for its dashboard route. */
	openRow(name: string): Promise<void>;

	sortButton(): Locator;
	sortBy(column: SortColumn): Promise<void>;
	sortOrder(order: SortOrder): Promise<void>;

	openRowMenu(name: string): Promise<void>;
	rowMenu(): Locator;
	rowMenuItems(): Locator;
	rowAction(action: RowAction): Locator;
	/** Clicks the list heading, outside the open menu. */
	clickOutside(): Promise<void>;
	/** Resolves with the tab Open in New Tab opens. */
	openInNewTab(name: string): Promise<Page>;
	/** Copies the row's link and returns the copied text. */
	copyLink(name: string): Promise<string>;
	/** Opens the delete confirmation without answering it. */
	requestDelete(name: string): Promise<Locator>;
	cancelDelete(): Promise<void>;

	newDashboardDialog(): Locator;
	openNewDashboard(tab?: NewDashboardTab): Promise<void>;
	newDashboardTabs(): Locator;
	jsonEditor(): Locator;
	uploadJsonButton(): Locator;
	importJsonSubmit(): Locator;
	/** Escape from the dialog title, since the JSON editor keeps Escape. */
	dismissWithEscape(): Promise<void>;
	closeDialog(): Promise<void>;

	/** Sidebar entries are `div.nav-item`, not links. */
	sidebarDashboards(): Locator;
	back(): Promise<void>;
}

function dashboardListDriver(page: Page): DashboardList {
	const rowTitle = (name: string): Locator =>
		page
			.locator('[data-testid^="dashboard-title-"]')
			.filter({ hasText: new RegExp(`^${escapeRegExp(name)}$`) });

	const rowOf = (name: string): Locator =>
		rowTitle(name).locator(
			'xpath=ancestor::div[.//*[@data-testid="dashboard-action-icon"]][1]',
		);
	const search = (): Locator =>
		page.getByTestId('dashboards-list-search').locator('.cm-content');
	const rowMenu = (): Locator => page.getByRole('menu', { name: 'Action' });
	const newDashboardDialog = (): Locator =>
		page.getByRole('dialog', { name: 'New dashboard' });
	// The antd confirm carries no test id.
	const deleteConfirm = (): Locator => page.locator('.ant-modal-confirm');

	// The sort popover stays open after a pick, and its trigger toggles it.
	const pickSortOption = async (testId: string): Promise<void> => {
		const option = page.getByTestId(testId);
		if (!(await option.isVisible())) {
			await page.getByTestId('sort-by').click();
		}
		await option.click();
	};

	// Tracked from the response, before the route settles, so a failed
	// navigation still cleans up.
	const submitAndTrack = async (submit: Locator): Promise<string> => {
		const [response] = await Promise.all([
			page.waitForResponse(
				(r) =>
					r.request().method() === 'POST' &&
					// The app is served under the base path, and so is its API.
					new URL(r.url()).pathname === `${BASE_PATH}${DASHBOARDS_API}`,
			),
			submit.click(),
		]);
		expect(response.ok(), `POST ${DASHBOARDS_API} failed`).toBe(true);
		const created = ((await response.json()) as { data: { id: string } }).data.id;
		trackDashboard(page, created);

		await page.waitForURL(DASHBOARD_ROUTE);
		const id = DASHBOARD_ROUTE.exec(new URL(page.url()).pathname)?.[1];
		expect(id).toBe(created);
		return created;
	};

	const list: DashboardList = {
		async open(name, sort = {}) {
			const params = new URLSearchParams(
				Object.entries({
					query: name ? nameContains(name) : undefined,
					...sort,
				}).filter((entry): entry is [string, string] => entry[1] !== undefined),
			).toString();
			const search = params ? `?${params}` : '';
			await page.goto(`${LIST_PATH}${search}`);
			await expect(list.newDashboardButton()).toBeVisible();
		},
		newDashboardButton: () => page.getByTestId('new-dashboard-cta'),
		nameInput: () => page.getByTestId('create-dashboard-name'),
		descriptionInput: () => page.getByTestId('create-dashboard-description'),
		tagsInput: () => page.getByTestId('create-dashboard-tags'),
		tagChips: () => page.getByTestId('create-dashboard-tags-chip'),
		submit: () => page.getByTestId('create-dashboard-submit'),
		async create({ name, description, tags = [] }) {
			await list.newDashboardButton().click();
			await list.nameInput().fill(name);
			if (description !== undefined) {
				await list.descriptionInput().fill(description);
			}
			for (const tag of tags) {
				await list.tagsInput().fill(tag);
				await list.tagsInput().press('Enter');
			}
			await expect(list.tagChips()).toHaveCount(tags.length);
			return submitAndTrack(list.submit());
		},
		async importJson(dashboard) {
			await list.openNewDashboard('Import JSON');
			const [chooser] = await Promise.all([
				page.waitForEvent('filechooser'),
				list.uploadJsonButton().click(),
			]);
			await chooser.setFiles({
				name: 'dashboard.json',
				mimeType: 'application/json',
				buffer: Buffer.from(JSON.stringify(dashboard)),
			});
			await expect(list.jsonEditor()).toContainText(dashboard.spec.display.name);
			return submitAndTrack(list.importJsonSubmit());
		},
		rowTitle,
		async delete(name) {
			const confirm = await list.requestDelete(name);
			await Promise.all([
				page.waitForResponse(
					(r) =>
						r.request().method() === 'DELETE' &&
						r.url().includes(`${DASHBOARDS_API}/`),
				),
				confirm.getByRole('button', { name: 'Delete', exact: true }).click(),
			]);
		},

		heading: () => page.getByRole('heading', { level: 1 }),
		feedbackButton: () => page.getByRole('button', { name: 'Feedback' }),
		shareButton: () => page.getByRole('button', { name: 'Share' }),
		search,
		searchPlaceholder: () => search().locator('.cm-placeholder'),
		async runSearch(query) {
			await search().click();
			await page.keyboard.press('ControlOrMeta+A');
			await page.keyboard.insertText(query);
			await expect(search()).toHaveText(query);
			await page.getByTestId('dashboards-list-search-submit').click();
			await page.waitForURL(
				(url) => (url.searchParams.get('query') ?? '') === query.trim(),
			);
		},
		clearFilters: () => page.getByTestId('dashboards-filter-clear'),
		noResults: () => page.getByText(/^No dashboards match/),
		rows: () => page.locator('[data-testid^="dashboard-title-"]'),
		async openRow(name) {
			await rowTitle(name).click();
			await page.waitForURL(DASHBOARD_ROUTE);
		},

		sortButton: () => page.getByTestId('sort-by'),
		async sortBy(column) {
			await pickSortOption(SORT_OPTION[column]);
		},
		async sortOrder(order) {
			await pickSortOption(`sort-order-${order}`);
		},

		async openRowMenu(name) {
			await rowOf(name).getByTestId('dashboard-action-icon').click();
			await expect(rowMenu()).toBeVisible();
		},
		rowMenu,
		rowMenuItems: () => rowMenu().getByRole('menuitem'),
		rowAction: (action) => page.getByTestId(`dashboard-action-${action}`),
		async clickOutside() {
			// The open menu makes the rest of the page inert to locator clicks.
			const box = await list.heading().boundingBox();
			expect(box, 'list heading has no box').not.toBeNull();
			const { x, y, width, height } = box as NonNullable<typeof box>;
			await page.mouse.click(x + width / 2, y + height / 2);
		},
		async openInNewTab(name) {
			await list.openRowMenu(name);
			const [tab] = await Promise.all([
				page.context().waitForEvent('page'),
				list.rowAction('open-new-tab').click(),
			]);
			await tab.waitForLoadState();
			return tab;
		},
		async copyLink(name) {
			// Clipboard permissions are Chromium-only, so the copy is caught in the
			// page: react-use copies through a selection and execCommand, whose
			// `copy` event a capture listener sees first.
			await page.evaluate(() => {
				const w = window as unknown as { __copied?: string };
				delete w.__copied;
				document.addEventListener(
					'copy',
					() => {
						w.__copied = document.getSelection()?.toString() ?? '';
					},
					{ capture: true, once: true },
				);
			});
			await list.openRowMenu(name);
			await list.rowAction('copy-link').click();
			await expect(rowMenu()).toBeHidden();
			const copied = (): Promise<string | undefined> =>
				page.evaluate(() => (window as unknown as { __copied?: string }).__copied);
			await expect.poll(copied).toBeTruthy();
			return (await copied()) as string;
		},
		async requestDelete(name) {
			await list.openRowMenu(name);
			await list.rowAction('delete').click();
			await expect(deleteConfirm()).toContainText(name);
			return deleteConfirm();
		},
		async cancelDelete() {
			await deleteConfirm().getByRole('button', { name: 'Cancel' }).click();
			await expect(deleteConfirm()).toBeHidden();
		},

		newDashboardDialog,
		async openNewDashboard(tab) {
			await list.newDashboardButton().click();
			await expect(newDashboardDialog()).toBeVisible();
			if (tab) {
				await newDashboardDialog().getByRole('tab', { name: tab }).click();
			}
		},
		newDashboardTabs: () => newDashboardDialog().getByRole('tab'),
		jsonEditor: () => newDashboardDialog().locator('.monaco-editor'),
		uploadJsonButton: () => page.getByTestId('upload-json-file'),
		importJsonSubmit: () => page.getByTestId('import-json-submit'),
		async dismissWithEscape() {
			await newDashboardDialog()
				.getByRole('heading', { name: 'New dashboard' })
				.click();
			await page.keyboard.press('Escape');
		},
		async closeDialog() {
			await newDashboardDialog().getByRole('button', { name: 'Close' }).click();
		},

		sidebarDashboards: () =>
			page.locator('.nav-item').filter({ hasText: /^Dashboards$/ }),
		async back() {
			await page.goBack();
		},
	};

	return list;
}

function escapeRegExp(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const withDashboardList = driver(
	'dashboardList',
	({ page }) => dashboardListDriver(page),
	(_, { page }) => removeTrackedDashboards(page),
);

export const test = withDashboardList(editorTest);

export * from './panel-editor';

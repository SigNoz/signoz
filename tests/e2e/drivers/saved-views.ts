/**
 * AI-owned. Generated and maintained by coding agents alongside the specs that
 * use it. Do not hand-edit: regenerate it with the spec that needs the change.
 */
import {
	expect,
	type Locator,
	type Page,
	type Request,
	type Response,
} from '@playwright/test';

import { BASE_PATH } from '../helpers/base-path';
import { collectRequests } from '../helpers/common';
import { dismissQuickFiltersAnnouncement } from '../helpers/quick-filters';
import {
	filterExpressions,
	isQueryRangeRequest,
	queryRangeBody,
} from './saved-views/query';
import { SAVED_VIEWS_API, seededView } from './saved-views/spec';
import type {
	GettableSavedView,
	PostableSavedView,
	SavedViewSource,
	SeededView,
} from './saved-views/spec.types';

import { driver, kit } from './kit';
import {
	createViaApi,
	getViaApi,
	removeTrackedSavedViews,
	statusViaApi,
	trackSavedView,
} from './saved-views/api';

// The saved views header and list on the explorers: the sliding list on logs,
// traces and meter, the pinned one on metrics.

export const MY_VIEW = 'My view';

const EXPLORER_PATH: Record<SavedViewSource, string> = {
	logs: '/logs/logs-explorer',
	traces: '/traces-explorer',
	metrics: '/metrics-explorer/explorer',
	meter: '/meter/explorer',
};

export function explorerPathname(source: SavedViewSource): string {
	return `${BASE_PATH}${EXPLORER_PATH[source]}`;
}

/** Row-menu items by the suffix of their `saved-views-row-menu-item-<key>` test id. */
export type RowAction = 'copyLink' | 'copyId' | 'editDetails' | 'delete';

/** Save-menu items by the suffix of their `saved-views-save-changes-item-<key>` test id. */
export type SaveAction = 'update' | 'save-as-new';

export type LinkGesture = 'modifier' | 'middle';

export interface OpenedTab {
	page: Page;
	savedViews: SavedViews;
}

export type ExplorerTab = 'list' | 'timeseries' | 'table';

export interface SavedViews {
	/** Created over the page's own session; deleted when the test ends. */
	seed(view: PostableSavedView): Promise<SeededView>;
	/** The stored view, read straight from the API. */
	get(id: string): Promise<GettableSavedView>;
	/** The status of `GET /api/v2/saved_views/<id>`, for asserting a view is gone. */
	status(id: string): Promise<number>;

	/** On a bare url by default, which is `relativeTime=1h` and nothing else. */
	openExplorer(
		source?: SavedViewSource,
		params?: Record<string, string>,
	): Promise<void>;
	/** Reloads and waits for the explorer to send the filter's query. */
	reload(filter?: string, requestType?: string): Promise<void>;
	/** The explorer's next query that carries `filter`, of `requestType` when given. */
	queryRan(filter: string, requestType?: string): Promise<Response>;
	/** The current url. */
	url(): URL;
	/** A query param of the current url, where the open view and time range live. */
	param(name: string): string | null;
	/** The id in the `viewKey` param, or null while no view is open. */
	activeViewId(): string | null;

	header(): Locator;
	name(): Locator;
	createButton(): Locator;
	clearButton(): Locator;
	discardButton(): Locator;
	saveChangesButton(): Locator;
	saveAction(action: SaveAction): Locator;
	/** The view is open and nothing differs from what is stored. */
	expectClean(displayName: string): Promise<void>;
	/** The view is open and the explorer holds changes to it. */
	expectDirty(displayName: string): Promise<void>;
	/** No view is open. */
	expectNoView(): Promise<void>;
	toast(text: string): Locator;

	openListButton(): Locator;
	panel(): Locator;
	searchInput(): Locator;
	openList(): Promise<void>;
	/** Narrows the list, and waits for exactly `rows` rows when given. */
	search(text: string, rows?: number): Promise<void>;
	rows(): Locator;
	row(id: string): Locator;
	rowLink(id: string): Locator;
	/** The row link's href, resolved against the current page. */
	rowHref(id: string): Promise<URL>;
	/**
	 * Searches for the view, opens it from its row and waits for the explorer's
	 * query for it. Resolves with that query's response.
	 */
	open(view: SeededView): Promise<Response>;

	rowMenuButton(id: string): Locator;
	rowAction(action: RowAction): Locator;
	openRowMenu(id: string): Promise<void>;
	/** Opens the row's menu and picks an action once its permission check settles. */
	chooseRowAction(id: string, action: RowAction): Promise<void>;
	/** Opens the row's menu and picks Copy link, returning the copied text. */
	copyLink(id: string): Promise<string>;
	/**
	 * Ctrl or Cmd click, or a middle click, on the row link. Resolves once the
	 * tab exists, not once it has loaded; the driver is bound to the new tab.
	 */
	openInNewTab(id: string, gesture?: LinkGesture): Promise<OpenedTab>;
	/**
	 * Opens `url` in a new tab of the same browser context and waits for the
	 * explorer's query for `view`.
	 */
	openLink(url: URL | string, view: SeededView): Promise<OpenedTab>;
	/** Tabs the browser context has opened since this driver was built. */
	newTabCount(): number;
	rename(id: string, displayName: string): Promise<void>;
	/** Confirms the delete dialog and waits for the DELETE. */
	deleteView(id: string): Promise<void>;

	modal(): Locator;
	modalNameInput(): Locator;
	modalSubmit(): Locator;
	deleteConfirm(): Locator;
	/** Create from the header: names the view, saves it and returns its id. */
	createFromHeader(displayName: string): Promise<string>;
	/** Types into the query bar, runs it and waits for the query to carry it. */
	applyFilter(filter: string): Promise<void>;
	queryBar(): Locator;
	/** Header cells of the logs table with a title: the state indicator has none. */
	logsColumnHeaders(): Locator;
	openLogsFormatMenu(): Promise<void>;
	closeLogsFormatMenu(): Promise<void>;
	/** The checked format in the open menu: Raw, Default or Column. */
	selectedLogsFormat(): Locator;
	logsMaxLines(): Locator;
	logsFontSize(): Locator;
	explorerTab(tab: ExplorerTab): Locator;
	/** Changes when the document reloads and not when the app navigates in place. */
	documentId(): Promise<number>;
	/** Update selected view, waiting for the PUT and the toast. */
	update(): Promise<void>;
	discard(): Promise<void>;

	/** `GET /api/v2/saved_views/<id>` requests the page has made so far. */
	viewGets(id: string): Request[];
}

/** The driver on any page of the same context, such as a tab a link opened. */
export function savedViewsFor(page: Page): SavedViews {
	const requests = collectRequests(page);
	let newTabs = 0;
	page.context().on('page', () => {
		newTabs += 1;
	});
	const tid = (id: string): Locator => page.getByTestId(id);
	const formatMenu = (): Locator => page.locator('.format-options-popover');
	const viewPath = (id: string): string =>
		`${BASE_PATH}${SAVED_VIEWS_API}/${id}`;

	// A menu row, like a header button, ignores clicks until its permission
	// check settles, and stays enabled-looking meanwhile.
	const settle = async (control: Locator): Promise<void> => {
		await expect(control).toBeVisible();
		await expect(control).not.toHaveAttribute('aria-busy');
		await expect(control).not.toHaveAttribute('data-loading');
		await expect(control).not.toHaveAttribute('data-disabled');
	};
	const press = async (control: Locator): Promise<void> => {
		await settle(control);
		await control.click();
	};

	const savedViews: SavedViews = {
		async seed(view) {
			const id = await createViaApi(page, view);
			trackSavedView(page, id);
			return seededView(id, view);
		},
		get: (id) => getViaApi(page, id),
		status: (id) => statusViaApi(page, id),

		async openExplorer(source = 'logs', params = { relativeTime: '1h' }) {
			await dismissQuickFiltersAnnouncement(page);
			const search = new URLSearchParams(params).toString();
			await page.goto(`${EXPLORER_PATH[source]}${search ? `?${search}` : ''}`);
			await expect(savedViews.header()).toBeVisible();
		},
		async reload(filter, requestType) {
			await Promise.all([
				filter === undefined ? undefined : savedViews.queryRan(filter, requestType),
				page.reload(),
			]);
			await expect(savedViews.header()).toBeVisible();
		},
		queryRan: (filter, requestType) =>
			page.waitForResponse((res) => {
				const request = res.request();
				return (
					isQueryRangeRequest(request) &&
					filterExpressions(request).includes(filter) &&
					(requestType === undefined ||
						queryRangeBody(request).requestType === requestType)
				);
			}),
		url: () => new URL(page.url()),
		param: (name) => new URL(page.url()).searchParams.get(name),
		activeViewId() {
			const raw = savedViews.param('viewKey');
			return raw === null ? null : (JSON.parse(raw) as string);
		},

		header: () => tid('saved-views-header'),
		name: () => tid('saved-views-name'),
		createButton: () => tid('saved-views-create'),
		clearButton: () => tid('saved-views-clear'),
		discardButton: () => tid('saved-views-discard'),
		saveChangesButton: () => tid('saved-views-save-changes'),
		saveAction: (action) => tid(`saved-views-save-changes-item-${action}`),
		async expectClean(displayName) {
			await expect(savedViews.name()).toHaveText(displayName);
			await expect(savedViews.clearButton()).toBeVisible();
			await expect(savedViews.discardButton()).toBeHidden();
			await expect(savedViews.saveChangesButton()).toBeHidden();
		},
		async expectDirty(displayName) {
			await expect(savedViews.name()).toHaveText(displayName);
			await expect(savedViews.discardButton()).toBeVisible();
			await expect(savedViews.saveChangesButton()).toBeVisible();
			await expect(savedViews.clearButton()).toBeHidden();
		},
		async expectNoView() {
			await expect(savedViews.name()).toHaveText(MY_VIEW);
			await expect(savedViews.createButton()).toBeVisible();
			await expect(savedViews.clearButton()).toBeHidden();
			await expect.poll(() => savedViews.param('viewKey')).toBeNull();
		},
		toast: (text) =>
			page.locator('[data-sonner-toast]').filter({ hasText: text }),

		openListButton: () => tid('saved-views-open'),
		panel: () => tid('saved-views-panel'),
		searchInput: () => tid('saved-views-search'),
		async openList() {
			await expect(
				savedViews.openListButton().or(savedViews.panel()),
			).toBeVisible();
			if (!(await savedViews.panel().isVisible())) {
				await press(savedViews.openListButton());
			}
			await expect(savedViews.panel()).toBeVisible();
		},
		async search(text, rows) {
			await savedViews.searchInput().fill(text);
			if (rows !== undefined) {
				await expect(savedViews.rows()).toHaveCount(rows);
			}
		},
		rows: () => tid('saved-views-row'),
		row: (id) =>
			page.locator(`[data-testid="saved-views-row"][data-view-id="${id}"]`),
		rowLink: (id) => savedViews.row(id).getByTestId('saved-views-row-name'),
		async rowHref(id) {
			const href = await savedViews.rowLink(id).getAttribute('href');
			expect(href, `row ${id} has no href`).not.toBeNull();
			return new URL(href as string, page.url());
		},
		async open(view) {
			await savedViews.openList();
			await savedViews.search(view.displayName);
			const [response] = await Promise.all([
				savedViews.queryRan(view.filter, view.requestType),
				savedViews.rowLink(view.id).click(),
			]);
			await expect.poll(() => savedViews.activeViewId()).toBe(view.id);
			await expect(savedViews.name()).toHaveText(view.displayName);
			return response;
		},

		rowMenuButton: (id) => savedViews.row(id).getByTestId('saved-views-row-menu'),
		rowAction: (action) => tid(`saved-views-row-menu-item-${action}`),
		async openRowMenu(id) {
			// The menu button has no width until the row is hovered.
			await savedViews.row(id).hover();
			await savedViews.rowMenuButton(id).click();
		},
		async chooseRowAction(id, action) {
			await savedViews.openRowMenu(id);
			await press(savedViews.rowAction(action));
		},
		async copyLink(id) {
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
			await savedViews.chooseRowAction(id, 'copyLink');
			const copied = (): Promise<string | undefined> =>
				page.evaluate(() => (window as unknown as { __copied?: string }).__copied);
			await expect.poll(copied).toBeTruthy();
			return (await copied()) as string;
		},
		async openInNewTab(id, gesture = 'modifier') {
			const [tab] = await Promise.all([
				page.context().waitForEvent('page'),
				savedViews
					.rowLink(id)
					.click(
						gesture === 'modifier'
							? { modifiers: ['ControlOrMeta'] }
							: { button: 'middle' },
					),
			]);
			return { page: tab, savedViews: savedViewsFor(tab) };
		},
		async openLink(url, view) {
			const tab = await page.context().newPage();
			const opened = savedViewsFor(tab);
			await Promise.all([
				opened.queryRan(view.filter, view.requestType),
				tab.goto(url.toString()),
			]);
			return { page: tab, savedViews: opened };
		},
		newTabCount: () => newTabs,
		async rename(id, displayName) {
			await savedViews.chooseRowAction(id, 'editDetails');
			await expect(savedViews.modalNameInput()).toBeVisible();
			await savedViews.modalNameInput().fill(displayName);
			const [response] = await Promise.all([
				page.waitForResponse(
					(res) =>
						res.request().method() === 'PUT' &&
						new URL(res.url()).pathname === viewPath(id),
				),
				savedViews.modalSubmit().click(),
			]);
			expect(response.ok(), `PUT ${SAVED_VIEWS_API}/${id}`).toBe(true);
			await expect(savedViews.modal()).toBeHidden();
		},
		async deleteView(id) {
			await Promise.all([
				page.waitForResponse(
					(res) =>
						res.request().method() === 'DELETE' &&
						new URL(res.url()).pathname === viewPath(id),
				),
				press(savedViews.deleteConfirm()),
			]);
			await expect(savedViews.deleteConfirm()).toBeHidden();
		},

		modal: () => tid('save-view-modal'),
		modalNameInput: () => tid('save-view-name'),
		modalSubmit: () => tid('save-view-submit'),
		deleteConfirm: () => tid('delete-saved-view-confirm'),
		async createFromHeader(displayName) {
			await press(savedViews.createButton());
			await savedViews.modalNameInput().fill(displayName);
			const [response] = await Promise.all([
				page.waitForResponse(
					(res) =>
						res.request().method() === 'POST' &&
						new URL(res.url()).pathname === `${BASE_PATH}${SAVED_VIEWS_API}`,
				),
				savedViews.modalSubmit().click(),
			]);
			expect(response.status(), `POST ${SAVED_VIEWS_API}`).toBe(201);
			const { id } = ((await response.json()) as { data: { id: string } }).data;
			trackSavedView(page, id);
			await expect(savedViews.modal()).toBeHidden();
			return id;
		},
		logsColumnHeaders: () => page.locator('thead th').filter({ hasText: /\S/ }),
		async openLogsFormatMenu() {
			await tid('periscope-btn-format-options').click();
			await expect(formatMenu()).toBeVisible();
		},
		async closeLogsFormatMenu() {
			await tid('periscope-btn-format-options').click();
			await expect(formatMenu()).toBeHidden();
		},
		selectedLogsFormat: () =>
			formatMenu()
				.locator('.menu-items .item')
				.filter({ has: page.locator('svg') }),
		logsMaxLines: () => formatMenu().locator('.max-lines-per-row-input input'),
		logsFontSize: () => formatMenu().locator('.font-value'),
		explorerTab: (tab) => page.locator(`.${tab}-view-tab`),
		documentId: () => page.evaluate(() => performance.timeOrigin),
		queryBar: () =>
			page.locator('.query-where-clause-editor .cm-content').first(),
		async applyFilter(filter) {
			await Promise.all([
				savedViews.queryRan(filter),
				(async (): Promise<void> => {
					await savedViews.queryBar().click();
					await page.keyboard.press('ControlOrMeta+a');
					await page.keyboard.insertText(filter);
					await expect(savedViews.queryBar()).toHaveText(filter);
					await page.locator('[data-run-query-btn]').click();
				})(),
			]);
		},
		async update() {
			const id = savedViews.activeViewId();
			await savedViews.saveChangesButton().click();
			const [response] = await Promise.all([
				page.waitForResponse(
					(res) =>
						res.request().method() === 'PUT' &&
						new URL(res.url()).pathname === viewPath(id as string),
				),
				press(savedViews.saveAction('update')),
			]);
			expect(response.ok(), `PUT ${SAVED_VIEWS_API}/${id}`).toBe(true);
			await expect(savedViews.toast('View updated')).toBeVisible();
		},
		async discard() {
			await press(savedViews.discardButton());
		},

		viewGets: (id) =>
			requests.filter(
				(request) =>
					request.method() === 'GET' &&
					new URL(request.url()).pathname === viewPath(id),
			),
	};

	return savedViews;
}

const withSavedViews = driver(
	'savedViews',
	({ page }) => savedViewsFor(page),
	(_, { page }) => removeTrackedSavedViews(page),
);

export const test = withSavedViews(kit);

export { expect } from './kit';
export * from './saved-views/spec';
export type * from './saved-views/spec.types';
export { queryRangeBody } from './saved-views/query';

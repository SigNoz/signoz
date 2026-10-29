/**
 * AI-owned. Generated and maintained by coding agents alongside the specs that
 * use it. Do not hand-edit: regenerate it with the spec that needs the change.
 */
import { expect, type Locator, type Page } from '@playwright/test';

import { driver } from './kit';
import { test as panelsTest } from './panels';

// The dashboard page chrome around the grid: breadcrumb, title, toolbar, the
// Actions menu, the JSON drawer and the section headers.

/** Suffixes of the `dashboard-action-<key>` testids on the Actions menu items. */
export const DashboardAction = {
	rename: 'rename',
	clone: 'clone',
	lock: 'lock',
	fullScreen: 'fullscreen',
	newSection: 'new-section',
	delete: 'delete',
} as const;

export type DashboardAction =
	(typeof DashboardAction)[keyof typeof DashboardAction];

/** Section menu items carry no testid; their label is the contract. */
export const SectionAction = {
	addPanel: 'Add panel',
	rename: 'Rename section',
	clone: 'Clone section',
	delete: 'Delete section',
} as const;

export interface SectionHandle {
	root(): Locator;
	/** The header button, named by the title; it toggles collapse. */
	toggle(): Locator;
	/** Panel roots mounted in the section: none while collapsed. */
	panels(): Locator;
	collapse(): Promise<void>;
	expand(): Promise<void>;
	openMenu(): Promise<Locator>;
	menuItem(label: string): Locator;
	/** Opens the rename modal and leaves it open. */
	startRename(): Promise<void>;
	rename(title: string): Promise<void>;
	delete(): Promise<void>;
}

export interface Toolbar {
	actions(): Locator;
	configure(): Locator;
	json(): Locator;
	newPanel(): Locator;
	timePicker(): Locator;
	/** No testid or accessible name: matched by its wrapper class. */
	refresh(): Locator;
	autoRefresh(): Locator;
	feedback(): Locator;
	share(): Locator;
}

/** The toolbar's controls, shared with the time picker and settings drivers. */
export function toolbarAt(page: Page): Toolbar {
	return {
		actions: () => page.getByTestId('options'),
		configure: () => page.getByTestId('show-drawer'),
		json: () => page.getByTestId('edit-json'),
		newPanel: () => page.getByTestId('add-panel-header'),
		timePicker: () => page.getByTestId('dropDown'),
		refresh: () => page.locator('.refresh-btn button'),
		autoRefresh: () => page.getByRole('button', { name: 'Set auto refresh' }),
		feedback: () => page.getByRole('button', { name: 'Feedback' }),
		share: () => page.getByRole('button', { name: 'Share' }),
	};
}

export interface DashboardPage {
	/** The confirm dialog's Cancel, which carries no testid. */
	cancelDelete(): Locator;
	breadcrumb(): Locator;
	/** The breadcrumb's link back to the list. */
	breadcrumbHome(): Locator;
	title(): Locator;
	documentTitle(): Promise<string>;
	tags(): Locator;
	tagsOverflow(): Locator;
	toolbar: Toolbar;
	actions: {
		open(): Promise<Locator>;
		close(): Promise<void>;
		item(action: DashboardAction): Locator;
		run(action: DashboardAction): Promise<void>;
	};
	rename: {
		input(): Locator;
		save(): Locator;
		cancel(): Locator;
		/** Through Actions → Rename, saved with the check button. */
		to(name: string): Promise<void>;
	};
	/** Header icon, rendered once the dashboard has been locked. */
	lockToggle(): Locator;
	lock(): Promise<void>;
	isFullScreen(): Promise<boolean>;
	exitFullScreen(): Promise<void>;
	json: {
		open(): Promise<void>;
		/** Returns what the Copy button put on the clipboard. */
		copy(): Promise<string>;
		/** Resolves with the suggested filename of the downloaded file. */
		download(): Promise<string>;
	};
	section(title: string): SectionHandle;
	sectionTitles(): Locator;
	sectionModal: {
		input(): Locator;
		submit(): Locator;
		cancel(): Locator;
	};
	/** Through Actions → New section. */
	addSection(title: string): Promise<void>;
	/** A variable's selector, which shows its current value. */
	variableValue(name: string): Locator;
	/** Shown in place of the page when the dashboard fetch fails. No testid. */
	loadError(): Locator;
	navigateSideNav(label: string): Promise<void>;
	/** The dashboards list, identified by its create button. */
	listPage(): Locator;
	/** Collects `pageerror`s from now on. */
	collectPageErrors(): { readonly errors: Error[] };
}

function sectionHandle(page: Page, title: string): SectionHandle {
	const toggle = (): Locator =>
		page.getByRole('button', { name: title, exact: true });
	const root = (): Locator =>
		page.locator('[data-section-layout-index]').filter({ has: toggle() });
	const menu = (): Locator => page.getByRole('menu');
	const menuItem = (label: string): Locator =>
		menu().getByRole('menuitem', { name: label, exact: true });
	const modal = (): Locator => page.getByRole('dialog');

	const section: SectionHandle = {
		root,
		toggle,
		panels: () => root().locator('[data-panel-root]'),
		async collapse() {
			await expect(section.panels().first()).toBeAttached();
			await toggle().click();
			await expect(section.panels()).toHaveCount(0);
		},
		async expand() {
			await expect(section.panels()).toHaveCount(0);
			await toggle().click();
			await expect(section.panels().first()).toBeAttached();
		},
		async openMenu() {
			await root().locator('[data-testid^="dashboard-section-actions-"]').click();
			await expect(menu()).toBeVisible();
			return menu();
		},
		menuItem,
		async startRename() {
			await section.openMenu();
			await menuItem(SectionAction.rename).click();
			await expect(modal()).toBeVisible();
		},
		async rename(next) {
			await section.startRename();
			await page.getByTestId('section-title-input').fill(next);
			await page.getByTestId('section-title-submit').click();
			await expect(modal()).toBeHidden();
		},
		async delete() {
			await section.openMenu();
			await menuItem(SectionAction.delete).click();
			await page.getByTestId('confirm-delete').click();
			await expect(root()).toHaveCount(0);
		},
	};
	return section;
}

function dashboardPageDriver(page: Page): DashboardPage {
	const breadcrumb = (): Locator =>
		page.getByRole('navigation', { name: 'breadcrumb' });
	const actionsMenu = (): Locator => page.getByRole('menu');
	const actionItem = (action: DashboardAction): Locator =>
		page.getByTestId(`dashboard-action-${action}`);
	const jsonDrawer = (): Locator =>
		page.getByRole('dialog').filter({ hasText: 'Dashboard JSON' });

	const dashboardPage: DashboardPage = {
		cancelDelete: () =>
			page.getByRole('dialog').getByRole('button', { name: 'Cancel' }),
		breadcrumb,
		breadcrumbHome: () =>
			breadcrumb().getByRole('link', { name: 'Dashboard', exact: true }),
		title: () => page.getByTestId('dashboard-title'),
		documentTitle: () => page.title(),
		tags: () => page.getByTestId('dashboard-tags'),
		tagsOverflow: () => page.getByTestId('dashboard-tags-overflow'),
		toolbar: toolbarAt(page),
		actions: {
			async open() {
				await dashboardPage.actions.close();
				await dashboardPage.toolbar.actions().click();
				await expect(actionsMenu()).toBeVisible();
				return actionsMenu();
			},
			async close() {
				if ((await actionsMenu().count()) === 0) {
					return;
				}
				await page.keyboard.press('Escape');
				await expect(actionsMenu()).toHaveCount(0);
			},
			item: actionItem,
			async run(action) {
				await dashboardPage.actions.open();
				await actionItem(action).click();
			},
		},
		rename: {
			input: () => page.getByTestId('dashboard-title-input'),
			save: () => page.getByTestId('dashboard-title-save'),
			cancel: () => page.getByTestId('dashboard-title-cancel'),
			async to(name) {
				await dashboardPage.actions.run(DashboardAction.rename);
				await dashboardPage.rename.input().fill(name);
				await dashboardPage.rename.save().click();
				await expect(dashboardPage.title()).toHaveText(name);
			},
		},
		lockToggle: () => page.getByTestId('dashboard-lock'),
		async lock() {
			await dashboardPage.actions.run(DashboardAction.lock);
			await expect(dashboardPage.lockToggle()).toHaveAccessibleName(
				'Unlock dashboard',
			);
		},
		isFullScreen: () => page.evaluate(() => !!document.fullscreenElement),
		async exitFullScreen() {
			await page.evaluate(() => document.exitFullscreen());
		},
		json: {
			async open() {
				await dashboardPage.toolbar.json().click();
				await expect(jsonDrawer()).toBeVisible();
			},
			async copy() {
				await page
					.context()
					.grantPermissions(['clipboard-read', 'clipboard-write']);
				await page.getByTestId('json-editor-copy').click();
				await expect(page.getByText('JSON copied to clipboard')).toBeVisible();
				return page.evaluate(() =>
					(
						globalThis as unknown as {
							navigator: { clipboard: { readText(): Promise<string> } };
						}
					).navigator.clipboard.readText(),
				);
			},
			async download() {
				const [file] = await Promise.all([
					page.waitForEvent('download'),
					page.getByTestId('json-editor-download').click(),
				]);
				return file.suggestedFilename();
			},
		},
		section: (title) => sectionHandle(page, title),
		sectionTitles: () =>
			page.locator('[data-testid^="dashboard-section-toggle-"]'),
		sectionModal: {
			input: () => page.getByTestId('section-title-input'),
			submit: () => page.getByTestId('section-title-submit'),
			cancel: () => page.getByTestId('section-title-cancel'),
		},
		async addSection(title) {
			await dashboardPage.actions.run(DashboardAction.newSection);
			await dashboardPage.sectionModal.input().fill(title);
			await dashboardPage.sectionModal.submit().click();
			await expect(dashboardPage.section(title).toggle()).toBeVisible();
		},
		variableValue: (name) => page.getByTestId(`variable-select-${name}`),
		loadError: () =>
			page.getByRole('heading', { name: 'Failed to load dashboard' }),
		async navigateSideNav(label) {
			await page
				.locator('.nav-item')
				.filter({ hasText: new RegExp(`^${label}$`) })
				.click();
		},
		listPage: () => page.getByTestId('new-dashboard-cta'),
		collectPageErrors() {
			const collected = { errors: [] as Error[] };
			page.on('pageerror', (error) => collected.errors.push(error));
			return collected;
		},
	};

	return dashboardPage;
}

const withDashboardPage = driver('dashboardPage', ({ page }) =>
	dashboardPageDriver(page),
);

export const test = withDashboardPage(panelsTest);

export * from './panels';

/**
 * AI-owned. Generated and maintained by coding agents alongside the specs that
 * use it. Do not hand-edit: regenerate it with the spec that needs the change.
 */
import { expect, type Locator, type Page } from '@playwright/test';

import { BASE_PATH } from '../helpers/base-path';

import {
	DASHBOARDS_API,
	removeTrackedDashboards,
	trackDashboard,
} from './dashboards';
import { driver } from './kit';
import { test as editorTest } from './panel-editor';

// The dashboards list page (`/dashboard`): the New dashboard modal's Blank tab
// and the per-row actions menu.

const LIST_PATH = '/dashboard';

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
	open(name?: string): Promise<void>;
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
	/** Rows render titles in `dashboard-title-<index>`, not by id. */
	rowTitle(name: string): Locator;
	/** Opens the row's actions menu and confirms Delete. */
	delete(name: string): Promise<void>;
}

function dashboardListDriver(page: Page): DashboardList {
	const rowTitle = (name: string): Locator =>
		page
			.locator('[data-testid^="dashboard-title-"]')
			.filter({ hasText: new RegExp(`^${escapeRegExp(name)}$`) });

	const list: DashboardList = {
		async open(name) {
			const search = name
				? `?${new URLSearchParams({ query: `name CONTAINS '${name}'` }).toString()}`
				: '';
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

			const [response] = await Promise.all([
				page.waitForResponse(
					(r) =>
						r.request().method() === 'POST' &&
						// The app is served under the base path, and so is its API.
						new URL(r.url()).pathname === `${BASE_PATH}${DASHBOARDS_API}`,
				),
				list.submit().click(),
			]);
			// Tracked from the response, before the route settles, so a failed
			// navigation still cleans up.
			expect(response.ok(), `POST ${DASHBOARDS_API} failed`).toBe(true);
			const created = ((await response.json()) as { data: { id: string } }).data
				.id;
			trackDashboard(page, created);

			await page.waitForURL(DASHBOARD_ROUTE);
			const id = DASHBOARD_ROUTE.exec(new URL(page.url()).pathname)?.[1];
			expect(id).toBe(created);
			return created;
		},
		rowTitle,
		async delete(name) {
			const row = rowTitle(name).locator(
				'xpath=ancestor::div[.//*[@data-testid="dashboard-action-icon"]][1]',
			);
			await row.getByTestId('dashboard-action-icon').click();
			await page.getByTestId('dashboard-action-delete').click();
			// The confirm is an antd `modal.confirm` with no testid.
			const confirm = page.locator('.ant-modal-confirm');
			await expect(confirm).toContainText(name);
			await Promise.all([
				page.waitForResponse(
					(r) =>
						r.request().method() === 'DELETE' &&
						r.url().includes(`${DASHBOARDS_API}/`),
				),
				confirm.getByRole('button', { name: 'Delete', exact: true }).click(),
			]);
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

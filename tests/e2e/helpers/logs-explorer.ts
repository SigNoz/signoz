import { expect, type Locator, type Page } from '@playwright/test';

import { dismissQuickFiltersAnnouncement } from './quick-filters';

export const LOGS_EXPLORER_PATH = '/logs/logs-explorer';

const RELATIVE_TIME = '6h';

const FORMAT_OPTIONS_TEST_ID = 'periscope-btn-format-options';

export type LogsFormat = 'Raw' | 'Default' | 'Column';

const FORMAT_MODES: Record<LogsFormat, string> = {
	Raw: 'raw',
	Default: 'list',
	Column: 'table',
};

export async function gotoLogsExplorer(page: Page): Promise<void> {
	await dismissQuickFiltersAnnouncement(page);
	await page.goto(`${LOGS_EXPLORER_PATH}?relativeTime=${RELATIVE_TIME}`);
	await expect(page.getByTestId(FORMAT_OPTIONS_TEST_ID)).toBeVisible();
}

export async function setLogsFormat(
	page: Page,
	format: LogsFormat,
): Promise<void> {
	const trigger = page.getByTestId(FORMAT_OPTIONS_TEST_ID);
	const popover = page.locator('.format-options-popover');
	const appliedMode = new RegExp(`%22format%22%3A%22${FORMAT_MODES[format]}%22`);

	await expect(async () => {
		if (!(await popover.isVisible())) {
			await trigger.click();
			await expect(popover).toBeVisible();
		}
		await popover
			.locator('.menu-items .item')
			.filter({ hasText: format })
			.click();
		await expect(page).toHaveURL(appliedMode, { timeout: 3_000 });
	}).toPass({ timeout: 20_000 });

	await trigger.click();
	await expect(popover).toBeHidden();
}

export function logsTableRows(page: Page): Locator {
	return page.locator('.logs-list-view-container tbody tr');
}

export function logDetailsDrawer(page: Page): Locator {
	return page.locator('.log-detail-drawer__content');
}

export async function openLogDetailsFromRow(row: Locator): Promise<void> {
	await row.locator('td').first().click();
	await expect(logDetailsDrawer(row.page())).toBeVisible();
}

export async function openContextView(page: Page): Promise<void> {
	await page
		.locator('.views-tabs')
		.getByText('Context', { exact: true })
		.click();
	await expect(contextLogItems(page).first()).toBeVisible();
}

export function contextLogItems(page: Page): Locator {
	return page.locator('.context-log-renderer__item');
}

export async function openContextLogInNewTab(
	page: Page,
	index = 0,
): Promise<Page> {
	const [newPage] = await Promise.all([
		page.context().waitForEvent('page'),
		contextLogItems(page).nth(index).click(),
	]);
	await newPage.waitForLoadState();
	return newPage;
}

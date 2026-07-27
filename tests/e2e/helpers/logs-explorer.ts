import { expect, type Locator, type Page } from '@playwright/test';

import { dismissQuickFiltersAnnouncement } from './quick-filters';

const LOGS_EXPLORER_PATH = '/logs/logs-explorer';

const RELATIVE_TIME = '6h';

const FORMAT_OPTIONS_TEST_ID = 'periscope-btn-format-options';

const ROW_TEST_ID_PREFIX = 'logs-table-row-';

const LOG_DETAIL_DRAWER_TEST_ID = 'log-detail-drawer';
export const LINKED_ROW_CLASS = 'logs-linked-row';

type LogsFormat = 'Raw' | 'Default' | 'Column';

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
	return page.locator(`[data-testid^="${ROW_TEST_ID_PREFIX}"]`);
}

export function logsTableRow(page: Page, logId: string): Locator {
	return page.getByTestId(`${ROW_TEST_ID_PREFIX}${logId}`);
}

export function highlightedLogsTableRows(page: Page): Locator {
	return logsTableRows(page).and(page.locator(`.${LINKED_ROW_CLASS}`));
}

/**
 * Rows without the highlight. `:not()` rather than `filter({ hasNot })` — the
 * latter tests descendants, and the class sits on the row element itself.
 */
export function unhighlightedLogsTableRows(page: Page): Locator {
	return page.locator(
		`[data-testid^="${ROW_TEST_ID_PREFIX}"]:not(.${LINKED_ROW_CLASS})`,
	);
}

export function activeLogIdFromUrl(page: Page): string {
	const value = new URL(page.url()).searchParams.get('activeLogId');
	if (!value) {
		throw new Error(`No activeLogId in URL: ${page.url()}`);
	}
	return value.replace(/"/g, '');
}

export function logDetailsDrawer(page: Page): Locator {
	return page.getByTestId(LOG_DETAIL_DRAWER_TEST_ID);
}

export async function clickRowFirstCell(row: Locator): Promise<void> {
	await row.locator('td').first().click();
}

export async function openLogDetailsFromRow(row: Locator): Promise<void> {
	await clickRowFirstCell(row);
	await expect(logDetailsDrawer(row.page())).toBeVisible();
}

export async function openContextView(page: Page): Promise<void> {
	await page
		.locator('.views-tabs')
		.getByText('Context', { exact: true })
		.click();
	await expect(contextLogItems(page).first()).toBeVisible();
}

function contextLogItems(page: Page): Locator {
	return page.locator('.context-log-renderer__item');
}

export async function openFirstContextLogInNewTab(page: Page): Promise<Page> {
	const [newPage] = await Promise.all([
		// Armed before the click: the tab can open before a sequential wait starts.
		page.context().waitForEvent('page'),
		contextLogItems(page).first().click(),
	]);
	await newPage.waitForLoadState();
	return newPage;
}

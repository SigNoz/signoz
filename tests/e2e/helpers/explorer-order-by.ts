import { expect, type Locator, type Page } from '@playwright/test';

import {
	dismissQuickFiltersAnnouncement,
	LOGS_EXPLORER_PATH,
} from './quick-filters';

export { LOGS_EXPLORER_PATH };

export const TRACES_EXPLORER_PATH = '/traces-explorer';
export const LLM_EXPLORER_PATH = '/ai-observability/explorer';

const RELATIVE_TIME = '6h';

const ORDER_BY_TEST_ID = 'list-view-order-by';

export type ExplorerView = 'list' | 'trace' | 'timeseries' | 'table';

const VIEW_TAB_CLASS: Record<ExplorerView, string> = {
	list: 'list-view-tab',
	trace: 'trace-view-tab',
	timeseries: 'timeseries-view-tab',
	table: 'table-view-tab',
};

export async function gotoExplorer(page: Page, path: string): Promise<void> {
	await dismissQuickFiltersAnnouncement(page);
	await page.goto(`${path}?relativeTime=${RELATIVE_TIME}`);
	await expect(orderByControl(page)).toBeVisible();
}

export function orderByControl(page: Page): Locator {
	return page.getByTestId(ORDER_BY_TEST_ID);
}

export async function expectOrderBy(page: Page, value: string): Promise<void> {
	await expect(
		orderByControl(page).locator('.ant-select-selection-item'),
	).toHaveText(value);
}

export async function setOrderBy(page: Page, value: string): Promise<void> {
	await orderByControl(page).click();
	await page
		.locator('.ant-select-item-option')
		.filter({ hasText: value })
		.first()
		.click();
	await expectOrderBy(page, value);
}

export function viewTab(page: Page, view: ExplorerView): Locator {
	return page.locator(`.${VIEW_TAB_CLASS[view]}`);
}

export async function switchView(
	page: Page,
	view: ExplorerView,
): Promise<void> {
	await viewTab(page, view).click();
	await expect(viewTab(page, view)).toHaveClass(/active-tab/);
}

export function orderByFromUrl(
	page: Page,
): { columnName: string; order: string }[] {
	const raw = new URL(page.url()).searchParams.get('compositeQuery');
	if (!raw) {
		return [];
	}
	const query = JSON.parse(decodeURIComponent(raw));
	return query?.builder?.queryData?.[0]?.orderBy ?? [];
}

export function withOrderByInUrl(
	path: string,
	orderBy: { columnName: string; order: string },
	dataSource: 'logs' | 'traces',
): string {
	const compositeQuery = {
		queryType: 'builder',
		builder: {
			queryData: [
				{
					dataSource,
					queryName: 'A',
					aggregateOperator: 'noop',
					expression: 'A',
					disabled: false,
					filters: { items: [], op: 'AND' },
					groupBy: [],
					orderBy: [orderBy],
					limit: null,
					having: [],
					legend: '',
					reduceTo: 'avg',
				},
			],
			queryFormulas: [],
		},
		promql: [],
		clickhouse_sql: [],
		id: 'e2e-order-by',
	};

	const params = new URLSearchParams({
		relativeTime: RELATIVE_TIME,
		panelTypes: JSON.stringify('list'),
		compositeQuery: encodeURIComponent(JSON.stringify(compositeQuery)),
	});

	return `${path}?${params.toString()}`;
}

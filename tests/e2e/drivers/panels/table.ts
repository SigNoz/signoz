/**
 * AI-owned. Generated and maintained by coding agents alongside the specs that
 * use it. Do not hand-edit: regenerate it with the spec that needs the change.
 */
import { type Locator, type Page } from '@playwright/test';

import { storageKey } from '../../helpers/base-path';

import { boxOf, dragBy, openSelectOption } from './dom';

/** Local storage key column widths persist under, behind a 400ms debounce. */
const COLUMN_WIDTHS_KEY = 'DASHBOARD_V2_PANEL_COLUMN_WIDTHS';

/** Header search, offered by Table and List. */
export interface PanelSearch {
	trigger(): Locator;
	input(): Locator;
	clear(): Locator;
	open(term: string): Promise<void>;
}

/** List pagination. */
export interface ListPager {
	page(): Locator;
	prev(): Locator;
	next(): Locator;
	/** Picks e.g. '50 / page' from the page-size select. */
	setPageSize(label: string): Promise<void>;
}

export interface TableColumns {
	rows(): Locator;
	header(column: string): Locator;
	/** Rendered header width in px, 0 when not laid out. */
	headerWidth(column: string): Promise<number>;
	resizeColumn(column: string, byPx: number): Promise<void>;
	/** The width persisted for this column, 0 when none. */
	storedWidth(column: string): Promise<number>;
}

export function searchAt(root: () => Locator): PanelSearch {
	const byTestId = (testId: string): Locator => root().getByTestId(testId);
	return {
		trigger: () => byTestId('panel-header-search-trigger'),
		input: () => byTestId('panel-header-search-input'),
		clear: () => byTestId('panel-header-search-clear'),
		async open(term) {
			await root().hover();
			await byTestId('panel-header-search-trigger').click();
			await byTestId('panel-header-search-input').fill(term);
		},
	};
}

export function pagerAt(page: Page, root: () => Locator): ListPager {
	const byTestId = (testId: string): Locator => root().getByTestId(testId);
	return {
		page: () => byTestId('list-panel-page'),
		prev: () => byTestId('list-panel-prev'),
		next: () => byTestId('list-panel-next'),
		async setPageSize(label) {
			await byTestId('list-panel-page-size').click();
			await openSelectOption(page, label).click();
		},
	};
}

export function tableAt(
	page: Page,
	panelId: string,
	root: () => Locator,
): TableColumns {
	const byTestId = (testId: string): Locator => root().getByTestId(testId);
	const header = (column: string): Locator =>
		root().locator('th').filter({ hasText: column });
	return {
		rows: () => root().locator('tbody tr.ant-table-row'),
		header,
		async headerWidth(column) {
			return (await header(column).boundingBox())?.width ?? 0;
		},
		async resizeColumn(column, byPx) {
			const grip = await boxOf(
				byTestId(`column-resize-${column}`),
				`the ${column} resize grip`,
			);
			const y = grip.y + grip.height / 2;
			await dragBy(
				page,
				{ x: grip.x + grip.width / 2, y },
				{ x: grip.x + byPx, y },
				10,
			);
		},
		storedWidth: (column) =>
			page.evaluate(
				({ key, panelId, name }) => {
					const raw = localStorage.getItem(key);
					const widths = raw ? JSON.parse(raw) : {};
					return (widths?.[panelId]?.[name] as number | undefined) ?? 0;
				},
				{ key: storageKey(COLUMN_WIDTHS_KEY), panelId, name: column },
			),
	};
}

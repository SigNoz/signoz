import { expect, type Locator, type Page } from '@playwright/test';

import { allowFor, SEEDED_DATA_TIMEOUT, SEEDED_TEST_BUDGET } from './kit';
import {
	columnStorageKey,
	readJson,
	resetKeys,
	writeJson,
	writeRaw,
	type ColumnState,
} from './storage';

/**
 * The TanStack table, driven the same way everywhere it is used: the alert-rules
 * list, the infra-monitoring lists and their expanded rows.
 *
 * Two details are load-bearing and were paid for in flake:
 *
 * - Locators are table-scoped. A row's name also appears in the quick-filter
 *   rail, and an unscoped text locator clicks the filter instead of the row.
 * - Skeleton rows carry the same testids as real ones, so waiting only for "a
 *   row exists" samples the placeholder and reads its key back as `unknown`.
 */

export interface SortState {
	columnName: string;
	order: string;
}

export interface TanstackOptions {
	/**
	 * Row testid prefix, when the table passes `getRowTestId`. Rows are matched
	 * on it so an expanded group's nested rows, which repeat the pattern, stay
	 * out of the outer row set. Omit for tables that render plain rows.
	 */
	rowTestIdPrefix?: string;
	/** `useColumnStore` table key, unprefixed. Enables the column-state methods. */
	tableKey?: string;
	/** Extra localStorage keys {@link Tanstack.reset} clears alongside it. */
	extraStorageKeys?: string[];
	/** Toolbar "Group by" select, when the feature has one. */
	groupBySelectTestId?: string;
}

export interface Tanstack {
	table(): Locator;
	rows(): Locator;
	row(key: string): Locator;
	rowKeys(): Promise<string[]>;
	headers(): Promise<string[]>;
	headerCell(columnId: string): Locator;
	sortButton(columnId: string): Locator;
	columnActions(columnId: string): Locator;

	waitForRows(): Promise<void>;
	waitForRow(key: string): Promise<void>;
	expectColumns(headers: string[]): Promise<void>;
	expectRowCount(count: number): Promise<void>;
	expectFirstPage(): Promise<void>;

	sortBy(columnId: string): Promise<void>;
	sortState(): SortState | null;
	rawOrderBy(): string | null;
	dragColumn(columnId: string, ontoColumnId: string): Promise<void>;
	resizeColumn(columnId: string, deltaX: number): Promise<number>;

	totalCount(): Locator;
	pageSize(size: number): Promise<void>;
	gotoPage(pageNumber: number): Promise<void>;
	paginationBar(): Locator;

	groupBy(attribute: string): Promise<void>;
	clearGrouping(): Promise<void>;
	groupByFromUrl(): string[];

	columnState(): Promise<ColumnState>;
	setColumnState(state: ColumnState): Promise<void>;
	setRawColumnState(raw: string): Promise<void>;
	/** Clear persisted table state once, before the first navigation. */
	reset(): Promise<void>;
}

const PAGINATION = {
	totalCount: 'pagination-total-count',
	pageSize: 'pagination-page-size',
} as const;

/**
 * `TanStackHeaderRow` builds these labels and the header `title` attribute from
 * the column **id**, capitalised — not from the visible header text, whose
 * string branch never applies when `column.header` is a render function.
 */
export function headerTitleAttr(columnId: string): string {
	return columnId.replace(/^\w/, (character) => character.toUpperCase());
}

export function dragHandleLabel(columnId: string): string {
	return `Drag ${columnId} column`;
}

export function columnActionsLabel(columnId: string): string {
	return `Column actions for ${headerTitleAttr(columnId)}`;
}

/** A bounding box, or a failure naming what never rendered. */
async function boxOf(
	locator: Locator,
	what: string,
): Promise<{ x: number; y: number; width: number; height: number }> {
	const box = await locator.boundingBox();
	if (!box) {
		throw new Error(`${what} has no bounding box — it is not rendered`);
	}
	return box;
}

export function tanstackDriver(
	page: Page,
	options: TanstackOptions = {},
): Tanstack {
	const table = (): Locator => page.locator('table').first();
	const headerCells = (): Locator => table().locator('thead th');
	const rows = (): Locator =>
		options.rowTestIdPrefix
			? table().locator(`> tbody > tr[data-testid^="${options.rowTestIdPrefix}"]`)
			: table().locator('> tbody > tr');

	const headerCell = (columnId: string): Locator =>
		headerCells()
			.filter({ has: page.locator(`[title="${headerTitleAttr(columnId)}"]`) })
			.first();

	const storageKey = options.tableKey
		? columnStorageKey(options.tableKey)
		: null;

	const requireStorage = (): string => {
		if (!storageKey) {
			throw new Error('tanstackDriver needs a tableKey for column state');
		}
		return storageKey;
	};

	const driver: Tanstack = {
		table,
		rows,
		row: (key) => page.getByTestId(`${options.rowTestIdPrefix ?? ''}${key}`),
		headerCell,
		totalCount: () => page.getByTestId(PAGINATION.totalCount),
		paginationBar: () => page.locator('[class*="paginationContainer"]').first(),

		sortButton: (columnId) =>
			headerCell(columnId).locator('button.tanstack-header-title'),

		columnActions: (columnId) =>
			page.getByRole('button', { name: columnActionsLabel(columnId) }),

		headers: async () => {
			const titles = await headerCells()
				.locator('.tanstack-header-title')
				.allInnerTexts();
			return titles.map((title) => title.trim()).filter(Boolean);
		},

		rowKeys: async () => {
			const ids = await rows().evaluateAll((elements) =>
				elements.map((element) => element.getAttribute('data-testid') ?? ''),
			);
			const prefix = options.rowTestIdPrefix ?? '';
			return ids.map((id) => (prefix ? id.replace(prefix, '') : id));
		},

		waitForRows: async () => {
			allowFor(SEEDED_TEST_BUDGET);
			await expect(rows().first()).toBeVisible({ timeout: SEEDED_DATA_TIMEOUT });
			// Skeletons carry the same testids as real rows, so row keys read back
			// as placeholders while they are up. Short budget: the data has arrived
			// by now and the skeletons are one render away.
			await expect(table().locator('.ant-skeleton')).toHaveCount(0, {
				timeout: 10_000,
			});
		},

		waitForRow: async (key) => {
			allowFor(SEEDED_TEST_BUDGET);
			await expect(driver.row(key)).toBeVisible({
				timeout: SEEDED_DATA_TIMEOUT,
			});
		},

		expectColumns: async (headers) => {
			await expect(async () => {
				expect(await driver.headers()).toEqual(headers);
			}).toPass();
		},

		expectRowCount: async (count) => {
			await expect(rows()).toHaveCount(count);
		},

		expectFirstPage: async () => {
			await expect(async () => {
				const value = new URL(page.url()).searchParams.get('page');
				expect(value === null || value === '1').toBe(true);
			}).toPass();
		},

		sortBy: async (columnId) => {
			// Resolve on the URL, not on a re-render: sorting by a column the data
			// has no value for empties the list, which swaps the table for the empty
			// state and takes the header with it. `orderBy` is written either way.
			const before = new URL(page.url()).searchParams.get('orderBy');
			await driver.sortButton(columnId).click();
			await expect(async () => {
				expect(new URL(page.url()).searchParams.get('orderBy')).not.toBe(before);
			}).toPass();
		},

		rawOrderBy: () => new URL(page.url()).searchParams.get('orderBy'),

		sortState: () => {
			const raw = driver.rawOrderBy();
			if (!raw) {
				return null;
			}
			try {
				return JSON.parse(raw) as SortState;
			} catch {
				// "unsorted" and "the app wrote something unparseable" are different
				// outcomes, and one scenario deep-links a malformed value on purpose.
				throw new Error(
					`orderBy is not decodable JSON — got \`${raw.slice(0, 200)}\``,
				);
			}
		},

		dragColumn: async (columnId, ontoColumnId) => {
			const grip = page.getByRole('button', { name: dragHandleLabel(columnId) });
			await grip.scrollIntoViewIfNeeded();
			const from = await boxOf(grip, `${columnId} drag grip`);
			const to = await boxOf(headerCell(ontoColumnId), `${ontoColumnId} header`);

			await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
			await page.mouse.down();
			// dnd-kit only starts a drag past its activation distance, so a single
			// jump from grip to target is swallowed.
			await page.mouse.move(
				from.x + from.width / 2 + 12,
				from.y + from.height / 2,
				{ steps: 4 },
			);
			await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, {
				steps: 20,
			});
			await page.mouse.move(to.x + to.width / 2 + 2, to.y + to.height / 2, {
				steps: 2,
			});
			await page.mouse.up();
		},

		resizeColumn: async (columnId, deltaX) => {
			const cell = headerCell(columnId);
			const before = await boxOf(cell, `${columnId} header`);
			await cell.locator('[title="Drag to resize column"]').hover();
			await page.mouse.down();
			await page.mouse.move(
				before.x + before.width + deltaX,
				before.y + before.height / 2,
				{ steps: 12 },
			);
			await page.mouse.up();

			// A quarter of the requested travel, in the requested direction: the
			// table clamps to a min width and rounds, so demanding the full delta is
			// flaky, while an unsigned comparison would pass on a no-op shrink.
			await expect(async () => {
				const after = await boxOf(cell, `${columnId} header`);
				if (deltaX >= 0) {
					expect(after.width).toBeGreaterThan(before.width + deltaX / 4);
				} else {
					expect(after.width).toBeLessThan(before.width + deltaX / 4);
				}
			}).toPass();
			return (await boxOf(cell, `${columnId} header`)).width;
		},

		pageSize: async (size) => {
			await page.getByTestId(PAGINATION.pageSize).click();
			// The viewport-derived size is labelled `Auto (N)` instead of `N`.
			await page
				.getByRole('option', { name: new RegExp(`^(Auto \\()?${size}\\)?$`) })
				.click();
			await expect(page).toHaveURL(new RegExp(`pageSize=${size}\\b`));
		},

		gotoPage: async (pageNumber) => {
			// The pagination component exposes no testids; its buttons are reachable
			// by accessible name. Scoped to the bar so a number elsewhere on the page
			// cannot resolve into a strict-mode violation.
			await driver
				.paginationBar()
				.getByRole('button', { name: String(pageNumber), exact: true })
				.click();
			await expect(page).toHaveURL(new RegExp(`page=${pageNumber}\\b`));
		},

		groupBy: async (attribute) => {
			if (!options.groupBySelectTestId) {
				throw new Error('tanstackDriver needs a groupBySelectTestId to group');
			}
			const select = page.getByTestId(options.groupBySelectTestId);
			await expect(select).toBeVisible();
			// antd Select: the search input is readonly until the dropdown opens, so
			// click first and type through the keyboard. Pick by exact title —
			// `hasText` would also match a longer key containing this one.
			await select.click();
			await page.keyboard.type(attribute);
			await page.locator(`.ant-select-item-option[title="${attribute}"]`).click();
			await expect(page).toHaveURL(
				new RegExp(`groupBy=[^&]*${attribute.replace(/\./g, '\\.')}`),
			);
			// Close the dropdown so it stops covering the rows.
			await page.keyboard.press('Escape');
		},

		clearGrouping: async () => {
			if (!options.groupBySelectTestId) {
				throw new Error('tanstackDriver needs a groupBySelectTestId to group');
			}
			const select = page.getByTestId(options.groupBySelectTestId);
			await select.hover();
			await select.locator('.ant-select-clear').click();
			await expect(async () => {
				expect(new URL(page.url()).searchParams.get('groupBy')).toBeNull();
			}).toPass();
		},

		groupByFromUrl: () => {
			const raw = new URL(page.url()).searchParams.get('groupBy');
			if (!raw) {
				return [];
			}
			const parsed = JSON.parse(raw) as (string | { key: string })[];
			return parsed.map((entry) =>
				typeof entry === 'string' ? entry : entry.key,
			);
		},

		columnState: async () =>
			(await readJson<ColumnState>(page, requireStorage())) ?? {},

		setColumnState: async (state) => {
			// `useColumnStore` always writes all three keys, so seeding one of them
			// tests a shape the product never produces. A partial value is worth a
			// scenario of its own, not the accidental setup of every other one.
			await writeJson(page, requireStorage(), {
				hiddenColumnIds: state.hiddenColumnIds ?? [],
				columnOrder: state.columnOrder ?? [],
				columnSizing: state.columnSizing ?? {},
			});
		},

		setRawColumnState: async (raw) => {
			await writeRaw(page, requireStorage(), raw);
		},

		reset: async () => {
			await resetKeys(page, [
				...(storageKey ? [storageKey] : []),
				...(options.extraStorageKeys ?? []),
			]);
		},
	};

	return driver;
}

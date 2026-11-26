import { expect, type Locator, type Page } from '@playwright/test';

import {
	allowFor,
	driver,
	kit,
	seeded,
	SEEDED_DATA_TIMEOUT,
	SEEDED_TEST_BUDGET,
	type Layer,
	type WorkerLayer,
} from './kit';
import { exceptionSpan, stamp as stampFor } from './spans';
import { seedTracesViaSeeder, type SeederSpan } from './traces';

/**
 * The exceptions list (`/exceptions`) and the exception detail page
 * (`/error-detail`). Both read the error index, which the seeder fills from a
 * span's `exception` event.
 */

const LIST_PATH = '/exceptions';
const TABLE = 'exceptions-table';
const ROW_LINK = 'exception-row-link';

/**
 * `listErrors` moves `end` back 30 s when it is within 30 s of now, so an event
 * seeded later than that is invisible. Every event sits past that edge.
 */
const TIMEOUT_EVENTS_AGO_MS = [120_000, 60_000];
const VALUE_EVENT_AGO_MS = 90_000;

export interface ExceptionGroup {
	type: string;
	message: string;
	count: number;
	/** Oldest first. */
	spans: SeederSpan[];
}

export interface ExceptionSeed {
	stamp: string;
	service: string;
	/** A frame every seeded stack trace carries. */
	frame: string;
	groups: { timeout: ExceptionGroup; value: ExceptionGroup };
}

export interface ExceptionDetail {
	type(): Locator;
	message(): Locator;
	eventId(): Locator;
	olderButton(): Locator;
	newerButton(): Locator;
	/** Click Older and wait for `errorId` in the URL to change. */
	older(): Promise<void>;
	newer(): Promise<void>;
	/** Click "See the error in trace graph"; resolves with the trace page URL. */
	viewTrace(): Promise<URL>;
	stacktrace(): Locator;
	attributes(): Locator;
}

export interface Exceptions {
	gotoList(params?: Record<string, string>): Promise<void>;
	table(): Locator;
	headers(): Promise<string[]>;
	tab(name: string): Locator;
	/** The data row whose type link is exactly `type`. */
	row(type: string): Locator;
	cell(type: string, header: string): Promise<Locator>;
	/** Application cell of every data row. */
	applications(): Promise<string[]>;
	/** Reload until `type` is listed: the list fetches once per load. */
	waitForRow(type: string): Promise<void>;
	/** The Application column's search dropdown. */
	filterByService(name: string): Promise<void>;
	openRow(type: string): Promise<void>;
	detail: ExceptionDetail;
}

const errorIdOf = (page: Page): string | null =>
	new URL(page.url()).searchParams.get('errorId');

export function exceptionsDriver(page: Page): Exceptions {
	const table = (): Locator => page.getByTestId(TABLE);

	const headers = async (): Promise<string[]> =>
		(await table().getByRole('columnheader').allInnerTexts())
			.map((text) => text.trim())
			.filter(Boolean);

	const columnIndex = async (header: string): Promise<number> => {
		const index = (await headers()).indexOf(header);
		if (index === -1) {
			throw new Error(`exceptions table has no "${header}" column`);
		}
		return index;
	};

	const dataRows = (): Locator =>
		table()
			.getByRole('row')
			.filter({ has: page.getByTestId(ROW_LINK) });

	const stepThrough = async (button: Locator): Promise<void> => {
		const before = errorIdOf(page);
		await expect(button).toBeEnabled();
		await button.click();
		await expect(async () => {
			expect(errorIdOf(page)).not.toBe(before);
		}).toPass();
	};

	const exceptions: Exceptions = {
		table,
		headers,
		tab: (name) => page.getByRole('tab', { name, exact: true }),

		gotoList: async (params = {}) => {
			const query = new URLSearchParams({ relativeTime: '15m', ...params });
			await page.goto(`${LIST_PATH}?${query.toString()}`);
			await expect(table()).toBeVisible();
		},

		row: (type) =>
			dataRows().filter({
				has: page.getByTestId(ROW_LINK).getByText(type, { exact: true }),
			}),

		cell: async (type, header) =>
			exceptions
				.row(type)
				.getByRole('cell')
				.nth(await columnIndex(header)),

		applications: async () => {
			const index = await columnIndex('Application');
			const rows = await dataRows().all();
			return Promise.all(
				rows.map(async (row) =>
					(await row.getByRole('cell').nth(index).innerText()).trim(),
				),
			);
		},

		waitForRow: async (type) => {
			allowFor(SEEDED_TEST_BUDGET);
			await expect(async () => {
				await page.reload();
				await expect(exceptions.row(type)).toBeVisible({ timeout: 5_000 });
			}).toPass({ timeout: SEEDED_TEST_BUDGET - 15_000 });
		},

		filterByService: async (name) => {
			await table()
				.getByRole('columnheader', { name: /Application/ })
				.getByRole('button')
				.click();
			const input = page.getByPlaceholder('Search By Application');
			await input.fill(name);
			await input.press('Enter');
			await expect(page).toHaveURL(
				new RegExp(`serviceName=${encodeURIComponent(name)}`),
			);
		},

		openRow: async (type) => {
			await exceptions.row(type).getByTestId(ROW_LINK).click();
			await expect(page).toHaveURL(/\/error-detail\?groupId=/);
			await expect(exceptions.detail.type()).toBeVisible({
				timeout: SEEDED_DATA_TIMEOUT,
			});
		},

		detail: {
			type: () => page.getByTestId('error-details-type'),
			message: () => page.getByTestId('error-details-message'),
			eventId: () => page.getByTestId('error-details-event-id'),
			olderButton: () => page.getByTestId('error-details-older'),
			newerButton: () => page.getByTestId('error-details-newer'),
			older: () => stepThrough(exceptions.detail.olderButton()),
			newer: () => stepThrough(exceptions.detail.newerButton()),
			viewTrace: async () => {
				await page.getByTestId('error-details-view-trace').click();
				await expect(page).toHaveURL(/\/trace\/[0-9a-f]{32}\?spanId=/);
				return new URL(page.url());
			},
			stacktrace: () => page.getByTestId('error-details-stacktrace'),
			attributes: () => page.getByTestId('error-details-attributes-table'),
		},
	};

	return exceptions;
}

export const withExceptions: Layer<{ exceptions: Exceptions }> = driver(
	'exceptions',
	({ page }) => exceptionsDriver(page),
);

/**
 * Two groups for one stamped service: `E2eTimeoutError` twice (so Older/Newer
 * have somewhere to go) and `E2eValueError` once. Telemetry has no scoped
 * delete, so there is no teardown; the stamp keeps workers apart.
 */
export const withExceptionSeed: WorkerLayer<{ exceptionSeed: ExceptionSeed }> =
	seeded('exceptionSeed', async ({ page, workerIndex }) => {
		const stamp = stampFor('exc', workerIndex);
		const service = stamp;
		const frame = `at ${stamp.replace(/-/g, '_')}.handler (app.js:42:7)`;
		const group = (
			type: string,
			message: string,
			agos: number[],
		): ExceptionGroup => ({
			type,
			message,
			count: agos.length,
			spans: agos.map((agoMs) =>
				exceptionSpan({
					service,
					type,
					message,
					stack: `${type}: ${message}\n    ${frame}`,
					agoMs,
				}),
			),
		});
		const groups = {
			timeout: group(
				'E2eTimeoutError',
				`${stamp} upstream timeout`,
				TIMEOUT_EVENTS_AGO_MS,
			),
			value: group('E2eValueError', `${stamp} bad value`, [VALUE_EVENT_AGO_MS]),
		};
		await seedTracesViaSeeder(page.request, [
			...groups.timeout.spans,
			...groups.value.spans,
		]);
		return { stamp, service, frame, groups };
	});

/** The exceptions `test`. */
export const test = withExceptionSeed(withExceptions(kit));
export { expect } from './kit';

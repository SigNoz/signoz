/**
 * AI-owned. Generated and maintained by coding agents alongside the specs that
 * use it. Do not hand-edit: regenerate it with the spec that needs the change.
 */
import type { Browser, Page, TestType } from '@playwright/test';

import { newAdminContext } from '../helpers/auth';

export { expect, test as kit } from '../fixtures/auth';

export interface DriverContext {
	page: Page;
}

type Fixtures = Record<string, unknown>;

/**
 * Adds test-scoped fixtures to any test carrying `authedPage`. `T` is inferred
 * from the argument: TypeScript cannot invert `T & { authedPage: Page }`, so
 * constraining that way widens every existing fixture to `unknown`.
 */
export type Layer<Adds> = <T extends { authedPage: Page }, W extends object>(
	base: TestType<T, W>,
) => TestType<T & Adds, W>;

export type WorkerLayer<Adds> = <T extends object, W extends object>(
	base: TestType<T, W>,
) => TestType<T, W & Adds>;

/** A `withX` layer binding `build` to the authenticated page. */
export function driver<Name extends string, T>(
	name: Name,
	build: (ctx: DriverContext) => T,
): Layer<{ [K in Name]: T }> {
	const fixture = {
		// Playwright reads fixture dependencies from the source text, so
		// `authedPage` must stay destructured literally.
		[name]: async (
			{ authedPage }: { authedPage: Page },
			use: (value: T) => Promise<void>,
		) => {
			await use(build({ page: authedPage }));
		},
	};
	return ((test: TestType<Fixtures, Fixtures>) =>
		test.extend(fixture as never)) as Layer<{ [K in Name]: T }>;
}

/**
 * A `withX` layer that seeds once per worker and tears down after. `open` and
 * `close` run on a throwaway admin page: worker fixtures cannot reach
 * `authedPage`.
 */
export function seeded<Name extends string, T>(
	name: Name,
	open: (ctx: { page: Page; workerIndex: number }) => Promise<T>,
	close?: (ctx: { page: Page; value: T }) => Promise<void>,
	options: { timeout?: number } = {},
): WorkerLayer<{ [K in Name]: T }> {
	const fixture = {
		[name]: [
			async (
				{ browser }: { browser: Browser },
				use: (value: T) => Promise<void>,
				workerInfo: { workerIndex: number },
			) => {
				const value = await onAdminPage(browser, (page) =>
					open({ page, workerIndex: workerInfo.workerIndex }),
				);
				await use(value);
				if (close) {
					await onAdminPage(browser, (page) => close({ page, value }));
				}
			},
			{ scope: 'worker', timeout: options.timeout },
		],
	};
	return ((test: TestType<Fixtures, Fixtures>) =>
		test.extend(fixture as never)) as WorkerLayer<{ [K in Name]: T }>;
}

/** Run `body` on a throwaway page authenticated as the admin. */
export async function onAdminPage<T>(
	browser: Browser,
	body: (page: Page) => Promise<T>,
): Promise<T> {
	const ctx = await newAdminContext(browser);
	try {
		return await body(await ctx.newPage());
	} finally {
		await ctx.close();
	}
}

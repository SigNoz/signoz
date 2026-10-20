/**
 * The driver kit.
 *
 * A spec imports one module: the `test` constant its feature exports. That
 * constant is built by composing layers, outermost last:
 *
 * ```ts
 * export const test = withInfraMonitoring(withTanstack(kit));
 * ```
 *
 * Each layer adds one named driver to the test arguments, so a spec body never
 * sees a `Page`:
 *
 * ```ts
 * test('TC-01 …', async ({ infra, table }) => {
 *   await infra.gotoList('pods');
 *   await table.expectColumns(['Pod Name', 'Status']);
 * });
 * ```
 *
 * A driver is a plain function returning an object of closures over the page.
 * Drivers reuse each other by calling the factory directly, never by reaching
 * for another fixture — layer order then carries no meaning beyond reading
 * order, and a driver stays usable from a worker seed, where test-scoped
 * fixtures are not reachable.
 */

import {
	expect,
	test as base,
	test as playwright,
	type Browser,
	type Page,
	type TestType,
} from '@playwright/test';

import { ADMIN, newAdminContext, storageStateFor, type User } from './auth';
import { installBasePathMode } from './base-path';
import { watchConsole, type ConsoleWatch } from './console';
import { usersApi, type CreatedUser, type ManagedRole } from './users';

/** What every driver is built from. */
export interface DriverContext {
	page: Page;
}

type Fixtures = Record<string, unknown>;

/**
 * Adds test-scoped fixtures. Accepts any test that already carries `authedPage`.
 *
 * `T` is inferred straight from the argument rather than from an intersection:
 * TypeScript cannot invert `T & { authedPage: Page }`, so writing the constraint
 * that way silently widens every existing fixture to `unknown`.
 */
export type Layer<Adds> = <T extends { authedPage: Page }, W extends object>(
	base: TestType<T, W>,
) => TestType<T & Adds, W>;

/** Adds worker-scoped fixtures — seeded data shared by every test in the worker. */
export type WorkerLayer<Adds> = <T extends object, W extends object>(
	base: TestType<T, W>,
) => TestType<T, W & Adds>;

/**
 * Build a `withX` layer that binds `build` to the authenticated page.
 *
 * The fixture destructures `authedPage` literally because Playwright derives
 * fixture dependencies from the function's source text.
 */
export function driver<Name extends string, T>(
	name: Name,
	build: (ctx: DriverContext) => T,
): Layer<{ [K in Name]: T }> {
	const fixture = {
		[name]: async (
			{ authedPage }: { authedPage: Page },
			use: (value: T) => Promise<void>,
		) => {
			await use(build({ page: authedPage }));
		},
	};
	// The fixture map is keyed at runtime, so its type cannot be expressed
	// against `extend`'s mapped parameter. The exported `Layer` signature is what
	// callers see, and it is checked.
	return ((test: TestType<Fixtures, Fixtures>) =>
		test.extend(fixture as never)) as Layer<{ [K in Name]: T }>;
}

/**
 * Like {@link driver}, but binds `build` to the logged-out `guestPage`, so a
 * logged-out feature stays page-free in specs too.
 */
export function guestDriver<Name extends string, T>(
	name: Name,
	build: (ctx: DriverContext) => T,
): Layer<{ [K in Name]: T }> {
	const fixture = {
		[name]: async (
			{ guestPage }: { guestPage: Page },
			use: (value: T) => Promise<void>,
		) => {
			await use(build({ page: guestPage }));
		},
	};
	return ((test: TestType<Fixtures, Fixtures>) =>
		test.extend(fixture as never)) as Layer<{ [K in Name]: T }>;
}

/**
 * Build a `withX` layer that seeds data once per worker and tears it down after.
 *
 * `open` and `close` run on a throwaway admin page: worker fixtures cannot use
 * the test-scoped `authedPage`, and every API call needs a context carrying the
 * admin storage state.
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

/**
 * Run `body` on a throwaway admin page, then close its context. The worker's
 * cached session is reused, so the cost is a context, not a login.
 */
export async function onAdminPage<T>(
	browser: Browser,
	body: (page: Page) => Promise<T>,
): Promise<T> {
	const ctx = await newAdminContext(browser);
	const page = await ctx.newPage();
	try {
		return await body(page);
	} finally {
		await ctx.close();
	}
}

/**
 * Run `body` on `factory` bound to a throwaway admin page. For seeding and
 * teardown from a driver whose own page is a less privileged user.
 */
export async function asAdmin<D, T>(
	page: Page,
	factory: (page: Page) => D,
	body: (driver: D) => Promise<T>,
): Promise<T> {
	const browser = page.context().browser();
	if (!browser) {
		throw new Error('asAdmin needs a page launched from a browser');
	}
	return onAdminPage(browser, (admin) => body(factory(admin)));
}

/**
 * Raise the current test's timeout to `floor`, idempotently.
 *
 * **Not `test.slow()`**: that multiplies the budget by three on *every* call, so
 * a driver method carrying it and called in a loop compounds — ten columns at
 * 30 s × 3¹⁰ is about seven days, and a test that never times out wedges a
 * worker until the whole run is killed. Absolute and monotonic instead, so
 * repeated calls and a spec's own `setTimeout` settle on the largest budget.
 */
export function allowFor(floor: number): void {
	const info = playwright.info();
	if (info.timeout < floor) {
		info.setTimeout(floor);
	}
}

/**
 * Seeded data has to be queryable in ClickHouse, not merely rendered, and with
 * six workers seeding at once that regularly outruns the default expect budget.
 * Failing at 15 s reports as "row not visible" on data that lands a second
 * later, which reads as product flake and is not.
 */
export const SEEDED_DATA_TIMEOUT = 30_000;
export const SEEDED_TEST_BUDGET = 90_000;

/**
 * Who a test runs as. `admin` is the bootstrap admin every existing spec uses;
 * the others are created once per worker, on first use.
 */
export type Identity = 'admin' | 'admin2' | 'editor' | 'viewer';

const MEMBER_ROLES: Record<Exclude<Identity, 'admin'>, ManagedRole> = {
	admin2: 'signoz-admin',
	editor: 'signoz-editor',
	viewer: 'signoz-viewer',
};

/** The worker's seeded members, created lazily and deleted at worker teardown. */
export interface Members {
	get(identity: Exclude<Identity, 'admin'>): Promise<User>;
}

/**
 * The root test constant. Everything else is `kit` with layers on top.
 *
 * `noise` is a fixture rather than a call in a spec body because the watcher has
 * to be installed before the first navigation, and a fixture is the only place
 * that is guaranteed.
 */
export const kit = base.extend<
	{
		/**
		 * Which identity `user` resolves to. `test.use({ as: 'viewer' })` runs a
		 * describe as a seeded viewer. Anything that logs out, changes a password
		 * or writes a per-user preference must not run as `admin`: every admin
		 * context in the worker shares one session and one preference set.
		 */
		as: Identity;
		/**
		 * User identity for this test. Override with `test.use({ user: … })` at the
		 * describe or test level to run as someone else. Defaults to the user `as`
		 * names, which defaults to the pytest-bootstrap-seeded admin.
		 */
		user: User;
		/** A page whose context is already authenticated as `user`. */
		authedPage: Page;
		/** Console errors and failed responses since before the first navigation. */
		noise: ConsoleWatch;
		/** A page in a fresh context with no session, for logged-out flows. */
		guestPage: Page;
		/**
		 * An active viewer created for this test alone and deleted after it, for
		 * flows that revoke the session they run in. It has no cached storage
		 * state: log in on `guestPage`.
		 */
		throwaway: CreatedUser;
	},
	{
		members: Members;
		/** Applies SIGNOZ_E2E_BASE_PATH before any page or login in the worker. */
		basePathMode: void;
	}
>({
	basePathMode: [
		async ({ browser }, use) => {
			await installBasePathMode(browser);
			await use();
		},
		{ scope: 'worker', auto: true },
	],

	as: ['admin', { option: true }],

	members: [
		async ({ browser }, use, workerInfo) => {
			const stamp = `w${workerInfo.workerIndex}-${Date.now()}`;
			const created = new Map<string, Promise<CreatedUser>>();
			await use({
				get: async (identity) => {
					let pending = created.get(identity);
					if (!pending) {
						pending = onAdminPage(browser, (page) =>
							usersApi(page).createActive(
								MEMBER_ROLES[identity],
								`${identity}-${stamp}`,
							),
						);
						created.set(identity, pending);
					}
					return (await pending).user;
				},
			});
			const settled = await Promise.allSettled(created.values());
			const ids = settled.flatMap((entry) =>
				entry.status === 'fulfilled' ? [entry.value.id] : [],
			);
			if (ids.length > 0) {
				await onAdminPage(browser, async (page) => {
					for (const id of ids) {
						await usersApi(page).remove(id);
					}
				});
			}
		},
		{ scope: 'worker' },
	],

	user: [
		async ({ as, members }, use) => {
			await use(as === 'admin' ? ADMIN : await members.get(as));
		},
		{ option: true },
	],

	guestPage: async ({ browser, baseURL }, use) => {
		const ctx = await browser.newContext({ baseURL });
		const page = await ctx.newPage();
		await use(page);
		await ctx.close();
	},

	throwaway: async ({ browser }, use, testInfo) => {
		const created = await onAdminPage(browser, (page) =>
			usersApi(page).createActive(
				'signoz-viewer',
				`throwaway-w${testInfo.workerIndex}-${Date.now()}`,
			),
		);
		await use(created);
		await onAdminPage(browser, (page) => usersApi(page).remove(created.id));
	},

	authedPage: async ({ browser, user }, use) => {
		const ctx = await browser.newContext({
			storageState: await storageStateFor(browser, user),
		});
		const page = await ctx.newPage();
		// Opt-in CPU throttling reproduces GitHub-runner conditions on developer
		// machines: `STRESS=1`, typically with `CI=1` for 2 workers and 2 retries.
		// The rate is the slowdown multiplier; 4× matches the 2 vCPU runner.
		if (process.env.STRESS === '1') {
			const client = await ctx.newCDPSession(page);
			await client.send('Emulation.setCPUThrottlingRate', {
				rate: Number(process.env.STRESS_CPU_RATE ?? '4'),
			});
		}
		await use(page);
		await ctx.close();
	},

	noise: async ({ authedPage }, use) => {
		await use(watchConsole(authedPage));
	},
});

export { ADMIN, expect };
export type { ConsoleWatch, CreatedUser, Page, User };

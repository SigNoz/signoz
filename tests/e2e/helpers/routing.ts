import { randomBytes } from 'crypto';

import {
	expect,
	type APIRequestContext,
	type Locator,
	type Page,
} from '@playwright/test';

import { authToken } from './common';

// Shared plumbing for `tests/routing/*`, the react-router v5 -> v6 regression
// net. Everything here exists because a router API decides its outcome —
// history depth, POP handling, same-url suppression, the `newTab` branch — so
// the specs stay readable while the router-sensitive mechanics live in one
// place.

// ─── Paths ───────────────────────────────────────────────────────────────

export const DASHBOARDS_LIST_PATH = '/dashboard';
export const HOME_PATH = '/home';
export const K8S_LIST_PATH = '/infrastructure-monitoring/kubernetes';
export const LOGIN_PATH = '/login';
export const LOGS_EXPLORER_PATH = '/logs/logs-explorer';
export const METRICS_EXPLORER_SUMMARY_PATH = '/metrics-explorer/summary';
export const METRICS_EXPLORER_VIEWS_PATH = '/metrics-explorer/views';
export const ROLES_SETTINGS_PATH = '/settings/roles';
export const ROLE_CREATE_PATH = '/settings/roles/new';
export const SERVICES_PATH = '/services';
export const TRACES_EXPLORER_PATH = '/traces-explorer';

/** A path that matches no entry of `AppRoutes/routes.ts`. */
export const UNKNOWN_PATH = '/definitely-not-a-route';

// ─── Seed naming ─────────────────────────────────────────────────────────

/**
 * Suffix for seeded resource names. The three browser projects run the same
 * specs concurrently against one backend, so a timestamp is not enough to keep
 * a role name unique or a dashboard title unambiguous in a list search.
 */
export function uniqueSuffix(): string {
	return randomBytes(4).toString('hex');
}

/**
 * Letters-only variant. Role names are validated server-side as lowercase
 * letters and hyphens only, at most 50 chars — a hex suffix fails with
 * `role_invalid_input`.
 */
export function uniqueAlphaSuffix(): string {
	return [...randomBytes(6)]
		.map((byte) => String.fromCharCode(97 + (byte % 26)))
		.join('');
}

// ─── Seeding ─────────────────────────────────────────────────────────────

/**
 * The seeder serves inserts on one ClickHouse session, so two spec files
 * seeding at once get `500 Attempt to execute concurrent queries within the
 * same session`. Retry until the insert lands — these specs run in parallel by
 * design and the collision is timing, not payload.
 */
export async function seedWithRetry(seed: () => Promise<void>): Promise<void> {
	await expect(async () => {
		await seed();
	}).toPass({ timeout: 180_000, intervals: [1_000, 2_000, 5_000] });
}

// ─── URL reads ───────────────────────────────────────────────────────────

/** Parsed current url. Assert `pathname` / individual `searchParams` off this. */
export function urlOf(page: Page): URL {
	return new URL(page.url());
}

/** A search param as a string, so `toContain` works on an absent param too. */
export function searchParam(page: Page, key: string): string {
	return urlOf(page).searchParams.get(key) ?? '';
}

// ─── History depth ───────────────────────────────────────────────────────

interface HistoryGlobal {
	history: { length: number };
}

/**
 * `history.length` — the only observable that separates a push from a replace
 * from a pop. Chromium leaves it untouched on POP, drops forward entries on
 * PUSH, and never grows on REPLACE.
 */
export async function historyDepth(page: Page): Promise<number> {
	return page.evaluate(
		() => (globalThis as unknown as HistoryGlobal).history.length,
	);
}

/** Go back one entry and wait until the url's pathname is `pathname`. */
export async function goBackTo(page: Page, pathname: string): Promise<void> {
	await page.goBack();
	await page.waitForURL((url) => url.pathname === pathname);
}

// ─── Global time picker ──────────────────────────────────────────────────

const RELATIVE_TIME_LABELS: Record<string, string> = {
	'5m': 'Last 5 minutes',
	'15m': 'Last 15 minutes',
	'30m': 'Last 30 minutes',
	'1h': 'Last 1 hour',
	'6h': 'Last 6 hours',
	'1d': 'Last 1 day',
	'1w': 'Last 1 week',
};

/** Picker placeholder for a `Options` value from `DateTimeSelectionV2`. */
export function relativeTimeLabel(value: string): string {
	const label = RELATIVE_TIME_LABELS[value];
	if (!label) {
		throw new Error(`No picker label mapped for relative time "${value}"`);
	}
	return label;
}

/**
 * The time picker's trigger input.
 *
 * Deliberately not `.first()`: TC-12 asserts `toHaveCount(0)` on routes where
 * the picker must not render at all.
 */
export function timePicker(page: Page): Locator {
	return page.getByTestId('dropDown');
}

/**
 * The global picker rendered by `TopNav`, scoped to its container. Several pages
 * mount their own `DateTimeSelectionV2` (the k8s header, Celery, MQ, funnels),
 * so an unscoped testid cannot tell "TopNav decided not to render" from "this
 * page has its own picker" — which is exactly what TC-12 asserts.
 */
export function globalTimePicker(page: Page): Locator {
	return page.locator('.top-nav-container').getByTestId('dropDown');
}

/**
 * Pick a relative range from the popover's main option list.
 *
 * The trigger is a readonly antd input whose popover mounts on open, and a click
 * that lands before the picker is interactive is silently dropped — leaving the
 * options in the DOM but hidden. Retry the open until an option is actually
 * visible rather than waiting on the first click.
 */
export async function selectRelativeTime(
	page: Page,
	value: string,
): Promise<void> {
	const option = page.getByTestId(`time-option-${value}`);
	await expect(async () => {
		if (!(await option.isVisible())) {
			await timePicker(page).click();
		}
		await expect(option).toBeVisible({ timeout: 3_000 });
	}).toPass({ timeout: 30_000 });
	await option.click();
	// The popover unmounts on close (`destroyTooltipOnHide`), so waiting for the
	// option to go away is what proves the selection was committed — the url may
	// legitimately not change at all (TC-07's same-url suppression).
	await expect(option).toBeHidden();
}

// ─── Kubernetes list: nuqs-backed params ─────────────────────────────────

const K8S_GROUP_BY_SELECT_TEST_ID = 'k8s-table-group-by-select';

/** A resource attribute the pods dataset always carries. */
export const K8S_NAMESPACE_ATTR = 'k8s.namespace.name';

export function k8sGroupBySelect(page: Page): Locator {
	return page.getByTestId(K8S_GROUP_BY_SELECT_TEST_ID);
}

/**
 * Open the k8s list and wait out its mount-time url rewrite: with no
 * `compositeQuery` in the url the page issues one `safeNavigate` that adds the
 * default query, and probing history depth or clicking before that lands makes
 * every assertion race the rewrite.
 */
export async function gotoK8sList(page: Page, search: string): Promise<void> {
	await page.goto(`${K8S_LIST_PATH}?${search}`);
	await page.waitForURL((url) => url.searchParams.has('compositeQuery'));
	await expect(k8sGroupBySelect(page)).toBeVisible();
}

/**
 * Set the `groupBy` nuqs param through the toolbar select. Every write in that
 * change handler is nuqs-backed (`groupBy`, `page`, sometimes `orderBy`), so
 * nuqs batches them into exactly one History API push with no router
 * involvement — which is what makes a single `goBack()` meaningful in TC-03.
 */
export async function setK8sGroupBy(
	page: Page,
	attribute: string,
): Promise<void> {
	const select = k8sGroupBySelect(page);
	await expect(select).toBeVisible();

	// antd Select keeps its search input readonly until the dropdown opens, so
	// click first and type through the keyboard. Match the option by exact title:
	// `hasText` would also match longer keys that contain this one.
	await select.click();
	await page.keyboard.type(attribute);
	await page.locator(`.ant-select-item-option[title="${attribute}"]`).click();
	await page.keyboard.press('Escape');

	await page.waitForURL((url) =>
		(url.searchParams.get('groupBy') ?? '').includes(attribute),
	);
}

/**
 * The select's value comes straight off the nuqs hook, so its tags are the
 * cheapest honest read of "the list still reflects the nuqs state".
 */
export async function expectK8sGroupedBy(
	page: Page,
	attribute: string,
): Promise<void> {
	await expect(k8sGroupBySelect(page)).toContainText(attribute);
}

export async function expectK8sNotGroupedBy(
	page: Page,
	attribute: string,
): Promise<void> {
	await expect(k8sGroupBySelect(page)).not.toContainText(attribute);
}

// ─── Dashboards list ─────────────────────────────────────────────────────

/**
 * The list row for `title`. Not `dashboard-title-0`: the list search tokenises
 * on hyphens, so `?search=routing-navigation-<hex>` also matches leftovers from
 * other specs and row 0 is whichever sorted first.
 */
export function dashboardRowByTitle(page: Page, title: string): Locator {
	return page
		.locator('[data-testid^="dashboard-title-"]')
		.filter({ hasText: title });
}

// ─── RouteTab ────────────────────────────────────────────────────────────

/** The `route-tab-<key>` label. `key` is the full route path, slashes included. */
export function routeTab(page: Page, key: string): Locator {
	return page.getByTestId(`route-tab-${key}`);
}

/** The same label, but only when antd marks its tab `aria-selected`. */
export function activeRouteTab(page: Page, key: string): Locator {
	return page
		.getByRole('tab', { selected: true })
		.getByTestId(`route-tab-${key}`);
}

// ─── New tab ─────────────────────────────────────────────────────────────

/**
 * Ctrl/Cmd-click `target` and return the page it opened. `useSafeNavigate`'s
 * `newTab` branch is the one navigation that goes through
 * `window.open(withBasePath(...))` instead of the router, so it is the only
 * place E2E can observe `withBasePath` at all.
 */
export async function openInNewTabByModifierClick(
	target: Locator,
): Promise<Page> {
	const page = target.page();
	const [newPage] = await Promise.all([
		page.context().waitForEvent('page'),
		target.click({ modifiers: ['ControlOrMeta'] }),
	]);
	await newPage.waitForLoadState();
	return newPage;
}

// ─── Unsaved-changes blocker ──────────────────────────────────────────────

export function discardChangesDialog(page: Page): Locator {
	return page.getByTestId('discard-changes-dialog');
}

// ─── Login form ──────────────────────────────────────────────────────────

/**
 * Complete the email -> password login form on the page as it stands.
 * Deliberately does not navigate: TC-14 must arrive at `/login` through
 * `Private.tsx`'s redirect, not through a `goto`.
 */
export async function submitLoginForm(page: Page): Promise<void> {
	const email = process.env.SIGNOZ_E2E_USERNAME;
	const password = process.env.SIGNOZ_E2E_PASSWORD;
	if (!email || !password) {
		throw new Error(
			'SIGNOZ_E2E_USERNAME / SIGNOZ_E2E_PASSWORD must be set ' +
				'(pytest bootstrap writes them to .env.local).',
		);
	}
	await page.getByTestId('email').fill(email);
	await page.getByTestId('initiate_login').click();
	await page.getByTestId('password').fill(password);
	await page.getByTestId('password_authn_submit').click();
}

// ─── Roles API (nav-blocker seed cleanup) ────────────────────────────────

interface RoleListEntry {
	id: string;
	name: string;
}

/** Resolve role ids for the given exact names via the list API. */
export async function findRoleIdsByName(
	page: Page,
	names: string[],
): Promise<string[]> {
	const token = await authToken(page);
	const res = await page.request.get('/api/v1/roles', {
		headers: { Authorization: `Bearer ${token}` },
	});
	if (!res.ok()) {
		return [];
	}
	const body = (await res.json()) as { data: RoleListEntry[] };
	const wanted = new Set(names);
	return body.data
		.filter((role) => wanted.has(role.name))
		.map((role) => role.id);
}

/**
 * Best-effort delete via API. Errors are swallowed so suite cleanup stays
 * resilient when the role was never created (a failed save) or the stack is
 * mid-shutdown.
 */
export async function deleteRoleViaApi(
	request: APIRequestContext,
	id: string,
	token: string,
): Promise<void> {
	await request
		.delete(`/api/v1/roles/${id}`, {
			headers: { Authorization: `Bearer ${token}` },
		})
		.catch(() => undefined);
}

import type { Page } from '@playwright/test';

import { expect, test } from '../../fixtures/auth';
import {
	ALERTS_LIST_PATH,
	DASHBOARDS_LIST_PATH,
	gotoK8sList,
	sidebarItem,
} from '../../helpers/routing';

// Guards the shape of the router mount itself, which no other spec observes:
// both properties below are invisible until the mount changes.

// The views rail renders whether or not the list is empty; the list's own
// heading does not.
const DASHBOARDS_LANDMARK_TEST_ID = 'dashboards-view-search';

/**
 * Hold every script requested from now on, and return the release. Route
 * components are `React.lazy`, so the target route's chunk is the request that
 * decides whether anything suspends.
 *
 * The handler stays installed after the release: `page.unroute` drops the
 * requests that are still parked in it, so the chunk under test would never
 * arrive.
 */
async function holdScripts(page: Page): Promise<() => void> {
	let release = (): void => {};
	const held = new Promise<void>((resolve) => {
		release = resolve;
	});
	await page.route('**/*.js', async (route) => {
		await held;
		await route.continue();
	});
	return release;
}

test.describe('Routing: router mount', () => {
	// Under a React transition the previous screen stays up instead of the
	// Suspense fallback, so a route whose chunk is not cached yet renders no
	// loader at all. Rendering route changes in a transition compiles, passes
	// every other spec, and silently removes the loader. This is the only test
	// that sees it.
	test('TC-18 an in-app navigation to an uncached route commits the Suspense fallback', async ({
		authedPage: page,
	}) => {
		await page.goto(DASHBOARDS_LIST_PATH);
		await expect(page.getByTestId(DASHBOARDS_LANDMARK_TEST_ID)).toBeVisible();

		const release = await holdScripts(page);
		try {
			await sidebarItem(page, 'Alerts').click();
			await page.waitForURL((url) => url.pathname === ALERTS_LIST_PATH);

			// Under a transition the dashboards list would still be on screen here.
			await expect(page.getByTestId(DASHBOARDS_LANDMARK_TEST_ID)).toBeHidden();
			await expect(
				page.getByRole('img', { name: 'loading' }).first(),
			).toBeVisible();
		} finally {
			release();
		}

		// The held chunk lands and the route renders, so the fallback above was the
		// transient state it is meant to be.
		await expect(
			page
				.getByRole('heading', { name: 'Alert Rules' })
				.or(page.getByTestId('list-alerts-search-input')),
		).toBeVisible();
	});

	// nuqs' react-router adapter calls `useNavigate` and `useSearchParams`, so it
	// only works inside a router, and the router has to mount above the nuqs
	// adapter. The wrong order throws on the first page that reads a nuqs param,
	// which is most of them.
	test('TC-19 a page with nuqs params mounts with no router-context error', async ({
		authedPage: page,
	}) => {
		const reported: string[] = [];
		page.on('pageerror', (error) => reported.push(error.message));
		page.on('console', (message) =>
			reported.push(`${message.type()}: ${message.text()}`),
		);

		await gotoK8sList(page, 'category=pods&relativeTime=30m');

		expect(
			reported.filter((text) =>
				/useNavigate|useSearchParams|context of a <Router>/i.test(text),
			),
		).toEqual([]);
	});
});

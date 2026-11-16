import {
	expect,
	explorerPathname,
	logsView,
	type SavedViews,
	test,
	uniqueViewName,
} from '../../drivers/saved-views';

const LOGS_PATH = explorerPathname('logs');
const FRONTEND_FILTER = "service.name = 'frontend'";
const CART_FILTER = "service.name = 'cartservice'";

const HOUR_MS = 3_600_000;

/** Whole milliseconds, as the links carry them. */
function customRange(): { startTime: string; endTime: string } {
	const end = Math.floor(Date.now() / 60_000) * 60_000;
	return {
		startTime: String(end - 2 * HOUR_MS),
		endTime: String(end - HOUR_MS),
	};
}

async function seedTwoViews(savedViews: SavedViews) {
	const target = await savedViews.seed(
		logsView({ displayName: uniqueViewName('link'), filter: FRONTEND_FILTER }),
	);
	const other = await savedViews.seed(
		logsView({ displayName: uniqueViewName('other'), filter: CART_FILTER }),
	);
	return { target, other };
}

test.describe('Saved views: row links', () => {
	test('TC-01 a row links to its view in the selected relative time range', async ({
		savedViews,
	}) => {
		const { target } = await seedTwoViews(savedViews);
		await savedViews.openExplorer('logs', { relativeTime: '1h' });
		await savedViews.openList();
		await savedViews.search(target.displayName);

		const href = await savedViews.rowHref(target.id);
		expect(href.pathname).toBe(LOGS_PATH);
		expect(href.searchParams.get('viewKey')).toBe(JSON.stringify(target.id));
		expect(href.searchParams.get('panelTypes')).toBe('"list"');
		expect(href.searchParams.get('relativeTime')).toBe('1h');
		expect(href.searchParams.has('startTime')).toBe(false);
		expect(href.searchParams.has('endTime')).toBe(false);
		expect(href.searchParams.get('compositeQuery')).toContain(
			encodeURIComponent(FRONTEND_FILTER),
		);
	});

	test('TC-02 a row links to its view in a custom time range, to the millisecond', async ({
		savedViews,
	}) => {
		const { target } = await seedTwoViews(savedViews);
		const range = customRange();
		await savedViews.openExplorer('logs', range);
		await savedViews.openList();
		await savedViews.search(target.displayName);

		const href = await savedViews.rowHref(target.id);
		expect(href.searchParams.get('startTime')).toBe(range.startTime);
		expect(href.searchParams.get('endTime')).toBe(range.endTime);
		expect(href.searchParams.has('relativeTime')).toBe(false);
		expect(href.searchParams.get('viewKey')).toBe(JSON.stringify(target.id));
	});

	test('TC-03 a plain click opens the view in place and marks its row', async ({
		savedViews,
	}) => {
		const { target, other } = await seedTwoViews(savedViews);
		await savedViews.openExplorer('logs', { relativeTime: '1h' });
		const documentId = await savedViews.documentId();

		await savedViews.openList();
		await savedViews.search(target.displayName);
		await savedViews.open(target);

		await savedViews.expectClean(target.displayName);
		await expect(savedViews.rowLink(target.id)).toHaveAttribute(
			'aria-current',
			'page',
		);
		expect(savedViews.param('relativeTime')).toBe('1h');
		expect(await savedViews.documentId()).toBe(documentId);
		expect(savedViews.newTabCount()).toBe(0);

		await savedViews.search(other.displayName);
		await expect(savedViews.rowLink(other.id)).not.toHaveAttribute(
			'aria-current',
			'page',
		);
	});

	for (const gesture of ['modifier', 'middle'] as const) {
		test(`TC-04 a ${gesture} click opens the view in a new tab and leaves this one alone`, async ({
			savedViews,
		}) => {
			const { target } = await seedTwoViews(savedViews);
			await savedViews.openExplorer('logs', { relativeTime: '1h' });
			await savedViews.openList();
			await savedViews.search(target.displayName);
			const urlBefore = savedViews.url().href;

			const { savedViews: opened } = await savedViews.openInNewTab(
				target.id,
				gesture,
			);
			await opened.queryRan(target.filter);

			await opened.expectClean(target.displayName);
			expect(opened.activeViewId()).toBe(target.id);
			expect(opened.param('relativeTime')).toBe('1h');
			await expect(opened.queryBar()).toHaveText(target.filter);
			expect(savedViews.url().href).toBe(urlBefore);
			await expect(savedViews.name()).toHaveText('My view');
		});
	}
});

test.describe('Saved views: copied links', () => {
	test('TC-05 a copied link reopens the view in the same relative time range', async ({
		savedViews,
	}) => {
		const { target } = await seedTwoViews(savedViews);
		await savedViews.openExplorer('logs', { relativeTime: '1h' });
		await savedViews.openList();
		await savedViews.search(target.displayName);

		const copied = new URL(await savedViews.copyLink(target.id));
		await expect(savedViews.toast('Link copied')).toBeVisible();
		expect(copied.origin).toBe(savedViews.url().origin);
		expect(copied.pathname).toBe(LOGS_PATH);
		expect(copied.searchParams.get('relativeTime')).toBe('1h');
		expect(copied.searchParams.get('viewKey')).toBe(JSON.stringify(target.id));

		const { savedViews: reopened } = await savedViews.openLink(copied, target);

		await reopened.expectClean(target.displayName);
		expect(reopened.activeViewId()).toBe(target.id);
		expect(reopened.param('relativeTime')).toBe('1h');
		await expect(reopened.queryBar()).toHaveText(target.filter);
	});

	test('TC-06 a copied link reopens the view in the same custom time range', async ({
		savedViews,
	}) => {
		const { target } = await seedTwoViews(savedViews);
		const range = customRange();
		await savedViews.openExplorer('logs', range);
		await savedViews.openList();
		await savedViews.search(target.displayName);

		const copied = new URL(await savedViews.copyLink(target.id));
		expect(copied.searchParams.get('startTime')).toBe(range.startTime);
		expect(copied.searchParams.get('endTime')).toBe(range.endTime);
		expect(copied.searchParams.has('relativeTime')).toBe(false);

		const { savedViews: reopened } = await savedViews.openLink(copied, target);

		await reopened.expectClean(target.displayName);
		expect(reopened.param('startTime')).toBe(range.startTime);
		expect(reopened.param('endTime')).toBe(range.endTime);
	});
});

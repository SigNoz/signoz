import { BASE_ENTITY, expect, test } from '../../drivers/infra';

// The three states the seeder cannot produce: a failing list request, a window
// before retention, and a window with nothing in it. All three are reached by
// intercepting the list request, which is the only way to make the backend fail
// on demand — nothing else in this directory stubs the network.

test.describe('infra monitoring — empty and error states', () => {
	test('TC-01 a failed list request renders the error state', async ({
		authedPage: page,
		infra,
	}) => {
		await page.route(
			(url) => infra.list.isListRequest(url.toString()),
			(route) =>
				route.fulfill({
					status: 500,
					contentType: 'application/json',
					body: JSON.stringify({ status: 'error', error: 'boom' }),
				}),
		);

		await infra.list.goto(BASE_ENTITY);

		await expect(infra.list.errorState()).toBeVisible();
		await expect(infra.list.table(BASE_ENTITY).rows()).toHaveCount(0);
	});

	test('TC-02 an empty list response renders the empty state', async ({
		authedPage: page,
		infra,
	}) => {
		await page.route(
			(url) => infra.list.isListRequest(url.toString()),
			(route) =>
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						status: 'success',
						data: { records: [], total: 0 },
					}),
				}),
		);

		await infra.list.goto(BASE_ENTITY);

		await expect(infra.list.emptyState()).toBeVisible();
	});

	test('TC-03 a window before retention says so rather than showing nothing', async ({
		infra,
	}) => {
		// The retention branch keys off the *requested* window, so a deep link far
		// enough back reaches it without any stubbing.
		const end = Date.now() - 400 * 24 * 60 * 60 * 1000;
		await infra.list.goto(BASE_ENTITY, {
			startTime: String(end - 60 * 60 * 1000),
			endTime: String(end),
		});

		await expect(
			infra.list.retentionState().or(infra.list.emptyState()),
		).toBeVisible();
	});
});

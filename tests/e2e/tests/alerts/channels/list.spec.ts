import { expect, test } from '../../../fixtures/auth';
import {
	createChannelViaApi,
	deleteChannelViaApi,
} from '../../../helpers/channels/api';
import {
	channelRow,
	channelRows,
	gotoChannelList,
	openChannelRowMenu,
} from '../../../helpers/channels/navigation';

test.describe('Notification channels — list', () => {
	// Search and the kind filter are both server-side, so each assertion here is
	// also a guard on the query the list sends.
	const prefix = `e2e-ncl-${Date.now()}`;
	const slackName = `${prefix}-slack`;
	const emailName = `${prefix}-email`;
	const seeded: string[] = [];

	test.beforeAll(async ({ authedPage: page }) => {
		seeded.push((await createChannelViaApi(page, slackName)).id);
		seeded.push(
			(
				await createChannelViaApi(page, emailName, 'email', {
					to: 'e2e@signoz.test',
				})
			).id,
		);
	});

	test.afterAll(async ({ authedPage: page }) => {
		await Promise.all(seeded.map((id) => deleteChannelViaApi(page, id)));
	});

	test('TC-01 search narrows the list to the matching channel', async ({
		authedPage: page,
	}) => {
		await gotoChannelList(page, { search: prefix });
		await expect(channelRows(page)).toHaveCount(2);

		await page.getByTestId('channels-search').fill(slackName);
		await expect(channelRow(page, slackName)).toBeVisible();
		await expect(channelRow(page, emailName)).toHaveCount(0);
	});

	test('TC-02 the kind filter keeps only channels of that kind', async ({
		authedPage: page,
	}) => {
		await gotoChannelList(page, { search: prefix, kind: 'email' });

		await expect(channelRow(page, emailName)).toBeVisible();
		await expect(channelRow(page, slackName)).toHaveCount(0);
	});

	test('TC-03 a search matching nothing offers to clear itself', async ({
		authedPage: page,
	}) => {
		await gotoChannelList(page, { search: `${prefix}-nothing-matches` });

		await expect(page.getByText('No matching channels')).toBeVisible();
		await page.getByRole('button', { name: 'Clear Search' }).click();
		await expect(page.getByTestId('channels-search')).toHaveValue('');
	});

	test('TC-04 clicking a row opens that channel for editing', async ({
		authedPage: page,
	}) => {
		await gotoChannelList(page, { search: slackName });
		await channelRow(page, slackName).click();

		await page.waitForURL(/\/alerts\/channels\/edit\//);
		await expect(page.getByTestId('channel-name-textbox')).toHaveValue(slackName);
	});

	test('TC-05 View JSON shows the channel with its secrets masked', async ({
		authedPage: page,
	}) => {
		await gotoChannelList(page, { search: slackName });
		await openChannelRowMenu(page, slackName);
		await page.getByRole('menuitem', { name: 'View JSON' }).click();

		const dialog = page.getByTestId('channel-json-dialog');
		await expect(dialog).toBeVisible();
		await expect(dialog).toContainText('"kind": "slack"');
		await expect(page.getByTestId('channel-json-toggle-secrets')).toBeVisible();
	});
});

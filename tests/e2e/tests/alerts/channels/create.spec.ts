import { expect, test } from '../../../fixtures/auth';
import { deleteChannelViaApi } from '../../../helpers/channels/api';
import {
	channelRow,
	CHANNELS_NEW_PATH,
	gotoChannelList,
} from '../../../helpers/channels/navigation';

test.describe('Notification channels — create', () => {
	test('TC-01 a webhook channel saves and shows up in the list', async ({
		authedPage: page,
	}) => {
		const name = `e2e-ncc-${Date.now()}`;
		let id: string | undefined;

		try {
			await page.goto(CHANNELS_NEW_PATH);
			await page.getByTestId('channel-name-textbox').fill(name);

			await page.getByTestId('channel-type-select').click();
			await page.getByRole('option', { name: 'Webhook', exact: true }).click();

			await page
				.getByTestId('webhook-url-textbox')
				.fill('https://example.test/e2e-hook');

			const [response] = await Promise.all([
				page.waitForResponse(
					(r) =>
						r.url().includes('/api/v2/notification_channels') &&
						r.request().method() === 'POST',
				),
				page.getByTestId('save-channel-button').click(),
			]);
			id = ((await response.json()) as { data: { id: string } }).data.id;

			await gotoChannelList(page, { search: name });
			await expect(channelRow(page, name)).toBeVisible();
		} finally {
			await deleteChannelViaApi(page, id);
		}
	});

	test('TC-02 saving without a name reports the missing field', async ({
		authedPage: page,
	}) => {
		await page.goto(CHANNELS_NEW_PATH);
		await page.getByTestId('save-channel-button').click();

		await expect(page.getByText('Channel name is mandatory')).toBeVisible();
	});
});

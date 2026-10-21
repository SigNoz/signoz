import { expect, test } from '../../../drivers/channels';
import { deleteChannelViaApi } from '../../../helpers/channels/api';

test.describe('Notification channels — create', () => {
	test('TC-01 a webhook channel saves and shows up in the list', async ({
		channels,
		authedPage,
	}) => {
		const name = `e2e-ncc-${Date.now()}`;
		let id: string | undefined;

		try {
			await channels.form.gotoNew();
			await channels.form.name().fill(name);
			await channels.form.pickType('Webhook');
			await channels.form.fillField(
				'webhook-url-textbox',
				'https://example.test/e2e-hook',
			);

			id = await channels.form.saveAndReturnId();

			await channels.list.goto({ search: name });
			await expect(channels.list.row(name)).toBeVisible();
		} finally {
			await deleteChannelViaApi(authedPage, id);
		}
	});

	test('TC-02 saving without a name reports the missing field', async ({
		channels,
		authedPage,
	}) => {
		await channels.form.gotoNew();
		await channels.form.save();

		await expect(authedPage.getByText('Channel name is mandatory')).toBeVisible();
	});
});

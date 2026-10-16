import { expect, test } from '../../../fixtures/auth';
import {
	createChannelViaApi,
	deleteChannelViaApi,
} from '../../../helpers/channels/api';
import {
	channelRow,
	gotoChannelList,
	openChannelRowMenu,
} from '../../../helpers/channels/navigation';

test.describe('Notification channels — delete', () => {
	test('TC-01 deleting from the row menu takes the channel out of the list', async ({
		authedPage: page,
	}) => {
		const name = `e2e-ncd-${Date.now()}`;
		const { id } = await createChannelViaApi(page, name);

		try {
			await gotoChannelList(page, { search: name });
			await openChannelRowMenu(page, name);
			await page.getByRole('menuitem', { name: 'Delete' }).click();

			await expect(
				page.getByText(`Are you sure you want to delete the ${name} channel?`),
			).toBeVisible();

			await Promise.all([
				page.waitForResponse(
					(r) =>
						r.url().includes('/api/v2/notification_channels') &&
						r.request().method() === 'DELETE',
				),
				page.getByRole('button', { name: 'Delete', exact: true }).click(),
			]);

			await expect(channelRow(page, name)).toHaveCount(0);
		} finally {
			// the test deletes it; this only catches a run that stopped earlier
			await deleteChannelViaApi(page, id);
		}
	});
});

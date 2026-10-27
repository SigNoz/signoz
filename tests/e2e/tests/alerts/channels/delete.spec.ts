import { expect, test } from '../../../drivers/channels';

test.describe('Notification channels — delete', () => {
	test('TC-01 deleting from the row menu takes the channel out of the list', async ({
		channels,
	}) => {
		const name = `e2e-ncd-${Date.now()}`;
		const { id } = await channels.api.create(name);

		try {
			await channels.list.goto({ search: name });
			await channels.list.openRowMenu(name);
			await channels.list.chooseMenuItem('Delete');

			await expect(channels.list.deletePrompt(name)).toBeVisible();
			await channels.list.confirmDelete();

			await expect(channels.list.row(name)).toHaveCount(0);
		} finally {
			// the test deletes it; this only catches a run that stopped earlier
			await channels.api.remove(id);
		}
	});
});

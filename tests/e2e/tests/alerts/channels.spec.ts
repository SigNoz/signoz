import { expect, test } from '../../drivers/alerts';

test.describe('Notification channels', () => {
	// Regression guard for engineering-pod#5509: after channels moved from
	// /settings/channels to /alerts/channels, the edit container still parsed the
	// id out of the old pathname, so every save PUT went to an empty id and no
	// edit ever persisted. Nothing navigated into the edit page, so the whole
	// class of "edits silently do nothing" was invisible.
	test('TC-01 an edited recipient persists after reload', async ({
		authedPage: page,
		alerts,
	}) => {
		// The channel *name* is read-only on the edit page, so the editable field
		// this exercises is the email recipient.
		const updatedTo = 'e2e-updated@signoz.test';
		const { id } = await alerts.seed.channel(`e2e-nc-${Date.now()}`);

		try {
			await alerts.channels.gotoEdit(id);

			const toBox = alerts.channels.recipients();
			await expect(toBox).toHaveValue('e2e@signoz.test');
			await toBox.fill(updatedTo);

			await Promise.all([
				page.waitForResponse(
					(res) =>
						res.url().includes('/api/v1/channels') &&
						res.request().method() === 'PUT',
				),
				alerts.channels.saveButton().click(),
			]);

			await alerts.channels.gotoEdit(id);
			await expect(alerts.channels.recipients()).toHaveValue(updatedTo);
		} finally {
			await alerts.seed.deleteChannel(id);
		}
	});
});

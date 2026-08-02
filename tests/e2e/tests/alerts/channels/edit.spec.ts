import { expect, test } from '../../../fixtures/auth';
import {
	createEmailChannelViaApi,
	deleteChannelViaApi,
} from '../../../helpers/alerts';

test.describe('Notification channels — edit', () => {
	// Regression guard for engineering-pod#5509: after channels moved from
	// /settings/channels to /alerts/channels, the edit container still parsed the
	// channel id out of the old pathname, so every save PUT went to an empty id
	// and no edit ever persisted. Nothing in the suite navigated into the edit
	// page, so the whole class of "edits silently do nothing" was invisible.
	test('NC-01 an edited recipient persists after reload', async ({
		authedPage: page,
	}) => {
		// The channel *name* is read-only on the edit page, so the editable field
		// this exercises is the email recipient.
		const name = `e2e-nc-${Date.now()}`;
		const updatedTo = 'e2e-updated@signoz.test';
		const { id } = await createEmailChannelViaApi(page, name);

		try {
			await page.goto(`/alerts/channels/edit/${id}`);

			const toBox = page.getByRole('textbox', { name: 'To' });
			await expect(toBox).toHaveValue('e2e@signoz.test');
			await toBox.fill(updatedTo);

			await Promise.all([
				page.waitForResponse(
					(r) =>
						r.url().includes('/api/v1/channels') && r.request().method() === 'PUT',
				),
				page.getByTestId('save-channel-button').click(),
			]);

			await page.goto(`/alerts/channels/edit/${id}`);
			await expect(page.getByRole('textbox', { name: 'To' })).toHaveValue(
				updatedTo,
			);
		} finally {
			await deleteChannelViaApi(page, id);
		}
	});
});

import { CHANNEL_TYPES, expect, test } from '../../../drivers/channels';

// The mirror of the create pass: seed a channel of each type through the API,
// open it, change its first required field and check the change survives a
// reload. A prefill or a save that drops a type's fields fails here.
test.describe('Notification channels — edit one of each type', () => {
	CHANNEL_TYPES.forEach(({ label, kind, fields, spec }, index) => {
		const number = String(index + 1).padStart(2, '0');
		const [testId, original] = fields[0];

		test(`TC-${number} an edited ${label} channel keeps its change`, async ({
			channels,
			authedPage,
		}) => {
			const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
			const name = `e2e-nte-${slug}-${Date.now()}`;
			const edited = `${original}-edited`;
			let id: string | undefined;

			try {
				({ id } = await channels.api.create(name, kind, spec));

				await authedPage.goto(`/alerts/channels/edit/${id}`);
				const field = authedPage.getByTestId(testId);
				await expect(field).toHaveValue(original);

				await field.fill(edited);
				await channels.form.saveEdit();

				await authedPage.goto(`/alerts/channels/edit/${id}`);
				await expect(authedPage.getByTestId(testId)).toHaveValue(edited);
			} finally {
				await channels.api.remove(id);
			}
		});
	});
});

import { CHANNEL_TYPES, expect, test } from '../../../drivers/channels';

// One pass per channel type, filling only what the form refuses to save
// without. The point is that every type can be created at all: a type whose
// settings component or validator drifts fails here rather than in support.
test.describe('Notification channels — create one of each type', () => {
	CHANNEL_TYPES.forEach(({ label, fields }, index) => {
		const number = String(index + 1).padStart(2, '0');

		test(`TC-${number} a ${label} channel saves and shows up in the list`, async ({
			channels,
		}) => {
			const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
			const name = `e2e-nct-${slug}-${Date.now()}`;
			let id: string | undefined;

			try {
				await channels.form.gotoNew();
				await channels.form.name().fill(name);
				await channels.form.pickType(label);

				for (const [testId, value] of fields) {
					// eslint-disable-next-line no-await-in-loop
					await channels.form.fillField(testId, value);
				}

				id = await channels.form.saveAndReturnId();

				await channels.list.goto({ search: name });
				await expect(channels.list.row(name)).toBeVisible();
			} finally {
				await channels.api.remove(id);
			}
		});
	});
});

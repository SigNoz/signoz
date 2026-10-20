import { expect, test } from '../../drivers/shell';

test.describe('app shell — time picker', () => {
	// A fixed zone makes the displayed offset deterministic.
	test.use({ timezoneId: 'Asia/Kolkata' });

	test('TC-01 a preset rewrites the URL and the services query window', async ({
		shell,
	}) => {
		await shell.goto('/services');
		await expect(shell.timePicker.input()).toBeVisible();

		const servicesCall = shell.nextServicesWindow(15);
		await shell.timePicker.pickPreset('15m');
		await servicesCall;

		expect(shell.timePicker.urlParams()).toEqual({
			relativeTime: '15m',
			startTime: undefined,
			endTime: undefined,
		});
		await expect(shell.timePicker.input()).toHaveValue('Last 15 minutes');
	});

	test('TC-02 a typed shorthand range applies', async ({ shell }) => {
		await shell.goto('/services');
		await expect(shell.timePicker.input()).toBeVisible();

		const servicesCall = shell.nextServicesWindow(120);
		await shell.timePicker.typeRange('2h');
		await servicesCall;

		await expect.poll(() => shell.timePicker.urlParams().relativeTime).toBe('2h');
		await expect(shell.timePicker.input()).toHaveValue('Last 2 hours');
	});

	test('TC-03 a timezone picked in the picker changes the offset and persists', async ({
		shell,
	}) => {
		await shell.goto('/services');
		await expect(shell.timezoneBadge()).toHaveText('UTC + 5:30');

		await shell.timePicker.pickTimezone('UTC', 'UTC');
		await expect(shell.timezoneBadge()).toHaveText('UTC');
		expect(await shell.storedTimezone()).not.toBeNull();

		await shell.reload();
		await expect(shell.timezoneBadge()).toHaveText('UTC');

		await shell.goto('/settings/my-settings');
		await expect(shell.timezoneOverrideNote()).toBeVisible();
		await shell.clearTimezoneOverride();

		await shell.goto('/services');
		await expect(shell.timezoneBadge()).toHaveText('UTC + 5:30');
	});
});

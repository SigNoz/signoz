import { expect, test } from '../../drivers/alerts';

// Planned downtime under Configuration. The form's scope switch and payload
// mapping are covered by jest in `container/PlannedDowntime/__test__/`; here
// the save has to reach the real API.

const inDays = (days: number): Date => {
	const day = new Date();
	day.setDate(day.getDate() + days);
	return day;
};

test.describe('Planned downtime', () => {
	test.describe.configure({ timeout: 60_000 });

	test('TC-01 a schedule started on specific rules and switched to All saves with no rule ids', async ({
		alerts,
		alertChannel,
	}) => {
		const stamp = Date.now();
		const name = `e2e-downtime-${stamp}`;
		const ruleName = `e2e-dt-${String(stamp).slice(-8)}`;
		const ruleId = await alerts.seed.threshold({
			name: ruleName,
			target: 1,
			channels: [alertChannel.name],
		});

		try {
			await alerts.downtime.goto();
			await alerts.downtime.newButton().click();
			await alerts.downtime.fillName(name);
			await alerts.downtime.pickDate('Starts from', inDays(1));
			await alerts.downtime.pickTimezone('UTC');
			await alerts.downtime.pickDate('Ends on', inDays(2));

			await expect(alerts.downtime.scope('Specific alert rules')).toBeChecked();
			await expect(alerts.downtime.rulePicker()).toBeVisible();
			await alerts.downtime.pickRule(ruleName);
			await expect(alerts.downtime.pickedRule(ruleName)).toBeVisible();

			await alerts.downtime.scope('All alert rules').click();
			await expect(alerts.downtime.rulePicker()).toHaveCount(0);
			await alerts.downtime.save();

			await expect(alerts.downtime.row(name)).toBeVisible();
			const stored = await alerts.downtime.byName(name);
			expect(stored?.alertIds ?? []).toEqual([]);
			expect(stored?.schedule.timezone).toBe('UTC');

			await alerts.downtime.remove(name);
			await expect.poll(() => alerts.downtime.byName(name)).toBeUndefined();
		} finally {
			await alerts.downtime.tryDelete(name);
			await alerts.seed.deleteRule(ruleId);
		}
	});
});

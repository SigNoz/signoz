import {
	expect,
	GET_STARTED_PATH,
	ONBOARDING_PATH,
	test,
} from '../../drivers/onboarding';

const DISCOVERY = 'A colleague recommended it';

test.describe('onboarding questionnaire', () => {
	// Each test walks up to four steps and two full page loads.
	test.describe.configure({ timeout: 90_000 });

	test('TC-01 a first-run admin is sent to /onboarding, finishes all four steps and is not sent back', async ({
		onboarding,
	}) => {
		const run = await onboarding.stubFirstRun();
		const { questionnaire: q } = onboarding;

		await onboarding.visit('/home');
		await onboarding.expectPath(ONBOARDING_PATH);

		await expect(q.heading('Welcome to SigNoz Cloud')).toBeVisible();
		await q.answerOrg({
			tool: 'DataDog',
			timeline: 'Less than a month',
			usesOtel: true,
		});
		await q.next().click();

		await expect(q.discovery()).toBeVisible();
		await q.answerSignoz({
			discovery: DISCOVERY,
			interests: ['Prefer open-source tooling'],
		});
		await q.next().click();

		await q.maxLogsSlider();
		await q.next().click();

		await expect(q.heading('Invite your team')).toBeVisible();
		expect(run.profileBodies).toEqual([
			{
				uses_otel: true,
				has_existing_observability_tool: true,
				existing_observability_tool: 'DataDog',
				where_did_you_discover_signoz: DISCOVERY,
				timeline_for_migrating_to_signoz: 'lessThanMonth',
				reasons_for_interest_in_signoz: ['openSourceTooling'],
				logs_scale_per_day_in_gb: 10000,
				number_of_hosts: 0,
				number_of_services: 0,
			},
		]);

		await q.doLater().click();
		await onboarding.expectPath(GET_STARTED_PATH);
		expect(run.onboardingWrites).toEqual([{ value: true }]);

		await onboarding.visit('/home');
		await expect(onboarding.homePage()).toBeVisible();
		await onboarding.settle();
		expect(onboarding.pathname()).toBe('/home');
	});

	test('TC-02 each step keeps Next disabled and says why until it is answered', async ({
		onboarding,
	}) => {
		await onboarding.stubFirstRun();
		const { questionnaire: q } = onboarding;
		await onboarding.visit(ONBOARDING_PATH);

		await q.expectDisabledBecause(
			q.next(),
			'Select the observability tool you use',
		);
		await q.pickTool('DataDog');
		await q.expectDisabledBecause(q.next(), 'Select your migration timeline');
		await q.pickTimeline('Just exploring');
		await q.expectDisabledBecause(
			q.next(),
			'Tell us if you already use OpenTelemetry',
		);
		await q.pickOtel(false);
		await expect(q.next()).not.toHaveAttribute('aria-disabled', 'true');
		await q.next().click();

		await q.expectDisabledBecause(
			q.next(),
			'Tell us how you first came across SigNoz',
		);
		await q.discovery().fill(DISCOVERY);
		await q.expectDisabledBecause(
			q.next(),
			'Select what got you interested in SigNoz',
		);
		await q.interest('Prefer open-source tooling').click();
		await expect(q.next()).not.toHaveAttribute('aria-disabled', 'true');
		await q.next().click();

		await q.expectDisabledBecause(
			q.next(),
			'Set at least one of the values above',
		);
		await q.maxLogsSlider();
		await expect(q.next()).not.toHaveAttribute('aria-disabled', 'true');
		await q.next().click();

		await q.expectDisabledBecause(
			q.sendInvites(),
			'Add at least one team member to invite',
		);
	});

	test('TC-03 a failed profile save shows a toast and still reaches the invite step', async ({
		onboarding,
	}) => {
		const run = await onboarding.stubFirstRun({ profiles: 'error' });
		const { questionnaire: q } = onboarding;
		await onboarding.visit(ONBOARDING_PATH);

		await q.answerOrg({ tool: 'None/Starting fresh', usesOtel: false });
		await q.next().click();
		await q.answerSignoz({
			discovery: DISCOVERY,
			interests: ['Prefer open-source tooling'],
		});
		await q.next().click();
		await q.doLater().click();

		await expect(
			onboarding.toast('Request failed with status code 500'),
		).toBeVisible();
		await expect(q.heading('Invite your team')).toBeVisible();
		expect(run.profileBodies).toHaveLength(1);
		expect(run.onboardingWrites).toEqual([]);
	});

	test('TC-04 Send invites creates the invited user and finishes onboarding', async ({
		onboarding,
	}) => {
		const run = await onboarding.stubFirstRun();
		const { questionnaire: q } = onboarding;
		const email = `e2e-onboarding-invite-${Date.now()}@signoz.test`;

		try {
			await onboarding.visit(ONBOARDING_PATH);
			await q.answerOrg({ tool: 'None/Starting fresh', usesOtel: true });
			await q.next().click();
			await q.answerSignoz({
				discovery: DISCOVERY,
				interests: ['Prefer open-source tooling'],
			});
			await q.next().click();
			await q.doLater().click();

			await q.invite([{ email, role: 'signoz-viewer' }]);
			await q.sendInvites().click();

			await onboarding.expectPath(GET_STARTED_PATH);
			expect(run.onboardingWrites).toEqual([{ value: true }]);
			expect(await onboarding.users.byEmail(email)).toBeDefined();
		} finally {
			await onboarding.users.remove(email);
		}
	});
});

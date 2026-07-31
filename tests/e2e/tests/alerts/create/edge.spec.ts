import { expect, test } from '../../../fixtures/alert-rules';
import {
	AlertType,
	elementAtPointClassName,
	gotoCreateAlertV1,
	gotoCreateAlertV2,
	selectThresholdChannel,
	v1SaveButton,
	v2DiscardButton,
	v2SaveButton,
} from '../../../helpers/alert-forms';
import {
	createEmailChannelViaApi,
	deleteChannelViaApi,
	gotoAlertDetails,
	gotoAlertOverview,
} from '../../../helpers/alerts';
import { watchConsole } from '../../../helpers/common';

// CE-* — errors and edges that are not specific to one form.
//
// CE-01 and CE-02 live in `edit/edge.spec.ts`'s header comment as unreachable
// (coverage doc §9.1). CE-05/CE-06 are v1-only validation and live with the v1
// specs. CE-08 is unwritable in either direction and EV2-08 explains why.
//
// See `specs/alerts/alerts-create-edit-coverage.md` §5.7.

test.describe('Alert create — errors and edges', () => {
	test('CE-04 a server-side rejection opens the error modal and keeps the draft', async ({
		authedPage: page,
	}) => {
		// A duplicate rule name is *not* rejected — the API happily creates two rules
		// with the same `alert` (probed: both POSTs return 201), so the coverage doc's
		// first suggestion cannot drive this row. A missing channel is rejected, with
		// `400 invalid_input: channels: the following channels do not exist`.
		//
		// So the 4xx is produced by a real race rather than by a stub: the form is filled
		// with a channel that exists, and the channel is deleted behind its back before
		// the save. Nothing about the response is faked, which is what keeps this row
		// inside the no-stubbing rule (§3.3).
		const channel = await createEmailChannelViaApi(
			page,
			`e2e-ce04-ch-${Date.now()}`,
		);

		await gotoCreateAlertV2(page, { alertType: AlertType.LOGS });
		const name = `e2e-ce04-${Date.now()}`;
		await page.getByTestId('alert-name-input').fill(name);
		await selectThresholdChannel(page, 0, channel.name);

		await deleteChannelViaApi(page, channel.id);

		const [response] = await Promise.all([
			page.waitForResponse(
				(r) => r.url().includes('/api/v2/rules') && r.request().method() === 'POST',
			),
			v2SaveButton(page).click(),
		]);
		expect(response.status()).toBe(400);

		// `Footer.tsx:51-58` funnels every save error into the shared error modal; v1
		// does the same through `showErrorModal`. The modal is antd's, wrapped in
		// `.error-modal__wrap` (`components/ErrorModal/ErrorModal.tsx:91`).
		await expect(page.locator('.error-modal__wrap')).toBeVisible();
		await expect(page.getByText(/do not exist/)).toBeVisible();

		// The load-bearing half: a rejected save must not navigate, and must not lose
		// what the user typed — otherwise the fix is "type it all again".
		expect(new URL(page.url()).pathname).toBe('/alerts/new');
		await page.getByTestId('close-button').click();
		await expect(page.locator('.error-modal__wrap')).toBeHidden();
		await expect(page.getByTestId('alert-name-input')).toHaveValue(name);
	});

	test('CE-07 none of the four builder mounts logs a console error', async ({
		authedPage: page,
		ownedRules,
	}) => {
		const watch = watchConsole(page);

		// v2 create.
		await gotoCreateAlertV2(page, { alertType: AlertType.LOGS });
		// v1 create. Metrics-based on purpose: it is the only alert type whose classic
		// form renders the detection-method step and the PromQL tab, i.e. the most code.
		await gotoCreateAlertV1(page, { alertType: AlertType.METRICS });

		// v2 edit.
		const v2Rule = await ownedRules.threshold(`e2e-ce07-v2-${Date.now()}`);
		await gotoAlertOverview(page, v2Rule);

		// v1 edit. `gotoAlertOverview` is wrong here — it waits for
		// `threshold-value-input`, which only the v2 builder renders — so the shell-level
		// wait is used and the classic form is asserted directly.
		const v1Rule = await ownedRules.logs({
			name: `e2e-ce07-v1-${Date.now()}`,
			schema: 'v1',
		});
		await gotoAlertDetails(page, v1Rule);
		await expect(v1SaveButton(page)).toBeVisible();

		// `FormAlertRules/index.tsx` used to render the global DOM `Element` as a React
		// child (coverage doc §9.6) — dead code that logged "Functions are not valid as a
		// React child" on every classic-form mount in a development build and was
		// compiled out in production. It has been deleted, so this assertion is no longer
		// build-dependent: it holds against the integration image *and* a dev server.
		expect(watch.errors).toEqual([]);
	});

	test('CE-09 the side navigation covers the v2 Discard button', async ({
		authedPage: page,
	}) => {
		await gotoCreateAlertV2(page, { alertType: AlertType.LOGS });

		// Coverage doc §9.7 — a **user-facing** bug: the footer is `position: fixed;
		// left: 63px` (the *collapsed* rail width) while the nav is 240px wide whenever
		// expanded, which is the default. Discard is the footer's left-most control, so
		// the nav sits on top of it.
		const box = await v2DiscardButton(page).boundingBox();
		expect(box).not.toBeNull();
		const covering = await elementAtPointClassName(
			page,
			box!.x + box!.width / 2,
			box!.y + box!.height / 2,
		);
		expect(covering).toMatch(/nav-item/);

		// And the consequence, asserted rather than described: a real click cannot land.
		// `{ force: true }` would not help either — it skips the actionability wait but
		// still dispatches a mouse event at these coordinates, which the nav receives.
		await expect(v2DiscardButton(page).click({ timeout: 3_000 })).rejects.toThrow(
			/intercepts pointer events/,
		);

		// This row exists so `v2ClickDiscard`'s `dispatchEvent` workaround cannot rot
		// silently: when the footer is fixed, this test fails, and that failure is the
		// signal to put the plain `.click()` back in the helper.
	});
});

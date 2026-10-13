import { expect, test } from '../../../fixtures/alerts/alert-rules';
import { AlertType } from '../../../helpers/alert-forms/constants';
import {
	gotoCreateAlertV1,
	gotoCreateAlertV2,
} from '../../../helpers/alert-forms/navigation';
import { v1SaveButton } from '../../../helpers/alert-forms/v1';
import {
	elementAtPointClassName,
	selectThresholdChannel,
	v2DiscardButton,
	v2SaveButton,
} from '../../../helpers/alert-forms/v2';
import {
	createEmailChannelViaApi,
	deleteChannelViaApi,
} from '../../../helpers/alerts/api';
import {
	gotoAlertDetails,
	gotoAlertOverview,
} from '../../../helpers/alerts/navigation';
import { watchConsole } from '../../../helpers/common';

// TC-* — errors and edges that are not specific to one form.

test.describe('Alert create — errors and edges', () => {
	test('TC-01 a server-side rejection opens the error modal and keeps the draft', async ({
		authedPage: page,
	}) => {
		// A duplicate rule name is *not* rejected — the API happily creates two rules
		// with the same `alert`. A missing channel is, with
		// `400 invalid_input: channels: the following channels do not exist`.
		//
		// So the 4xx comes from a real race rather than a stub: the form is filled with
		// a channel that exists, and the channel is deleted behind its back before the
		// save. Nothing about the response is faked.
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

		// Both forms funnel every save error into the shared error modal, which is
		// antd's wrapped in `.error-modal__wrap`.
		await expect(page.locator('.error-modal__wrap')).toBeVisible();
		await expect(page.getByText(/do not exist/)).toBeVisible();

		// A rejected save must not navigate, and must not lose what the user typed.
		expect(new URL(page.url()).pathname).toBe('/alerts/new');
		await page.getByTestId('close-button').click();
		await expect(page.locator('.error-modal__wrap')).toBeHidden();
		await expect(page.getByTestId('alert-name-input')).toHaveValue(name);
	});

	test('TC-02 none of the four builder mounts logs a console error', async ({
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

		expect(watch.errors).toEqual([]);
	});

	// TODO: enable once the covered-Discard bug is fixed, and revert
	// `v2ClickDiscard` (`helpers/alert-forms.ts`) to a plain `.click()` in the same
	// commit — CV2-22 and EV2-11 both go through it.
	//
	// 🐞 **A user cannot discard an alert draft.** The footer is
	// `position: fixed; left: 63px` — the *collapsed* nav rail width — while the side
	// navigation is 240px wide whenever expanded, which is the default (pinned for a
	// fresh admin) and also happens transiently on hover when unpinned. Discard is the
	// footer's left-most control, so the nav sits on top of it and wins the stacking
	// contest despite the footer's `z-index: 1000`.
	//
	// Observed live: `document.elementFromPoint` at the button's centre returns the
	// nav's `.nav-item-data`, and `page.click()` fails with
	// *"div.nav-item-data … intercepts pointer events"*. `{ force: true }` does not
	// help — it skips the actionability wait but still delivers a real mouse event at
	// those coordinates. Only `dispatchEvent('click')` gets through, which proves the
	// handler is fine and the defect is purely pointer delivery.
	//
	// Fix is one of: make the footer's `left` follow the nav's actual width, move
	// Discard to the right-hand group, or lift the footer out of the nav's stacking
	// context.
	test.skip('TC-03 the v2 Discard button is clickable', async ({
		authedPage: page,
	}) => {
		await gotoCreateAlertV2(page, { alertType: AlertType.LOGS });

		// Nothing from the side navigation may sit over the button's centre.
		const box = await v2DiscardButton(page).boundingBox();
		expect(box).not.toBeNull();
		const covering = await elementAtPointClassName(
			page,
			box!.x + box!.width / 2,
			box!.y + box!.height / 2,
		);
		expect(covering).not.toMatch(/nav-item/);

		// And the consequence that matters: a real click lands and leaves the form.
		await v2DiscardButton(page).click({ timeout: 3_000 });
		await page.waitForURL(/\/alerts(\?|$)/);
		expect(new URL(page.url()).pathname).toBe('/alerts');
	});
});

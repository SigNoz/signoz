import { type Page } from '@playwright/test';

import { type Channels, expect, test } from '../../../drivers/channels';

// Shorter than the Slack form, so it only fits by scrolling inside the
// configuration pane, whose own overflow is hidden.
test.use({ viewport: { width: 1280, height: 600 } });

async function expectScrollsWithActionsPinned(
	page: Page,
	form: Channels['form'],
): Promise<void> {
	const actions = form.actions();
	const lastControl = page.getByTestId('slack-action-add');

	await expect(actions).toBeInViewport({ ratio: 1 });
	await expect(lastControl).not.toBeInViewport();

	await form.wheelToEnd();

	await expect(lastControl).toBeInViewport({ ratio: 1 });
	await expect(actions).toBeInViewport({ ratio: 1 });

	const control = await lastControl.boundingBox();
	const bar = await actions.boundingBox();
	expect(control!.y + control!.height).toBeLessThanOrEqual(bar!.y);
}

test.describe('Notification channels — form scroll', () => {
	test('TC-01 the new channel form scrolls to its end with actions pinned', async ({
		channels,
		authedPage,
	}) => {
		await channels.form.gotoNew();
		await channels.form.pickType('Slack');
		await expect(authedPage.getByTestId('slack-action-add')).toBeAttached();

		await expectScrollsWithActionsPinned(authedPage, channels.form);
	});

	test('TC-02 the edit channel form scrolls to its end with actions pinned', async ({
		channels,
		authedPage,
	}) => {
		let id: string | undefined;

		try {
			({ id } = await channels.api.create(`e2e-ncs-${Date.now()}`));
			await authedPage.goto(`/alerts/channels/edit/${id}`);
			await expect(channels.form.name()).toBeVisible();

			await expectScrollsWithActionsPinned(authedPage, channels.form);
		} finally {
			await channels.api.remove(id);
		}
	});
});

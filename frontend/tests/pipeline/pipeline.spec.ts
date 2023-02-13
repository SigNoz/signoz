import { expect, test } from '@playwright/test';
import ROUTES from 'constants/routes';

test.describe('Pipeline page', async () => {
	test('Get Add Pipeline Button', async ({ page, baseURL }) => {
		const pipelinePage = `${baseURL}${ROUTES.PIPELINES}`;
		const button = page.locator('text=Add Pipeline');

		expect(button).toBeVisible();
		expect(button).toHaveText('Add Pipeline');
		expect(await button.getAttribute('disabled')).toBe(null);

		expect(await button.isEnabled()).toBe(true);
		await expect(page).toHaveURL(pipelinePage);
	});
});

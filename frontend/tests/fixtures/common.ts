import { Page } from '@playwright/test';
import { getVersion } from 'constants/api';

import { version } from './constant';

export const waitForVersionApiSuccess = async (page: Page): Promise<void> => {
	await page.route(`**/${getVersion}`, (route) =>
		route.fulfill({
			contentType: 'application/json',
			status: 200,
			body: JSON.stringify({ version }),
		}),
	);
};

import { Page } from '@playwright/test';
import { getVersion } from 'constants/api';

import loginApiResponse from './api/login/200.json';
import updateOrgResponse from './api/organisation/201.json';
import successLoginResponse from './api/register/200.json';
import userLoginResponse from './api/userId/200.json';
import { version } from './constant';

export const waitForVersionApiSuccess = async (page: Page): Promise<void> => {
	await page.route(`**/${getVersion}`, (route) =>
		route.fulfill({
			status: 200,
			body: JSON.stringify({ version }),
		}),
	);
};

export const loginApi = async (page: Page): Promise<void> => {
	await Promise.all([
		page.route(`**/register`, (route) =>
			route.fulfill({
				status: 200,
				body: JSON.stringify(successLoginResponse),
			}),
		),
		page.route(`**/user/${loginApiResponse.userId}`, (route) =>
			route.fulfill({ status: 200, body: JSON.stringify(userLoginResponse) }),
		),
		page.route('**/login', (route) =>
			route.fulfill({
				status: 200,
				body: JSON.stringify(loginApiResponse),
			}),
		),
		page.route(`**/org/${userLoginResponse.orgId}`, (route) =>
			route.fulfill({
				status: 200,
				body: JSON.stringify(updateOrgResponse),
			}),
		),
	]);
};

import type { Page } from '@playwright/test';

import { expect } from '../fixtures/auth';

// Verbatim from frontend/src/constants/routes.ts
export const SETTINGS_ROUTES = {
	WORKSPACE: '/settings',
	MY_SETTINGS: '/settings/my-settings',
	ORG_SETTINGS: '/settings/org-settings',
	ALL_CHANNELS: '/settings/channels',
	INGESTION: '/settings/ingestion-settings',
	BILLING: '/settings/billing',
	ROLES: '/settings/roles',
	MEMBERS: '/settings/members',
	SERVICE_ACCOUNTS: '/settings/service-accounts',
	SHORTCUTS: '/settings/shortcuts',
	MCP_SERVER: '/settings/mcp-server',
	INTEGRATIONS: '/integrations',
} as const;

export type SettingsRoute =
	(typeof SETTINGS_ROUTES)[keyof typeof SETTINGS_ROUTES];

// Sidenav item data-testid == itemKey in menuItems.tsx settingsNavSections.
export const NAV_TESTID: Record<string, string> = {
	[SETTINGS_ROUTES.WORKSPACE]: 'workspace',
	[SETTINGS_ROUTES.MY_SETTINGS]: 'account',
	[SETTINGS_ROUTES.ALL_CHANNELS]: 'notification-channels',
	[SETTINGS_ROUTES.BILLING]: 'billing',
	[SETTINGS_ROUTES.INTEGRATIONS]: 'integrations',
	[SETTINGS_ROUTES.MCP_SERVER]: 'mcp-server',
	[SETTINGS_ROUTES.ROLES]: 'roles',
	[SETTINGS_ROUTES.MEMBERS]: 'members',
	[SETTINGS_ROUTES.SERVICE_ACCOUNTS]: 'service-accounts',
	[SETTINGS_ROUTES.INGESTION]: 'ingestion',
	[SETTINGS_ROUTES.ORG_SETTINGS]: 'sso',
	[SETTINGS_ROUTES.SHORTCUTS]: 'keyboard-shortcuts',
};

export async function gotoSettings(page: Page): Promise<void> {
	await page.goto(SETTINGS_ROUTES.WORKSPACE);
	await expect(page.getByTestId('settings-page-title')).toBeVisible();
}

export async function openSettingsTab(
	page: Page,
	route: SettingsRoute,
): Promise<void> {
	const testid = NAV_TESTID[route];
	await page.getByTestId('settings-page-sidenav').getByTestId(testid).click();
	await expect(page).toHaveURL(new RegExp(route.replace(/\//g, '\\/')));
}

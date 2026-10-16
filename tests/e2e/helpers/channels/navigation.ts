import { expect, type Locator, type Page } from '@playwright/test';

export const CHANNELS_LIST_PATH = '/alerts?tab=Channels';
export const CHANNELS_NEW_PATH = '/alerts/channels/new';

/** Open the channels tab, optionally pre-filtered, and wait for the table. */
export async function gotoChannelList(
	page: Page,
	options: { search?: string; kind?: string } = {},
): Promise<void> {
	const url = new URL(CHANNELS_LIST_PATH, 'http://localhost');
	if (options.search) {
		url.searchParams.set('search', options.search);
	}
	if (options.kind) {
		url.searchParams.set('kind', options.kind);
	}

	await page.goto(`${url.pathname}${url.search}`);
	await expect(page.getByTestId('channels-search')).toBeVisible();
}

/** Rows currently rendered in the channels table body. */
export function channelRows(page: Page): Locator {
	return page.locator('tbody tr');
}

/** The row whose name cell reads `name`. */
export function channelRow(page: Page, name: string): Locator {
	return channelRows(page).filter({ hasText: name });
}

/** Open a row's Actions menu and wait for it to render. */
export async function openChannelRowMenu(
	page: Page,
	name: string,
): Promise<void> {
	await page.getByRole('button', { name: `Actions for ${name}` }).click();
	await expect(page.getByRole('menu')).toBeVisible();
}

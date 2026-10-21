/**
 * AI-owned. Generated and maintained by coding agents alongside the specs that
 * use it. Do not hand-edit: regenerate it with the spec that needs the change.
 */
import { expect, type Locator, type Page } from '@playwright/test';

import {
	createChannelViaApi,
	deleteChannelViaApi,
} from '../helpers/channels/api';

import { driver, kit, seeded } from './kit';

// Search and the type filter are both served by the API, so every assertion on
// the list is also a guard on the query the list sends.

export const PATH = {
	list: '/alerts?tab=Channels',
	new: '/alerts/channels/new',
	/** Matches any channel's edit route. */
	edit: /\/alerts\/channels\/edit\//,
} as const;

const CHANNELS_API = '/api/v2/notification_channels';

export interface Channels {
	list: ChannelList;
	form: ChannelForm;
}

interface ChannelList {
	goto(options?: { search?: string; kind?: string }): Promise<void>;
	search(): Locator;
	rows(): Locator;
	row(name: string): Locator;
	openRowMenu(name: string): Promise<void>;
	chooseMenuItem(name: string): Promise<void>;
	jsonDialog(): Locator;
	noResults(): Locator;
	deletePrompt(name: string): Locator;
	confirmDelete(): Promise<void>;
	clearSearch(): Promise<void>;
}

interface ChannelForm {
	gotoNew(): Promise<void>;
	name(): Locator;
	pickType(label: string): Promise<void>;
	fillField(testId: string, value: string): Promise<void>;
	/** Saves and returns the id the API assigned, so the test can clean up. */
	saveAndReturnId(): Promise<string>;
	save(): Promise<void>;
}

function channelsDriver(page: Page): Channels {
	const rows = (): Locator => page.locator('tbody tr');

	const list: ChannelList = {
		async goto({ search, kind } = {}) {
			const url = new URL(PATH.list, 'http://localhost');
			if (search) {
				url.searchParams.set('search', search);
			}
			if (kind) {
				url.searchParams.set('kind', kind);
			}

			await page.goto(`${url.pathname}${url.search}`);
			await expect(list.search()).toBeVisible();
		},
		search: () => page.getByTestId('channels-search'),
		rows,
		row: (name) => rows().filter({ hasText: name }),
		async openRowMenu(name) {
			await page.getByRole('button', { name: `Actions for ${name}` }).click();
			await expect(page.getByRole('menu')).toBeVisible();
		},
		async chooseMenuItem(name) {
			await page.getByRole('menuitem', { name }).click();
		},
		jsonDialog: () => page.getByTestId('channel-json-dialog'),
		noResults: () => page.getByText('No matching channels'),
		deletePrompt: (name) =>
			page.getByText(`Are you sure you want to delete the ${name} channel?`),
		async confirmDelete() {
			await Promise.all([
				page.waitForResponse(
					(r) => r.url().includes(CHANNELS_API) && r.request().method() === 'DELETE',
				),
				page.getByRole('button', { name: 'Delete', exact: true }).click(),
			]);
		},
		async clearSearch() {
			await page.getByRole('button', { name: 'Clear Search' }).click();
			await expect(list.search()).toHaveValue('');
		},
	};

	const form: ChannelForm = {
		async gotoNew() {
			await page.goto(PATH.new);
			await expect(form.name()).toBeVisible();
		},
		name: () => page.getByTestId('channel-name-textbox'),
		async pickType(label) {
			await page.getByTestId('channel-type-select').click();
			await page.getByRole('option', { name: label, exact: true }).click();
		},
		async fillField(testId, value) {
			await page.getByTestId(testId).fill(value);
		},
		async saveAndReturnId() {
			const [response] = await Promise.all([
				page.waitForResponse(
					(r) => r.url().includes(CHANNELS_API) && r.request().method() === 'POST',
				),
				page.getByTestId('save-channel-button').click(),
			]);
			return ((await response.json()) as { data: { id: string } }).data.id;
		},
		async save() {
			await page.getByTestId('save-channel-button').click();
		},
	};

	return { list, form };
}

const withChannels = driver('channels', ({ page }) => channelsDriver(page));

// One slack and one email channel sharing a prefix, so a search can hold both
// and the type filter has something to tell apart.
const withChannelSet = seeded(
	'channelSet',
	async ({ page, workerIndex }) => {
		const prefix = `e2e-nc-${workerIndex}-${Date.now()}`;
		const slack = await createChannelViaApi(page, `${prefix}-slack`);
		const email = await createChannelViaApi(page, `${prefix}-email`, 'email', {
			to: 'e2e@signoz.test',
		});
		return { prefix, slack, email };
	},
	async ({ page, value }) => {
		await deleteChannelViaApi(page, value.slack.id);
		await deleteChannelViaApi(page, value.email.id);
	},
);

export const test = withChannelSet(withChannels(kit));

export { expect, onAdminPage } from './kit';

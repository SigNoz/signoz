/**
 * AI-owned. Generated and maintained by coding agents alongside the specs that
 * use it. Do not hand-edit: regenerate it with the spec that needs the change.
 */
import { expect, type Locator, type Page } from '@playwright/test';

import { authToken } from '../helpers/common';

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

/**
 * One entry per channel type the form offers. `fields` carries only what the
 * validator refuses to save without, and `spec` is the same channel as the API
 * takes it, for specs that seed rather than type.
 */
export const CHANNEL_TYPES: ChannelType[] = [
	{
		label: 'Slack',
		kind: 'slack',
		fields: [['webhook-url-textbox', 'https://hooks.slack.com/services/T/B/X']],
		edit: ['webhook-url-textbox', 'https://hooks.slack.com/services/T/B/edited'],
		spec: { apiUrl: 'https://hooks.slack.com/services/T/B/X' },
	},
	{
		label: 'Webhook',
		kind: 'webhook',
		fields: [['webhook-url-textbox', 'https://example.test/e2e-hook']],
		edit: ['webhook-url-textbox', 'https://example.test/e2e-hook-edited'],
		spec: { url: 'https://example.test/e2e-hook' },
	},
	{
		label: 'Pagerduty',
		kind: 'pagerduty',
		fields: [['pager-routing-key-textbox', 'e2e-routing-key']],
		edit: ['pager-routing-key-textbox', 'e2e-routing-key-edited'],
		spec: { routingKey: 'e2e-routing-key' },
	},
	{
		label: 'Opsgenie',
		kind: 'opsgenie',
		fields: [['opsgenie-api-key-textbox', 'e2e-api-key']],
		edit: ['opsgenie-api-key-textbox', 'e2e-api-key-edited'],
		spec: { apiKey: 'e2e-api-key' },
	},
	{
		label: 'Email',
		kind: 'email',
		fields: [['email-to-textbox', 'e2e@signoz.test']],
		edit: ['email-to-textbox', 'edited@signoz.test'],
		spec: { to: 'e2e@signoz.test' },
	},
	{
		label: 'Microsoft Teams',
		kind: 'msteams',
		fields: [
			['webhook-url-textbox', 'https://outlook.office.com/webhook/e2e-teams'],
		],
		edit: [
			'webhook-url-textbox',
			'https://outlook.office.com/webhook/e2e-teams-edited',
		],
		spec: { webhookUrl: 'https://outlook.office.com/webhook/e2e-teams' },
	},
	{
		label: 'Google Chat',
		kind: 'googlechat',
		// the validator accepts https on chat.googleapis.com and nothing else
		fields: [
			[
				'webhook-url-textbox',
				'https://chat.googleapis.com/v1/spaces/AAA/messages?key=k&token=t',
			],
		],
		edit: [
			'webhook-url-textbox',
			'https://chat.googleapis.com/v1/spaces/AAA/messages?key=k&token=edited',
		],
		spec: {
			webhookUrl:
				'https://chat.googleapis.com/v1/spaces/AAA/messages?key=k&token=t',
		},
	},
	{
		label: 'Jira',
		kind: 'jira',
		// the site has to be an https atlassian.net host
		fields: [
			['jira-site-textbox', 'https://e2e.atlassian.net'],
			['jira-email-textbox', 'e2e@signoz.test'],
			['jira-api-token-textbox', 'e2e-api-token'],
			['jira-project-textbox', 'E2E'],
			['jira-issue-type-textbox', 'Task'],
		],
		edit: ['jira-project-textbox', 'E2EEDIT'],
		spec: {
			site: 'https://e2e.atlassian.net',
			email: 'e2e@signoz.test',
			apiToken: 'e2e-api-token',
			project: 'E2E',
			issueType: 'Task',
		},
	},
	{
		label: 'Jira Service Management Ops',
		kind: 'jsmops',
		fields: [['jsmops-api-key-textbox', 'e2e-api-key']],
		edit: ['jsmops-api-key-textbox', 'e2e-api-key-edited'],
		spec: { apiKey: 'e2e-api-key' },
	},
	{
		label: 'incident.io',
		kind: 'incidentio',
		// the path has to carry an id after /v2/alert_events/http/
		fields: [
			[
				'incidentio-url-textbox',
				'https://api.incident.io/v2/alert_events/http/e2e-source',
			],
			['incidentio-token-textbox', 'e2e-token'],
		],
		edit: ['incidentio-token-textbox', 'e2e-token-edited'],
		spec: {
			url: 'https://api.incident.io/v2/alert_events/http/e2e-source',
			token: 'e2e-token',
		},
	},
	{
		label: 'Telegram',
		kind: 'telegram',
		// the API rejects a chat id of 0, so this one is deliberately non-zero
		fields: [
			['telegram-bot-token-textbox', '123456:e2e-bot-token'],
			['telegram-chat-id-textbox', '-1001234567890'],
		],
		edit: ['telegram-bot-token-textbox', '123456:e2e-bot-token-edited'],
		spec: { botToken: '123456:e2e-bot-token', chatId: -1001234567890 },
	},
];

export interface SeededChannel {
	id: string;
	name: string;
}

/** Everything a channel spec needs: the form labels, and the API equivalent. */
export interface ChannelType {
	label: string;
	kind: string;
	/** Only what the form refuses to save without, in the order it is filled. */
	fields: [string, string][];
	/**
	 * The field an edit pass changes, and the value to change it to. Spelled out
	 * per type rather than derived: appending to a Jira site or a Google Chat
	 * webhook breaks the format its validator demands, and the save then never
	 * leaves the page.
	 */
	edit: [string, string];
	spec: Record<string, unknown>;
}

export interface Channels {
	list: ChannelList;
	form: ChannelForm;
	api: ChannelApi;
}

interface ChannelApi {
	create(
		name: string,
		kind?: string,
		spec?: Record<string, unknown>,
	): Promise<SeededChannel>;
	remove(id: string | undefined): Promise<void>;
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
	/** Saves an existing channel and waits for the write to land. */
	saveEdit(): Promise<void>;
	save(): Promise<void>;
}

/**
 * Seeds a channel through the v2 API. The spec only has to be valid enough for
 * the API to store it: nothing is ever delivered.
 */
async function createViaApi(
	page: Page,
	name: string,
	kind = 'slack',
	spec: Record<string, unknown> = {
		apiUrl: 'https://hooks.slack.com/services/T/B/X',
		channel: '#e2e',
	},
): Promise<SeededChannel> {
	const token = await authToken(page);
	const res = await page.request.post(CHANNELS_API, {
		data: { generateName: true, displayName: name, config: { kind, spec } },
		headers: { Authorization: `Bearer ${token}` },
	});
	if (!res.ok()) {
		throw new Error(`POST ${CHANNELS_API} ${res.status()}: ${await res.text()}`);
	}
	const json = (await res.json()) as { data: { id: string } };
	return { id: String(json.data.id), name };
}

/**
 * Tolerates an empty id and an already-deleted channel, so a cleanup block
 * never has to branch on whether the seed got that far.
 */
async function removeViaApi(page: Page, id: string | undefined): Promise<void> {
	if (!id) {
		return;
	}

	// A test that already failed often leaves a closed page behind, and a throw
	// here would replace its error with one about the cleanup.
	try {
		const token = await authToken(page);
		await page.request.delete(`${CHANNELS_API}/${id}`, {
			headers: { Authorization: `Bearer ${token}` },
		});
	} catch {
		/* the channel outlives the run rather than hiding why it failed */
	}
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
		async saveEdit() {
			await Promise.all([
				page.waitForResponse(
					(r) => r.url().includes(CHANNELS_API) && r.request().method() === 'PUT',
				),
				page.getByTestId('save-channel-button').click(),
			]);
		},
		async save() {
			await page.getByTestId('save-channel-button').click();
		},
	};

	const api: ChannelApi = {
		create: (name, kind, spec) => createViaApi(page, name, kind, spec),
		remove: (id) => removeViaApi(page, id),
	};

	return { list, form, api };
}

const withChannels = driver('channels', ({ page }) => channelsDriver(page));

// One slack and one email channel sharing a prefix, so a search can hold both
// and the type filter has something to tell apart.
const withChannelSet = seeded(
	'channelSet',
	async ({ page, workerIndex }) => {
		const prefix = `e2e-nc-${workerIndex}-${Date.now()}`;
		const slack = await createViaApi(page, `${prefix}-slack`);
		const email = await createViaApi(page, `${prefix}-email`, 'email', {
			to: 'e2e@signoz.test',
		});
		return { prefix, slack, email };
	},
	async ({ page, value }) => {
		await removeViaApi(page, value.slack.id);
		await removeViaApi(page, value.email.id);
	},
);

export const test = withChannelSet(withChannels(kit));

export { expect, onAdminPage } from './kit';

import type { Page } from '@playwright/test';

import { authToken } from '../common';

// The v2 channel API. `helpers/alerts/api.ts` still posts to v1 for the older
// alert specs, so the two sets of channel helpers are not interchangeable.

const CHANNELS_PATH = '/api/v2/notification_channels';

export interface SeededChannel {
	id: string;
	name: string;
}

/**
 * Seed a channel of `kind` through the v2 API. The spec only has to be valid
 * enough for the API to store it — nothing is ever delivered.
 */
export async function createChannelViaApi(
	page: Page,
	name: string,
	kind = 'slack',
	spec: Record<string, unknown> = {
		apiUrl: 'https://hooks.slack.com/services/T/B/X',
		channel: '#e2e',
	},
): Promise<SeededChannel> {
	const token = await authToken(page);
	const res = await page.request.post(CHANNELS_PATH, {
		data: { generateName: true, displayName: name, config: { kind, spec } },
		headers: { Authorization: `Bearer ${token}` },
	});
	if (!res.ok()) {
		throw new Error(`POST ${CHANNELS_PATH} ${res.status()}: ${await res.text()}`);
	}
	const json = (await res.json()) as { data: { id: string } };
	return { id: String(json.data.id), name };
}

/**
 * Delete a channel by id. Tolerates an empty id and an already-deleted channel,
 * so a cleanup block never has to branch on whether the seed got that far.
 */
export async function deleteChannelViaApi(
	page: Page,
	id: string | undefined,
): Promise<void> {
	if (!id) {
		return;
	}

	const token = await authToken(page);
	await page.request.delete(`${CHANNELS_PATH}/${id}`, {
		headers: { Authorization: `Bearer ${token}` },
	});
}

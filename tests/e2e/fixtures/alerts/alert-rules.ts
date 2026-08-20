import type { Browser, Page } from '@playwright/test';

import {
	type AlertSchema,
	createEmailChannelViaApi,
	createLogsAlertViaApi,
	createThresholdAlertViaApi,
	deleteAlertViaApi,
	deleteChannelViaApi,
	type LogsAlertSeed,
	seedAlertRules,
	type ThresholdAlertSeed,
} from '../helpers/alerts';
import { newAdminContext } from '../helpers/auth';
import { expect, test as base } from './auth';

// Alert *rule* fixtures — the API-only half of the alerts suite. Nothing here
// waits on the ruler: a rule is created and that's it. History rows need real
// evaluations, so those fixtures live in `alert-history.ts`, which
// extends this module — a spec importing from there gets both sets.
//
// Scopes, and why:
//   `alertChannel` — worker. Every rule payload has to reference a channel by
//     name, and one channel serves the whole worker.
//   `alertList`    — worker. SEED-B, the read-only rule list the `tests/alerts/
//     list` specs page, search and sort through. Names and label values are
//     stamped per worker so parallel batches never count each other's rules.
//   `ownedRules`   — test. Scenarios that rename/toggle/clone/delete a rule seed
//     their own and have it removed when they finish; mutating a shared seed
//     would break every scenario scheduled after it.

export interface AlertChannel {
	id: string;
	name: string;
}

export interface AlertListSeed {
	channelName: string;
	/** Rules are named `<namePrefix>-NN` — unique to this worker's batch. */
	namePrefix: string;
	/** Rules seeded ⇒ the `of N` total once the list is scoped to the prefix. */
	count: number;
	/** `team` label on the odd-indexed half of the batch, i.e. `count / 2` rules. */
	paymentsLabel: string;
	ruleIds: string[];
}

export interface OwnedRules {
	/** Seed a metric threshold rule this test owns. */
	threshold(
		name: string,
		overrides?: Partial<Omit<ThresholdAlertSeed, 'name'>>,
	): Promise<string>;
	/**
	 * Seed a logs rule this test owns. No telemetry is seeded for its marker, so
	 * it never fires — enough for anything about the details shell.
	 *
	 * `schema: 'v1'` posts the legacy payload and is SEED-RV1; the condition
	 * overrides exist so a v1 *prefill* assertion can be made against values the
	 * create form would not have produced by itself.
	 */
	logs(
		options: {
			name: string;
			schema?: AlertSchema;
			marker?: string;
		} & Partial<
			Pick<
				LogsAlertSeed,
				'severity' | 'extraLabels' | 'evalWindow' | 'target' | 'op' | 'matchType'
			>
		>,
	): Promise<string>;
	/**
	 * Track a rule the *app* created (Clone / Duplicate) so teardown removes it
	 * too. Lives here because the id may legitimately be missing and a
	 * conditional inside a test body is a lint error.
	 */
	register(response: { json: () => Promise<unknown> }): Promise<void>;
}

/** SEED-B size. 12 over a pinned page size of 10 ⇒ a short second page. */
const LIST_SEED_COUNT = 12;

/**
 * Run `body` on a throwaway admin page. Worker hooks can't use the test-scoped
 * `authedPage`, and every API helper needs a page whose context carries the
 * admin storage state.
 */
export async function withAdminPage<T>(
	browser: Browser,
	body: (page: Page) => Promise<T>,
): Promise<T> {
	const ctx = await newAdminContext(browser);
	const page = await ctx.newPage();
	try {
		return await body(page);
	} finally {
		await ctx.close();
	}
}

async function deleteRules(browser: Browser, ids: string[]): Promise<void> {
	if (ids.length === 0) {
		return;
	}
	await withAdminPage(browser, async (page) => {
		for (const id of ids) {
			// eslint-disable-next-line no-await-in-loop
			await deleteAlertViaApi(page, id);
		}
	});
}

export const test = base.extend<
	{ ownedRules: OwnedRules },
	{ alertChannel: AlertChannel; alertList: AlertListSeed }
>({
	alertChannel: [
		async ({ browser }, use, workerInfo) => {
			const channel = await withAdminPage(browser, (page) =>
				createEmailChannelViaApi(
					page,
					`e2e-alerts-ch-w${workerInfo.workerIndex}-${Date.now()}`,
				),
			);

			await use(channel);

			await withAdminPage(browser, (page) =>
				deleteChannelViaApi(page, channel.id),
			);
		},
		{ scope: 'worker' },
	],

	alertList: [
		async ({ browser, alertChannel }, use, workerInfo) => {
			const stamp = `w${workerInfo.workerIndex}-${Date.now()}`;
			const namePrefix = `e2e-alert-list-${stamp}`;
			const teamSuffix = `-${stamp}`;

			const ruleIds = await withAdminPage(browser, (page) =>
				seedAlertRules(page, {
					count: LIST_SEED_COUNT,
					channelName: alertChannel.name,
					namePrefix,
					teamSuffix,
				}),
			);

			await use({
				channelName: alertChannel.name,
				namePrefix,
				count: LIST_SEED_COUNT,
				paymentsLabel: `payments${teamSuffix}`,
				ruleIds,
			});

			await deleteRules(browser, ruleIds);
		},
		{ scope: 'worker', timeout: 120_000 },
	],

	ownedRules: async ({ browser, alertChannel }, use) => {
		const ids = new Set<string>();

		const seed = async (
			create: (page: Page) => Promise<string>,
		): Promise<string> => {
			const id = await withAdminPage(browser, create);
			ids.add(id);
			return id;
		};

		await use({
			threshold: (name, overrides = {}) =>
				seed((page) =>
					createThresholdAlertViaApi(page, {
						name,
						target: 42,
						channels: [alertChannel.name],
						labels: { severity: 'critical' },
						...overrides,
					}),
				),

			logs: ({ name, schema = 'v2', marker, ...overrides }) =>
				seed((page) =>
					createLogsAlertViaApi(page, {
						name,
						marker: marker ?? `e2e alert never seeded ${name}`,
						channels: [alertChannel.name],
						schema,
						...overrides,
					}),
				),

			register: async (response) => {
				const body = (await response.json()) as { data?: { id?: string } };
				const id = body.data?.id;
				if (id) {
					ids.add(String(id));
				}
			},
		});

		// Best-effort: `deleteAlertViaApi` tolerates a rule a scenario already
		// deleted through the UI.
		await deleteRules(browser, [...ids]);
	},
});

export { expect };

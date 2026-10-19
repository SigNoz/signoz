import {
	expect,
	type Locator,
	type Page,
	type Request,
	type Route,
} from '@playwright/test';

import { antdDriver } from './antd';
import { apiDriver } from './api';
import { ADMIN } from './auth';
import { driver, kit, type Layer } from './kit';

/**
 * Org onboarding: the four-step questionnaire at `/onboarding` and the
 * data-source wizard at `/get-started-with-signoz-cloud`.
 *
 * The redirect to `/onboarding` needs `org_onboarding` unset and exactly one
 * user in the org. Bootstrap sets the preference org-wide and other specs add
 * users, so both are faked per context with `page.route` and the real org is
 * never written. Invites in the questionnaire are the exception: they go to the
 * real API and the spec removes them.
 */

export const ONBOARDING_PATH = '/onboarding';
export const GET_STARTED_PATH = '/get-started-with-signoz-cloud';

const ORG_ONBOARDING = 'org_onboarding';

export type ObservabilityTool =
	| 'AWS Cloudwatch'
	| 'DataDog'
	| 'New Relic'
	| 'Grafana / Prometheus'
	| 'None/Starting fresh';

export type MigrationTimeline =
	| 'Less than a month'
	| '1-3 months'
	| 'Greater than 3 months'
	| 'Just exploring';

export interface OrgAnswers {
	tool: ObservabilityTool;
	timeline?: MigrationTimeline;
	usesOtel: boolean;
}

export interface SignozAnswers {
	discovery: string;
	interests: string[];
}

export interface FirstRunOptions {
	/** `several` returns the admin plus a second member, which suppresses the redirect. */
	users?: 'single' | 'several';
	/** How `PUT /api/v2/zeus/profiles` answers. */
	profiles?: 'ok' | 'error';
	/**
	 * Hold the profiles response until {@link FirstRun.releaseProfiles}, to see
	 * the step-3 buttons while the request is in flight.
	 */
	holdProfiles?: boolean;
}

export interface FirstRun {
	/** Bodies the app sent to `PUT /api/v2/zeus/profiles`. */
	profileBodies: unknown[];
	/** Bodies the app sent to `PUT /api/v1/org/preferences/org_onboarding`. */
	onboardingWrites: unknown[];
	releaseProfiles(): void;
}

export interface InvitedUser {
	id: string;
	email: string;
	status?: string;
}

export interface Onboarding {
	/**
	 * Make this context look like a fresh cloud org: `org_onboarding` reads
	 * false until the app writes it, and the users list holds only the admin.
	 */
	stubFirstRun(options?: FirstRunOptions): Promise<FirstRun>;
	/** Navigate to `path` and wait for the app to settle on a route. */
	visit(path: string): Promise<void>;
	expectPath(path: string): Promise<void>;
	pathname(): string;
	/**
	 * Wait for the network to go quiet. The redirect decision waits on the users
	 * and preferences queries, so a page can paint before it is redirected.
	 */
	settle(): Promise<void>;

	questionnaire: {
		root(): Locator;
		heading(name: string): Locator;
		next(): Locator;
		doLater(): Locator;
		/** Assert `button` is disabled and its hover tooltip reads `reason`. */
		expectDisabledBecause(button: Locator, reason: string): Promise<void>;
		pickTool(tool: ObservabilityTool): Promise<void>;
		pickTimeline(timeline: MigrationTimeline): Promise<void>;
		pickOtel(uses: boolean): Promise<void>;
		answerOrg(answers: OrgAnswers): Promise<void>;
		discovery(): Locator;
		interest(label: string): Locator;
		answerSignoz(answers: SignozAnswers): Promise<void>;
		/** Drag the Logs / Day slider to its maximum. */
		maxLogsSlider(): Promise<void>;
		invite(rows: { email: string; role: string }[]): Promise<void>;
		sendInvites(): Locator;
	};

	wizard: {
		root(): Locator;
		search(text: string): Promise<void>;
		source(label: string): Locator;
		option(label: string): Locator;
		configure(): Locator;
		docsFrame(): Locator;
		back(): Locator;
		continue(): Locator;
		inviteButton(): Locator;
		inviteModal(): Locator;
		invite(rows: { email: string; role: string }[]): Promise<void>;
		noResults(): Locator;
	};

	homePage(): Locator;
	servicesPage(): Locator;
	toast(text: string | RegExp): Locator;

	users: {
		byEmail(email: string): Promise<InvitedUser | undefined>;
		remove(email: string): Promise<void>;
	};
}

interface OrgPreferenceRow {
	name: string;
	value: unknown;
}

interface UserRow {
	id: string;
	email: string;
	status?: string;
}

const exactText = (text: string): RegExp =>
	new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);

const pathIs =
	(path: string) =>
	(url: URL): boolean =>
		url.pathname === path;

async function fulfillWith<T>(
	route: Route,
	edit: (body: { data: T }) => void,
): Promise<void> {
	const response = await route.fetch();
	const body = (await response.json()) as { data: T };
	edit(body);
	await route.fulfill({ response, json: body });
}

async function stubFirstRun(
	page: Page,
	{ users = 'single', profiles = 'ok', holdProfiles = false }: FirstRunOptions,
): Promise<FirstRun> {
	let completed = false;
	let release: () => void = () => undefined;
	const released = holdProfiles
		? new Promise<void>((resolve) => {
				release = resolve;
			})
		: Promise.resolve();
	const run: FirstRun = {
		profileBodies: [],
		onboardingWrites: [],
		releaseProfiles: () => release(),
	};
	const isGet = (request: Request): boolean => request.method() === 'GET';

	await page.route(pathIs('/api/v1/org/preferences'), async (route) => {
		if (!isGet(route.request())) {
			await route.fallback();
			return;
		}
		await fulfillWith<OrgPreferenceRow[]>(route, (body) => {
			const rows = body.data ?? [];
			const row = rows.find((entry) => entry.name === ORG_ONBOARDING);
			if (row) {
				row.value = completed;
			} else {
				rows.push({ name: ORG_ONBOARDING, value: completed });
			}
			body.data = rows;
		});
	});

	await page.route(
		pathIs(`/api/v1/org/preferences/${ORG_ONBOARDING}`),
		async (route) => {
			if (route.request().method() !== 'PUT') {
				await route.fallback();
				return;
			}
			run.onboardingWrites.push(route.request().postDataJSON());
			completed = true;
			await route.fulfill({ json: { status: 'success', data: null } });
		},
	);

	await page.route(pathIs('/api/v2/users'), async (route) => {
		if (!isGet(route.request())) {
			await route.fallback();
			return;
		}
		await fulfillWith<UserRow[]>(route, (body) => {
			const admin = (body.data ?? []).filter((row) => row.email === ADMIN.email);
			body.data =
				users === 'single'
					? admin
					: [
							...admin,
							...admin.map((row) => ({
								...row,
								id: `${row.id}-colleague`,
								email: 'e2e-colleague@signoz.test',
							})),
						];
		});
	});

	await page.route(pathIs('/api/v2/zeus/profiles'), async (route) => {
		run.profileBodies.push(route.request().postDataJSON());
		await released;
		if (profiles === 'ok') {
			await route.fulfill({ status: 204 });
		} else {
			await route.fulfill({ status: 500, json: { status: 'error' } });
		}
	});

	return run;
}

export function onboardingDriver(page: Page): Onboarding {
	const antd = antdDriver(page);
	const api = apiDriver(page);
	const questionnaireRoot = (): Locator =>
		page.locator('.onboarding-questionaire-container');
	const wizardRoot = (): Locator => page.locator('.onboarding-v2');

	const fillInviteRows = async (
		scope: Locator,
		rows: { email: string; role: string }[],
	): Promise<void> => {
		for (const [index, { email, role }] of rows.entries()) {
			const emails = scope.locator('[data-testid^="invite-email-"]');
			if (index >= (await emails.count())) {
				await scope.getByTestId('invite-add-row').click();
			}
			await emails.nth(index).fill(email);
			const select = scope
				.locator('.ant-select')
				.filter({ has: page.locator('input[id^="invite-role-"]') })
				.nth(index);
			await antd.pickByName(select, role);
		}
	};

	const onboarding: Onboarding = {
		stubFirstRun: (options = {}) => stubFirstRun(page, options),

		visit: async (path) => {
			// The wizard frames the public docs site; keep the run off the network.
			await page.route('https://signoz.io/**', (route) =>
				route.fulfill({ contentType: 'text/html', body: '<html></html>' }),
			);
			await page.goto(path);
		},

		expectPath: async (path) => {
			await expect(page).toHaveURL((url) => url.pathname === path);
		},

		pathname: () => new URL(page.url()).pathname,

		settle: async () => {
			await page.waitForLoadState('networkidle');
		},

		questionnaire: {
			root: questionnaireRoot,
			heading: (name) =>
				questionnaireRoot().getByRole('heading', { name, exact: true }),
			next: () =>
				questionnaireRoot().getByRole('button', { name: 'Next', exact: true }),
			doLater: () =>
				questionnaireRoot().getByRole('button', { name: "I'll do this later" }),

			expectDisabledBecause: async (button, reason) => {
				await expect(button).toHaveAttribute('aria-disabled', 'true');
				await button.hover();
				await expect(page.getByRole('tooltip')).toHaveText(reason);
				await page.mouse.move(0, 0);
				await expect(page.getByRole('tooltip')).toHaveCount(0);
			},

			pickTool: async (tool) => {
				await questionnaireRoot()
					.getByRole('radio', { name: tool, exact: true })
					.click();
			},
			pickTimeline: async (timeline) => {
				await questionnaireRoot()
					.getByRole('radio', { name: timeline, exact: true })
					.click();
			},
			pickOtel: async (uses) => {
				await questionnaireRoot()
					.getByRole('radio', { name: uses ? 'Yes' : 'No', exact: true })
					.click();
			},

			answerOrg: async ({ tool, timeline, usesOtel }) => {
				await onboarding.questionnaire.pickTool(tool);
				if (timeline) {
					await onboarding.questionnaire.pickTimeline(timeline);
				}
				await onboarding.questionnaire.pickOtel(usesOtel);
			},

			discovery: () =>
				questionnaireRoot().getByPlaceholder(/^e\.g\., I asked ChatGPT/),
			interest: (label) =>
				questionnaireRoot().getByRole('checkbox', { name: label, exact: true }),

			answerSignoz: async ({ discovery, interests }) => {
				await onboarding.questionnaire.discovery().fill(discovery);
				for (const label of interests) {
					await onboarding.questionnaire.interest(label).click();
				}
			},

			maxLogsSlider: async () => {
				const slider = questionnaireRoot().getByRole('slider').first();
				await slider.focus();
				await slider.press('End');
				await expect(slider).toHaveAttribute('aria-valuenow', '100');
			},

			invite: (rows) => fillInviteRows(questionnaireRoot(), rows),
			sendInvites: () => page.getByTestId('send-invites-button'),
		},

		wizard: {
			root: wizardRoot,
			search: async (text) => {
				await wizardRoot().getByPlaceholder('Search', { exact: true }).fill(text);
			},
			// The logo's alt repeats the label, so the accessible name is doubled.
			source: (label) =>
				wizardRoot()
					.locator('.onboarding-data-source-list .onboarding-data-source-button')
					.filter({ hasText: exactText(label) }),
			option: (label) =>
				wizardRoot()
					.locator('.onboarding-data-source-options .onboarding-data-source-button')
					.filter({ hasText: exactText(label) }),
			configure: () =>
				wizardRoot().getByRole('button', { name: 'Next: Configure your product' }),
			docsFrame: () => wizardRoot().locator('iframe[title="docs"]'),
			back: () => wizardRoot().getByRole('button', { name: 'Back', exact: true }),
			continue: () =>
				wizardRoot().getByRole('button', { name: 'Continue', exact: true }),
			inviteButton: () =>
				wizardRoot().getByRole('button', { name: 'Invite a teammate' }),
			inviteModal: () => page.locator('.invite-team-member-modal'),
			invite: async (rows) => {
				const modal = onboarding.wizard.inviteModal();
				await fillInviteRows(modal, rows);
				await modal.getByRole('button', { name: 'Send Invites' }).click();
			},
			noResults: () => wizardRoot().locator('.no-results-found-container'),
		},

		homePage: () => page.locator('.home-container'),
		servicesPage: () => page.getByRole('columnheader', { name: 'Application' }),
		toast: (text) =>
			page.locator('[data-sonner-toast]').filter({ hasText: text }),

		users: {
			byEmail: async (email) => {
				const body = await api.get<{ data: UserRow[] | null }>('/api/v2/users');
				return (body.data ?? []).find((row) => row.email === email);
			},
			remove: async (email) => {
				const match = await onboarding.users.byEmail(email);
				if (match) {
					await api.tryDel(`/api/v2/users/${match.id}`);
				}
			},
		},
	};

	return onboarding;
}

export const withOnboarding: Layer<{ onboarding: Onboarding }> = driver(
	'onboarding',
	({ page }) => onboardingDriver(page),
);

export const test = withOnboarding(kit);
export { expect } from './kit';

import { expect, type Locator, type Page } from '@playwright/test';

import { authToken } from './common';

// ─── Constants ───────────────────────────────────────────────────────────

export const ORG_SETTINGS_PATH = '/settings/org-settings';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface GoogleAuthDomainSeed {
	/** Domain name (e.g. `sso-edit.example.com`). Keep unique per test. */
	name: string;
	/** Enforce-SSO flag. Defaults to false. */
	enabled?: boolean;
	clientId?: string;
	clientSecret?: string;
	/**
	 * Enables Google Workspace group fetching. The backend then requires
	 * `serviceAccountJson` and `domainToAdminEmail`, and only with it may
	 * `allowedGroups` be set.
	 */
	fetchGroups?: boolean;
	serviceAccountJson?: string;
	domainToAdminEmail?: Record<string, string>;
	allowedGroups?: string[];
	roleMapping?: {
		defaultRole?: string;
		groupMappings?: Record<string, string>;
		useRoleAttribute?: boolean;
	};
}

// ─── API helpers ─────────────────────────────────────────────────────────

/**
 * Seed a Google auth domain via POST /api/v2/auth_domains. Returns the new
 * domain ID. Pair with {@link deleteAuthDomainByNameViaApi} for cleanup.
 */
export async function createGoogleAuthDomainViaApi(
	page: Page,
	seed: GoogleAuthDomainSeed,
): Promise<string> {
	const token = await authToken(page);

	const spec: Record<string, unknown> = {
		clientId: seed.clientId ?? 'e2e-client-id.apps.googleusercontent.com',
		clientSecret: seed.clientSecret ?? 'e2e-client-secret',
		fetchGroups: seed.fetchGroups ?? false,
		insecureSkipEmailVerified: false,
	};
	if (seed.serviceAccountJson) {
		spec.serviceAccountJson = seed.serviceAccountJson;
	}
	if (seed.domainToAdminEmail) {
		spec.domainToAdminEmail = seed.domainToAdminEmail;
	}
	if (seed.allowedGroups) {
		spec.allowedGroups = seed.allowedGroups;
	}

	const res = await page.request.post('/api/v2/auth_domains', {
		data: {
			name: seed.name,
			enabled: seed.enabled ?? false,
			config: { kind: 'google', spec },
			roleMapping: seed.roleMapping,
		},
		headers: { Authorization: `Bearer ${token}` },
	});
	if (!res.ok()) {
		throw new Error(
			`POST /api/v2/auth_domains ${res.status()}: ${await res.text()}`,
		);
	}
	const json = (await res.json()) as { data: { id: string } };
	return json.data.id;
}

/** Names of every auth domain in the org, across all list pages. */
export async function listAuthDomainNamesViaApi(page: Page): Promise<string[]> {
	const token = await authToken(page);
	const res = await page.request.get('/api/v2/auth_domains', {
		headers: { Authorization: `Bearer ${token}` },
	});
	if (!res.ok()) {
		throw new Error(
			`GET /api/v2/auth_domains ${res.status()}: ${await res.text()}`,
		);
	}
	const json = (await res.json()) as {
		data: Array<{ name: string }> | null;
	};
	return (json.data ?? []).map((domain) => domain.name);
}

/** Delete an auth domain by ID (best-effort cleanup). */
export async function deleteAuthDomainViaApi(
	page: Page,
	id: string,
): Promise<void> {
	const token = await authToken(page);
	await page.request.delete(`/api/v2/auth_domains/${id}`, {
		headers: { Authorization: `Bearer ${token}` },
	});
}

/**
 * Delete any auth domain named `name`; a no-op when absent. Doubles as the
 * leftover guard before seeding (domain names are unique per org, so a
 * crashed earlier run would otherwise make the seed conflict).
 */
export async function deleteAuthDomainByNameViaApi(
	page: Page,
	name: string,
): Promise<void> {
	const token = await authToken(page);
	const res = await page.request.get('/api/v2/auth_domains', {
		headers: { Authorization: `Bearer ${token}` },
	});
	if (!res.ok()) {
		throw new Error(
			`GET /api/v2/auth_domains ${res.status()}: ${await res.text()}`,
		);
	}
	const json = (await res.json()) as {
		data: Array<{ id: string; name: string }> | null;
	};
	const match = (json.data ?? []).find((domain) => domain.name === name);
	if (match) {
		await deleteAuthDomainViaApi(page, match.id);
	}
}

// ─── Navigation ────────────────────────────────────────────────────────────

/** Open org settings and wait for the Authenticated Domains section. */
export async function gotoAuthDomains(page: Page): Promise<void> {
	await page.goto(ORG_SETTINGS_PATH);
	await expect(page.getByTestId('auth-domain-title')).toBeVisible();
}

/**
 * Locate the list row for `name`, advancing through the pager when needed. The
 * table paginates, and a shared stack holds domains this suite did not seed, so
 * a freshly created row is not necessarily on the page currently shown.
 */
export async function findAuthDomainRow(
	page: Page,
	name: string,
): Promise<Locator> {
	const row = page.getByTestId(`auth-domain-row-${name}`);
	const nextPage = page.locator('.auth-domain-list .ant-pagination-next');

	// Bounded: a pager that never reports itself disabled must not spin forever.
	for (let visited = 0; visited < 25; visited += 1) {
		try {
			await row.waitFor({ state: 'attached', timeout: 2_000 });
			return row;
		} catch {
			// Not on the page currently shown; fall through to the pager.
		}

		if (
			(await nextPage.count()) === 0 ||
			(await nextPage.getAttribute('aria-disabled')) === 'true' ||
			(await nextPage.evaluate((node) =>
				node.classList.contains('ant-pagination-disabled'),
			))
		) {
			break;
		}

		await nextPage.click();
	}

	throw new Error(`auth domain row not found in the list: ${name}`);
}

/** Open the Configure (edit) modal for the domain row named `name`. */
export async function openConfigureAuthDomain(
	page: Page,
	name: string,
): Promise<void> {
	const row = await findAuthDomainRow(page, name);
	await row.getByTestId('auth-domain-configure').click();
	await expect(page.getByTestId('auth-domain-form')).toBeVisible();
}

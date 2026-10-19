import { expect, type Locator, type Page } from '@playwright/test';

import { apiDriver } from './api';
import { driver, kit, type Layer } from './kit';

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
async function createGoogleAuthDomainViaApi(
	page: Page,
	seed: GoogleAuthDomainSeed,
): Promise<string> {
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

	return apiDriver(page).create('/api/v2/auth_domains', {
		name: seed.name,
		enabled: seed.enabled ?? false,
		config: { kind: 'google', spec },
		roleMapping: seed.roleMapping,
	});
}

/**
 * Delete any auth domain named `name`; a no-op when absent. Doubles as the
 * leftover guard before seeding (domain names are unique per org, so a
 * crashed earlier run would otherwise make the seed conflict).
 */
async function deleteAuthDomainByNameViaApi(
	page: Page,
	name: string,
): Promise<void> {
	const api = apiDriver(page);
	const body = await api.get<{ data: { id: string; name: string }[] | null }>(
		'/api/v2/auth_domains',
	);
	const match = (body.data ?? []).find((domain) => domain.name === name);
	if (match) {
		await api.tryDel(`/api/v2/auth_domains/${match.id}`);
	}
}

// ─── Navigation ────────────────────────────────────────────────────────────

/** Open org settings and wait for the Authenticated Domains section. */
async function gotoAuthDomains(page: Page): Promise<void> {
	await page.goto(ORG_SETTINGS_PATH);
	await expect(page.getByTestId('auth-domain-title')).toBeVisible();
}

/** Locate the list row for the domain named `name`. */
async function findAuthDomainRow(page: Page, name: string): Promise<Locator> {
	const row = page.getByTestId(`auth-domain-row-${name}`);
	await row.waitFor({ state: 'attached' });
	return row;
}

/** Open the Configure (edit) modal for the domain row named `name`. */
async function openConfigureAuthDomain(
	page: Page,
	name: string,
): Promise<void> {
	const row = await findAuthDomainRow(page, name);
	await row.getByTestId('auth-domain-configure').click();
	await expect(page.getByTestId('auth-domain-form')).toBeVisible();
}

// ─── The driver ──────────────────────────────────────────────────────────────

export interface SsoForm {
	root(): Locator;
	googleDomain(): Locator;
	googleClientId(): Locator;
	googleClientSecret(): Locator;
	save(): Locator;
}

export interface SsoRoleMapping {
	header(): Locator;
	rows(): Locator;
	groupName(index: number): Locator;
	remove(index: number): Locator;
}

export interface SsoWorkspaceGroups {
	header(): Locator;
	fetchGroups(): Locator;
	/** The chosen allowed groups, one per antd select item. */
	allowedGroups(): Locator;
}

export interface Sso {
	/** Seed a Google auth domain. Returns its id. */
	createGoogleDomain(seed: GoogleAuthDomainSeed): Promise<string>;
	/**
	 * Delete any auth domain named `name`; a no-op when absent. Doubles as the
	 * leftover guard before seeding, since domain names are unique per org and a
	 * crashed earlier run would otherwise make the seed conflict.
	 */
	deleteDomainByName(name: string): Promise<void>;
	goto(): Promise<void>;
	title(): Locator;
	addButton(): Locator;
	/** The provider card's Configure button in the add-domain modal. */
	configureProvider(provider: string): Locator;
	row(name: string): Locator;
	configureButton(name: string): Locator;
	enforceSsoToggle(name: string): Locator;
	deleteButton(name: string): Locator;
	deleteConfirmButton(): Locator;
	openConfigure(name: string): Promise<void>;
	form: SsoForm;
	roleMapping: SsoRoleMapping;
	workspaceGroups: SsoWorkspaceGroups;
	toast(text: string): Locator;
}

export function ssoDriver(page: Page): Sso {
	const row = (name: string): Locator =>
		page.getByTestId(`auth-domain-row-${name}`);
	const roleMappingRows = (): Locator => page.getByTestId('role-mapping-row');

	return {
		createGoogleDomain: (seed) => createGoogleAuthDomainViaApi(page, seed),
		deleteDomainByName: (name) => deleteAuthDomainByNameViaApi(page, name),
		goto: () => gotoAuthDomains(page),
		title: () => page.getByTestId('auth-domain-title'),
		addButton: () => page.getByTestId('auth-domain-add'),
		configureProvider: (provider) =>
			page.getByTestId(`authn-provider-configure-${provider}`),
		row,
		configureButton: (name) => row(name).getByTestId('auth-domain-configure'),
		enforceSsoToggle: (name) => row(name).getByTestId('auth-domain-enforce-sso'),
		deleteButton: (name) => row(name).getByTestId('auth-domain-delete'),
		deleteConfirmButton: () => page.getByTestId('auth-domain-delete-confirm'),
		openConfigure: (name) => openConfigureAuthDomain(page, name),
		form: {
			root: () => page.getByTestId('auth-domain-form'),
			googleDomain: () => page.getByTestId('google-auth-domain'),
			googleClientId: () => page.getByTestId('google-auth-client-id'),
			googleClientSecret: () => page.getByTestId('google-auth-client-secret'),
			save: () => page.getByTestId('auth-domain-save'),
		},
		roleMapping: {
			header: () => page.getByTestId('role-mapping-header'),
			rows: roleMappingRows,
			groupName: (index) =>
				roleMappingRows().nth(index).getByTestId('role-mapping-group-name'),
			remove: (index) =>
				roleMappingRows().nth(index).getByTestId('role-mapping-remove'),
		},
		workspaceGroups: {
			header: () => page.getByTestId('google-auth-workspace-groups-header'),
			fetchGroups: () => page.getByRole('checkbox', { name: 'Fetch Groups' }),
			allowedGroups: () =>
				page
					.getByTestId('google-auth-allowed-groups')
					.locator('.ant-select-selection-item'),
		},
		toast: (text) => page.getByText(text),
	};
}

export const withSso: Layer<{ sso: Sso }> = driver('sso', ({ page }) =>
	ssoDriver(page),
);

/** The SSO `test`. */
export const test = withSso(kit);
export { expect } from './kit';

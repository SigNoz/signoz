import { expect, type Locator, type Page } from '@playwright/test';

import type {
	AuthtypesRelationDTO,
	AuthtypesRoleDTO,
	AuthtypesTransactionGroupDTO,
	CoretypesKindDTO,
	CoretypesTypeDTO,
	ServiceaccounttypesGettableFactorAPIKeyWithKeyDTO,
	ServiceaccounttypesServiceAccountDTO,
	ServiceaccounttypesServiceAccountWithRolesDTO,
	TypesOrganizationDTO,
} from '../schemas';
import { antdDriver } from '../antd';
import { apiDriver, type Envelope } from '../api';
import { dashboardsDriver, type DashboardSeed } from '../dashboards';
import { driver, type Layer } from '../kit';
import { usersApi, type UsersApi } from '../users';

/**
 * The `/settings/*` pages: workspace, org, account, members, roles, service
 * accounts, ingestion keys, shortcuts, MCP and billing.
 *
 * Members, roles and service accounts are org-wide lists that every worker
 * adds to, so every read here is scoped by a name or email the caller stamped.
 */

export type Theme = 'dark' | 'light' | 'auto';
export type Scope = 'all' | 'none';

const toastText = (page: Page, text: string): Locator =>
	page.locator('[data-sonner-toast]').filter({ hasText: text });

/** `n` in base 26, spelled with `a-z` only. */
const letters = (n: number): string =>
	n
		.toString(26)
		.replace(/[0-9a-p]/g, (char) =>
			String.fromCharCode(97 + Number.parseInt(char, 26)),
		);

/**
 * A unique custom role name. The server accepts only `a-z` and `-`, at most 50
 * characters, so the worker index and timestamp are spelled in letters.
 */
export function roleName(kind: string, workerIndex: number): string {
	return `e-role-${kind}-w${letters(workerIndex)}-${letters(Date.now())}`;
}

/** A `transactionGroups` entry granting `relation` on every `kind` object. */
export function grantAll(
	relation: `${AuthtypesRelationDTO}`,
	kind: `${CoretypesKindDTO}`,
	type: `${CoretypesTypeDTO}` = 'metaresource',
): AuthtypesTransactionGroupDTO {
	return {
		relation: relation as AuthtypesRelationDTO,
		objectGroup: {
			resource: {
				kind: kind as CoretypesKindDTO,
				type: type as CoretypesTypeDTO,
			},
			selectors: ['*'],
		},
	};
}

export interface Settings {
	users: UsersApi;
	toast(text: string): Locator;
	pathname(): string;
	reload(): Promise<void>;
	errorBoundary(): Locator;
	goto(path: string): Promise<void>;
	seedDashboard(title: string): Promise<DashboardSeed>;
	removeDashboard(id: string): Promise<void>;

	/** The app side nav, as far as the account preferences drive it. */
	sidenav: {
		isCollapsed(): Promise<boolean>;
		hover(): Promise<void>;
		/** Move the pointer away: an unpinned nav expands on hover. */
		parkPointer(): Promise<void>;
	};

	shell: {
		goto(path: string): Promise<void>;
		title(): Locator;
		navItem(key: string): Locator;
		navKeys(): Promise<string[]>;
	};

	general: {
		retentionTitle(): Locator;
		licenseCopyButton(): Locator;
	};

	org: {
		goto(): Promise<void>;
		nameInput(): Locator;
		rename(name: string): Promise<void>;
		apiName(): Promise<string>;
		setApiName(name: string): Promise<void>;
		authDomainTitle(): Locator;
	};

	account: {
		goto(): Promise<void>;
		userName(): Locator;
		rename(name: string): Promise<void>;
		changePassword(current: string, next: string): Promise<void>;
		theme(value: Theme): Promise<void>;
		/** `lightMode` on `<body>` and the persisted `THEME`. */
		appliedTheme(): Promise<{ light: boolean; stored: string | null }>;
		themeSelector(): Locator;
		sidebarPinnedSwitch(): Locator;
		/** Flip the pinned switch; resolves with the value the PUT sent. */
		toggleSidebarPinned(): Promise<boolean>;
		timezoneAdaptationSwitch(): Locator;
		email(address: string): Locator;
	};

	members: {
		goto(params?: string): Promise<void>;
		heading(): Locator;
		search(text: string): Promise<void>;
		/** The member's table row. Search for the email first: the list pages at 20. */
		row(email: string): Locator;
		openInvite(): Promise<void>;
		inviteDialog(): Locator;
		invite(rows: { email: string; role: string }[]): Promise<void>;
		openMember(email: string): Promise<void>;
		drawer(): Locator;
		roleSelect(): Locator;
		deleteButton(): Locator;
		setRoles(roles: string[]): Promise<void>;
		saveMember(): Promise<void>;
		/** Mint a reset or invite link from the drawer and return it. */
		generateLink(): Promise<string>;
		deleteMember(): Promise<void>;
		filter(label: 'All members' | 'Pending invites' | 'Deleted'): Promise<void>;
	};

	roles: {
		goto(): Promise<void>;
		page(): Locator;
		search(text: string): Promise<void>;
		row(name: string): Locator;
		section(label: string): Locator;
		openCreate(): Promise<void>;
		fillName(name: string): Promise<void>;
		fillDescription(text: string): Promise<void>;
		grant(resource: string, verb: string, scope: Scope): Promise<void>;
		/** The view page's Update button, disabled for managed roles. */
		updateButton(): Locator;
		deleteButton(): Locator;
		save(): Promise<void>;
		view(id: string, name: string): Promise<void>;
		openEdit(): Promise<void>;
		viewPage(): Locator;
		/** The create and edit page. */
		editor(): Locator;
		grantedCount(kind: string): Locator;
		delete(): Promise<void>;
		apiRole(id: string): Promise<AuthtypesRoleDTO>;
		createApi(input: {
			name: string;
			description?: string;
			transactionGroups?: AuthtypesTransactionGroupDTO[];
		}): Promise<string>;
		removeApi(id: string): Promise<void>;
		removeByName(name: string): Promise<void>;
		idByName(name: string): Promise<string | undefined>;
	};

	serviceAccounts: {
		goto(params?: string): Promise<void>;
		heading(): Locator;
		newButton(): Locator;
		search(text: string): Promise<void>;
		row(name: string): Locator;
		/** Create through the UI. Returns the new account's id. */
		create(name: string): Promise<string>;
		drawer(): Locator;
		closeDrawer(): Promise<void>;
		openAccount(id: string): Promise<void>;
		openKeys(id: string): Promise<void>;
		/** Add a key through the UI and return the secret it shows once. */
		addKey(name: string): Promise<string>;
		keyCreatedCallout(): Locator;
		closeKeyModal(): Promise<void>;
		revokeKey(name: string): Promise<void>;
		roleSelect(): Locator;
		setRoles(roles: string[]): Promise<void>;
		save(): Promise<void>;
		delete(): Promise<void>;
		filter(label: 'All accounts' | 'Active' | 'Deleted'): Promise<void>;
		callWithKey(key: string, path: string): Promise<number>;
		createApi(name: string, role?: string): Promise<string>;
		removeApi(id: string): Promise<void>;
		removeByName(name: string): Promise<void>;
		apiAccount(
			id: string,
		): Promise<ServiceaccounttypesServiceAccountWithRolesDTO>;
		addKeyApi(id: string, name: string): Promise<string>;
	};

	ingestion: {
		goto(): Promise<void>;
		/** The gateway WireMock has no mappings; serve an empty key list instead. */
		stubGateway(): Promise<void>;
		title(): Locator;
		addButton(): Locator;
	};

	mcp: {
		goto(): Promise<void>;
		fallbackTitle(): Locator;
	};

	billing: {
		goto(): Promise<void>;
		subtitle(): Locator;
	};

	shortcutsPage: {
		goto(): Promise<void>;
		root(): Locator;
		section(name: string): Locator;
	};
}

export function settingsDriver(page: Page): Settings {
	const api = apiDriver(page);
	const antd = antdDriver(page);
	const users = usersApi(page);

	const clearSelect = async (select: Locator): Promise<void> => {
		const removers = select.locator('.ant-select-selection-item-remove');
		while ((await removers.count()) > 0) {
			await removers.first().click();
		}
	};

	/**
	 * `antd.pickByName` closes the list with Escape, which also closes the
	 * enclosing dialog or drawer. Close it by clicking the dialog's title.
	 */
	const pickInDialog = async (
		dialog: Locator,
		select: Locator,
		name: string,
	): Promise<void> => {
		const before = await antd.selectedTags(select).count();
		await select.click();
		await expect(select).toHaveClass(/ant-select-open/);
		await select.locator('input[role="combobox"]').fill(name);
		const dropdown = await antd.ownDropdown(select);
		await dropdown
			.locator('.ant-select-item-option')
			.filter({ hasText: name })
			.first()
			.click();
		await dialog.getByRole('heading').first().click();
		await expect(select).not.toHaveClass(/ant-select-open/);
		await expect(antd.selectedTags(select)).toHaveCount(before + 1);
	};

	/** antd renders the select root around the input that carries the id. */
	const selectById = (id: string): Locator =>
		page.locator('.ant-select').filter({ has: page.locator(`input#${id}`) });

	const settings: Settings = {
		users,
		toast: (text) => toastText(page, text),
		pathname: () => new URL(page.url()).pathname,
		reload: async () => {
			await page.reload();
		},
		errorBoundary: () => page.getByTestId('error-boundary-fallback'),
		goto: async (path) => {
			await page.goto(path);
		},
		seedDashboard: (title) => dashboardsDriver(page).create(title),
		removeDashboard: (id) => dashboardsDriver(page).remove(id),

		sidenav: {
			isCollapsed: async () =>
				(await page.getByTestId('sidenav').getAttribute('data-collapsed')) ===
				'true',
			hover: async () => {
				await page.getByTestId('sidenav').hover();
				await expect(page.getByTestId('sidenav')).toHaveAttribute(
					'data-collapsed',
					'false',
				);
			},
			parkPointer: async () => {
				const viewport = page.viewportSize() ?? { width: 1280, height: 720 };
				await page.mouse.move(viewport.width - 10, viewport.height - 10);
			},
		},

		shell: {
			goto: async (path) => {
				await page.goto(path);
				await expect(settings.shell.title()).toBeVisible();
			},
			title: () => page.getByTestId('settings-page-title'),
			navItem: (key) => page.getByTestId('settings-page-sidenav').getByTestId(key),
			navKeys: () =>
				page
					.getByTestId('settings-page-sidenav')
					.locator('[data-testid]')
					.evaluateAll((nodes) =>
						nodes.map((node) => node.getAttribute('data-testid') ?? ''),
					),
		},

		general: {
			retentionTitle: () => page.getByText('Retention Controls'),
			licenseCopyButton: () => page.getByTestId('license-key-row-copy-btn'),
		},

		org: {
			goto: () => settings.shell.goto('/settings/org-settings'),
			nameInput: () => page.getByTestId('org-display-name-input'),
			rename: async (name) => {
				await settings.org.nameInput().fill(name);
				const saved = page.waitForResponse(
					(response) =>
						response.request().method() === 'PUT' &&
						new URL(response.url()).pathname === '/api/v2/orgs/me',
				);
				await page.getByTestId('org-display-name-submit').click();
				expect((await saved).ok()).toBe(true);
			},
			apiName: async () =>
				(await api.get<Envelope<TypesOrganizationDTO>>('/api/v2/orgs/me')).data
					.displayName ?? '',
			setApiName: async (name) => {
				const org = (
					await api.get<Envelope<TypesOrganizationDTO>>('/api/v2/orgs/me')
				).data;
				await api.put('/api/v2/orgs/me', { id: org.id, displayName: name });
			},
			authDomainTitle: () => page.getByTestId('auth-domain-title'),
		},

		account: {
			goto: () => settings.shell.goto('/settings/my-settings'),
			userName: () => page.getByTestId('user-info-name'),
			rename: async (name) => {
				await page.getByTestId('update-name-open-btn').click();
				await page.getByTestId('update-name-input').fill(name);
				const saved = page.waitForResponse(
					(response) =>
						response.request().method() === 'PUT' &&
						new URL(response.url()).pathname === '/api/v2/users/me',
				);
				await page.getByTestId('update-name-btn').click();
				expect((await saved).ok()).toBe(true);
				await expect(settings.toast('Name updated successfully')).toBeVisible();
			},
			changePassword: async (current, next) => {
				await page.getByTestId('reset-password-open-btn').click();
				await page.getByTestId('current-password-textbox').fill(current);
				await page.getByTestId('new-password-textbox').fill(next);
				await page.getByTestId('reset-password-btn').click();
				await expect(settings.toast('Password updated successfully')).toBeVisible();
			},
			themeSelector: () => page.getByTestId('theme-selector'),
			theme: async (value) => {
				await page.getByTestId(`theme-selector-button-${value}`).click();
			},
			appliedTheme: () =>
				page.evaluate(() => ({
					light: document.body.classList.contains('lightMode'),
					stored: localStorage.getItem('THEME'),
				})),
			sidebarPinnedSwitch: () => page.getByTestId('side-nav-pinned-switch'),
			toggleSidebarPinned: async () => {
				const saved = page.waitForResponse(
					(response) =>
						response.request().method() === 'PUT' &&
						response.url().includes('/api/v1/user/preferences/sidenav_pinned'),
				);
				await settings.account.sidebarPinnedSwitch().click();
				const response = await saved;
				expect(response.ok()).toBe(true);
				return (response.request().postDataJSON() as { value: boolean }).value;
			},
			timezoneAdaptationSwitch: () =>
				page.getByTestId('timezone-adaptation-switch'),
			email: (address) => page.getByText(address, { exact: true }),
		},

		members: {
			goto: async (params) => {
				await settings.shell.goto(
					params ? `/settings/members?${params}` : '/settings/members',
				);
				await expect(settings.members.heading()).toBeVisible();
			},
			heading: () => page.getByRole('heading', { name: 'Members', exact: true }),
			search: async (text) => {
				await page.getByTestId('members-search-input').fill(text);
			},
			// antd keys each row by the member id; the email is what callers hold.
			row: (email) => page.locator('tr[data-row-key]').filter({ hasText: email }),
			openInvite: async () => {
				await page.getByTestId('invite-member-btn').click();
				await expect(settings.members.inviteDialog()).toBeVisible();
			},
			inviteDialog: () =>
				page.getByRole('dialog', { name: 'Invite Team Members' }),
			invite: async (rows) => {
				const dialog = settings.members.inviteDialog();
				for (const [index, { email, role }] of rows.entries()) {
					if (
						index >= (await dialog.locator('[data-testid^="invite-email-"]').count())
					) {
						await dialog.getByTestId('invite-add-row').click();
					}
					await dialog
						.locator('[data-testid^="invite-email-"]')
						.nth(index)
						.fill(email);
					const select = dialog
						.locator('.ant-select')
						.filter({ has: page.locator('input[id^="invite-role-"]') })
						.nth(index);
					await pickInDialog(dialog, select, role);
				}
				await page.getByTestId('invite-submit-btn').click();
				await expect(settings.toast('Invites sent successfully')).toBeVisible();
				await expect(dialog).toHaveCount(0);
			},
			openMember: async (email) => {
				await settings.members.search(email);
				await settings.members.row(email).click();
				await expect(settings.members.drawer()).toBeVisible();
				await expect(settings.members.drawer().getByText(email)).toBeVisible();
			},
			drawer: () => page.getByRole('dialog', { name: 'Member Details' }),
			roleSelect: () => selectById('member-role'),
			deleteButton: () => page.getByTestId('member-delete-btn'),
			setRoles: async (roles) => {
				const select = settings.members.roleSelect();
				await clearSelect(select);
				for (const role of roles) {
					await pickInDialog(settings.members.drawer(), select, role);
				}
			},
			saveMember: async () => {
				await page.getByTestId('member-save-btn').click();
				await expect(
					settings.toast('Member details updated successfully'),
				).toBeVisible();
			},
			generateLink: async () => {
				await page.getByTestId('member-reset-link-btn').click();
				const link = page.getByTestId('reset-link-text');
				await expect(link).toContainText('/password-reset?token=');
				return (await link.innerText()).trim();
			},
			deleteMember: async () => {
				await settings.members.deleteButton().click();
				await page.getByTestId('member-delete-confirm-btn').click();
			},
			filter: async (label) => {
				await page.getByTestId('members-filter-trigger').click();
				await page.getByRole('menuitem', { name: new RegExp(`^${label}`) }).click();
			},
		},

		roles: {
			goto: async () => {
				await settings.shell.goto('/settings/roles');
				await expect(settings.roles.page()).toBeVisible();
			},
			page: () => page.getByTestId('roles-settings'),
			search: async (text) => {
				await page.getByTestId('roles-search-input').fill(text);
			},
			row: (name) => page.getByTestId(`role-row-${name}`),
			section: (label) =>
				page.getByRole('heading', { name: new RegExp(`^${label}`) }),
			openCreate: async () => {
				await page.getByTestId('create-custom-role-btn').click();
				await expect(settings.roles.editor()).toBeVisible();
			},
			fillName: async (name) => {
				await page.getByTestId('role-name-input').fill(name);
			},
			fillDescription: async (text) => {
				await page.getByTestId('role-description-input').fill(text);
			},
			grant: async (resource, verb, scope) => {
				// The view page shares the header testid and can still be mounted.
				const editor = settings.roles.editor();
				const header = editor.getByTestId(`resource-card-header-${resource}`);
				if ((await header.getAttribute('aria-expanded')) !== 'true') {
					await header.click();
				}
				await editor
					.getByTestId(`action-toggle-scope-${resource}-${verb}-button-${scope}`)
					.click();
			},
			// The view and edit pages share testids, and the route tab that is
			// leaving stays mounted until its animation ends.
			updateButton: () => settings.roles.viewPage().getByTestId('save-button'),
			deleteButton: () => settings.roles.viewPage().getByTestId('delete-button'),
			save: async () => {
				await settings.roles.editor().getByTestId('save-button').click();
			},
			view: async (id, name) => {
				await page.goto(`/settings/roles/${id}?name=${encodeURIComponent(name)}`);
				await expect(settings.roles.viewPage()).toBeVisible();
			},
			openEdit: async () => {
				await settings.roles.updateButton().click();
				await expect(settings.roles.editor()).toBeVisible();
			},
			viewPage: () => page.getByTestId('view-role-page'),
			editor: () => page.getByTestId('create-edit-role-page'),
			grantedCount: (kind) =>
				settings.roles.viewPage().getByTestId(`granted-count-${kind}`),
			delete: async () => {
				await settings.roles.deleteButton().click();
				await page
					.getByTestId('delete-role-modal')
					.getByRole('button', { name: 'Delete Role' })
					.click();
			},
			apiRole: async (id) =>
				(await api.get<Envelope<AuthtypesRoleDTO>>(`/api/v1/roles/${id}`)).data,
			createApi: ({ name, description = '', transactionGroups = [] }) =>
				api.create('/api/v1/roles', { name, description, transactionGroups }),
			removeApi: (id) => api.tryDel(`/api/v1/roles/${id}`),
			idByName: async (name) =>
				(await users.roles()).find((role) => role.name === name)?.id,
			removeByName: async (name) => {
				const id = await settings.roles.idByName(name);
				if (id) {
					await settings.roles.removeApi(id);
				}
			},
		},

		serviceAccounts: {
			goto: async (params) => {
				await settings.shell.goto(
					params
						? `/settings/service-accounts?${params}`
						: '/settings/service-accounts',
				);
				await expect(settings.serviceAccounts.heading()).toBeVisible();
			},
			heading: () =>
				page.getByRole('heading', { name: 'Service Accounts', exact: true }),
			newButton: () => page.getByTestId('new-sa-btn'),
			search: async (text) => {
				await page.getByTestId('sa-search-input').fill(text);
			},
			row: (name) =>
				page.getByRole('button', { name: `View service account ${name}` }),
			create: async (name) => {
				await settings.serviceAccounts.newButton().click();
				await page.getByTestId('create-sa-name-input').fill(name);
				const created = page.waitForResponse(
					(response) =>
						response.request().method() === 'POST' &&
						new URL(response.url()).pathname === '/api/v1/service_accounts',
				);
				await page.getByTestId('create-sa-submit-btn').click();
				const response = await created;
				expect(response.ok()).toBe(true);
				const body = (await response.json()) as Envelope<{ id: string }>;
				return body.data.id;
			},
			drawer: () => page.getByRole('dialog', { name: 'Service Account Details' }),
			closeDrawer: async () => {
				await settings.serviceAccounts
					.drawer()
					.getByRole('button', { name: 'Cancel' })
					.click();
				await expect(settings.serviceAccounts.drawer()).toHaveCount(0);
			},
			// The drawer is modal and hides the page heading from the a11y tree.
			openAccount: async (id) => {
				await settings.shell.goto(
					`/settings/service-accounts?account=${encodeURIComponent(id)}`,
				);
				await expect(settings.serviceAccounts.drawer()).toBeVisible();
				// The select renders empty until the account loads, and a clear
				// that runs first is overwritten by the late roles.
				const { serviceAccountRoles } =
					await settings.serviceAccounts.apiAccount(id);
				await expect(
					antd.selectedTags(settings.serviceAccounts.roleSelect()),
				).toHaveCount((serviceAccountRoles ?? []).length);
			},
			openKeys: async (id) => {
				await settings.shell.goto(
					`/settings/service-accounts?account=${encodeURIComponent(id)}&tab=keys`,
				);
				await expect(settings.serviceAccounts.drawer()).toBeVisible();
			},
			addKey: async (name) => {
				await page.getByTestId('sa-add-key-btn').click();
				await page.getByTestId('add-key-name-input').fill(name);
				await page.getByTestId('add-key-submit-btn').click();
				const value = page.getByTestId('created-key-value');
				await expect(value).not.toBeEmpty();
				return (await value.innerText()).trim();
			},
			keyCreatedCallout: () =>
				page.getByText(
					'Store the key securely. This is the only time it will be displayed.',
				),
			closeKeyModal: async () => {
				await page.keyboard.press('Escape');
				await expect(page.getByTestId('add-key-modal')).toHaveCount(0);
			},
			revokeKey: async (name) => {
				await settings.serviceAccounts
					.drawer()
					.locator('tr')
					.filter({ hasText: name })
					.getByTestId('keys-tab-revoke-btn')
					.click();
				await page.getByTestId('revoke-key-confirm-btn').click();
				await expect(settings.toast('Key revoked successfully')).toBeVisible();
			},
			roleSelect: () => selectById('sa-roles'),
			setRoles: async (roles) => {
				const select = settings.serviceAccounts.roleSelect();
				await clearSelect(select);
				for (const role of roles) {
					await pickInDialog(settings.serviceAccounts.drawer(), select, role);
				}
			},
			save: async () => {
				await page.getByTestId('sa-save-btn').click();
				await expect(
					settings.toast('Service account updated successfully'),
				).toBeVisible();
			},
			delete: async () => {
				await page.getByTestId('sa-delete-btn').click();
				await page.getByTestId('confirm-delete-btn').click();
				await expect(settings.toast('Service account deleted')).toBeVisible();
			},
			filter: async (label) => {
				await page.getByTestId('sa-filter-trigger').click();
				await page.getByRole('menuitem', { name: new RegExp(`^${label}`) }).click();
			},
			callWithKey: async (key, path) =>
				(
					await page.request.get(path, { headers: { 'SIGNOZ-API-KEY': key } })
				).status(),
			createApi: async (name, role) => {
				const id = await api.create('/api/v1/service_accounts', { name });
				if (role) {
					await api.post('/api/v1/service_account_roles', {
						serviceAccountId: id,
						roleId: await users.roleId(role),
					});
				}
				return id;
			},
			removeApi: (id) => api.tryDel(`/api/v1/service_accounts/${id}`),
			removeByName: async (name) => {
				const list = await api.get<
					Envelope<ServiceaccounttypesServiceAccountDTO[]>
				>('/api/v1/service_accounts');
				await Promise.all(
					list.data
						.filter((account) => account.name === name)
						.map((account) => settings.serviceAccounts.removeApi(account.id)),
				);
			},
			apiAccount: async (id) =>
				(
					await api.get<Envelope<ServiceaccounttypesServiceAccountWithRolesDTO>>(
						`/api/v1/service_accounts/${id}`,
					)
				).data,
			addKeyApi: async (id, name) =>
				(
					await api.post<
						Envelope<ServiceaccounttypesGettableFactorAPIKeyWithKeyDTO>
					>(`/api/v1/service_accounts/${id}/keys`, { name, expiresAt: 0 })
				).data.key,
		},

		ingestion: {
			goto: () => settings.shell.goto('/settings/ingestion-settings'),
			stubGateway: async () => {
				await page.route('**/api/v2/gateway/**', (route) =>
					route.fulfill({
						status: 200,
						contentType: 'application/json',
						body: JSON.stringify({
							status: 'success',
							data: {
								keys: [],
								_pagination: { page: 1, per_page: 10, pages: 0, total: 0 },
							},
						}),
					}),
				);
			},
			title: () => page.getByRole('heading', { name: 'Ingestion Keys' }),
			addButton: () => page.getByTestId('ingestion-key-add-btn'),
		},

		mcp: {
			goto: () => settings.shell.goto('/settings/mcp-server'),
			fallbackTitle: () =>
				page.getByRole('heading', { name: 'MCP Server is available on SigNoz' }),
		},

		billing: {
			goto: () => settings.shell.goto('/settings/billing'),
			subtitle: () =>
				page.getByText(
					'Manage your billing information, invoices, and monitor costs.',
				),
		},

		shortcutsPage: {
			goto: async () => {
				await settings.shell.goto('/settings/shortcuts');
				await expect(settings.shortcutsPage.root()).toBeVisible();
			},
			root: () => page.getByTestId('keyboard-shortcuts-page'),
			section: (name) => page.getByTestId(`shortcut-section-${name}`),
		},
	};

	return settings;
}

export const withSettings: Layer<{ settings: Settings }> = driver(
	'settings',
	({ page }) => settingsDriver(page),
);

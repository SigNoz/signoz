import {
	buildHelpSupportDropdownMenuItems,
	getUserSettingsDropdownMenuItems,
} from 'container/SideNav/menuItems';

const BASE_PARAMS = {
	userEmail: 'test@signoz.io',
	isWorkspaceBlocked: false,
	isEnterpriseSelfHostedUser: false,
	isCommunityEnterpriseUser: false,
};

describe('getUserSettingsDropdownMenuItems', () => {
	it('always includes logged-in-as label, workspace, account, keyboard shortcuts, and sign out', () => {
		const items = getUserSettingsDropdownMenuItems(BASE_PARAMS);
		const keys = items?.map((item) => item?.key);

		expect(keys).toContain('label');
		expect(keys).toContain('workspace');
		expect(keys).toContain('account');
		expect(keys).toContain('keyboard-shortcuts');
		expect(keys).toContain('logout');

		// workspace item is enabled when workspace is not blocked
		const workspaceItem = items?.find(
			(item: any) => item.key === 'workspace',
		) as any;

		expect(workspaceItem?.disabled).toBe(false);

		// does not include license item for regular cloud user
		expect(keys).not.toContain('license');
	});

	it('includes manage license item for enterprise self-hosted users', () => {
		const items = getUserSettingsDropdownMenuItems({
			...BASE_PARAMS,
			isEnterpriseSelfHostedUser: true,
		});
		const keys = items?.map((item) => item?.key);

		expect(keys).toContain('license');
	});

	it('includes manage license item for community enterprise users', () => {
		const items = getUserSettingsDropdownMenuItems({
			...BASE_PARAMS,
			isCommunityEnterpriseUser: true,
		});
		const keys = items?.map((item) => item?.key);

		expect(keys).toContain('license');
	});

	it('workspace item is disabled when workspace is blocked', () => {
		const items = getUserSettingsDropdownMenuItems({
			...BASE_PARAMS,
			isWorkspaceBlocked: true,
		});
		const workspaceItem = items?.find(
			(item: any) => item.key === 'workspace',
		) as any;

		expect(workspaceItem?.disabled).toBe(true);
	});

	it('returns items in correct order: label, divider, workspace, account, ..., shortcuts, divider, logout', () => {
		const items = getUserSettingsDropdownMenuItems(BASE_PARAMS) ?? [];
		const keys = items.map((item: any) => item.key ?? item.type);

		expect(keys[0]).toBe('label');
		expect(keys[1]).toBe('divider');
		expect(keys[2]).toBe('workspace');
		expect(keys[3]).toBe('account');
		expect(keys[keys.length - 1]).toBe('logout');
	});
});

describe('buildHelpSupportDropdownMenuItems', () => {
	it('returns the standard help items without a version entry when no version is provided', () => {
		const items = buildHelpSupportDropdownMenuItems();
		const keys = items
			.filter((item): item is { key: string | number } => !('type' in item))
			.map((item) => item.key);

		expect(keys).toContain('documentation');
		expect(keys).toContain('github');
		expect(keys).toContain('slack');
		expect(keys).toContain('chat-support');
		expect(keys).toContain('invite-collaborators');
		expect(keys).not.toContain('version');
	});

	it('includes a separator + version entry at the bottom when a version is provided', () => {
		const items = buildHelpSupportDropdownMenuItems('v0.99.0-rc.1');

		// Last two entries must be divider + version so the version sits
		// visually at the bottom of the dropdown.
		const tail = items.slice(items.length - 2) as Array<
			{ type?: string; key?: string | number; itemKey?: string } | undefined
		>;
		expect((tail[0] as { type?: string }).type).toBe('divider');

		const versionEntry = tail[1] as
			| { key?: string | number; itemKey?: string }
			| undefined;
		expect(versionEntry?.key).toBe('version');
		expect(versionEntry?.itemKey).toBe('version');
	});

	it('renders the version string into the version label', () => {
		const items = buildHelpSupportDropdownMenuItems('v0.99.0-rc.1');
		const versionEntry = items.find(
			(item) => !('type' in item) && item.itemKey === 'version',
		) as { label?: unknown } | undefined;

		// The label is a JSX element; assert the rendered text appears in
		// its serialized form.
		const serialized = JSON.stringify(versionEntry?.label);
		expect(serialized).toContain('SigNoz');
		expect(serialized).toContain('v0.99.0-rc.1');
	});

	it('omits the version block entirely when currentVersion is empty string', () => {
		const items = buildHelpSupportDropdownMenuItems('');
		const versionEntry = items.find(
			(item) => !('type' in item) && item.itemKey === 'version',
		);
		expect(versionEntry).toBeUndefined();
	});

	it('preserves the original key order when version is provided', () => {
		const items = buildHelpSupportDropdownMenuItems('v0.99.0');
		const keys = items
			.filter((item): item is { key: string | number } => !('type' in item))
			.map((item) => item.key);

		expect(keys[0]).toBe('documentation');
		expect(keys[1]).toBe('github');
		expect(keys[2]).toBe('slack');
		expect(keys[3]).toBe('chat-support');
		expect(keys[4]).toBe('invite-collaborators');
		expect(keys[keys.length - 1]).toBe('version');
	});
});

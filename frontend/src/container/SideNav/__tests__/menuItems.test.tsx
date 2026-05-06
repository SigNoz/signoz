import { getUserSettingsDropdownMenuItems } from 'container/SideNav/menuItems';

const BASE_PARAMS = {
	userEmail: 'test@signoz.io',
	isWorkspaceBlocked: false,
	isEnterpriseSelfHostedUser: false,
	isCommunityEnterpriseUser: false,
	isNoAuthMode: false,
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

	it('omits sign out and its preceding divider when isNoAuthMode=true', () => {
		const items =
			getUserSettingsDropdownMenuItems({ ...BASE_PARAMS, isNoAuthMode: true }) ??
			[];
		const keys = items.map((item: any) => item.key ?? item.type);

		expect(keys).not.toContain('logout');
		// the trailing divider before logout should also be gone
		expect(keys[keys.length - 1]).toBe('keyboard-shortcuts');
	});
});

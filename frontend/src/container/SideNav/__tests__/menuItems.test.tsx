import type { MouseEvent } from 'react';
import type {
	DropdownActionItemType,
	DropdownItemType,
} from '@signozhq/ui/dropdown';
import {
	getUserSettingsDropdownMenuItems,
	WORKSPACE_LOCKED_TOOLTIP,
} from 'container/SideNav/menuItems';

const BASE_PARAMS = {
	userEmail: 'test@signoz.io',
	isWorkspaceBlocked: false,
	isEnterpriseSelfHostedUser: false,
	isCommunityEnterpriseUser: false,
	onSelect: jest.fn(),
};

function settingsRows(items: DropdownItemType[]): DropdownActionItemType[] {
	const group = items.find((item) => item.type === 'group');
	if (group?.type !== 'group') {
		throw new Error('No logged-in-as group');
	}
	return group.items.filter(
		(row): row is DropdownActionItemType => row.type === 'item',
	);
}

function settingsRow(
	items: DropdownItemType[],
	value: string,
): DropdownActionItemType {
	const row = settingsRows(items).find((r) => r.value === value);
	if (!row) {
		throw new Error(`No "${value}" row`);
	}
	return row;
}

describe('getUserSettingsDropdownMenuItems', () => {
	it('heads the settings rows with the logged-in user, then signs out below a separator', () => {
		const items = getUserSettingsDropdownMenuItems(BASE_PARAMS);

		expect(items.map((item) => item.type)).toStrictEqual([
			'group',
			'separator',
			'item',
		]);
		expect(items[0]).toHaveProperty('testId', 'logged-in-as-nav-item');
		expect(items[2]).toMatchObject({ value: 'logout', danger: true });
		expect(settingsRows(items).map((row) => row.value)).toStrictEqual([
			'workspace',
			'account',
			'keyboard-shortcuts',
		]);
	});

	it('includes manage license item for enterprise self-hosted users', () => {
		const items = getUserSettingsDropdownMenuItems({
			...BASE_PARAMS,
			isEnterpriseSelfHostedUser: true,
		});

		expect(settingsRows(items).map((row) => row.value)).toContain('license');
	});

	it('includes manage license item for community enterprise users', () => {
		const items = getUserSettingsDropdownMenuItems({
			...BASE_PARAMS,
			isCommunityEnterpriseUser: true,
		});

		expect(settingsRows(items).map((row) => row.value)).toContain('license');
	});

	it('workspace item is enabled when workspace is not blocked', () => {
		const items = getUserSettingsDropdownMenuItems(BASE_PARAMS);

		expect(settingsRow(items, 'workspace').disabled).toBe(false);
	});

	it('workspace item is disabled with the reason when workspace is blocked', () => {
		const items = getUserSettingsDropdownMenuItems({
			...BASE_PARAMS,
			isWorkspaceBlocked: true,
		});

		expect(settingsRow(items, 'workspace')).toMatchObject({
			disabled: true,
			disabledTooltip: WORKSPACE_LOCKED_TOOLTIP,
		});
	});

	it('reports the picked row by key', () => {
		const onSelect = jest.fn();
		const items = getUserSettingsDropdownMenuItems({ ...BASE_PARAMS, onSelect });
		const event = {} as MouseEvent;

		settingsRow(items, 'account').onClick?.(event);

		expect(onSelect).toHaveBeenCalledWith('account', event);
	});
});

import * as roleApi from 'api/generated/services/role';
import * as useAuthZModule from 'lib/authz/hooks/useAuthZ/useAuthZ';
import { customRoleResponse } from 'mocks-server/__mockdata__/roles';
import { mockUseAuthZGrantAll } from 'lib/authz/utils/authz-test-utils';
import userEvent from '@testing-library/user-event';
import { render, screen, within } from 'tests/test-utils';

import * as useRolePermissionsModule from '../../hooks/useRolePermissions';
import ViewRolePage from '../ViewRolePage';

import {
	buildViewRoleRoute,
	CUSTOM_ROLE_ID,
	CUSTOM_ROLE_NAME,
	mockHooksForCustomRole,
	mockHooksWithPermissions,
	mockPermissionsData,
} from './testUtils';

async function expandAllCards(): Promise<void> {
	const user = userEvent.setup();
	const expandButton = screen.getByTestId('expand-all-button');
	await user.click(expandButton);
}

describe('ViewRolePage - Permission Overview', () => {
	beforeEach(() => {
		mockHooksForCustomRole();
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('renders Transaction Groups section label', async () => {
		render(<ViewRolePage />, undefined, {
			initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
		});

		await expect(
			screen.findByText('Transaction Groups'),
		).resolves.toBeInTheDocument();
	});

	it('renders permission overview container', () => {
		render(<ViewRolePage />, undefined, {
			initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
		});

		expect(screen.getByTestId('permission-overview')).toBeInTheDocument();
	});

	it('shows resource permission cards', () => {
		render(<ViewRolePage />, undefined, {
			initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
		});

		expect(
			screen.getByTestId('resource-section-factor-api-key'),
		).toBeInTheDocument();
		expect(screen.getByTestId('resource-section-role')).toBeInTheDocument();
		expect(
			screen.getByTestId('resource-section-serviceaccount'),
		).toBeInTheDocument();
	});

	it('displays granted count for each resource', () => {
		render(<ViewRolePage />, undefined, {
			initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
		});

		expect(
			screen.getByTestId('granted-count-factor-api-key'),
		).toBeInTheDocument();
	});
});

describe('ViewRolePage - Permission Overview Loading State', () => {
	beforeEach(() => {
		jest
			.spyOn(useAuthZModule, 'useAuthZ')
			.mockImplementation(mockUseAuthZGrantAll);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('shows skeleton when permissions are loading', () => {
		jest.spyOn(roleApi, 'useGetRole').mockReturnValue({
			data: customRoleResponse,
			isLoading: false,
			isError: false,
			error: null,
		} as ReturnType<typeof roleApi.useGetRole>);

		jest.spyOn(useRolePermissionsModule, 'useRolePermissions').mockReturnValue({
			data: undefined,
			isLoading: true,
			isError: false,
			error: null,
		} as ReturnType<typeof useRolePermissionsModule.useRolePermissions>);

		render(<ViewRolePage />, undefined, {
			initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
		});

		expect(screen.getByTestId('permission-overview-loading')).toBeInTheDocument();
	});
});

describe('ViewRolePage - Permission Overview Error State', () => {
	beforeEach(() => {
		jest
			.spyOn(useAuthZModule, 'useAuthZ')
			.mockImplementation(mockUseAuthZGrantAll);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('shows error when permissions fail to load', () => {
		jest.spyOn(roleApi, 'useGetRole').mockReturnValue({
			data: customRoleResponse,
			isLoading: false,
			isError: false,
			error: null,
		} as ReturnType<typeof roleApi.useGetRole>);

		jest.spyOn(useRolePermissionsModule, 'useRolePermissions').mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: true,
			error: new Error('Failed'),
		} as ReturnType<typeof useRolePermissionsModule.useRolePermissions>);

		render(<ViewRolePage />, undefined, {
			initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
		});

		expect(screen.getByTestId('permission-overview-error')).toBeInTheDocument();
	});
});

describe('ViewRolePage - Scope: ALL permissions', () => {
	beforeEach(() => {
		jest
			.spyOn(useAuthZModule, 'useAuthZ')
			.mockImplementation(mockUseAuthZGrantAll);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('shows "All" badge for actions with ALL scope', async () => {
		mockHooksWithPermissions({
			...mockPermissionsData,
			resources: [
				{
					resourceId: 'factor-api-key',
					resourceKind: 'factor-api-key',
					resourceType: 'metaresource',
					resourceLabel: 'API Keys',
					actions: {
						read: { scope: 'all', selectedIds: [] },
						create: { scope: 'all', selectedIds: [] },
					},
					availableActions: ['read', 'create'],
				},
			],
		});

		render(<ViewRolePage />, undefined, {
			initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
		});

		await expandAllCards();

		expect(screen.getByTestId('scope-badge-read')).toHaveTextContent('All');
		expect(screen.getByTestId('scope-badge-create')).toHaveTextContent('All');
	});

	it('shows full granted count when all actions are ALL', () => {
		mockHooksWithPermissions({
			...mockPermissionsData,
			resources: [
				{
					resourceId: 'role',
					resourceKind: 'role',
					resourceType: 'role',
					resourceLabel: 'Roles',
					actions: {
						read: { scope: 'all', selectedIds: [] },
						create: { scope: 'all', selectedIds: [] },
						update: { scope: 'all', selectedIds: [] },
					},
					availableActions: ['read', 'create', 'update'],
				},
			],
		});

		render(<ViewRolePage />, undefined, {
			initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
		});

		expect(screen.getByTestId('granted-count-role')).toHaveTextContent(
			'3 / 3 granted',
		);
	});
});

describe('ViewRolePage - Scope: NONE permissions', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('shows "None" badge for actions with NONE scope', async () => {
		mockHooksWithPermissions({
			...mockPermissionsData,
			resources: [
				{
					resourceId: 'serviceaccount',
					resourceKind: 'serviceaccount',
					resourceType: 'serviceaccount',
					resourceLabel: 'Service Accounts',
					actions: {
						read: { scope: 'none', selectedIds: [] },
						delete: { scope: 'none', selectedIds: [] },
					},
					availableActions: ['read', 'delete'],
				},
			],
		});

		render(<ViewRolePage />, undefined, {
			initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
		});

		await expandAllCards();

		expect(screen.getByTestId('scope-badge-read')).toHaveTextContent('None');
		expect(screen.getByTestId('scope-badge-delete')).toHaveTextContent('None');
	});

	it('shows zero granted count when all actions are NONE', () => {
		mockHooksWithPermissions({
			...mockPermissionsData,
			resources: [
				{
					resourceId: 'factor-api-key',
					resourceKind: 'factor-api-key',
					resourceType: 'metaresource',
					resourceLabel: 'API Keys',
					actions: {
						read: { scope: 'none', selectedIds: [] },
						create: { scope: 'none', selectedIds: [] },
						update: { scope: 'none', selectedIds: [] },
						delete: { scope: 'none', selectedIds: [] },
					},
					availableActions: ['read', 'create', 'update', 'delete'],
				},
			],
		});

		render(<ViewRolePage />, undefined, {
			initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
		});

		expect(screen.getByTestId('granted-count-factor-api-key')).toHaveTextContent(
			'0 / 4 granted',
		);
	});
});

describe('ViewRolePage - Scope: ONLY_SELECTED permissions', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('shows "Only selected" badge with count', async () => {
		mockHooksWithPermissions({
			...mockPermissionsData,
			resources: [
				{
					resourceId: 'role',
					resourceKind: 'role',
					resourceType: 'role',
					resourceLabel: 'Roles',
					actions: {
						read: {
							scope: 'only_selected',
							selectedIds: ['admin', 'editor', 'viewer'],
						},
					},
					availableActions: ['read'],
				},
			],
		});

		render(<ViewRolePage />, undefined, {
			initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
		});

		await expandAllCards();

		expect(screen.getByTestId('scope-badge-read')).toHaveTextContent(
			'Only selected · 3',
		);
	});

	it('displays selected IDs as expandable chips', async () => {
		mockHooksWithPermissions({
			...mockPermissionsData,
			resources: [
				{
					resourceId: 'factor-api-key',
					resourceKind: 'factor-api-key',
					resourceType: 'metaresource',
					resourceLabel: 'API Keys',
					actions: {
						read: {
							scope: 'only_selected',
							selectedIds: ['key-abc-123', 'key-def-456'],
						},
					},
					availableActions: ['read'],
				},
			],
		});

		render(<ViewRolePage />, undefined, {
			initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
		});

		await expandAllCards();

		await expect(screen.findByText('key-abc-123')).resolves.toBeInTheDocument();
		await expect(screen.findByText('key-def-456')).resolves.toBeInTheDocument();
	});

	it('counts ONLY_SELECTED as granted in count', () => {
		mockHooksWithPermissions({
			...mockPermissionsData,
			resources: [
				{
					resourceId: 'serviceaccount',
					resourceKind: 'serviceaccount',
					resourceType: 'serviceaccount',
					resourceLabel: 'Service Accounts',
					actions: {
						read: { scope: 'only_selected', selectedIds: ['sa-1'] },
						create: { scope: 'none', selectedIds: [] },
					},
					availableActions: ['read', 'create'],
				},
			],
		});

		render(<ViewRolePage />, undefined, {
			initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
		});

		expect(screen.getByTestId('granted-count-serviceaccount')).toHaveTextContent(
			'1 / 2 granted',
		);
	});

	it('can collapse and expand selected items list', async () => {
		const user = userEvent.setup();

		mockHooksWithPermissions({
			...mockPermissionsData,
			resources: [
				{
					resourceId: 'role',
					resourceKind: 'role',
					resourceType: 'role',
					resourceLabel: 'Roles',
					actions: {
						update: {
							scope: 'only_selected',
							selectedIds: ['editor-role'],
						},
					},
					availableActions: ['update'],
				},
			],
		});

		render(<ViewRolePage />, undefined, {
			initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
		});

		await expandAllCards();

		await expect(screen.findByText('editor-role')).resolves.toBeInTheDocument();

		const toggle = screen.getByTestId('toggle-items-update');
		await user.click(toggle);

		expect(screen.queryByText('editor-role')).not.toBeInTheDocument();

		await user.click(toggle);
		await expect(screen.findByText('editor-role')).resolves.toBeInTheDocument();
	});
});

describe('ViewRolePage - Mixed permission scopes', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('renders all three scope types in single resource card', async () => {
		mockHooksWithPermissions({
			...mockPermissionsData,
			resources: [
				{
					resourceId: 'factor-api-key',
					resourceKind: 'factor-api-key',
					resourceType: 'metaresource',
					resourceLabel: 'API Keys',
					actions: {
						read: { scope: 'all', selectedIds: [] },
						create: { scope: 'none', selectedIds: [] },
						update: { scope: 'only_selected', selectedIds: ['key-1', 'key-2'] },
						delete: { scope: 'none', selectedIds: [] },
					},
					availableActions: ['read', 'create', 'update', 'delete'],
				},
			],
		});

		render(<ViewRolePage />, undefined, {
			initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
		});

		await expandAllCards();

		const section = screen.getByTestId('resource-section-factor-api-key');

		expect(within(section).getByTestId('scope-badge-read')).toHaveTextContent(
			'All',
		);
		expect(within(section).getByTestId('scope-badge-create')).toHaveTextContent(
			'None',
		);
		expect(within(section).getByTestId('scope-badge-update')).toHaveTextContent(
			'Only selected · 2',
		);
		expect(within(section).getByTestId('scope-badge-delete')).toHaveTextContent(
			'None',
		);

		expect(screen.getByTestId('granted-count-factor-api-key')).toHaveTextContent(
			'2 / 4 granted',
		);
	});

	it('renders multiple resources with different scope combinations', () => {
		mockHooksWithPermissions({
			...mockPermissionsData,
			resources: [
				{
					resourceId: 'factor-api-key',
					resourceKind: 'factor-api-key',
					resourceType: 'metaresource',
					resourceLabel: 'API Keys',
					actions: {
						read: { scope: 'all', selectedIds: [] },
						create: { scope: 'all', selectedIds: [] },
					},
					availableActions: ['read', 'create'],
				},
				{
					resourceId: 'role',
					resourceKind: 'role',
					resourceType: 'role',
					resourceLabel: 'Roles',
					actions: {
						read: { scope: 'none', selectedIds: [] },
						create: { scope: 'none', selectedIds: [] },
					},
					availableActions: ['read', 'create'],
				},
				{
					resourceId: 'serviceaccount',
					resourceKind: 'serviceaccount',
					resourceType: 'serviceaccount',
					resourceLabel: 'Service Accounts',
					actions: {
						read: { scope: 'only_selected', selectedIds: ['sa-1'] },
						create: { scope: 'all', selectedIds: [] },
					},
					availableActions: ['read', 'create'],
				},
			],
		});

		render(<ViewRolePage />, undefined, {
			initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
		});

		expect(screen.getByTestId('granted-count-factor-api-key')).toHaveTextContent(
			'2 / 2 granted',
		);
		expect(screen.getByTestId('granted-count-role')).toHaveTextContent(
			'0 / 2 granted',
		);
		expect(screen.getByTestId('granted-count-serviceaccount')).toHaveTextContent(
			'2 / 2 granted',
		);
	});
});

describe('ViewRolePage - Unknown resources', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('renders unknown resource with fallback label', async () => {
		mockHooksWithPermissions({
			...mockPermissionsData,
			resources: [
				{
					resourceId: 'future-resource',
					resourceKind: 'future-resource',
					resourceType: 'metaresource',
					resourceLabel: 'future-resource',
					actions: {
						read: { scope: 'all', selectedIds: [] },
					},
					availableActions: ['read'],
				},
			],
		});

		render(<ViewRolePage />, undefined, {
			initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
		});

		expect(
			screen.getByTestId('resource-section-future-resource'),
		).toBeInTheDocument();
		await expect(
			screen.findByText('future-resource'),
		).resolves.toBeInTheDocument();
	});

	it('shows raw verb name when no label mapping exists', async () => {
		mockHooksWithPermissions({
			...mockPermissionsData,
			resources: [
				{
					resourceId: 'test-resource',
					resourceKind: 'test-resource',
					resourceType: 'metaresource',
					resourceLabel: 'Test Resource',
					actions: {
						unknown_action: { scope: 'all', selectedIds: [] },
					},
					availableActions: ['unknown_action'],
				},
			],
		});

		render(<ViewRolePage />, undefined, {
			initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
		});

		await expandAllCards();

		await expect(
			screen.findByText('Unknown_action'),
		).resolves.toBeInTheDocument();
	});

	it('handles resource with empty actions', () => {
		mockHooksWithPermissions({
			...mockPermissionsData,
			resources: [
				{
					resourceId: 'empty-resource',
					resourceKind: 'empty-resource',
					resourceType: 'metaresource',
					resourceLabel: 'Empty Resource',
					actions: {},
					availableActions: [],
				},
			],
		});

		render(<ViewRolePage />, undefined, {
			initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
		});

		expect(
			screen.getByTestId('resource-section-empty-resource'),
		).toBeInTheDocument();
		expect(screen.getByTestId('granted-count-empty-resource')).toHaveTextContent(
			'0 / 0 granted',
		);
	});
});

describe('ViewRolePage - View mode toggle', () => {
	beforeEach(() => {
		mockHooksForCustomRole();
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('renders Interactive/JSON toggle', () => {
		render(<ViewRolePage />, undefined, {
			initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
		});

		expect(screen.getByTestId('permission-view-mode-list')).toBeInTheDocument();
		expect(screen.getByTestId('permission-view-mode-json')).toBeInTheDocument();
	});

	it('switches to JSON view when JSON toggle clicked', async () => {
		const user = userEvent.setup();

		render(<ViewRolePage />, undefined, {
			initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
		});

		expect(screen.getByTestId('permission-overview')).toBeInTheDocument();

		const jsonToggle = screen.getByTestId('permission-view-mode-json');
		await user.click(jsonToggle);

		expect(screen.queryByTestId('permission-overview')).not.toBeInTheDocument();
	});
});

describe('ViewRolePage - JSON Viewer Copy Button', () => {
	beforeEach(() => {
		mockHooksForCustomRole();
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('renders copy button in JSON view', async () => {
		const user = userEvent.setup();

		render(<ViewRolePage />, undefined, {
			initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
		});

		const jsonToggle = screen.getByTestId('permission-view-mode-json');
		await user.click(jsonToggle);

		expect(
			screen.getByTestId('read-only-json-viewer-copy-button'),
		).toBeInTheDocument();
	});

	it('copy button is clickable', async () => {
		const user = userEvent.setup();

		render(<ViewRolePage />, undefined, {
			initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
		});

		const jsonToggle = screen.getByTestId('permission-view-mode-json');
		await user.click(jsonToggle);

		const copyButton = screen.getByTestId('read-only-json-viewer-copy-button');
		expect(copyButton).not.toBeDisabled();
		await user.click(copyButton);
	});
});

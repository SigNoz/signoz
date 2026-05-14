import type {
	CoretypesResourceRefDTO,
	CoretypesObjectGroupDTO,
	CoretypesTypeDTO,
} from 'api/generated/services/sigNoz.schemas';

import type {
	PermissionConfig,
	ResourceDefinition,
} from '../PermissionSidePanel/PermissionSidePanel.types';

type AuthzResources = {
	resources: CoretypesResourceRefDTO[];
	relations: Record<string, string[]>;
};
import { PermissionScope } from '../PermissionSidePanel/PermissionSidePanel.types';
import {
	buildConfig,
	buildPatchPayload,
	configsEqual,
	DEFAULT_RESOURCE_CONFIG,
	derivePermissionTypes,
	deriveResourcesForRelation,
	objectsToPermissionConfig,
} from '../utils';

jest.mock('../RoleDetails/constants', () => {
	const MockIcon = (): null => null;
	return {
		PERMISSION_ICON_MAP: {
			create: MockIcon,
			list: MockIcon,
			read: MockIcon,
			update: MockIcon,
			delete: MockIcon,
		},
		FALLBACK_PERMISSION_ICON: MockIcon,
		ROLE_ID_REGEX: /\/settings\/roles\/([^/]+)/,
	};
});

const dashboardResource: AuthzResources['resources'][number] = {
	kind: 'dashboard',
	type: 'metaresource' as CoretypesTypeDTO,
};

const alertResource: AuthzResources['resources'][number] = {
	kind: 'alert',
	type: 'metaresource' as CoretypesTypeDTO,
};

const baseAuthzResources: AuthzResources = {
	resources: [dashboardResource, alertResource],
	relations: {
		create: ['metaresource'],
		read: ['metaresource'],
	},
};

const resourceDefs: ResourceDefinition[] = [
	{ id: 'dashboard', label: 'Dashboard' },
	{ id: 'alert', label: 'Alert' },
];

const ID_A = 'aaaaaaaa-0000-0000-0000-000000000001';
const ID_B = 'bbbbbbbb-0000-0000-0000-000000000002';
const ID_C = 'cccccccc-0000-0000-0000-000000000003';

describe('buildPatchPayload', () => {
	it('sends only the added selector as an addition', () => {
		const initial: PermissionConfig = {
			dashboard: { scope: PermissionScope.ONLY_SELECTED, selectedIds: [ID_A] },
			alert: { scope: PermissionScope.ONLY_SELECTED, selectedIds: [] },
		};
		const newConfig: PermissionConfig = {
			dashboard: {
				scope: PermissionScope.ONLY_SELECTED,
				selectedIds: [ID_A, ID_B],
			},
			alert: { scope: PermissionScope.ONLY_SELECTED, selectedIds: [] },
		};

		const result = buildPatchPayload({
			newConfig,
			initialConfig: initial,
			resources: resourceDefs,
			authzRes: baseAuthzResources,
		});

		expect(result.additions).toStrictEqual([
			{ resource: dashboardResource, selectors: [ID_B] },
		]);
		expect(result.deletions).toBeNull();
	});

	it('sends only the removed selector as a deletion', () => {
		const initial: PermissionConfig = {
			dashboard: {
				scope: PermissionScope.ONLY_SELECTED,
				selectedIds: [ID_A, ID_B, ID_C],
			},
			alert: { scope: PermissionScope.ONLY_SELECTED, selectedIds: [] },
		};
		const newConfig: PermissionConfig = {
			dashboard: {
				scope: PermissionScope.ONLY_SELECTED,
				selectedIds: [ID_A, ID_C],
			},
			alert: { scope: PermissionScope.ONLY_SELECTED, selectedIds: [] },
		};

		const result = buildPatchPayload({
			newConfig,
			initialConfig: initial,
			resources: resourceDefs,
			authzRes: baseAuthzResources,
		});

		expect(result.deletions).toStrictEqual([
			{ resource: dashboardResource, selectors: [ID_B] },
		]);
		expect(result.additions).toBeNull();
	});

	it('treats selector order as irrelevant — produces no payload when IDs are identical', () => {
		const initial: PermissionConfig = {
			dashboard: {
				scope: PermissionScope.ONLY_SELECTED,
				selectedIds: [ID_A, ID_B],
			},
			alert: { scope: PermissionScope.ONLY_SELECTED, selectedIds: [] },
		};
		const newConfig: PermissionConfig = {
			dashboard: {
				scope: PermissionScope.ONLY_SELECTED,
				selectedIds: [ID_B, ID_A],
			},
			alert: { scope: PermissionScope.ONLY_SELECTED, selectedIds: [] },
		};

		const result = buildPatchPayload({
			newConfig,
			initialConfig: initial,
			resources: resourceDefs,
			authzRes: baseAuthzResources,
		});

		expect(result.additions).toBeNull();
		expect(result.deletions).toBeNull();
	});

	it('replaces wildcard with specific IDs when switching all → only_selected', () => {
		const initial: PermissionConfig = {
			dashboard: { scope: PermissionScope.ALL, selectedIds: [] },
			alert: { scope: PermissionScope.ONLY_SELECTED, selectedIds: [] },
		};
		const newConfig: PermissionConfig = {
			dashboard: {
				scope: PermissionScope.ONLY_SELECTED,
				selectedIds: [ID_A, ID_B],
			},
			alert: { scope: PermissionScope.ONLY_SELECTED, selectedIds: [] },
		};

		const result = buildPatchPayload({
			newConfig,
			initialConfig: initial,
			resources: resourceDefs,
			authzRes: baseAuthzResources,
		});

		expect(result.deletions).toStrictEqual([
			{ resource: dashboardResource, selectors: ['*'] },
		]);
		expect(result.additions).toStrictEqual([
			{ resource: dashboardResource, selectors: [ID_A, ID_B] },
		]);
	});

	it('only deletes wildcard when switching all → only_selected with empty selector list', () => {
		const initial: PermissionConfig = {
			dashboard: { scope: PermissionScope.ALL, selectedIds: [] },
			alert: { scope: PermissionScope.ONLY_SELECTED, selectedIds: [] },
		};
		const newConfig: PermissionConfig = {
			dashboard: { scope: PermissionScope.ONLY_SELECTED, selectedIds: [] },
			alert: { scope: PermissionScope.ONLY_SELECTED, selectedIds: [] },
		};

		const result = buildPatchPayload({
			newConfig,
			initialConfig: initial,
			resources: resourceDefs,
			authzRes: baseAuthzResources,
		});

		expect(result.deletions).toStrictEqual([
			{ resource: dashboardResource, selectors: ['*'] },
		]);
		expect(result.additions).toBeNull();
	});

	it('only includes resources that actually changed', () => {
		const initial: PermissionConfig = {
			dashboard: { scope: PermissionScope.ALL, selectedIds: [] },
			alert: { scope: PermissionScope.ONLY_SELECTED, selectedIds: [ID_A] },
		};
		const newConfig: PermissionConfig = {
			dashboard: { scope: PermissionScope.ALL, selectedIds: [] }, // unchanged
			alert: { scope: PermissionScope.ONLY_SELECTED, selectedIds: [ID_A, ID_B] }, // added ID_B
		};

		const result = buildPatchPayload({
			newConfig,
			initialConfig: initial,
			resources: resourceDefs,
			authzRes: baseAuthzResources,
		});

		expect(result.additions).toStrictEqual([
			{ resource: alertResource, selectors: [ID_B] },
		]);
		expect(result.deletions).toBeNull();
	});
});

describe('objectsToPermissionConfig', () => {
	it('maps a wildcard selector to ALL scope', () => {
		const objects: CoretypesObjectGroupDTO[] = [
			{ resource: dashboardResource, selectors: ['*'] },
		];

		const result = objectsToPermissionConfig(objects, resourceDefs);

		expect(result.dashboard).toStrictEqual({
			scope: PermissionScope.ALL,
			selectedIds: [],
		});
	});

	it('maps specific selectors to ONLY_SELECTED scope with the IDs', () => {
		const objects: CoretypesObjectGroupDTO[] = [
			{ resource: dashboardResource, selectors: [ID_A, ID_B] },
		];

		const result = objectsToPermissionConfig(objects, resourceDefs);

		expect(result.dashboard).toStrictEqual({
			scope: PermissionScope.ONLY_SELECTED,
			selectedIds: [ID_A, ID_B],
		});
	});

	it('defaults to ONLY_SELECTED with empty selectedIds when resource is absent from API response', () => {
		const result = objectsToPermissionConfig([], resourceDefs);

		expect(result.dashboard).toStrictEqual({
			scope: PermissionScope.ONLY_SELECTED,
			selectedIds: [],
		});
		expect(result.alert).toStrictEqual({
			scope: PermissionScope.ONLY_SELECTED,
			selectedIds: [],
		});
	});
});

describe('configsEqual', () => {
	it('returns true for identical configs', () => {
		const config: PermissionConfig = {
			dashboard: { scope: PermissionScope.ALL, selectedIds: [] },
			alert: { scope: PermissionScope.ONLY_SELECTED, selectedIds: [ID_A] },
		};

		expect(configsEqual(config, { ...config })).toBe(true);
	});

	it('returns false when configs differ', () => {
		const a: PermissionConfig = {
			dashboard: { scope: PermissionScope.ALL, selectedIds: [] },
		};
		const b: PermissionConfig = {
			dashboard: { scope: PermissionScope.ONLY_SELECTED, selectedIds: [] },
		};

		expect(configsEqual(a, b)).toBe(false);

		const c: PermissionConfig = {
			dashboard: {
				scope: PermissionScope.ONLY_SELECTED,
				selectedIds: [ID_C, ID_B],
			},
		};
		const d: PermissionConfig = {
			dashboard: {
				scope: PermissionScope.ONLY_SELECTED,
				selectedIds: [ID_A, ID_B],
			},
		};

		expect(configsEqual(c, d)).toBe(false);
	});

	it('returns true when selectedIds are the same but in different order', () => {
		const a: PermissionConfig = {
			dashboard: {
				scope: PermissionScope.ONLY_SELECTED,
				selectedIds: [ID_A, ID_B],
			},
		};
		const b: PermissionConfig = {
			dashboard: {
				scope: PermissionScope.ONLY_SELECTED,
				selectedIds: [ID_B, ID_A],
			},
		};

		expect(configsEqual(a, b)).toBe(true);
	});
});

describe('buildConfig', () => {
	it('uses initial values when provided and defaults for resources not in initial', () => {
		const initial: PermissionConfig = {
			dashboard: { scope: PermissionScope.ALL, selectedIds: [] },
		};

		const result = buildConfig(resourceDefs, initial);

		expect(result.dashboard).toStrictEqual({
			scope: PermissionScope.ALL,
			selectedIds: [],
		});
		expect(result.alert).toStrictEqual(DEFAULT_RESOURCE_CONFIG);
	});

	it('applies DEFAULT_RESOURCE_CONFIG to all resources when no initial is provided', () => {
		const result = buildConfig(resourceDefs);

		expect(result.dashboard).toStrictEqual(DEFAULT_RESOURCE_CONFIG);
		expect(result.alert).toStrictEqual(DEFAULT_RESOURCE_CONFIG);
	});
});

describe('derivePermissionTypes', () => {
	it('derives one PermissionType per relation key with correct key and capitalised label', () => {
		const relations: AuthzResources['relations'] = {
			create: ['metaresource'],
			read: ['metaresource'],
			delete: ['metaresource'],
		};

		const result = derivePermissionTypes(relations);

		expect(result).toHaveLength(3);
		expect(result.map((p) => p.key)).toStrictEqual(['create', 'read', 'delete']);
		expect(result[0].label).toBe('Create');
	});

	it('falls back to the default set of permission types when relations is null', () => {
		const result = derivePermissionTypes(null);

		expect(result.map((p) => p.key)).toStrictEqual([
			'create',
			'list',
			'read',
			'update',
			'delete',
		]);
	});
});

describe('deriveResourcesForRelation', () => {
	it('returns resources whose type matches the relation', () => {
		const result = deriveResourcesForRelation(baseAuthzResources, 'create');

		expect(result).toHaveLength(2);
		expect(result.map((r) => r.id)).toStrictEqual(['dashboard', 'alert']);
	});

	it('returns an empty array when authzResources is null', () => {
		expect(deriveResourcesForRelation(null, 'create')).toHaveLength(0);
	});

	it('returns an empty array when the relation is not defined in the map', () => {
		expect(
			deriveResourcesForRelation(baseAuthzResources, 'nonexistent'),
		).toHaveLength(0);
	});
});

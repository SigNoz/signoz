import { useMemo, useState } from 'react';

import type { BrandedPermission } from '../../hooks/useAuthZ/types';
import { parsePermission } from '../../hooks/useAuthZ/utils';
import type { ObservedPermission, OverrideState } from '../types';

type SelectItem = {
	value: string;
	label: string;
};

type PermissionGroup = {
	resource: string;
	items: BrandedPermission[];
};

type UseAuthZDevModalDataResult = {
	search: string;
	setSearch: (search: string) => void;
	resourceFilter: string;
	setResourceFilter: (filter: string) => void;
	observedList: ObservedPermission[];
	resourceFilterItems: SelectItem[];
	filteredPermissions: BrandedPermission[];
	groups: PermissionGroup[];
	orderedPermissions: BrandedPermission[];
	indexByPermission: Map<string, number>;
	hasActiveFilter: boolean;
	filteredOverrideCount: number;
	overrideCount: number;
};

export function useAuthZDevModalData(
	observed: Record<string, ObservedPermission>,
	overrides: Record<string, OverrideState>,
): UseAuthZDevModalDataResult {
	const [search, setSearch] = useState('');
	const [resourceFilter, setResourceFilter] = useState<string>('all');

	const observedList = useMemo(
		() =>
			Object.values(observed).sort((a, b) =>
				a.permission.localeCompare(b.permission),
			),
		[observed],
	);

	const resources = useMemo(() => {
		const resourceSet = new Set<string>();
		for (const obs of observedList) {
			const { object } = parsePermission(obs.permission);
			const resource = object.split(':')[0];
			resourceSet.add(resource);
		}
		return Array.from(resourceSet).sort();
	}, [observedList]);

	const resourceFilterItems = useMemo<SelectItem[]>(
		() => [
			{ value: 'all', label: 'All resources' },
			...resources.map((resource) => ({
				value: resource,
				label: resource,
			})),
		],
		[resources],
	);

	const filteredPermissions = useMemo(() => {
		let filtered = observedList;

		if (search) {
			const searchLower = search.toLowerCase();
			filtered = filtered.filter((obs) =>
				obs.permission.toLowerCase().includes(searchLower),
			);
		}

		if (resourceFilter !== 'all') {
			filtered = filtered.filter((obs) => {
				const { object } = parsePermission(obs.permission);
				const resource = object.split(':')[0];
				return resource === resourceFilter;
			});
		}

		return filtered.map((obs) => obs.permission);
	}, [observedList, search, resourceFilter]);

	const { groups, orderedPermissions } = useMemo(() => {
		const groupMap = new Map<string, BrandedPermission[]>();
		for (const permission of filteredPermissions) {
			const { object } = parsePermission(permission);
			const resource = object.split(':')[0] || 'other';
			const bucket = groupMap.get(resource);
			if (bucket) {
				bucket.push(permission);
			} else {
				groupMap.set(resource, [permission]);
			}
		}

		const sortItems = (items: BrandedPermission[]): BrandedPermission[] =>
			[...items].sort((a, b) => {
				const objA = parsePermission(a).object;
				const objB = parsePermission(b).object;
				const idA = objA.split(':')[1] ?? '';
				const idB = objB.split(':')[1] ?? '';
				const isWildcardA = idA === '*';
				const isWildcardB = idB === '*';

				// Wildcards first
				if (isWildcardA && !isWildcardB) {
					return -1;
				}
				if (!isWildcardA && isWildcardB) {
					return 1;
				}

				// Then by object ID, then by full permission
				const idCompare = idA.localeCompare(idB);
				if (idCompare !== 0) {
					return idCompare;
				}
				return a.localeCompare(b);
			});

		const sortedGroups = Array.from(groupMap, ([resource, items]) => ({
			resource,
			items: sortItems(items),
		})).sort((a, b) => a.resource.localeCompare(b.resource));
		return {
			groups: sortedGroups,
			orderedPermissions: sortedGroups.flatMap((group) => group.items),
		};
	}, [filteredPermissions]);

	const indexByPermission = useMemo(() => {
		const map = new Map<string, number>();
		orderedPermissions.forEach((permission, index) => {
			map.set(permission, index);
		});
		return map;
	}, [orderedPermissions]);

	const hasActiveFilter = search !== '' || resourceFilter !== 'all';

	const filteredOverrideCount = useMemo(() => {
		if (!hasActiveFilter) {
			return Object.keys(overrides).length;
		}
		return filteredPermissions.filter((p) => p in overrides).length;
	}, [hasActiveFilter, overrides, filteredPermissions]);

	const overrideCount = Object.keys(overrides).length;

	return {
		search,
		setSearch,
		resourceFilter,
		setResourceFilter,
		observedList,
		resourceFilterItems,
		filteredPermissions,
		groups,
		orderedPermissions,
		indexByPermission,
		hasActiveFilter,
		filteredOverrideCount,
		overrideCount,
	};
}

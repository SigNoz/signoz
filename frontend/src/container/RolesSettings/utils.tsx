import React from 'react';
import { Badge } from '@signozhq/badge';
import type {
	AuthtypesGettableObjectsDTO,
	AuthtypesGettableResourcesDTO,
} from 'api/generated/services/sigNoz.schemas';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { capitalize } from 'lodash-es';
import { useTimezone } from 'providers/Timezone';

import type {
	PermissionConfig,
	ResourceConfig,
	ResourceDefinition,
} from './PermissionSidePanel/PermissionSidePanel.types';
import { PermissionScope } from './PermissionSidePanel/PermissionSidePanel.types';
import {
	FALLBACK_PERMISSION_ICON,
	PERMISSION_ICON_MAP,
} from './RoleDetails/constants';

export interface PermissionType {
	key: string;
	label: string;
	icon: JSX.Element;
}

export interface PatchPayloadOptions {
	newConfig: PermissionConfig;
	initialConfig: PermissionConfig;
	resources: ResourceDefinition[];
	authzRes: AuthtypesGettableResourcesDTO;
}

export function derivePermissionTypes(
	relations: AuthtypesGettableResourcesDTO['relations'] | null,
): PermissionType[] {
	const iconSize = { size: 14 };

	if (!relations) {
		return Object.entries(PERMISSION_ICON_MAP).map(([key, IconComp]) => ({
			key,
			label: capitalize(key),
			icon: React.createElement(IconComp, iconSize),
		}));
	}
	return Object.keys(relations).map((key) => {
		const IconComp = PERMISSION_ICON_MAP[key] ?? FALLBACK_PERMISSION_ICON;
		return {
			key,
			label: capitalize(key),
			icon: React.createElement(IconComp, iconSize),
		};
	});
}

export function deriveResourcesForRelation(
	authzResources: AuthtypesGettableResourcesDTO | null,
	relation: string,
): ResourceDefinition[] {
	if (!authzResources?.relations) {
		return [];
	}
	const supportedTypes = authzResources.relations[relation] ?? [];
	return authzResources.resources
		.filter((r) => supportedTypes.includes(r.type))
		.map((r) => ({
			id: r.name,
			label: capitalize(r.name).replace(/_/g, ' '),
			options: [],
		}));
}

export function objectsToPermissionConfig(
	objects: AuthtypesGettableObjectsDTO[],
	resources: ResourceDefinition[],
): PermissionConfig {
	const config: PermissionConfig = {};
	for (const res of resources) {
		const obj = objects.find((o) => o.resource.name === res.id);
		if (!obj) {
			config[res.id] = {
				scope: PermissionScope.ONLY_SELECTED,
				selectedIds: [],
			};
		} else {
			const isAll = obj.selectors.includes('*');
			config[res.id] = {
				scope: isAll ? PermissionScope.ALL : PermissionScope.ONLY_SELECTED,
				selectedIds: isAll ? [] : obj.selectors,
			};
		}
	}
	return config;
}

// eslint-disable-next-line sonarjs/cognitive-complexity
export function buildPatchPayload({
	newConfig,
	initialConfig,
	resources,
	authzRes,
}: PatchPayloadOptions): {
	additions: AuthtypesGettableObjectsDTO[] | null;
	deletions: AuthtypesGettableObjectsDTO[] | null;
} {
	if (!authzRes) {
		return { additions: null, deletions: null };
	}
	const additions: AuthtypesGettableObjectsDTO[] = [];
	const deletions: AuthtypesGettableObjectsDTO[] = [];

	for (const res of resources) {
		const initial = initialConfig[res.id];
		const current = newConfig[res.id];
		const resourceDef = authzRes.resources.find((r) => r.name === res.id);
		if (!resourceDef) {
			continue;
		}

		const initialScope = initial?.scope ?? PermissionScope.ONLY_SELECTED;
		const currentScope = current?.scope ?? PermissionScope.ONLY_SELECTED;

		if (initialScope === currentScope) {
			// Same scope — only diff individual selectors when both are ONLY_SELECTED
			if (initialScope === PermissionScope.ONLY_SELECTED) {
				const initialIds = new Set(initial?.selectedIds ?? []);
				const currentIds = new Set(current?.selectedIds ?? []);
				const removed = [...initialIds].filter((id) => !currentIds.has(id));
				const added = [...currentIds].filter((id) => !initialIds.has(id));
				if (removed.length > 0) {
					deletions.push({ resource: resourceDef, selectors: removed });
				}
				if (added.length > 0) {
					additions.push({ resource: resourceDef, selectors: added });
				}
			}
			// Both ALL → no change, skip
		} else {
			// Scope changed (ALL ↔ ONLY_SELECTED) — replace old with new
			const initialSelectors =
				initialScope === PermissionScope.ALL ? ['*'] : initial?.selectedIds ?? [];
			if (initialSelectors.length > 0) {
				deletions.push({ resource: resourceDef, selectors: initialSelectors });
			}
			const currentSelectors =
				currentScope === PermissionScope.ALL ? ['*'] : current?.selectedIds ?? [];
			if (currentSelectors.length > 0) {
				additions.push({ resource: resourceDef, selectors: currentSelectors });
			}
		}
	}

	return {
		additions: additions.length > 0 ? additions : null,
		deletions: deletions.length > 0 ? deletions : null,
	};
}

interface TimestampBadgeProps {
	date?: Date | string;
}

export function TimestampBadge({ date }: TimestampBadgeProps): JSX.Element {
	const { formatTimezoneAdjustedTimestamp } = useTimezone();

	if (!date) {
		return <Badge color="vanilla">—</Badge>;
	}

	const d = new Date(date);
	if (Number.isNaN(d.getTime())) {
		return <Badge color="vanilla">—</Badge>;
	}

	const formatted = formatTimezoneAdjustedTimestamp(
		date,
		DATE_TIME_FORMATS.DASH_DATETIME,
	);

	return <Badge color="vanilla">{formatted}</Badge>;
}

export const DEFAULT_RESOURCE_CONFIG: ResourceConfig = {
	scope: PermissionScope.ONLY_SELECTED,
	selectedIds: [],
};

export function buildConfig(
	resources: ResourceDefinition[],
	initial?: PermissionConfig,
): PermissionConfig {
	const config: PermissionConfig = {};
	resources.forEach((r) => {
		config[r.id] = initial?.[r.id] ?? { ...DEFAULT_RESOURCE_CONFIG };
	});
	return config;
}

export function isResourceConfigEqual(
	ac: ResourceConfig,
	bc?: ResourceConfig,
): boolean {
	if (!bc) {
		return false;
	}
	return (
		ac.scope === bc.scope &&
		JSON.stringify([...ac.selectedIds].sort()) ===
			JSON.stringify([...bc.selectedIds].sort())
	);
}

export function configsEqual(
	a: PermissionConfig,
	b: PermissionConfig,
): boolean {
	const keysA = Object.keys(a);
	const keysB = Object.keys(b);

	if (keysA.length !== keysB.length) {
		return false;
	}

	return keysA.every((id) => isResourceConfigEqual(a[id], b[id]));
}

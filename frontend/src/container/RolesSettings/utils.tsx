import React from 'react';
import { Badge } from '@signozhq/ui/badge';
import type {
	CoretypesResourceRefDTO,
	CoretypesObjectGroupDTO,
} from 'api/generated/services/sigNoz.schemas';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { capitalize } from 'lodash-es';
import { useTimezone } from 'providers/Timezone';

import type {
	PermissionConfig,
	ResourceConfig,
	ResourceDefinition,
	ScopeType,
} from './PermissionSidePanel/PermissionSidePanel.types';
import { PermissionScope } from './PermissionSidePanel/PermissionSidePanel.types';
import {
	FALLBACK_PERMISSION_ICON,
	PERMISSION_ICON_MAP,
} from './RoleDetails/constants';

export type AuthzResources = {
	resources: ReadonlyArray<CoretypesResourceRefDTO>;
	relations: Readonly<Record<string, ReadonlyArray<string>>>;
};

export interface PermissionType {
	key: string;
	label: string;
	icon: JSX.Element;
}

export interface PatchPayloadOptions {
	newConfig: PermissionConfig;
	initialConfig: PermissionConfig;
	resources: ResourceDefinition[];
	authzRes: AuthzResources;
}

export function derivePermissionTypes(
	relations: AuthzResources['relations'] | null,
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
	authzResources: AuthzResources | null,
	relation: string,
): ResourceDefinition[] {
	if (!authzResources?.relations) {
		return [];
	}
	const supportedTypes = authzResources.relations[relation] ?? [];
	return authzResources.resources
		.filter((r) => supportedTypes.includes(r.type))
		.map((r) => ({
			id: `${r.type}:${r.kind}`,
			kind: r.kind,
			type: r.type,
			label: r.kind,
			options: [],
		}));
}

export function objectsToPermissionConfig(
	objects: CoretypesObjectGroupDTO[],
	resources: ResourceDefinition[],
): PermissionConfig {
	const config: PermissionConfig = {};
	for (const res of resources) {
		const obj = objects.find(
			(o) => o.resource.kind === res.kind && o.resource.type === res.type,
		);
		if (!obj) {
			config[res.id] = {
				scope: PermissionScope.NONE,
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

function selectorsForScope(scope: ScopeType, selectedIds: string[]): string[] {
	if (scope === PermissionScope.ALL) {
		return ['*'];
	}
	if (scope === PermissionScope.ONLY_SELECTED) {
		return selectedIds;
	}
	return []; // NONE
}

// eslint-disable-next-line sonarjs/cognitive-complexity
export function buildPatchPayload({
	newConfig,
	initialConfig,
	resources,
	authzRes,
}: PatchPayloadOptions): {
	additions: CoretypesObjectGroupDTO[] | null;
	deletions: CoretypesObjectGroupDTO[] | null;
} {
	if (!authzRes) {
		return { additions: null, deletions: null };
	}
	const additions: CoretypesObjectGroupDTO[] = [];
	const deletions: CoretypesObjectGroupDTO[] = [];

	for (const res of resources) {
		const initial = initialConfig[res.id];
		const current = newConfig[res.id];
		const found = authzRes.resources.find(
			(r) => r.kind === res.kind && r.type === res.type,
		);
		if (!found) {
			continue;
		}
		const resourceDef: CoretypesResourceRefDTO = {
			kind: found.kind,
			type: found.type,
		};

		const initialScope = initial?.scope ?? PermissionScope.NONE;
		const currentScope = current?.scope ?? PermissionScope.NONE;

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
			// Both ALL or both NONE → no change, skip
		} else {
			// Scope changed — replace old selectors with new ones
			const initialSelectors = selectorsForScope(
				initialScope,
				initial?.selectedIds ?? [],
			);
			if (initialSelectors.length > 0) {
				deletions.push({ resource: resourceDef, selectors: initialSelectors });
			}
			const currentSelectors = selectorsForScope(
				currentScope,
				current?.selectedIds ?? [],
			);
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
	scope: PermissionScope.NONE,
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

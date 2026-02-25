import React from 'react';
import type {
	AuthtypesGettableObjectsDTO,
	AuthtypesGettableResourcesDTO,
} from 'api/generated/services/sigNoz.schemas';

import type {
	PermissionConfig,
	ResourceDefinition,
} from '../PermissionSidePanel';
import { FALLBACK_PERMISSION_ICON, PERMISSION_ICON_MAP } from './constants';

export interface PermissionType {
	key: string;
	label: string;
	icon: JSX.Element;
}

export interface PatchPayloadOptions {
	newConfig: PermissionConfig;
	currentObjects: AuthtypesGettableObjectsDTO[];
	resources: ResourceDefinition[];
	authzRes: AuthtypesGettableResourcesDTO;
}

export function capitalise(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

export function derivePermissionTypes(
	relations: AuthtypesGettableResourcesDTO['relations'] | null,
): PermissionType[] {
	const iconSize = { size: 14 };

	if (!relations) {
		return Object.entries(PERMISSION_ICON_MAP).map(([key, IconComp]) => ({
			key,
			label: capitalise(key),
			icon: React.createElement(IconComp, iconSize),
		}));
	}
	return Object.keys(relations).map((key) => {
		const IconComp = PERMISSION_ICON_MAP[key] ?? FALLBACK_PERMISSION_ICON;
		return {
			key,
			label: capitalise(key),
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
			label: capitalise(r.name).replace(/_/g, ' '),
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
			config[res.id] = { enabled: false, scope: 'all', selectedIds: [] };
		} else {
			const isAll = obj.selectors.includes('*');
			config[res.id] = {
				enabled: true,
				scope: isAll ? 'all' : 'only_selected',
				selectedIds: isAll ? [] : obj.selectors,
			};
		}
	}
	return config;
}

export function buildPatchPayload({
	newConfig,
	currentObjects,
	resources,
	authzRes,
}: PatchPayloadOptions): {
	additions: AuthtypesGettableObjectsDTO[] | null;
	deletions: AuthtypesGettableObjectsDTO[] | null;
} {
	const deletions = currentObjects.length > 0 ? currentObjects : null;

	const additions: AuthtypesGettableObjectsDTO[] = [];
	for (const res of resources) {
		const cfg = newConfig[res.id];
		if (!cfg?.enabled) {
			continue;
		}
		const resourceDef = authzRes.resources.find((r) => r.name === res.id);
		if (!resourceDef) {
			continue;
		}
		additions.push({
			resource: resourceDef,
			selectors: cfg.scope === 'all' ? ['*'] : cfg.selectedIds,
		});
	}

	return {
		additions: additions.length > 0 ? additions : null,
		deletions,
	};
}

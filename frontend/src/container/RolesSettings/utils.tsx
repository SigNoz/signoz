import React from 'react';
import { ErrorResponseHandlerForGeneratedAPIs } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import type {
	AuthtypesGettableObjectsDTO,
	AuthtypesGettableResourcesDTO,
	RenderErrorResponseDTO,
} from 'api/generated/services/sigNoz.schemas';
import { ErrorType } from 'api/generatedAPIInstance';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { capitalize } from 'lodash-es';
import { useTimezone } from 'providers/Timezone';
import APIError from 'types/api/error';

import type {
	PermissionConfig,
	ResourceConfig,
	ResourceDefinition,
} from './PermissionSidePanel';
import { PermissionScope } from './PermissionSidePanel';
import {
	FALLBACK_PERMISSION_ICON,
	PERMISSION_ICON_MAP,
} from './RoleDetails/constants';

import './RoleDetails/RoleDetailsPage.styles.scss';

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
				enabled: false,
				scope: PermissionScope.ALL,
				selectedIds: [],
			};
		} else {
			const isAll = obj.selectors.includes('*');
			config[res.id] = {
				enabled: true,
				scope: isAll ? PermissionScope.ALL : PermissionScope.ONLY_SELECTED,
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
			selectors: cfg.scope === PermissionScope.ALL ? ['*'] : cfg.selectedIds,
		});
	}

	return {
		additions: additions.length > 0 ? additions : null,
		deletions,
	};
}

interface TimestampBadgeProps {
	date?: Date | string;
}

export function TimestampBadge({ date }: TimestampBadgeProps): JSX.Element {
	const { formatTimezoneAdjustedTimestamp } = useTimezone();

	if (!date) {
		return <span className="role-details-badge">—</span>;
	}

	const d = new Date(date);
	if (Number.isNaN(d.getTime())) {
		return <span className="role-details-badge">—</span>;
	}

	const formatted = formatTimezoneAdjustedTimestamp(
		date,
		DATE_TIME_FORMATS.DASH_DATETIME,
	);

	return <span className="role-details-badge">{formatted}</span>;
}

export function handleApiError(
	err: ErrorType<RenderErrorResponseDTO>,
	showErrorModal: (error: APIError) => void,
): void {
	try {
		ErrorResponseHandlerForGeneratedAPIs(err);
	} catch (apiError) {
		showErrorModal(apiError as APIError);
	}
}

export const DEFAULT_RESOURCE_CONFIG: ResourceConfig = {
	enabled: false,
	scope: PermissionScope.ALL,
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

export function configsEqual(
	a: PermissionConfig,
	b: PermissionConfig,
): boolean {
	return Object.keys(a).every((id) => {
		const ac = a[id];
		const bc = b[id];
		if (!bc) {
			return false;
		}
		return (
			ac.enabled === bc.enabled &&
			ac.scope === bc.scope &&
			JSON.stringify([...ac.selectedIds].sort()) ===
				JSON.stringify([...bc.selectedIds].sort())
		);
	});
}

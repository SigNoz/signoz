/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type {
	AuthtypesGettableRoleDTO,
	AuthtypesRoleDTO,
	AuthtypesTransactionGroupDTO,
	GetRole200,
	ListRoles200,
} from 'api/generated/services/sigNoz.schemas';
import {
	AuthtypesRelationDTO,
	CoretypesKindDTO,
	CoretypesTypeDTO,
} from 'api/generated/services/sigNoz.schemas';
import { RoleType } from 'types/roles';

export const CUSTOM_ROLE_MAX = 8;

/** The three the backend ships with every org, which the list groups on their own. */
const MANAGED_ROLES = [
	{ name: 'admin', description: 'Full access to every resource in the org.' },
	{
		name: 'editor',
		description: 'Can create and change dashboards, alerts and views.',
	},
	{
		name: 'viewer',
		description: 'Read-only access to telemetry and saved work.',
	},
];

const CUSTOM_ROLES = [
	{
		name: 'oncall-responder',
		description: 'Reads telemetry and acknowledges alerts.',
	},
	{
		name: 'billing-owner',
		description: 'Manages the subscription and ingestion keys.',
	},
	{
		name: 'integration-bot',
		description: 'Writes pipelines from CI, reads nothing else.',
	},
	{
		name: 'dashboard-author',
		description: 'Builds dashboards over the shared metrics.',
	},
	{
		name: 'platform-sre',
		description: 'Runs the collectors and the ingestion limits.',
	},
	{
		name: 'support-engineer',
		description: 'Reads customer traces during an incident.',
	},
	{
		name: 'security-auditor',
		description: 'Reads audit logs and every role definition.',
	},
	{
		name: 'release-manager',
		description: 'Reads deploy dashboards and manages funnels.',
	},
];

const DAY = 24 * 60 * 60 * 1000;

/** Fixed epoch so a rerender does not move the "created" column. */
const CREATED_AT = Date.UTC(2026, 1, 14, 9, 30);

const timestamps = (
	index: number,
): Pick<AuthtypesGettableRoleDTO, 'createdAt' | 'updatedAt'> => ({
	createdAt: new Date(CREATED_AT - index * 3 * DAY).toISOString(),
	updatedAt: new Date(CREATED_AT - index * DAY).toISOString(),
});

export const CUSTOM_ROLE_ID = 'role-oncall-responder';
export const MANAGED_ROLE_ID = 'role-admin';

const roleId = (name: string): string => `role-${name}`;

const gettableRole = (
	seed: { name: string; description: string },
	type: RoleType,
	index: number,
): AuthtypesGettableRoleDTO => ({
	id: roleId(seed.name),
	name: seed.name,
	description: seed.description,
	orgId: 'story-org',
	type,
	...timestamps(index),
});

export const rolesListResponse = (customRoles: number): ListRoles200 => ({
	status: 'success',
	data: [
		...MANAGED_ROLES.map((seed, index) =>
			gettableRole(seed, RoleType.MANAGED, index),
		),
		...CUSTOM_ROLES.slice(0, customRoles).map((seed, index) =>
			gettableRole(seed, RoleType.CUSTOM, index + MANAGED_ROLES.length),
		),
	],
});

const objectGroup = (
	kind: CoretypesKindDTO,
	type: CoretypesTypeDTO,
	selectors: string[],
	relation: AuthtypesRelationDTO,
): AuthtypesTransactionGroupDTO => ({
	objectGroup: { resource: { kind, type }, selectors },
	relation,
});

const WILDCARD = ['*'];

/**
 * A grant wide enough that the overview shows all three scopes: whole-resource,
 * a named subset, and resources with nothing granted at all.
 */
const BROAD_GRANT: AuthtypesTransactionGroupDTO[] = [
	objectGroup(
		CoretypesKindDTO.logs,
		CoretypesTypeDTO.telemetryresource,
		WILDCARD,
		AuthtypesRelationDTO.read,
	),
	objectGroup(
		CoretypesKindDTO.traces,
		CoretypesTypeDTO.telemetryresource,
		WILDCARD,
		AuthtypesRelationDTO.read,
	),
	objectGroup(
		CoretypesKindDTO.metrics,
		CoretypesTypeDTO.telemetryresource,
		['attribute/service.name/checkout', 'attribute/service.name/payments'],
		AuthtypesRelationDTO.read,
	),
	objectGroup(
		CoretypesKindDTO.serviceaccount,
		CoretypesTypeDTO.serviceaccount,
		WILDCARD,
		AuthtypesRelationDTO.list,
	),
	objectGroup(
		CoretypesKindDTO['factor-api-key'],
		CoretypesTypeDTO.metaresource,
		['key-ci-pipeline'],
		AuthtypesRelationDTO.read,
	),
	objectGroup(
		CoretypesKindDTO.role,
		CoretypesTypeDTO.role,
		WILDCARD,
		AuthtypesRelationDTO.list,
	),
];

/** The narrow end: one resource, one verb, one named object. */
const NARROW_GRANT: AuthtypesTransactionGroupDTO[] = [
	objectGroup(
		CoretypesKindDTO.logs,
		CoretypesTypeDTO.telemetryresource,
		['attribute/deployment.environment/production'],
		AuthtypesRelationDTO.read,
	),
];

export const PERMISSION_BREADTHS = ['broad', 'narrow', 'none'] as const;

export type PermissionBreadth = (typeof PERMISSION_BREADTHS)[number];

const grantFor = (
	breadth: PermissionBreadth,
): AuthtypesTransactionGroupDTO[] => {
	switch (breadth) {
		case 'narrow':
			return NARROW_GRANT;

		case 'none':
			return [];

		default:
			return BROAD_GRANT;
	}
};

export const roleResponse = (
	id: string,
	type: RoleType,
	breadth: PermissionBreadth,
): GetRole200 => {
	const name = id.replace(/^role-/, '');
	const seed =
		[...MANAGED_ROLES, ...CUSTOM_ROLES].find((entry) => entry.name === name) ??
		CUSTOM_ROLES[0];

	const role: AuthtypesRoleDTO = {
		id,
		name,
		description: seed.description,
		orgId: 'story-org',
		type,
		transactionGroups: grantFor(breadth),
		...timestamps(0),
	};

	return { status: 'success', data: role };
};

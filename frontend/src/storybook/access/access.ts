import type { AuthtypesTransactionDTO } from 'api/generated/services/sigNoz.schemas';
import {
	IsAdminPermission,
	IsAnonymousPermission,
	IsEditorPermission,
	IsViewerPermission,
} from 'lib/authz/hooks/useAuthZ/legacy';
import permissionsType from 'lib/authz/hooks/useAuthZ/permissions.type';
import {
	formatPermission,
	gettableTransactionToPermission,
} from 'lib/authz/hooks/useAuthZ/utils';
import { ROLES, USER_ROLES } from 'types/roles';

/**
 * `relation:kind` for every verb the backend allows on a resource, from the
 * generated permission catalogue, so a resource added there shows up here
 * without anyone touching this file. Selector-scoped checks (`role:some-id`)
 * match the entry for their kind.
 */
export const permissionCatalogue = (): string[] => {
	const entries = new Set<string>();

	for (const [relation, types] of Object.entries(
		permissionsType.data.relations,
	)) {
		for (const resource of permissionsType.data.resources) {
			const appliesToResource = (types as readonly string[]).includes(
				resource.type,
			);

			const allowsVerb = (resource.allowedVerbs as readonly string[]).includes(
				relation,
			);

			if (appliesToResource && allowsVerb) {
				entries.add(`${relation}:${resource.kind}`);
			}
		}
	}

	return [...entries].sort();
};

const CATALOGUE = permissionCatalogue();

const TELEMETRY_READS = CATALOGUE.filter((permission) =>
	permissionsType.data.resources.some(
		(resource) =>
			resource.type === 'telemetryresource' &&
			permission === `read:${resource.kind}`,
	),
);

/**
 * `user.role` is itself an authz check in the real app (`AppProvider` derives it
 * from these), so a caller that wants a role grants the matching permission
 * rather than setting the role directly.
 */
export const LEGACY_ROLE_PERMISSIONS = {
	[USER_ROLES.ADMIN]: formatPermission(IsAdminPermission),
	[USER_ROLES.EDITOR]: formatPermission(IsEditorPermission),
	[USER_ROLES.VIEWER]: formatPermission(IsViewerPermission),
	[USER_ROLES.ANONYMOUS]: formatPermission(IsAnonymousPermission),
};

export const ACCESS_PRESETS = [
	'admin',
	'editor',
	'viewer',
	'anonymous',
	'grant-all',
	'deny-all',
	'custom',
	'dev-tools',
] as const;

export type AccessPreset = (typeof ACCESS_PRESETS)[number];

/**
 * The legacy roles only differ in authz for the resources the backend already
 * covers: an admin manages roles, service accounts and API keys, while editor
 * and viewer are telemetry readers and differ through `user.role` alone. The
 * presets go away with the roles; the permission list does not.
 */
const ADMIN_PERMISSIONS = [
	LEGACY_ROLE_PERMISSIONS[USER_ROLES.ADMIN],
	// Without the `assignee` wildcard, which would hand out every legacy role at
	// once. That is what `grant-all` is for.
	...CATALOGUE.filter((permission) => permission !== 'assignee:role'),
];

const PRESET_PERMISSIONS: Record<AccessPreset, readonly string[]> = {
	admin: ADMIN_PERMISSIONS,
	editor: [LEGACY_ROLE_PERMISSIONS[USER_ROLES.EDITOR], ...TELEMETRY_READS],
	viewer: [LEGACY_ROLE_PERMISSIONS[USER_ROLES.VIEWER], ...TELEMETRY_READS],
	anonymous: [LEGACY_ROLE_PERMISSIONS[USER_ROLES.ANONYMOUS]],
	'grant-all': [...Object.values(LEGACY_ROLE_PERMISSIONS), ...CATALOGUE],
	'deny-all': [],
	custom: [],
	'dev-tools': ADMIN_PERMISSIONS,
};

/** Every permission a caller can grant on top of a preset. */
export const PERMISSION_OPTIONS = [
	...Object.values(LEGACY_ROLE_PERMISSIONS),
	...CATALOGUE,
];

export interface AccessGrant {
	permissions: ReadonlySet<string>;
	/** Answers one `authz/check` transaction the way the backend would. */
	allows(transaction: AuthtypesTransactionDTO): boolean;
	/**
	 * The legacy role the granted `assignee:role:signoz-*` permissions derive,
	 * the way `AppProvider` derives it. No legacy role granted lands on
	 * `ANONYMOUS`.
	 */
	legacyRole: ROLES;
}

const deriveLegacyRole = (granted: ReadonlySet<string>): ROLES => {
	const role = Object.entries(LEGACY_ROLE_PERMISSIONS).find(([, permission]) =>
		granted.has(permission),
	);

	return (role?.[0] ?? USER_ROLES.ANONYMOUS) as ROLES;
};

/**
 * The permission set a preset plus its extra grants resolve to, and the two
 * questions the app asks of it. `custom` and `deny-all` start from nothing, so
 * there the extra grants are the whole set.
 */
export const accessFor = (
	preset: AccessPreset,
	extraPermissions: readonly string[] = [],
): AccessGrant => {
	const permissions = new Set([
		...PRESET_PERMISSIONS[preset],
		...extraPermissions,
	]);

	return {
		permissions,
		allows: (transaction): boolean =>
			permissions.has(
				formatPermission(gettableTransactionToPermission(transaction)),
			) ||
			permissions.has(
				`${transaction.relation}:${transaction.object.resource.kind}`,
			),
		legacyRole: deriveLegacyRole(permissions),
	};
};

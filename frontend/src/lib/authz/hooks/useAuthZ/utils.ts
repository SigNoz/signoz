import {
	AuthtypesTransactionDTO,
	CoretypesTypeDTO,
	AuthtypesRelationDTO,
	CoretypesKindDTO,
} from '../../../../api/generated/services/sigNoz.schemas';
import permissionsType from './permissions.type';
import {
	AuthZObject,
	AuthZRelation,
	BrandedPermission,
	ResourcesForRelation,
	ResourceType,
} from './types';

export const PermissionSeparator = '||__||';
export const ObjectSeparator = ':';

export function buildPermission<R extends AuthZRelation>(
	relation: R,
	object: AuthZObject<R>,
): BrandedPermission {
	return `${relation}${PermissionSeparator}${object}` as BrandedPermission;
}

/**
 * Builds an object string for use with `buildPermission`.
 *
 * ## Type Inference Behavior
 *
 * TypeScript infers `R` from `resource`. If a resource belongs to multiple relations,
 * the return type becomes a union of all matching `AuthZObject` types.
 *
 * Example: 'role' is valid for 'read', 'update', 'delete', 'assignee'.
 * Without explicit generic, return type = `AuthZObject<'read' | 'update' | 'delete' | 'assignee'>`.
 *
 * ## When to specify explicit generic
 *
 * **Needed** when resource belongs to multiple relations AND you pass result to `buildPermission`
 * with a relation that has FEWER valid resources than others:
 *
 * ```ts
 * // ERROR: 'read' includes telemetry resources, 'update' does not
 * buildPermission('update', buildObjectString('role', 'admin'))
 *
 * // OK: explicit generic narrows return type
 * buildPermission('update', buildObjectString<'update'>('role', 'admin'))
 * ```
 *
 * **Not needed** when:
 * - Resource only belongs to one relation in the constraint
 * - Using with 'read' relation (widest type, accepts all)
 * - Storing in a variable typed as `BrandedPermission` (already opaque)
 *
 * ```ts
 * // OK: 'read' is widest, accepts union return type
 * buildPermission('read', buildObjectString('role', 'admin'))
 * ```
 */
export function buildObjectString<
	R extends 'delete' | 'read' | 'update' | 'assignee',
>(resource: ResourcesForRelation<R>, objectId: string): AuthZObject<R> {
	return `${resource}${ObjectSeparator}${objectId}` as AuthZObject<R>;
}

export type ParsedPermissionObject = {
	relation: AuthZRelation;
	object: string;
};

export function parsePermission(
	permission: BrandedPermission,
): ParsedPermissionObject {
	const [relation, object] = permission.split(PermissionSeparator);
	return { relation: relation as AuthZRelation, object };
}

export function formatPermission(permission: BrandedPermission): string {
	const { relation, object } = parsePermission(permission);
	return `${relation}:${object}`;
}

const kindsByType = permissionsType.data.resources.reduce(
	(acc, r) => {
		if (!acc[r.type]) {
			acc[r.type] = new Set();
		}
		acc[r.type].add(r.kind);
		return acc;
	},
	{} as Record<string, Set<string>>,
);

function resolveType(
	relation: AuthZRelation,
	kind: string,
): ResourceType | undefined {
	const candidates: readonly string[] =
		permissionsType.data.relations[relation] ?? [];
	for (const t of candidates) {
		if (kindsByType[t]?.has(kind)) {
			return t as ResourceType;
		}
	}
	return undefined;
}

function splitObjectString(objectStr: string): {
	resourceName: string;
	selector: string;
} {
	const idx = objectStr.indexOf(ObjectSeparator);
	if (idx === -1) {
		return { resourceName: objectStr, selector: '' };
	}
	return {
		resourceName: objectStr.slice(0, idx),
		selector: objectStr.slice(idx + 1),
	};
}

export function permissionToTransactionDto(
	permission: BrandedPermission,
): AuthtypesTransactionDTO {
	const { relation, object: objectStr } = parsePermission(permission);
	const { resourceName, selector } = splitObjectString(objectStr);
	const type = resolveType(relation, resourceName) ?? 'metaresource';

	return {
		relation: relation as AuthtypesRelationDTO,
		object: {
			resource: {
				kind: resourceName as CoretypesKindDTO,
				type: type as CoretypesTypeDTO,
			},
			selector: selector || '*',
		},
	};
}

export function gettableTransactionToPermission(
	item: AuthtypesTransactionDTO,
): BrandedPermission {
	const {
		relation,
		object: { resource, selector },
	} = item;
	const resourceName = String(resource.kind);
	const selectorStr = typeof selector === 'string' ? selector : '*';
	const objectStr = `${resourceName}${ObjectSeparator}${selectorStr}`;
	return `${relation}${PermissionSeparator}${objectStr}` as BrandedPermission;
}

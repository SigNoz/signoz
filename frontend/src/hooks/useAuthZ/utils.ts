import {
	AuthtypesTransactionDTO,
	CoretypesTypeDTO,
	AuthtypesRelationDTO,
} from '../../api/generated/services/sigNoz.schemas';
import permissionsType from './permissions.type';
import {
	AuthZObject,
	AuthZRelation,
	BrandedPermission,
	ResourceName,
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

export function buildObjectString<
	R extends 'delete' | 'read' | 'update' | 'assignee',
>(resource: ResourcesForRelation<R>, objectId: string): AuthZObject<R> {
	return `${resource}${ObjectSeparator}${objectId}` as AuthZObject<R>;
}

export function parsePermission(permission: BrandedPermission): {
	relation: AuthZRelation;
	object: string;
} {
	const [relation, object] = permission.split(PermissionSeparator);
	return { relation: relation as AuthZRelation, object };
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
	const directType = resolveType(relation, objectStr);
	if (directType === 'metaresources') {
		return {
			relation: relation as AuthtypesRelationDTO,
			object: {
				resource: {
					kind: objectStr as ResourceName,
					type: directType as CoretypesTypeDTO,
				},
				selector: '*',
			},
		};
	}
	const { resourceName, selector } = splitObjectString(objectStr);
	const type = resolveType(relation, resourceName) ?? 'metaresource';

	return {
		relation: relation as AuthtypesRelationDTO,
		object: {
			resource: {
				kind: resourceName as ResourceName,
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
	const objectStr =
		resource.type === 'metaresources'
			? resourceName
			: `${resourceName}${ObjectSeparator}${selectorStr}`;
	return `${relation}${PermissionSeparator}${objectStr}` as BrandedPermission;
}

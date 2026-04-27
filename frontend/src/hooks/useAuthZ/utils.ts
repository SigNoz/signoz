import {
	AuthtypesTransactionDTO,
	CoretypesVerbDTO,
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

const resourceNameToType = permissionsType.data.resources.reduce((acc, r) => {
	acc[r.kind] = r.type;
	return acc;
}, {} as Record<ResourceName, ResourceType>);

export function permissionToTransactionDto(
	permission: BrandedPermission,
): AuthtypesTransactionDTO {
	const { relation, object: objectStr } = parsePermission(permission);
	const directType = resourceNameToType[objectStr as ResourceName];
	if (directType === 'metaresources') {
		return {
			relation: relation as CoretypesVerbDTO,
			object: {
				resource: { kind: objectStr, type: directType },
				selector: '*',
			},
		};
	}
	const [resourceName, selector] = objectStr.split(ObjectSeparator);
	const type =
		resourceNameToType[resourceName as ResourceName] ?? 'metaresource';

	return {
		relation: relation as CoretypesVerbDTO,
		object: {
			resource: { kind: resourceName, type },
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

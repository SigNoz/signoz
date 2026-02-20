export type AuthZRelation =
	| 'list'
	| 'create'
	| 'read'
	| 'update'
	| 'delete'
	| 'assignee';
export type AuthZResource = 'dashboard';
export type AuthZObject<R extends AuthZRelation> = R extends 'list' | 'create'
	? `${AuthZResource}s`
	: `${AuthZResource}:${string}`;

export type AuthZPermissionCheck<R extends AuthZRelation> = {
	object: AuthZObject<R>;
	relation: R;
};

export type BrandedPermission = string & { __brandedPermission: true };

export function buildPermission<R extends AuthZRelation>(
	relation: R,
	object: AuthZObject<R>,
): BrandedPermission {
	return `${relation}/${object}` as BrandedPermission;
}

export function buildObjectString(
	resource: AuthZResource,
	objectId: string,
): `${AuthZResource}:${string}` {
	return `${resource}:${objectId}`;
}

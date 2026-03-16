import permissionsType from './permissions.type';
import { ObjectSeparator } from './utils';

type PermissionsData = typeof permissionsType.data;
export type Resource = PermissionsData['resources'][number];
export type ResourceName = Resource['name'];
export type ResourceType = Resource['type'];

type RelationsByType = PermissionsData['relations'];

type ResourceTypeMap = {
	[K in ResourceName]: Extract<Resource, { name: K }>['type'];
};

type RelationName = keyof RelationsByType;

type ResourcesForRelation<R extends RelationName> = Extract<
	Resource,
	{ type: RelationsByType[R][number] }
>['name'];

type IsPluralResource<
	R extends ResourceName
> = ResourceTypeMap[R] extends 'metaresources' ? true : false;

type ObjectForResource<R extends ResourceName> = R extends infer U
	? U extends ResourceName
		? IsPluralResource<U> extends true
			? U
			: `${U}${typeof ObjectSeparator}${string}`
		: never
	: never;

type RelationToObject<R extends RelationName> = ObjectForResource<
	ResourcesForRelation<R>
>;

type AllRelations = RelationName;

export type AuthZRelation = AllRelations;
export type AuthZResource = ResourceName;
export type AuthZObject<R extends AuthZRelation> = RelationToObject<R>;

export type BrandedPermission = string & { __brandedPermission: true };

export type AuthZCheckResponse = Record<
	BrandedPermission,
	{
		isGranted: boolean;
	}
>;

export type UseAuthZResult = {
	isLoading: boolean;
	error: Error | null;
	permissions: AuthZCheckResponse | null;
};

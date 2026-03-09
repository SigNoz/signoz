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

export type ResourcesForRelation<R extends RelationName> = Extract<
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

export type UseAuthZOptions = {
	/**
	 * If false, the query/permissions will not be fetched.
	 * Useful when you want to disable the query/permissions for a specific use case, like logout.
	 *
	 * @default true
	 */
	enabled?: boolean;
};

export type UseAuthZResult = {
	/**
	 * If query is cached, and refetch happens in background, this is false.
	 */
	isLoading: boolean;
	/**
	 * If query is fetching, even if happens in background, this is true.
	 */
	isFetching: boolean;
	error: Error | null;
	permissions: AuthZCheckResponse | null;
	refetchPermissions: () => void;
};

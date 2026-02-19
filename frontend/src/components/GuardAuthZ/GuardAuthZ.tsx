import { ReactElement } from 'react';
import { useAuthZ } from 'hooks/useAuthZ/useAuthZ';
import {
	AuthZObject,
	AuthZRelation,
	BrandedPermission,
	buildPermission,
} from 'hooks/useAuthZ/utils';

export type GuardAuthZProps<R extends AuthZRelation> = {
	children: ReactElement;
	relation: R;
	object: AuthZObject<R>;
	fallbackOnLoading?: JSX.Element;
	fallbackOnError?: (error: Error) => JSX.Element;
	fallbackOnNoPermissions?: (response: {
		requiredPermissionName: BrandedPermission;
	}) => JSX.Element;
};

export function GuardAuthZ<R extends AuthZRelation>({
	children,
	relation,
	object,
	fallbackOnLoading,
	fallbackOnError,
	fallbackOnNoPermissions,
}: GuardAuthZProps<R>): JSX.Element | null {
	const permission = buildPermission<R>(relation, object);

	const { permissions, isLoading, error } = useAuthZ([permission]);

	if (isLoading) {
		return fallbackOnLoading ?? null;
	}

	if (error) {
		return fallbackOnError?.(error) ?? null;
	}

	if (!permissions?.[permission]?.isGranted) {
		return (
			fallbackOnNoPermissions?.({
				requiredPermissionName: permission,
			}) ?? null
		);
	}

	return children;
}

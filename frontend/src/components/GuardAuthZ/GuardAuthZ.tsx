import { ReactElement } from 'react';
import {
	AuthZObject,
	AuthZRelation,
	BrandedPermission,
} from 'hooks/useAuthZ/types';
import { useAuthZ } from 'hooks/useAuthZ/useAuthZ';
import { buildPermission } from 'hooks/useAuthZ/utils';

export type GuardAuthZProps<R extends AuthZRelation> = {
	children: ReactElement;
	relation: R;
	object: AuthZObject<R>;
	fallbackOnLoading?: JSX.Element;
	fallbackOnNoPermissions?: (response: {
		requiredPermissionName: BrandedPermission;
	}) => JSX.Element;
};

export function GuardAuthZ<R extends AuthZRelation>({
	children,
	relation,
	object,
	fallbackOnLoading,
	fallbackOnNoPermissions,
}: GuardAuthZProps<R>): JSX.Element | null {
	const permission = buildPermission<R>(relation, object);

	const { permissions, isLoading } = useAuthZ([permission]);

	if (isLoading) {
		return fallbackOnLoading ?? null;
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

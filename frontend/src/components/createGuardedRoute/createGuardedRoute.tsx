import { ComponentType, ReactElement, useMemo } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import {
	AuthZObject,
	AuthZRelation,
	BrandedPermission,
} from 'hooks/useAuthZ/types';
import { formatPermission } from 'hooks/useAuthZ/utils';
import { useAppContext } from 'providers/App/App';

import noDataUrl from '@/assets/Icons/no-data.svg';

import AppLoading from '../AppLoading/AppLoading';
import { GuardAuthZ } from '../GuardAuthZ/GuardAuthZ';

import './createGuardedRoute.styles.scss';

function OnNoPermissionsFallback(response: {
	requiredPermissionName: BrandedPermission;
}): ReactElement {
	const { user } = useAppContext();

	return (
		<div className="guard-authz-error-no-authz">
			<div className="guard-authz-error-no-authz-content">
				<img src={noDataUrl} alt="No permission" />
				<h3>Uh-oh! You are not authorized</h3>
				<p>
					<code>user/{user.id}</code> is not authorized to perform{' '}
					<code>{formatPermission(response.requiredPermissionName)}</code>
				</p>
			</div>
		</div>
	);
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function createGuardedRoute<P extends object, R extends AuthZRelation>(
	Component: ComponentType<P>,
	relation: R,
	object: AuthZObject<R>,
): ComponentType<P & RouteComponentProps<Record<string, string>>> {
	return function GuardedRouteComponent(
		props: P & RouteComponentProps<Record<string, string>>,
	): ReactElement {
		const resolvedObject = useMemo(() => {
			const paramPattern = /\{([^}]+)\}/g;
			return object.replace(paramPattern, (match, paramName) => {
				const paramValue = props.match?.params?.[paramName];
				return paramValue !== undefined ? paramValue : match;
			}) as AuthZObject<R>;
		}, [props.match?.params]);

		return (
			<GuardAuthZ
				relation={relation}
				object={resolvedObject}
				fallbackOnLoading={<AppLoading />}
				fallbackOnNoPermissions={(response): ReactElement => (
					<OnNoPermissionsFallback {...response} />
				)}
			>
				<Component {...props} />
			</GuardAuthZ>
		);
	};
}

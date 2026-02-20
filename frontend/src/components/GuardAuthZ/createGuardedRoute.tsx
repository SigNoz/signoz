import { ComponentType, ReactElement, useMemo } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { toast } from '@signozhq/sonner';
import {
	AuthZObject,
	AuthZRelation,
	BrandedPermission,
} from 'hooks/useAuthZ/utils';
import { Copy } from 'lucide-react';

import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';
import ErrorBoundaryFallback from '../../pages/ErrorBoundaryFallback/ErrorBoundaryFallback';
import AppLoading from '../AppLoading/AppLoading';
import { GuardAuthZ } from './GuardAuthZ';

import './createGuardedRoute.styles.scss';

const onErrorFallback = (): JSX.Element => <ErrorBoundaryFallback />;

function OnNoPermissionsFallback(response: {
	requiredPermissionName: BrandedPermission;
}): ReactElement {
	const { copyToClipboard } = useCopyToClipboard();
	const onClickToCopy = (): void => {
		copyToClipboard(response.requiredPermissionName, 'required-permission');

		toast.success('Permission copied to clipboard');
	};

	return (
		<div className="guard-authz-error-no-authz">
			<div className="guard-authz-error-no-authz-content">
				<img src="/Icons/no-data.svg" alt="No permission" />
				<h3>Uh-oh! You don’t have permission to view this page.</h3>
				<p>
					You need the following permission to view this page:
					<br />
					<pre onClick={onClickToCopy}>
						{response.requiredPermissionName} <Copy size={12} />
					</pre>
					Ask your SigNoz administrator to grant access.
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
				fallbackOnError={onErrorFallback}
				fallbackOnNoPermissions={(response): ReactElement => (
					<OnNoPermissionsFallback {...response} />
				)}
			>
				<Component {...props} />
			</GuardAuthZ>
		);
	};
}

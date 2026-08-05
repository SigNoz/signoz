import { ReactElement } from 'react';
import AppLoading from 'components/AppLoading/AppLoading';
import PermissionDeniedFullPage from 'lib/authz/components/PermissionDeniedFullPage/PermissionDeniedFullPage';

import { AuthZGuard, AuthZGuardProps } from './AuthZGuard';

export function AuthZGuardPage({
	fallback,
	fallbackOnLoading,
	...rest
}: AuthZGuardProps): JSX.Element | null {
	return (
		<AuthZGuard
			{...rest}
			fallbackOnLoading={fallbackOnLoading ?? <AppLoading />}
			fallback={
				fallback ??
				(({ deniedPermissions }): ReactElement => (
					<PermissionDeniedFullPage deniedPermissions={deniedPermissions} />
				))
			}
		/>
	);
}

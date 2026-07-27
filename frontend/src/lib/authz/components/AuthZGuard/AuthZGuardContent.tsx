import { ReactElement } from 'react';
import PermissionDeniedCallout from 'lib/authz/components/PermissionDeniedCallout/PermissionDeniedCallout';

import { AuthZGuard, AuthZGuardProps } from './AuthZGuard';

export function AuthZGuardContent({
	fallback,
	...rest
}: AuthZGuardProps): JSX.Element | null {
	return (
		<AuthZGuard
			{...rest}
			fallback={
				fallback ??
				(({ deniedPermissions }): ReactElement => (
					<PermissionDeniedCallout deniedPermissions={deniedPermissions} />
				))
			}
		/>
	);
}

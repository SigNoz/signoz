import { useMemo } from 'react';
import { Button, ButtonProps } from '@signozhq/ui/button';
import { AUTHZ_LOADING_TOOLTIP } from 'lib/authz/components/constants';
import { formatDeniedMessage } from 'lib/authz/components/formatDeniedMessage';
import type { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';
import { useAuthZ } from 'lib/authz/hooks/useAuthZ/useAuthZ';
import { useAppContext } from 'providers/App/App';

export type AuthZButtonProps = ButtonProps & {
	/**
	 * Permissions required to enable the button (AND semantics).
	 */
	checks: BrandedPermission[];
	/**
	 * Gate the permission check itself. When false, renders a plain button.
	 */
	authZEnabled?: boolean;
	/** Replace the standard denial wording; prefer the default. */
	tooltipMessage?: string;
	/**
	 * A non-permission block the consumer already knows about — a lock, an
	 * immutable resource. Disables the button and takes precedence over `checks`,
	 * which are then skipped.
	 */
	disabledTooltip?: ButtonProps['disabledTooltip'];
};

function AuthZButton({
	checks,
	authZEnabled = true,
	tooltipMessage,
	disabled,
	disabledTooltip,
	loading,
	loadingTooltip,
	...buttonProps
}: AuthZButtonProps): JSX.Element {
	const { user } = useAppContext();

	const isBlocked = !!disabledTooltip;
	const shouldCheck = authZEnabled && checks.length > 0 && !isBlocked;

	const { permissions, isLoading } = useAuthZ(checks, { enabled: shouldCheck });

	const deniedPermissions = useMemo(() => {
		if (!shouldCheck || !permissions) {
			return [];
		}
		return checks.filter((p) => permissions[p]?.isGranted === false);
	}, [shouldCheck, checks, permissions]);

	const isPending = shouldCheck && isLoading;
	const isDenied = deniedPermissions.length > 0;

	return (
		<Button
			{...buttonProps}
			disabled={disabled || isBlocked || isDenied}
			disabledTooltip={
				isDenied
					? formatDeniedMessage(deniedPermissions, user.id, tooltipMessage)
					: disabledTooltip
			}
			loading={loading || isPending}
			loadingTooltip={
				isPending && !loading ? AUTHZ_LOADING_TOOLTIP : loadingTooltip
			}
			data-denied-permissions={isDenied ? deniedPermissions.join(',') : undefined}
		/>
	);
}

export default AuthZButton;

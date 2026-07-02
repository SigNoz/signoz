import { ReactElement, ReactNode } from 'react';
import type { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';
import { useAuthZ } from 'lib/authz/hooks/useAuthZ/useAuthZ';

export type AuthZGuardFallback =
	| ReactNode
	| ((info: { deniedPermissions: BrandedPermission[] }) => ReactNode);

export type AuthZGuardProps = {
	/**
	 * Permissions required to render `children` (AND semantics).
	 */
	checks: BrandedPermission[];
	children: ReactElement;
	/**
	 * Rendered when denied. A function receives the denied permissions.
	 */
	fallback?: AuthZGuardFallback;
	fallbackOnLoading?: ReactNode;
	/**
	 * By default, we don't expect the check API request to fail, in those cases, we prefer to show the content and then let the API fail (during list/create).
	 *
	 * In case you want to have a different behavior when request fail, set to false.
	 *
	 * @default true
	 */
	onFailRenderContent?: boolean;
};

function resolveFallback(
	fallback: AuthZGuardFallback | undefined,
	deniedPermissions: BrandedPermission[],
): ReactNode {
	if (typeof fallback === 'function') {
		return fallback({ deniedPermissions });
	}
	return fallback ?? null;
}

export function AuthZGuard({
	checks,
	children,
	fallback,
	fallbackOnLoading,
	onFailRenderContent = true,
}: AuthZGuardProps): JSX.Element | null {
	const { allowed, isLoading, error, deniedPermissions } = useAuthZ(checks);

	if (isLoading) {
		return <>{fallbackOnLoading ?? null}</>;
	}

	if (error) {
		return onFailRenderContent ? (
			children
		) : (
			<>{resolveFallback(fallback, deniedPermissions)}</>
		);
	}

	if (!allowed) {
		return <>{resolveFallback(fallback, deniedPermissions)}</>;
	}

	return children;
}

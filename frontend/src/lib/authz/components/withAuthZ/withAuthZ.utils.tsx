import { ComponentType, ReactElement, createElement, useMemo } from 'react';
import {
	matchPath as reactRouterMatchPath,
	useLocation,
	useParams,
} from 'react-router-dom';
import type { AuthZGuardProps } from 'lib/authz/components/AuthZGuard/AuthZGuard';
import type { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';

export type RouterContext = {
	/**
	 * Route params from useParams (e.g. `/roles/:roleId` → `{ roleId: "r-1" }`)
	 */
	params: Record<string, string | undefined>;
	pathname: string;
	/**
	 * Query params as URLSearchParams (use `.get('key')` to read)
	 */
	searchParams: URLSearchParams;
	/**
	 * Extract params from pathname using a route pattern.
	 * Returns null if pattern doesn't match.
	 * @example router.matchPath<{ id: string }>('/edit/:id')?.id
	 */
	matchPath: <Params extends Record<string, string>>(
		pattern: string,
	) => Params | null;
};

export type WithAuthZOptions<P> = {
	/**
	 * Static checks, or a selector deriving them from props and router context.
	 * Use router context to extract dynamic values from route params, pathname, or query params.
	 * @example
	 * // From route params
	 * checks: (props, router) => [buildPermission('read', `role:${router.params.roleId}`)]
	 * // From query params
	 * checks: (props, router) => [buildPermission('read', `dashboard:${router.searchParams.get('id')}`)]
	 * // From pathname matching
	 * checks: (props, router) => {
	 *   const match = router.matchPath<{ id: string }>('/edit/:id');
	 *   return match ? [buildPermission('update', `role:${match.id}`)] : [];
	 * }
	 */
	checks:
		| BrandedPermission[]
		| ((props: P, router: RouterContext) => BrandedPermission[]);
	fallback?: AuthZGuardProps['fallback'];
	fallbackOnLoading?: AuthZGuardProps['fallbackOnLoading'];
	failOpenOnError?: AuthZGuardProps['onFailRenderContent'];
};

function useStableParams(): Record<string, string | undefined> {
	const params = useParams();
	const paramsJson = JSON.stringify(params);
	return useMemo(() => JSON.parse(paramsJson), [paramsJson]);
}

function useRouterContext(): RouterContext {
	const params = useStableParams();
	const { pathname, search } = useLocation();
	const searchParams = useMemo(() => new URLSearchParams(search), [search]);

	return useMemo(
		(): RouterContext => ({
			params,
			pathname,
			searchParams,
			matchPath: <Params extends Record<string, string>>(
				pattern: string,
			): Params | null => {
				const match = reactRouterMatchPath<Params>(pathname, {
					path: pattern,
					exact: false,
				});
				return match?.params ?? null;
			},
		}),
		[params, pathname, searchParams],
	);
}

export function createAuthZHOC<P extends object>(
	Guard: ComponentType<AuthZGuardProps>,
	hocName: string,
	Component: ComponentType<P>,
	opts: WithAuthZOptions<P>,
): ComponentType<P> {
	const { checks, ...guardProps } = opts;

	function Wrapped(props: P): ReactElement | null {
		const router = useRouterContext();
		const resolvedChecks =
			typeof checks === 'function' ? checks(props, router) : checks;

		return (
			<Guard checks={resolvedChecks} {...guardProps}>
				{createElement(Component, props)}
			</Guard>
		);
	}

	Wrapped.displayName = `${hocName}(${
		Component.displayName || Component.name || 'Component'
	})`;

	return Wrapped;
}

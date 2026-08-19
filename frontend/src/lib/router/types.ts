/**
 * Facade contracts for the react-router v5 -> v6 migration. Every shape here is
 * defined the way v6 / history@5 behaves; the v5-backed implementations adapt
 * up to it. See frontend/docs/react-router-v6-migration.md.
 */

export type NavigationAction = 'PUSH' | 'REPLACE' | 'POP';

export interface AppLocation<S = unknown> {
	pathname: string;
	search: string;
	hash: string;
	state: S;
	/** history@4 leaves this undefined on the initial entry; v6 always sets it. */
	key?: string;
}

export type To =
	| string
	| Partial<Pick<AppLocation, 'pathname' | 'search' | 'hash'>>;

export type AppParams<Key extends string = string> = {
	readonly [K in Key]: string | undefined;
};

/**
 * Mirrors v6's `useParams` return type so both call shapes keep working:
 * a union of param names (`useAppParams<'dashboardId'>()`) or a record
 * (`useAppParams<{ dashboardId: string }>()`).
 */
export type AppParamsResult<
	ParamsOrKey extends string | Record<string, string | undefined>,
> = Readonly<
	[ParamsOrKey] extends [string] ? AppParams<ParamsOrKey> : Partial<ParamsOrKey>
>;

export interface RoutePattern {
	path: string;
	caseSensitive: boolean;
	end: boolean;
}

export interface RouteMatch<Key extends string = string> {
	params: AppParams<Key>;
	pathname: string;
	/**
	 * The matched portion minus any trailing splat. Equal to `pathname` for every
	 * pattern in `constants/routes.ts` — none of them use a splat.
	 */
	pathnameBase: string;
	pattern: RoutePattern;
}

export interface NavigateOptions {
	replace?: boolean;
	state?: unknown;
}

export type NavigateFn = (to: To, options?: NavigateOptions) => void;

/**
 * The slice of a history object `applyNavigate` needs, so the adapter does not
 * have to name a particular history package.
 */
export interface NavigableHistory {
	push(to: To, state?: unknown): void;
	replace(to: To, state?: unknown): void;
}

export interface BlockedTransition {
	location: AppLocation;
	action: NavigationAction;
	/**
	 * Re-attempts the blocked navigation. The blocker is still registered, so
	 * callers must unblock first — this is history@5's contract, not v4's
	 * return-`false`-to-cancel protocol.
	 */
	retry: () => void;
}

export type NavigationBlocker = (transition: BlockedTransition) => void;

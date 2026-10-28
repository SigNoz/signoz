/**
 * Facade contracts for the router. Every shape here is defined the way
 * react-router v7 behaves.
 */

export type NavigationAction = 'PUSH' | 'REPLACE' | 'POP';

export interface AppLocation<S = unknown> {
	pathname: string;
	search: string;
	hash: string;
	state: S;
	/** Always set by v7; optional for callers that build a location by hand. */
	key?: string;
}

export type To =
	| string
	| Partial<Pick<AppLocation, 'pathname' | 'search' | 'hash'>>;

export type AppParams<Key extends string = string> = {
	readonly [K in Key]: string | undefined;
};

/**
 * Mirrors v7's `useParams` return type so both call shapes keep working:
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
	 * pattern in `constants/routes.ts`, none of which use a splat.
	 */
	pathnameBase: string;
	pattern: RoutePattern;
}

export interface NavigateOptions {
	replace?: boolean;
	state?: unknown;
}

export type NavigateFn = (to: To, options?: NavigateOptions) => void;

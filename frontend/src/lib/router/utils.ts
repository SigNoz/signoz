import type { AppLocation } from './types';

export function toAppLocation<S = unknown>(
	location: AppLocation<unknown>,
): AppLocation<S> {
	return {
		pathname: location.pathname,
		search: location.search,
		hash: location.hash,
		state: location.state as S,
		key: location.key,
	};
}

import { getBasePath } from 'utils/basePath';

/**
 * Returns a storage key scoped to the runtime base path.
 * At root ("/") the bare key is returned unchanged — backward compatible.
 * At any other prefix the key is prefixed: "/signoz/AUTH_TOKEN".
 */
export function getScopedKey(key: string): string {
	const basePath = getBasePath();
	return basePath === '/' ? key : `${basePath}${key}`;
}

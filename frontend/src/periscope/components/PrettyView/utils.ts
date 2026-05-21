// Resolve a value from a nested object using an array of keys (not dot-notation)
// e.g. resolveValueByKeys({ tagMap: { 'cloud.account.id': 'x' } }, ['tagMap', 'cloud.account.id']) → 'x'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function resolveValueByKeys(
	data: Record<string, any>,
	keys: (string | number)[],
): unknown {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return keys.reduce((obj: any, key) => obj?.[key], data);
}

// Convert react-json-tree's reversed keyPath to forward order
// e.g. ['cloud.account.id', 'tagMap'] → ['tagMap', 'cloud.account.id']
export function keyPathToForward(
	keyPath: readonly (string | number)[],
): (string | number)[] {
	return [...keyPath].reverse();
}

// Display-friendly string for a keyPath
// e.g. ['tagMap', 'cloud.account.id'] → 'tagMap.cloud.account.id'
export function keyPathToDisplayString(
	keyPath: readonly (string | number)[],
): string {
	return [...keyPath].reverse().join('.');
}

// Serialize keyPath for storage/comparison (JSON stringified array)
export function serializeKeyPath(keyPath: (string | number)[]): string {
	return JSON.stringify(keyPath);
}

export function deserializeKeyPath(
	serialized: string,
): (string | number)[] | null {
	try {
		const parsed = JSON.parse(serialized);
		if (Array.isArray(parsed)) {
			return parsed;
		}
		return null;
	} catch {
		return null;
	}
}

/**
 * Extract the actual attribute key from a field key path.
 * Normal tree: fieldKeyPath = ['resource', 'service.name'] → last element = 'service.name'
 * Pinned tree: fieldKeyPath = ['resource.service.name'] → resolve via displayKeyToForwardPath
 *   to get the original path ['resource', 'service.name'], then take last element.
 *
 * @param displayKeyToForwardPath - Optional map from display keys to original forward paths
 *   (from usePinnedFields). Required for correct pinned item resolution when keys contain dots.
 */
export function getLeafKeyFromPath(
	fieldKeyPath: (string | number)[],
	fieldKey: string,
	displayKeyToForwardPath?: Record<string, (string | number)[]>,
): string {
	// Normal tree: multiple path segments, last is the leaf key
	if (fieldKeyPath.length > 1) {
		return String(fieldKeyPath[fieldKeyPath.length - 1]);
	}

	// Pinned tree: single display key — resolve via map if available
	if (fieldKeyPath.length === 1) {
		const pathStr = String(fieldKeyPath[0]);

		if (displayKeyToForwardPath) {
			const resolvedPath = displayKeyToForwardPath[pathStr];
			if (resolvedPath && resolvedPath.length > 0) {
				return String(resolvedPath[resolvedPath.length - 1]);
			}
		}

		// Fallback: split on dot and drop first segment (parent object name)
		const parts = pathStr.split('.');
		return parts.length > 1 ? parts.slice(1).join('.') : pathStr;
	}

	return fieldKey;
}

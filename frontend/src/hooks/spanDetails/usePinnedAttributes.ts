import { useCallback, useMemo } from 'react';
import { LOCALSTORAGE } from 'constants/localStorage';

import { useLocalStorage } from '../useLocalStorage';

interface UsePinnedAttributesReturn {
	pinnedAttributes: Record<string, boolean>;
	togglePin: (attributeKey: string) => void;
	isPinned: (attributeKey: string) => boolean;
}

/**
 * V2 trace-details pinned-attributes hook. localStorage-only.
 *
 * NOTE: V2 used to also persist to the user-pref API
 * (`span_details_pinned_attributes`) but V3 now owns that key with a different
 * (nested-path) format. V2 is isolated to localStorage so it doesn't fight V3
 * over the same backend value. See `useMigratePinnedAttributes` in V3.
 */
export function usePinnedAttributes(
	availableAttributes: string[],
): UsePinnedAttributesReturn {
	const [pinnedKeys, setPinnedKeys] = useLocalStorage<string[]>(
		LOCALSTORAGE.SPAN_DETAILS_PINNED_ATTRIBUTES,
		[],
	);

	const pinnedAttributes = useMemo(
		(): Record<string, boolean> =>
			pinnedKeys.reduce(
				(acc, key) => {
					if (availableAttributes.includes(key)) {
						acc[key] = true;
					}
					return acc;
				},
				{} as Record<string, boolean>,
			),
		[pinnedKeys, availableAttributes],
	);

	const togglePin = useCallback(
		(attributeKey: string): void => {
			setPinnedKeys((prev) =>
				prev.includes(attributeKey)
					? prev.filter((k) => k !== attributeKey)
					: [...prev, attributeKey],
			);
		},
		[setPinnedKeys],
	);

	const isPinned = useCallback(
		(attributeKey: string): boolean => pinnedAttributes[attributeKey] === true,
		[pinnedAttributes],
	);

	return {
		pinnedAttributes,
		togglePin,
		isPinned,
	};
}

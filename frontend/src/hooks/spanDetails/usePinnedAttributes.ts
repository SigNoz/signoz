import { LOCALSTORAGE } from 'constants/localStorage';
import { useCallback, useMemo } from 'react';

import { useLocalStorage } from '../useLocalStorage';

interface UsePinnedAttributesReturn {
	pinnedAttributes: Record<string, boolean>;
	togglePin: (attributeKey: string) => void;
	isPinned: (attributeKey: string) => boolean;
}

/**
 * Hook for managing pinned span attributes with localStorage persistence.
 * Handles graceful degradation when stored attributes don't exist in current span.
 *
 * @param availableAttributes - Object keys of the current span's flattened attributes
 * @returns Object with pinned state, toggle function, and check function
 */
export function usePinnedAttributes(
	availableAttributes: string[],
): UsePinnedAttributesReturn {
	// Use the useLocalStorage hook to manage pinned attribute keys
	const [storedPinnedKeys, setStoredPinnedKeys] = useLocalStorage<string[]>(
		LOCALSTORAGE.SPAN_DETAILS_PINNED_ATTRIBUTES,
		[],
	);

	// Create pinned attributes state from stored keys, filtering by available attributes
	const pinnedAttributes = useMemo(
		(): Record<string, boolean> =>
			storedPinnedKeys.reduce((acc, key) => {
				// Only include if the attribute exists in the current span
				if (availableAttributes.includes(key)) {
					acc[key] = true;
				}
				return acc;
			}, {} as Record<string, boolean>),
		[storedPinnedKeys, availableAttributes],
	);

	// Toggle pin state for an attribute
	const togglePin = useCallback(
		(attributeKey: string): void => {
			const currentlyPinned = storedPinnedKeys.includes(attributeKey);

			if (currentlyPinned) {
				// Remove from pinned
				setStoredPinnedKeys(storedPinnedKeys.filter((key) => key !== attributeKey));
			} else {
				// Add to pinned
				setStoredPinnedKeys([...storedPinnedKeys, attributeKey]);
			}
		},
		[storedPinnedKeys, setStoredPinnedKeys],
	);

	// Check if an attribute is pinned
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

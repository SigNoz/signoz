import setLocalStorageApi from 'api/browser/localstorage/set';
import updateUserPreference from 'api/v1/user/preferences/name/update';
import { AxiosError } from 'axios';
import { LOCALSTORAGE } from 'constants/localStorage';
import { USER_PREFERENCES } from 'constants/userPreferences';
import { useNotifications } from 'hooks/useNotifications';
import { useAppContext } from 'providers/App/App';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation } from 'react-query';
import { UserPreference } from 'types/api/preferences/preference';
import { showErrorNotification } from 'utils/error';

import { useLocalStorage } from '../useLocalStorage';

interface UsePinnedAttributesReturn {
	pinnedAttributes: Record<string, boolean>;
	togglePin: (attributeKey: string) => void;
	isPinned: (attributeKey: string) => boolean;
}

/**
 * Hook for managing pinned span attributes with backend persistence.
 * Falls back to localStorage during initial load and handles migration.
 *
 * @param availableAttributes - Object keys of the current span's flattened attributes
 * @returns Object with pinned state, toggle function, and check function
 */
export function usePinnedAttributes(
	availableAttributes: string[],
): UsePinnedAttributesReturn {
	const { userPreferences, updateUserPreferenceInContext } = useAppContext();
	const { notifications } = useNotifications();
	// API mutation for updating preferences
	const { mutate: updateUserPreferenceMutation } = useMutation(
		updateUserPreference,
		{
			onError: (error) => {
				showErrorNotification(notifications, error as AxiosError);
			},
		},
	);

	// Local state for optimistic updates
	const [pinnedKeys, setPinnedKeys] = useState<string[]>([]);

	// Get localStorage fallback for initial load
	const [localStoragePinnedKeys] = useLocalStorage<string[]>(
		LOCALSTORAGE.SPAN_DETAILS_PINNED_ATTRIBUTES,
		[],
	);

	// Initialize from user preferences when loaded
	useEffect(() => {
		if (userPreferences !== null) {
			const preference = userPreferences.find(
				(pref) => pref.name === USER_PREFERENCES.SPAN_DETAILS_PINNED_ATTRIBUTES,
			);

			if (preference?.value) {
				// use backend data
				setPinnedKeys(preference.value as string[]);
			} else if (localStoragePinnedKeys.length > 0) {
				// use local storage data
				setPinnedKeys(localStoragePinnedKeys);
			}
		}
	}, [userPreferences, localStoragePinnedKeys]);

	// Create pinned attributes state from stored keys, filtering by available attributes
	const pinnedAttributes = useMemo(
		(): Record<string, boolean> =>
			pinnedKeys.reduce((acc, key) => {
				// Only include if the attribute exists in the current span
				if (availableAttributes.includes(key)) {
					acc[key] = true;
				}
				return acc;
			}, {} as Record<string, boolean>),
		[pinnedKeys, availableAttributes],
	);

	// Toggle pin state for an attribute
	const togglePin = useCallback(
		(attributeKey: string): void => {
			const currentlyPinned = pinnedKeys.includes(attributeKey);
			const newPinnedKeys = currentlyPinned
				? pinnedKeys.filter((key) => key !== attributeKey)
				: [...pinnedKeys, attributeKey];

			// Optimistically update local state for instant UI feedback
			setPinnedKeys(newPinnedKeys);

			updateUserPreferenceInContext({
				name: USER_PREFERENCES.SPAN_DETAILS_PINNED_ATTRIBUTES,
				value: newPinnedKeys,
			} as UserPreference);

			// Save to localStorage immediately for offline resilience
			setLocalStorageApi(
				LOCALSTORAGE.SPAN_DETAILS_PINNED_ATTRIBUTES,
				JSON.stringify(newPinnedKeys),
			);

			// Make the API call in the background
			updateUserPreferenceMutation({
				name: USER_PREFERENCES.SPAN_DETAILS_PINNED_ATTRIBUTES,
				value: newPinnedKeys,
			});
		},
		[pinnedKeys, updateUserPreferenceInContext, updateUserPreferenceMutation],
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

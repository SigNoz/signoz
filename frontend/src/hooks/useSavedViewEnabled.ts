import getLocalStorageKey from 'api/browser/localstorage/get';
import { LOCALSTORAGE } from 'constants/localStorage';
import { useState } from 'react';

export function useSavedViewEnabled(): boolean {
	const [isEnabled] = useState(
		() => getLocalStorageKey(LOCALSTORAGE.SAVED_VIEW_ENABLED) === 'true',
	);

	return isEnabled;
}

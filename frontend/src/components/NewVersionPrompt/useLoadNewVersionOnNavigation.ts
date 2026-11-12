import { useEffect } from 'react';
import { toast } from '@signozhq/ui/sonner';
import {
	blockNavigation,
	getCurrentLocation,
	getHref,
} from 'lib/router/navigation';
import { reloadApp } from 'utils/appReload';

import { NEW_VERSION_TOAST_ID } from './constants';

export function useLoadNewVersionOnNavigation(enabled: boolean): void {
	useEffect(() => {
		if (!enabled) {
			return undefined;
		}
		return blockNavigation(({ location, retry }) => {
			if (location.pathname === getCurrentLocation().pathname) {
				retry();
				return;
			}
			// sonner merges an update into the toast with the same id, so clear the prompt's description and action.
			toast.loading('Loading the latest version of SigNoz', {
				id: NEW_VERSION_TOAST_ID,
				description: undefined,
				action: undefined,
			});
			reloadApp(
				{ reason: 'navigation', detail: location.pathname },
				getHref(location),
			);
		});
	}, [enabled]);
}

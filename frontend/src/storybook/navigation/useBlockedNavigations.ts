import { useSyncExternalStore } from 'react';

import {
	BlockedNavigation,
	getBlockedNavigations,
	subscribeToBlockedNavigations,
} from './blockedNavigationStore';

export const useBlockedNavigations = (): BlockedNavigation[] =>
	useSyncExternalStore(subscribeToBlockedNavigations, getBlockedNavigations);

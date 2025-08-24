import getLocalStorageApi from 'api/browser/localstorage/get';
import setLocalStorageApi from 'api/browser/localstorage/set';
import logEvent from 'api/common/logEvent';
import updateUserPreference from 'api/v1/user/preferences/name/update';
import { AxiosError } from 'axios';
import ROUTES from 'constants/routes';
import { USER_PREFERENCES } from 'constants/userPreferences';
import { routeConfig } from 'container/SideNav/config';
import { getQueryString } from 'container/SideNav/helper';
import useThemeMode, { useIsDarkMode } from 'hooks/useDarkMode';
import { useNotifications } from 'hooks/useNotifications';
import { KBarProvider } from 'kbar';
import history from 'lib/history';
import { useCallback, useEffect, useState } from 'react';
import { useMutation } from 'react-query';
import { useLocation } from 'react-router-dom';
import { UserPreference } from 'types/api/preferences/preference';
import { showErrorNotification } from 'utils/error';

import { useAppContext } from './App/App';

export function KBarCommandPaletteProvider({
	children,
}: {
	children: React.ReactNode;
}): JSX.Element {
	const { pathname, search } = useLocation();
	const { notifications } = useNotifications();
	const { userPreferences } = useAppContext();

	const { toggleTheme, setAutoSwitch } = useThemeMode();

	const isDarkMode = useIsDarkMode();

	const handleThemeChange = (value: string): void => {
		console.log('value', value);
		console.log('isDarkMode', isDarkMode);

		logEvent('Account Settings: Theme Changed', {
			theme: value,
		});

		if (value === 'auto') {
			setAutoSwitch(true);
		} else {
			setAutoSwitch(false);
			// Only toggle if the current theme is different from the target
			const targetIsDark = value === 'dark';

			if (targetIsDark !== isDarkMode) {
				toggleTheme();
			}
		}
	};

	const isCtrlMetaKey = (e: MouseEvent): boolean => e.ctrlKey || e.metaKey;

	const openInNewTab = (path: string): void => {
		window.open(path, '_blank');
	};

	const onClickHandler = useCallback(
		(key: string, event: MouseEvent | null) => {
			const params = new URLSearchParams(search);
			const availableParams = routeConfig[key];

			const queryString = getQueryString(availableParams || [], params);

			if (pathname !== key) {
				if (event && isCtrlMetaKey(event)) {
					openInNewTab(`${key}?${queryString.join('&')}`);
				} else {
					history.push(`${key}?${queryString.join('&')}`, {
						from: pathname,
					});
				}
			}
		},
		[pathname, search],
	);

	const { updateUserPreferenceInContext } = useAppContext();

	const { mutate: updateUserPreferenceMutation } = useMutation(
		updateUserPreference,
		{
			onError: (error) => {
				showErrorNotification(notifications, error as AxiosError);
			},
		},
	);

	const sideNavPinnedPreference = userPreferences?.find(
		(preference) => preference.name === USER_PREFERENCES.SIDENAV_PINNED,
	)?.value as boolean;

	// Add loading state to prevent layout shift during initial load
	const [isSidebarLoaded, setIsSidebarLoaded] = useState(false);

	// Get sidebar state from localStorage as fallback until preferences are loaded
	const getSidebarStateFromLocalStorage = useCallback((): boolean => {
		try {
			const storedValue = getLocalStorageApi(USER_PREFERENCES.SIDENAV_PINNED);
			return storedValue === 'true';
		} catch {
			return false;
		}
	}, []);

	// Set sidebar as loaded after user preferences are fetched
	useEffect(() => {
		if (userPreferences !== null) {
			setIsSidebarLoaded(true);
		}
	}, [userPreferences]);

	// Use localStorage value as fallback until preferences are loaded
	const isSideNavPinned = isSidebarLoaded
		? sideNavPinnedPreference
		: getSidebarStateFromLocalStorage();

	const handleToggleSidebar = useCallback((): void => {
		const newState = !isSideNavPinned;

		logEvent('Global Shortcut: Sidebar Toggle', {
			previousState: isSideNavPinned,
			newState,
		});

		// Save to localStorage immediately for instant feedback
		setLocalStorageApi(USER_PREFERENCES.SIDENAV_PINNED, newState.toString());

		// Update the context immediately
		const save = {
			name: USER_PREFERENCES.SIDENAV_PINNED,
			value: newState,
		};
		updateUserPreferenceInContext(save as UserPreference);

		// Make the API call in the background
		updateUserPreferenceMutation({
			name: USER_PREFERENCES.SIDENAV_PINNED,
			value: newState,
		});
	}, [
		isSideNavPinned,
		updateUserPreferenceInContext,
		updateUserPreferenceMutation,
	]);

	const kbarActions = [
		{
			id: 'dashboards',
			name: 'Go to Dashboards',
			shortcut: ['shift + d'],
			keywords: 'dashboards metrics visualization',
			section: 'Navigation',
			perform: (): void => {
				onClickHandler(ROUTES.ALL_DASHBOARD, null);
			},
		},
		{
			id: 'services',
			name: 'Go to Services',
			shortcut: ['shift + s'],
			keywords: 'services monitoring',
			section: 'Navigation',
			perform: (): void => {
				onClickHandler(ROUTES.APPLICATION, null);
			},
		},
		{
			id: 'traces',
			name: 'Go to Traces',
			shortcut: ['shift + t'],
			keywords: 'traces distributed tracing',
			section: 'Navigation',
			perform: (): void => {
				onClickHandler(ROUTES.TRACE, null);
			},
		},
		{
			id: 'logs',
			name: 'Go to Logs',
			shortcut: ['shift + l'],
			keywords: 'logs log management',
			section: 'Navigation',
			perform: (): void => {
				onClickHandler(ROUTES.LOGS, null);
			},
		},
		{
			id: 'alerts',
			name: 'Go to Alerts',
			shortcut: ['shift + a'],
			keywords: 'alerts notifications',
			section: 'Navigation',
			perform: (): void => {
				onClickHandler(ROUTES.LIST_ALL_ALERT, null);
			},
		},
		{
			id: 'exceptions',
			name: 'Go to Exceptions',
			shortcut: ['shift + e'],
			keywords: 'exceptions errors',
			section: 'Navigation',
			perform: (): void => {
				onClickHandler(ROUTES.ALL_ERROR, null);
			},
		},
		{
			id: 'messaging-queues',
			name: 'Go to Messaging Queues',
			shortcut: ['shift + m'],
			keywords: 'messaging queues mq',
			section: 'Navigation',
			perform: (): void => {
				onClickHandler(ROUTES.MESSAGING_QUEUES_OVERVIEW, null);
			},
		},
		{
			id: 'toggle-sidebar',
			name: 'Toggle Sidebar',
			shortcut: ['shift + b'],
			keywords: 'sidebar navigation menu',
			section: 'Settings',
			perform: (): void => {
				handleToggleSidebar();
			},
		},
		{
			id: 'dark-mode',
			name: 'Switch to Dark Mode',
			keywords: 'theme dark mode appearance',
			section: 'Settings',
			perform: (): void => {
				handleThemeChange('dark');
			},
		},
		{
			id: 'light-mode',
			name: 'Switch to Light Mode [Beta]',
			keywords: 'theme light mode appearance',
			section: 'Settings',
			perform: (): void => {
				handleThemeChange('light');
			},
		},
		{
			id: 'system-theme',
			name: 'Switch to System Theme',
			keywords: 'system theme appearance',
			section: 'Settings',
			perform: (): void => {
				handleThemeChange('auto');
			},
		},
	];

	return <KBarProvider actions={kbarActions}>{children}</KBarProvider>;
}

import setLocalStorageApi from 'api/browser/localstorage/set';
import logEvent from 'api/common/logEvent';
import updateUserPreference from 'api/v1/user/preferences/name/update';
import { AxiosError } from 'axios';
import ROUTES from 'constants/routes';
import { USER_PREFERENCES } from 'constants/userPreferences';
import { useThemeMode } from 'hooks/useDarkMode';
import { THEME_MODE } from 'hooks/useDarkMode/constant';
import { useNotifications } from 'hooks/useNotifications';
import { KBarProvider } from 'kbar';
import history from 'lib/history';
import { useCallback } from 'react';
import { useMutation } from 'react-query';
import { UserPreference } from 'types/api/preferences/preference';
import { showErrorNotification } from 'utils/error';

import { useAppContext } from './App/App';

export function KBarCommandPaletteProvider({
	children,
}: {
	children: React.ReactNode;
}): JSX.Element {
	const { notifications } = useNotifications();

	const { setAutoSwitch, setTheme } = useThemeMode();

	const handleThemeChange = (value: string): void => {
		logEvent('Account Settings: Theme Changed', {
			theme: value,
		});

		if (value === 'auto') {
			setAutoSwitch(true);
		} else {
			setAutoSwitch(false);
			setTheme(value);
		}
	};

	const onClickHandler = useCallback((key: string): void => {
		history.push(key);
	}, []);

	const { updateUserPreferenceInContext } = useAppContext();

	const { mutate: updateUserPreferenceMutation } = useMutation(
		updateUserPreference,
		{
			onError: (error) => {
				showErrorNotification(notifications, error as AxiosError);
			},
		},
	);

	const handleOpenSidebar = useCallback((): void => {
		setLocalStorageApi(USER_PREFERENCES.SIDENAV_PINNED, 'true');

		// Update the context immediately
		const save = {
			name: USER_PREFERENCES.SIDENAV_PINNED,
			value: true,
		};

		updateUserPreferenceInContext(save as UserPreference);

		// Make the API call in the background
		updateUserPreferenceMutation({
			name: USER_PREFERENCES.SIDENAV_PINNED,
			value: true,
		});
	}, [updateUserPreferenceInContext, updateUserPreferenceMutation]);

	const handleCloseSidebar = useCallback((): void => {
		setLocalStorageApi(USER_PREFERENCES.SIDENAV_PINNED, 'false');

		// Update the context immediately
		const save = {
			name: USER_PREFERENCES.SIDENAV_PINNED,
			value: false,
		};

		updateUserPreferenceInContext(save as UserPreference);

		// Make the API call in the background
		updateUserPreferenceMutation({
			name: USER_PREFERENCES.SIDENAV_PINNED,
			value: false,
		});
	}, [updateUserPreferenceInContext, updateUserPreferenceMutation]);
	const kbarActions = [
		{
			id: 'home',
			name: 'Go to Home',
			shortcut: ['shift + h'],
			keywords: 'home',
			section: 'Navigation',
			perform: (): void => {
				onClickHandler(ROUTES.HOME);
			},
		},
		{
			id: 'dashboards',
			name: 'Go to Dashboards',
			shortcut: ['shift + d'],
			keywords: 'dashboards',
			section: 'Navigation',
			perform: (): void => {
				onClickHandler(ROUTES.ALL_DASHBOARD);
			},
		},
		{
			id: 'services',
			name: 'Go to Services',
			shortcut: ['shift + s'],
			keywords: 'services monitoring',
			section: 'Navigation',
			perform: (): void => {
				onClickHandler(ROUTES.APPLICATION);
			},
		},
		{
			id: 'traces',
			name: 'Go to Traces',
			shortcut: ['shift + t'],
			keywords: 'traces',
			section: 'Navigation',
			perform: (): void => {
				onClickHandler(ROUTES.TRACES_EXPLORER);
			},
		},
		{
			id: 'logs',
			name: 'Go to Logs',
			shortcut: ['shift + l'],
			keywords: 'logs',
			section: 'Navigation',
			perform: (): void => {
				onClickHandler(ROUTES.LOGS);
			},
		},
		{
			id: 'alerts',
			name: 'Go to Alerts',
			shortcut: ['shift + a'],
			keywords: 'alerts',
			section: 'Navigation',
			perform: (): void => {
				onClickHandler(ROUTES.LIST_ALL_ALERT);
			},
		},
		{
			id: 'exceptions',
			name: 'Go to Exceptions',
			shortcut: ['shift + e'],
			keywords: 'exceptions errors',
			section: 'Navigation',
			perform: (): void => {
				onClickHandler(ROUTES.ALL_ERROR);
			},
		},
		{
			id: 'messaging-queues',
			name: 'Go to Messaging Queues',
			shortcut: ['shift + m'],
			keywords: 'messaging queues mq',
			section: 'Navigation',
			perform: (): void => {
				onClickHandler(ROUTES.MESSAGING_QUEUES_OVERVIEW);
			},
		},
		{
			id: 'my-settings',
			name: 'Go to Account Settings',
			keywords: 'account settings',
			section: 'Navigation',
			perform: (): void => {
				onClickHandler(ROUTES.MY_SETTINGS);
			},
		},
		{
			id: 'open-sidebar',
			name: 'Open Sidebar',
			keywords: 'sidebar navigation menu expand',
			section: 'Settings',
			perform: (): void => {
				handleOpenSidebar();
			},
		},
		{
			id: 'collapse-sidebar',
			name: 'Collapse Sidebar',
			keywords: 'sidebar navigation menu collapse',
			section: 'Settings',
			perform: (): void => {
				handleCloseSidebar();
			},
		},
		{
			id: 'dark-mode',
			name: 'Switch to Dark Mode',
			keywords: 'theme dark mode appearance',
			section: 'Settings',
			perform: (): void => {
				handleThemeChange(THEME_MODE.DARK);
			},
		},
		{
			id: 'light-mode',
			name: 'Switch to Light Mode [Beta]',
			keywords: 'theme light mode appearance',
			section: 'Settings',
			perform: (): void => {
				handleThemeChange(THEME_MODE.LIGHT);
			},
		},
		{
			id: 'system-theme',
			name: 'Switch to System Theme',
			keywords: 'system theme appearance',
			section: 'Settings',
			perform: (): void => {
				handleThemeChange(THEME_MODE.SYSTEM);
			},
		},
	];

	return <KBarProvider actions={kbarActions}>{children}</KBarProvider>;
}

import './cmdKPalette.scss';

import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandShortcut,
} from '@signozhq/command';
import setLocalStorageApi from 'api/browser/localstorage/set';
import logEvent from 'api/common/logEvent';
import updateUserPreference from 'api/v1/user/preferences/name/update';
import { AxiosError } from 'axios';
import ROUTES from 'constants/routes';
import { USER_PREFERENCES } from 'constants/userPreferences';
import { useThemeMode } from 'hooks/useDarkMode';
import { THEME_MODE } from 'hooks/useDarkMode/constant';
import { useNotifications } from 'hooks/useNotifications';
import history from 'lib/history';
import {
	BellDot,
	BugIcon,
	DraftingCompass,
	HardDrive,
	Home,
	LayoutGrid,
	ListMinus,
	ScrollText,
	Settings,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo } from 'react';
import { useMutation } from 'react-query';
import { UserPreference } from 'types/api/preferences/preference';
import { showErrorNotification } from 'utils/error';

import { useAppContext } from '../../providers/App/App';
import { useCmdK } from '../../providers/cmdKProvider';

type CmdAction = {
	id: string;
	name: string;
	shortcut?: string[];
	keywords?: string;
	section?: string;
	icon?: React.ReactNode;
	roles?: UserRole[];
	perform: () => void;
};

type UserRole = 'ADMIN' | 'EDITOR' | 'AUTHOR' | 'VIEWER';
export function CmdKPalette({
	role,
	isLoggedInState,
}: {
	role: UserRole;
	isLoggedInState: boolean;
}): JSX.Element | null {
	const { open, setOpen } = useCmdK();

	const { updateUserPreferenceInContext } = useAppContext();
	const { notifications } = useNotifications();
	const { setAutoSwitch, setTheme, theme } = useThemeMode();

	const { mutate: updateUserPreferenceMutation } = useMutation(
		updateUserPreference,
		{
			onError: (error) => {
				showErrorNotification(notifications, error as AxiosError);
			},
		},
	);

	// toggle palette with ⌘/Ctrl+K
	useEffect((): (() => void) => {
		const onKey = (e: KeyboardEvent): void => {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
				e.preventDefault();
				setOpen((s) => !s);
			}
		};

		window.addEventListener('keydown', onKey);

		return (): void => {
			window.removeEventListener('keydown', onKey);
		};
	}, [setOpen]);

	const handleThemeChange = useCallback(
		(value: string): void => {
			logEvent('Account Settings: Theme Changed', { theme: value });
			if (value === 'auto') {
				setAutoSwitch(true);
			} else {
				setAutoSwitch(false);
				setTheme(value);
			}
		},
		[setAutoSwitch, setTheme],
	);

	const onClickHandler = useCallback((key: string): void => {
		history.push(key);
	}, []);

	const handleOpenSidebar = useCallback((): void => {
		setLocalStorageApi(USER_PREFERENCES.SIDENAV_PINNED, 'true');
		const save = { name: USER_PREFERENCES.SIDENAV_PINNED, value: true };
		updateUserPreferenceInContext(save as UserPreference);
		updateUserPreferenceMutation({
			name: USER_PREFERENCES.SIDENAV_PINNED,
			value: true,
		});
	}, [updateUserPreferenceInContext, updateUserPreferenceMutation]);

	const handleCloseSidebar = useCallback((): void => {
		setLocalStorageApi(USER_PREFERENCES.SIDENAV_PINNED, 'false');
		const save = { name: USER_PREFERENCES.SIDENAV_PINNED, value: false };
		updateUserPreferenceInContext(save as UserPreference);
		updateUserPreferenceMutation({
			name: USER_PREFERENCES.SIDENAV_PINNED,
			value: false,
		});
	}, [updateUserPreferenceInContext, updateUserPreferenceMutation]);

	const actions: CmdAction[] = useMemo(
		() => [
			{
				id: 'home',
				name: 'Go to Home',
				shortcut: ['shift + h'],
				keywords: 'home',
				section: 'Navigation',
				icon: <Home size={12} />,
				roles: ['ADMIN', 'EDITOR', 'AUTHOR', 'VIEWER'],
				perform: (): void => onClickHandler(ROUTES.HOME),
			},
			{
				id: 'dashboards',
				name: 'Go to Dashboards',
				shortcut: ['shift + d'],
				keywords: 'dashboards',
				section: 'Navigation',
				icon: <LayoutGrid size={12} />,
				roles: ['ADMIN', 'EDITOR', 'AUTHOR', 'VIEWER'],
				perform: (): void => onClickHandler(ROUTES.ALL_DASHBOARD),
			},
			{
				id: 'services',
				name: 'Go to Services',
				shortcut: ['shift + s'],
				keywords: 'services monitoring',
				section: 'Navigation',
				icon: <HardDrive size={12} />,
				roles: ['ADMIN', 'EDITOR', 'AUTHOR', 'VIEWER'],
				perform: (): void => onClickHandler(ROUTES.APPLICATION),
			},
			{
				id: 'traces',
				name: 'Go to Traces',
				shortcut: ['shift + t'],
				keywords: 'traces',
				section: 'Navigation',
				icon: <DraftingCompass size={12} />,
				roles: ['ADMIN', 'EDITOR', 'AUTHOR', 'VIEWER'],
				perform: (): void => onClickHandler(ROUTES.TRACES_EXPLORER),
			},
			{
				id: 'logs',
				name: 'Go to Logs',
				shortcut: ['shift + l'],
				keywords: 'logs',
				section: 'Navigation',
				icon: <ScrollText size={12} />,
				roles: ['ADMIN', 'EDITOR', 'AUTHOR', 'VIEWER'],
				perform: (): void => onClickHandler(ROUTES.LOGS),
			},
			{
				id: 'alerts',
				name: 'Go to Alerts',
				shortcut: ['shift + a'],
				keywords: 'alerts',
				section: 'Navigation',
				icon: <BellDot size={12} />,
				roles: ['ADMIN', 'EDITOR', 'AUTHOR', 'VIEWER'],
				perform: (): void => onClickHandler(ROUTES.LIST_ALL_ALERT),
			},
			{
				id: 'exceptions',
				name: 'Go to Exceptions',
				shortcut: ['shift + e'],
				keywords: 'exceptions errors',
				section: 'Navigation',
				icon: <BugIcon size={12} />,
				roles: ['ADMIN', 'EDITOR', 'AUTHOR', 'VIEWER'],
				perform: (): void => onClickHandler(ROUTES.ALL_ERROR),
			},
			{
				id: 'messaging-queues',
				name: 'Go to Messaging Queues',
				shortcut: ['shift + m'],
				keywords: 'messaging queues mq',
				section: 'Navigation',
				icon: <ListMinus size={12} />,
				roles: ['ADMIN', 'EDITOR', 'AUTHOR', 'VIEWER'],
				perform: (): void => onClickHandler(ROUTES.MESSAGING_QUEUES_OVERVIEW),
			},
			{
				id: 'my-settings',
				name: 'Go to Account Settings',
				keywords: 'account settings',
				section: 'Navigation',
				icon: <Settings size={12} />,
				roles: ['ADMIN', 'EDITOR', 'AUTHOR', 'VIEWER'],
				perform: (): void => onClickHandler(ROUTES.MY_SETTINGS),
			},

			// Settings
			{
				id: 'open-sidebar',
				name: 'Open Sidebar',
				keywords: 'sidebar navigation menu expand',
				section: 'Settings',
				roles: ['ADMIN', 'EDITOR', 'AUTHOR', 'VIEWER'],
				perform: (): void => handleOpenSidebar(),
			},
			{
				id: 'collapse-sidebar',
				name: 'Collapse Sidebar',
				keywords: 'sidebar navigation menu collapse',
				section: 'Settings',
				roles: ['ADMIN', 'EDITOR', 'AUTHOR', 'VIEWER'],
				perform: (): void => handleCloseSidebar(),
			},
			{
				id: 'dark-mode',
				name: 'Switch to Dark Mode',
				keywords: 'theme dark mode appearance',
				section: 'Settings',
				roles: ['ADMIN', 'EDITOR', 'AUTHOR', 'VIEWER'],
				perform: (): void => handleThemeChange(THEME_MODE.DARK),
			},
			{
				id: 'light-mode',
				name: 'Switch to Light Mode [Beta]',
				keywords: 'theme light mode appearance',
				section: 'Settings',
				roles: ['ADMIN', 'EDITOR', 'AUTHOR', 'VIEWER'],
				perform: (): void => handleThemeChange(THEME_MODE.LIGHT),
			},
			{
				id: 'system-theme',
				name: 'Switch to System Theme',
				keywords: 'system theme appearance',
				section: 'Settings',
				roles: ['ADMIN', 'EDITOR', 'AUTHOR', 'VIEWER'],
				perform: (): void => handleThemeChange(THEME_MODE.SYSTEM),
			},
		],
		[onClickHandler, handleOpenSidebar, handleCloseSidebar, handleThemeChange],
	);

	// RBAC filter: show action if no roles set OR current user role is included
	const permitted = useMemo(
		() => actions.filter((a) => !a.roles || a.roles.includes(role)),
		[actions, role],
	);

	// group permitted actions by section
	const grouped = useMemo<[string, CmdAction[]][]>(() => {
		const map = new Map<string, CmdAction[]>();
		permitted.forEach((a) => {
			const section = a.section ?? 'Other';
			const existing = map.get(section);
			if (existing) {
				existing.push(a);
			} else {
				map.set(section, [a]);
			}
		});
		return Array.from(map.entries());
	}, [permitted]);

	const handleInvoke = (action: CmdAction): void => {
		try {
			action.perform();
		} catch (e) {
			console.error('Error invoking action', e);
		} finally {
			setOpen(false);
		}
	};

	const handleSelect = (action: CmdAction): (() => void) => (): void =>
		handleInvoke(action);

	if (!isLoggedInState) {
		return null;
	}
	return (
		<CommandDialog open={open} onOpenChange={setOpen}>
			<CommandInput placeholder="Search…" className="cmdk-input-wrapper" />
			<CommandList className="cmdk-list-scroll">
				<CommandEmpty>No results</CommandEmpty>
				{grouped.map(([section, items]) => (
					<React.Fragment key={section}>
						<CommandGroup heading={section} className="cmdk-section-heading">
							{items.map((it) => (
								<CommandItem
									key={it.id}
									onSelect={handleSelect(it)}
									value={it.name}
									className={theme === 'light' ? 'cmdk-item-light' : 'cmdk-item'}
								>
									{it.icon ? (
										<span className="cmd-item-icon">{it.icon}</span>
									) : (
										<img
											src="/Icons/expand.svg"
											alt="expand-icon"
											className="cmd-expand-icon"
										/>
									)}
									{it.name}
									{it.shortcut && it.shortcut.length > 0 && (
										<CommandShortcut>{it.shortcut.join(' • ')}</CommandShortcut>
									)}
								</CommandItem>
							))}
						</CommandGroup>
					</React.Fragment>
				))}
			</CommandList>
		</CommandDialog>
	);
}

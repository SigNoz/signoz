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
import { USER_PREFERENCES } from 'constants/userPreferences';
import { useThemeMode } from 'hooks/useDarkMode';
import { useNotifications } from 'hooks/useNotifications';
import history from 'lib/history';
import React, { useEffect } from 'react';
import { useMutation } from 'react-query';
import { UserPreference } from 'types/api/preferences/preference';
import { showErrorNotification } from 'utils/error';

import { createShortcutActions } from '../../constants/shortcutActions';
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
	userRole,
}: {
	userRole: UserRole;
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
	function handleGlobalCmdK(
		e: KeyboardEvent,
		setOpen: React.Dispatch<React.SetStateAction<boolean>>,
	): void {
		if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
			e.preventDefault();
			setOpen(true);
		}
	}

	const cmdKEffect = (): void | (() => void) => {
		const listener = (e: KeyboardEvent): void => {
			handleGlobalCmdK(e, setOpen);
		};

		window.addEventListener('keydown', listener);

		return (): void => {
			window.removeEventListener('keydown', listener);
			setOpen(false);
		};
	};

	useEffect(cmdKEffect, [setOpen]);

	function handleThemeChange(value: string): void {
		logEvent('Account Settings: Theme Changed', { theme: value });
		if (value === 'auto') {
			setAutoSwitch(true);
		} else {
			setAutoSwitch(false);
			setTheme(value);
		}
	}

	function onClickHandler(key: string): void {
		history.push(key);
	}

	function handleOpenSidebar(): void {
		setLocalStorageApi(USER_PREFERENCES.SIDENAV_PINNED, 'true');
		const save = { name: USER_PREFERENCES.SIDENAV_PINNED, value: true };
		updateUserPreferenceInContext(save as UserPreference);
		updateUserPreferenceMutation({
			name: USER_PREFERENCES.SIDENAV_PINNED,
			value: true,
		});
	}

	function handleCloseSidebar(): void {
		setLocalStorageApi(USER_PREFERENCES.SIDENAV_PINNED, 'false');
		const save = { name: USER_PREFERENCES.SIDENAV_PINNED, value: false };
		updateUserPreferenceInContext(save as UserPreference);
		updateUserPreferenceMutation({
			name: USER_PREFERENCES.SIDENAV_PINNED,
			value: false,
		});
	}

	const actions = createShortcutActions({
		navigate: onClickHandler,
		handleThemeChange,
		openSidebar: handleOpenSidebar,
		closeSidebar: handleCloseSidebar,
	});

	// RBAC filter: show action if no roles set OR current user role is included
	const permitted = actions.filter(
		(a) => !a.roles || a.roles.includes(userRole),
	);

	// group permitted actions by section
	const grouped: [string, CmdAction[]][] = ((): [string, CmdAction[]][] => {
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
	})();

	const handleInvoke = (action: CmdAction): void => {
		try {
			action.perform();
		} catch (e) {
			console.error('Error invoking action', e);
		} finally {
			setOpen(false);
		}
	};

	return (
		<CommandDialog open={open} onOpenChange={setOpen} position="top" offset={110}>
			<CommandInput placeholder="Search…" className="cmdk-input-wrapper" />
			<CommandList className="cmdk-list-scroll">
				<CommandEmpty>No results</CommandEmpty>
				{grouped.map(([section, items]) => (
					<CommandGroup
						key={section}
						heading={section}
						className="cmdk-section-heading"
					>
						{items.map((it) => (
							<CommandItem
								key={it.id}
								onSelect={(): void => handleInvoke(it)}
								value={it.name}
								className={theme === 'light' ? 'cmdk-item-light' : 'cmdk-item'}
							>
								<span className="cmd-item-icon">{it.icon}</span>
								{it.name}
								{it.shortcut && it.shortcut.length > 0 && (
									<CommandShortcut>{it.shortcut.join(' • ')}</CommandShortcut>
								)}
							</CommandItem>
						))}
					</CommandGroup>
				))}
			</CommandList>
		</CommandDialog>
	);
}

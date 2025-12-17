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
import logEvent from 'api/common/logEvent';
import { useThemeMode } from 'hooks/useDarkMode';
import history from 'lib/history';
import React, { useEffect } from 'react';

import { createShortcutActions } from '../../constants/shortcutActions';
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

	const { setAutoSwitch, setTheme, theme } = useThemeMode();

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

	const actions = createShortcutActions({
		navigate: onClickHandler,
		handleThemeChange,
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

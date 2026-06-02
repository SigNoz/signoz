import React, { useEffect } from 'react';
import cx from 'classnames';
import { useLocation } from 'react-router-dom';
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandShortcut,
} from '@signozhq/ui/command';
import logEvent from 'api/common/logEvent';
import {
	AIAssistantEvents,
	AIAssistantOpenSource,
} from 'container/AIAssistant/events';
import { normalizePage } from 'container/AIAssistant/hooks/useAIAssistantAnalyticsContext';
import {
	openAIAssistantModal,
	useAIAssistantStore,
} from 'container/AIAssistant/store/useAIAssistantStore';
import { useThemeMode } from 'hooks/useDarkMode';
import { ThemeMode } from 'hooks/useDarkMode/constant';
import { useThemeSelection } from 'hooks/useDarkMode/useThemeSelection';
import { useIsAIAssistantEnabled } from 'hooks/useIsAIAssistantEnabled';
import history from 'lib/history';
import { ROLES as UserRole } from 'types/roles';

import { createShortcutActions } from '../../constants/shortcutActions';
import { useCmdK } from '../../providers/cmdKProvider';

import './cmdKPalette.scss';

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

export function CmdKPalette({
	userRole,
}: {
	userRole: UserRole;
}): JSX.Element | null {
	const { open, setOpen } = useCmdK();

	const { theme } = useThemeMode();
	const selectTheme = useThemeSelection();
	const location = useLocation();
	const isAIAssistantEnabled = useIsAIAssistantEnabled();
	const startNewConversation = useAIAssistantStore(
		(s) => s.startNewConversation,
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

	function handleThemeChange(value: ThemeMode): void {
		logEvent('Account Settings: Theme Changed', { theme: value });
		// Close the palette inside the same flushSync batch as the theme change
		// so its dismissal is part of the captured "new" frame of the wipe;
		// otherwise the dialog would be visible in both snapshots and flicker.
		selectTheme(value, () => setOpen(false));
	}

	function onClickHandler(key: string): void {
		history.push(key);
	}

	const handleOpenAIAssistant = (): void => {
		void logEvent(AIAssistantEvents.Opened, {
			source: AIAssistantOpenSource.Cmdk,
			currentPage: normalizePage(location.pathname),
		});
		startNewConversation();
		openAIAssistantModal();
	};

	const actions = createShortcutActions({
		navigate: onClickHandler,
		handleThemeChange,
		aiAssistant: isAIAssistantEnabled
			? { open: handleOpenAIAssistant }
			: undefined,
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
								<span
									className={cx('cmd-item-icon', it.id === 'ai-assistant' && 'noz-icon')}
								>
									{it.icon}
								</span>
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

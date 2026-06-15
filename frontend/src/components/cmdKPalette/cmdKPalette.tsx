import React, { useEffect, useMemo } from 'react';
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
import { useIsAIAssistantEnabled } from 'hooks/useIsAIAssistantEnabled';
import history from 'lib/history';
import { ROLES as UserRole } from 'types/roles';

import {
	CmdAction,
	createShortcutActions,
} from '../../constants/shortcutActions';
import { useCmdK } from '../../providers/cmdKProvider';

import './cmdKPalette.scss';

export function getActiveSectionFromActions(
	pathname: string,
	actions: CmdAction[],
): string | null {
	for (const action of actions) {
		if (action.routePrefix && pathname.startsWith(action.routePrefix)) {
			return action.section ?? null;
		}
	}
	return null;
}

export function CmdKPalette({
	userRole,
}: {
	userRole: UserRole;
}): JSX.Element | null {
	const { open, setOpen } = useCmdK();
	const { pathname } = useLocation();
	const { setAutoSwitch, setTheme, theme } = useThemeMode();
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
	const grouped: [string, CmdAction[]][] = useMemo(() => {
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
		const entries = Array.from(map.entries());
		// Detect the active module from the current URL and move its section to the top
		const activeSection = getActiveSectionFromActions(pathname, permitted);

		if (activeSection) {
			entries.sort((a, b) => {
				const aMatch = a[0] === activeSection ? 0 : 1;
				const bMatch = b[0] === activeSection ? 0 : 1;
				return aMatch - bMatch;
			});
		}

		return entries;
	}, [permitted, pathname]);

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

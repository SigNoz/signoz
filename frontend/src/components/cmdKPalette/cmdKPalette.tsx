import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
	Command,
	type CommandActionItemType,
	type CommandItemType,
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
import { IS_DEV } from 'lib/env';
import history from 'lib/history';
import { ROLES as UserRole } from 'types/roles';

import {
	type CmdAction,
	createShortcutActions,
} from '../../constants/shortcutActions';
import { useCmdK } from '../../providers/cmdKProvider';

import './cmdKPalette.scss';

const AuthZDevModal = IS_DEV
	? React.lazy(() =>
			import('lib/authz/devtools/AuthZDevModal/AuthZDevModal').then((m) => ({
				default: m.AuthZDevModal,
			})),
		)
	: null;

const AuthZDevFloatingIndicator = IS_DEV
	? React.lazy(() =>
			import('lib/authz/devtools/AuthZDevFloatingIndicator/AuthZDevFloatingIndicator').then(
				(m) => ({
					default: m.AuthZDevFloatingIndicator,
				}),
			),
		)
	: null;

const openAuthZDevModal = IS_DEV
	? (): void => {
			void import('lib/authz/devtools/useAuthZDevStore').then((m) => {
				m.openAuthZDevModal();
				return m;
			});
		}
	: undefined;

export function CmdKPalette({
	userRole,
}: {
	userRole: UserRole;
}): JSX.Element | null {
	const { open, setOpen } = useCmdK();

	const { setAutoSwitch, setTheme } = useThemeMode();
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
		authzDevTools: openAuthZDevModal ? { open: openAuthZDevModal } : undefined,
	});

	// RBAC filter: show action if no roles set OR current user role is included
	const permitted = actions.filter(
		(a) => !a.roles || a.roles.includes(userRole),
	);

	const toCommandItem = (action: CmdAction): CommandActionItemType => ({
		type: 'item',
		value: action.id,
		label: action.name,
		prefix: action.icon,
		searchMetadata: action.keywords,
		shortcut:
			action.shortcut && action.shortcut.length > 0
				? action.shortcut.join(' • ')
				: undefined,
		onClick: (): void => {
			// the palette closes itself after a pick, also when this throws
			try {
				action.perform();
			} catch (e) {
				console.error('Error invoking action', e);
			}
		},
	});

	// group permitted actions by section
	const items: CommandItemType[] = ((): CommandItemType[] => {
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

		return Array.from(map.entries()).map(([section, sectionActions]) => ({
			type: 'group',
			value: section.toLowerCase().replace(/\s+/g, '-'),
			label: section,
			items: sectionActions.map(toCommandItem),
		}));
	})();

	return (
		<>
			<Command
				label="Command palette"
				open={open}
				onOpenChange={setOpen}
				items={items}
				searchInputProps={{ placeholder: 'Search…' }}
				noContent="No results"
				testId="cmdk-palette"
			/>
			{IS_DEV && AuthZDevModal && (
				<React.Suspense fallback={null}>
					<AuthZDevModal />
				</React.Suspense>
			)}
			{IS_DEV && AuthZDevFloatingIndicator && (
				<React.Suspense fallback={null}>
					<AuthZDevFloatingIndicator />
				</React.Suspense>
			)}
		</>
	);
}

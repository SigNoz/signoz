import { useMemo } from 'react';
import ReactDOM from 'react-dom';

import { formatShortcut } from './formatShortcut';

import './shiftOverlay.scss';

export type UserRole = 'ADMIN' | 'EDITOR' | 'AUTHOR' | 'VIEWER';
export type CmdAction = {
	id: string;
	name: string;
	shortcut?: string[];
	keywords?: string;
	section?: string;
	roles?: UserRole[];
	perform: () => void;
};

interface ShortcutProps {
	label: string;
	keyHint: React.ReactNode;
}

function Shortcut({ label, keyHint }: ShortcutProps): JSX.Element {
	return (
		<div className="shift-overlay__item">
			<span className="shift-overlay__label">{label}</span>
			<kbd className="shift-overlay__kbd">{keyHint}</kbd>
		</div>
	);
}

interface ShiftOverlayProps {
	visible: boolean;
	actions: CmdAction[];
	userRole: UserRole;
}

export function ShiftOverlay({
	visible,
	actions,
	userRole,
}: ShiftOverlayProps): JSX.Element | null {
	const navigationActions = useMemo(() => {
		// RBAC filter: show action if no roles set OR current user role is included
		const permitted = actions.filter(
			(a) => !a.roles || a.roles.includes(userRole),
		);

		// Navigation only + must have shortcut
		return permitted.filter(
			(a) =>
				a.section?.toLowerCase() === 'navigation' &&
				a.shortcut &&
				a.shortcut.length > 0,
		);
	}, [actions, userRole]);

	if (!visible || navigationActions.length === 0) {
		return null;
	}

	return ReactDOM.createPortal(
		<div className="shift-overlay">
			<div className="shift-overlay__panel">
				{navigationActions.map((action) => (
					<Shortcut
						key={action.id}
						label={action.name.replace(/^Go to\s+/i, '')}
						keyHint={formatShortcut(action.shortcut)}
					/>
				))}
			</div>
		</div>,
		document.body,
	);
}

import './styles.scss';

import { Popover } from 'antd';
import { ReactNode } from 'react';

import { Coordinates, PopoverPosition } from './types';
import { useCoordinates } from './useCoordinates';

export { useCoordinates };
export type { ClickedData, Coordinates, PopoverPosition } from './types';

interface ContextMenuProps {
	coordinates: Coordinates | null;
	popoverPosition?: PopoverPosition | null;
	title?: string;
	items?: ReactNode;
	onClose: () => void;
	children?: ReactNode;
}

interface ContextMenuItemProps {
	children: ReactNode;
	onClick?: () => void;
	icon?: ReactNode;
	disabled?: boolean;
	danger?: boolean;
}

function ContextMenuItem({
	children,
	onClick,
	icon,
	disabled = false,
	danger = false,
}: ContextMenuItemProps): JSX.Element {
	const className = `context-menu-item${disabled ? ' disabled' : ''}${
		danger ? ' danger' : ''
	}`;

	return (
		<button
			className={className}
			onClick={disabled ? undefined : onClick}
			disabled={disabled}
			type="button"
		>
			{icon && <span className="icon">{icon}</span>}
			<span className="text">{children}</span>
		</button>
	);
}

export function ContextMenu({
	coordinates,
	popoverPosition,
	title,
	items,
	onClose,
	children,
}: ContextMenuProps): JSX.Element | null {
	if (!coordinates || !items) {
		return null;
	}

	const position: PopoverPosition = popoverPosition ?? {
		left: coordinates.x + 10,
		top: coordinates.y - 10,
		placement: 'right',
	};

	return (
		<Popover
			content={items}
			title={title}
			open={Boolean(coordinates)}
			onOpenChange={(open: boolean): void => {
				if (!open) {
					onClose();
				}
			}}
			trigger="click"
			overlayStyle={{
				position: 'fixed',
				left: position.left,
				top: position.top,
				width: 180,
				maxHeight: 254,
			}}
			arrow={false}
			placement={position.placement}
			rootClassName="context-menu"
		>
			{children}
			{/* phantom span to force Popover to position relative to viewport */}
			<span
				style={{
					position: 'fixed',
					left: position.left,
					top: position.top,
					width: 0,
					height: 0,
				}}
			/>
		</Popover>
	);
}

// Attach Item component to ContextMenu
ContextMenu.Item = ContextMenuItem;

// default props for ContextMenuItem
ContextMenuItem.defaultProps = {
	onClick: undefined,
	icon: undefined,
	disabled: false,
	danger: false,
};

// default props
ContextMenu.defaultProps = {
	popoverPosition: null,
	title: '',
	items: null,
	children: null,
};
export default ContextMenu;

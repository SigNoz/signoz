import { Popover, PopoverProps } from 'antd';
import { ReactNode } from 'react';

import { useCoordinates } from './useCoordinates';

export { useCoordinates };

interface ContextMenuProps {
	coordinates: { x: number; y: number } | null;
	popoverPosition?: {
		left: number;
		top: number;
		placement: PopoverProps['placement'];
	} | null;
	title?: string;
	items?: ReactNode;
	onClose: () => void;
	children?: ReactNode;
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

	const position = popoverPosition ?? {
		left: coordinates.x + 10,
		top: coordinates.y - 10,
		placement: 'right' as PopoverProps['placement'],
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
				maxHeight: 400,
			}}
			arrow={false}
			placement={position.placement}
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

// default props
ContextMenu.defaultProps = {
	popoverPosition: null,
	title: '',
	items: null,
	children: null,
};
export default ContextMenu;

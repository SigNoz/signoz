/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import './NavItem.styles.scss';

import { Tag } from 'antd';
import cx from 'classnames';
import { Pin, PinOff } from 'lucide-react';

import { SidebarItem } from '../sideNav.types';

export default function NavItem({
	item,
	isActive,
	onClick,
	isDisabled,
	onTogglePin,
	isPinned,
	showIcon,
	dataTestId,
}: {
	item: SidebarItem;
	isActive: boolean;
	onClick: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
	isDisabled: boolean;
	onTogglePin?: (item: SidebarItem) => void;
	isPinned?: boolean;
	showIcon?: boolean;
	dataTestId?: string;
}): JSX.Element {
	const { label, icon, isBeta, isNew } = item;

	const handleTogglePinClick = (
		event: React.MouseEvent<SVGSVGElement, MouseEvent>,
	): void => {
		event.stopPropagation();
		onTogglePin?.(item);
	};

	return (
		<div
			className={cx(
				'nav-item',
				isActive ? 'active' : '',
				isDisabled ? 'disabled' : '',
			)}
			onClick={(event): void => {
				if (isDisabled) {
					return;
				}
				onClick(event);
			}}
			data-testid={dataTestId}
		>
			{showIcon && <div className="nav-item-active-marker" />}
			<div className={cx('nav-item-data', isBeta ? 'beta-tag' : '')}>
				{showIcon && <div className="nav-item-icon">{icon}</div>}

				<div className="nav-item-label">{label}</div>

				{isBeta && (
					<div className="nav-item-beta">
						<Tag bordered={false} className="sidenav-beta-tag">
							Beta
						</Tag>
					</div>
				)}

				{isNew && (
					<div className="nav-item-new">
						<Tag bordered={false} className="sidenav-new-tag">
							New
						</Tag>
					</div>
				)}

				{onTogglePin && !isPinned && (
					<Pin
						size={12}
						className="nav-item-pin-icon"
						onClick={handleTogglePinClick}
						color="var(--Vanilla-400, #c0c1c3)"
					/>
				)}

				{onTogglePin && isPinned && (
					<PinOff
						size={12}
						className="nav-item-pin-icon"
						onClick={handleTogglePinClick}
						color="var(--Vanilla-400, #c0c1c3)"
					/>
				)}
			</div>
		</div>
	);
}

NavItem.defaultProps = {
	onTogglePin: undefined,
	isPinned: false,
	showIcon: false,
	dataTestId: undefined,
};

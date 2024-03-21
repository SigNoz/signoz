/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import './NavItem.styles.scss';

import { Tooltip } from 'antd';
import cx from 'classnames';

import { SidebarItem } from '../sideNav.types';

export default function NavItem({
	isCollapsed,
	item,
	isActive,
	onClick,
}: {
	isCollapsed: boolean;
	item: SidebarItem;
	isActive: boolean;
	onClick: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
}): JSX.Element {
	const { label, icon } = item;

	return (
		<Tooltip title={isCollapsed ? label : ''} placement="right">
			<div
				className={cx('nav-item', isActive ? 'active' : '')}
				onClick={(event): void => onClick(event)}
			>
				<div className="nav-item-active-marker" />
				<div className="nav-item-data">
					<div className="nav-item-icon">{icon}</div>

					{!isCollapsed && <div className="nav-item-label">{label}</div>}
				</div>
			</div>
		</Tooltip>
	);
}

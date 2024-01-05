import './NavItem.styles.scss';

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
	onClick: () => void;
}): JSX.Element {
	const { label, icon } = item;

	return (
		// eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
		<div className={cx('nav-item', isActive ? 'active' : '')} onClick={onClick}>
			<div className="nav-item-active-marker" />
			<div className="nav-item-data">
				<div className="nav-item-icon">{icon}</div>

				{!isCollapsed && <div className="nav-item-label">{label}</div>}
			</div>
		</div>
	);
}

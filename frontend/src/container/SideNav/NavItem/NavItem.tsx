import './NavItem.styles.scss';

import cx from 'classnames';

import { SidebarItem } from '../sideNav.types';

export default function NavItem({
	item,
	isActive,
	onClickHandler,
}: {
	item: SidebarItem;
	isActive: boolean;
	onClickHandler: () => void;
}): JSX.Element {
	const { label, icon } = item;

	return (
		// eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
		<div
			className={cx('nav-item', isActive ? 'active' : '')}
			onClick={onClickHandler}
		>
			<div className="nav-item-icon">{icon}</div>

			<div className="nav-item-label">{label}</div>
		</div>
	);
}

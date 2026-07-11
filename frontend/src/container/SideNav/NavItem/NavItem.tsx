/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import './NavItem.styles.scss';

import { Tag } from 'antd';
import cx from 'classnames';
import { forwardRef } from 'react';

import { SidebarItem } from '../sideNav.types';

const NavItem = forwardRef<HTMLAnchorElement, {
	item: SidebarItem;
	isActive: boolean;
	onClick: (event: React.MouseEvent<HTMLElement, MouseEvent>) => void;
}>((props, ref) => {
	const { item, isActive, onClick } = props;
	const { label, icon, isBeta, isNew, key: itemKey } = item;

	const href = item.href ?? (typeof itemKey === 'string' ? `/${itemKey}` : undefined);

	return (
		<a
			ref={ref}
			href={href}
			className={cx('nav-item', isActive ? 'active' : '')}
			onMouseDown={(event): void => {
				if (event.button !== 0) return; // only left-click
				event.preventDefault();
				onClick(event);
			}}
		>
			<div className="nav-item-active-marker" />
			<div className={cx('nav-item-data', isBeta ? 'beta-tag' : '')}>
				<div className="nav-item-icon">{icon}</div>

				<div className="nav-item-label">{label}</div>

				{isBeta && (
					<div className="nav-item-beta">
						<Tag bordered={false} color="geekblue">
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
			</div>
		</a>
	);
});

NavItem.displayName = 'NavItem';

export default NavItem;

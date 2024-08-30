/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import './NavItem.styles.scss';

import { Tag } from 'antd';
import cx from 'classnames';

import { SidebarItem } from '../sideNav.types';

export default function NavItem({
	item,
	isActive,
	onClick,
}: {
	item: SidebarItem;
	isActive: boolean;
	onClick: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
}): JSX.Element {
	const { label, icon, isBeta } = item;

	return (
		<div
			className={cx('nav-item', isActive ? 'active' : '')}
			onClick={(event): void => onClick(event)}
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
			</div>
		</div>
	);
}

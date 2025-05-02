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
	isDisabled,
}: {
	item: SidebarItem;
	isActive: boolean;
	onClick: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
	isDisabled: boolean;
}): JSX.Element {
	const { label, icon, isBeta, isNew } = item;

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
		</div>
	);
}

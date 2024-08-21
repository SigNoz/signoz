/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import './NavItem.styles.scss';

import { Tag } from 'antd';
import cx from 'classnames';

// import { Color } from '@signozhq/design-tokens';
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
			<div className="nav-item-data">
				<div className="nav-item-icon">{icon}</div>

				<div className="nav-item-label">{label}</div>

				{isBeta && (
					<div className="nav-item-beta">
						{/* Ways of adding color beased on our design tokens.  Tried using custom color, but AntD tag component by default gives a background for custom color */}
						{/* <Tag bordered={false} color={Color.TEXT_ROBIN_400}>Beta</Tag> */}

						<Tag bordered={false} color="geekblue">
							Beta
						</Tag>
						{/* <Tag 
  							bordered={false} 
							style={{ 
								backgroundColor: 'rgba(0, 0, 0, 0.2)', 
								color: Color.TEXT_ROBIN_400 
							}}
							>
							Beta
						</Tag> */}
					</div>
				)}
			</div>
		</div>
	);
}

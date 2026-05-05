import { Tag, Tooltip } from 'antd';
import cx from 'classnames';
import { Pin, PinOff } from 'lucide-react';

import { SidebarItem } from '../sideNav.types';

import './NavItem.styles.scss';

export default function NavItem({
	item,
	isActive,
	onClick,
	isDisabled,
	onTogglePin,
	isPinned,
	showIcon,
	dataTestId,
	shortcut,
}: {
	item: SidebarItem;
	isActive: boolean;
	onClick: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
	isDisabled: boolean;
	onTogglePin?: (item: SidebarItem) => void;
	isPinned?: boolean;
	showIcon?: boolean;
	dataTestId?: string;
	shortcut?: string;
}): JSX.Element {
	const { label, icon, isBeta, isNew } = item;

	const handleTogglePinClick = (
		event: React.MouseEvent<SVGSVGElement, MouseEvent>,
	): void => {
		event.stopPropagation();
		onTogglePin?.(item);
	};

	const tooltipTitle = (
		<span>
			{label} {shortcut ? `(${shortcut.toUpperCase()})` : ''}
		</span>
	);

	return (
		<Tooltip title={tooltipTitle} placement="right" mouseEnterDelay={0.5}>
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
						<Tooltip title="Add to shortcuts" placement="right">
							<Pin
								size={12}
								className="nav-item-pin-icon"
								onClick={handleTogglePinClick}
								color="var(--Vanilla-400, #c0c1c3)"
							/>
						</Tooltip>
					)}

					{onTogglePin && isPinned && (
						<Tooltip title="Remove from shortcuts" placement="right">
							<PinOff
								size={12}
								className="nav-item-pin-icon"
								onClick={handleTogglePinClick}
								color="var(--Vanilla-400, #c0c1c3)"
							/>
						</Tooltip>
					)}
				</div>
			</div>
		</Tooltip>
	);
}

NavItem.defaultProps = {
	onTogglePin: undefined,
	isPinned: false,
	showIcon: false,
	dataTestId: undefined,
	shortcut: undefined,
};

import { Tooltip } from 'antd';
import { Badge } from '@signozhq/ui/badge';
import cx from 'classnames';
import { Pin, PinOff } from '@signozhq/icons';
import { Link } from 'react-router-dom';

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
	href,
}: {
	item: SidebarItem;
	isActive: boolean;
	onClick: (event: React.MouseEvent<HTMLElement, MouseEvent>) => void;
	isDisabled: boolean;
	onTogglePin?: (item: SidebarItem) => void;
	isPinned?: boolean;
	showIcon?: boolean;
	dataTestId?: string;
	href?: string;
}): JSX.Element {
	const { label, icon, isBeta, isNew, isEarlyAccess, tooltip } = item;
	const isExternalLink = item.isExternal && href;

	const handleTogglePinClick = (
		event: React.MouseEvent<SVGSVGElement, MouseEvent>,
	): void => {
		event.preventDefault();
		event.stopPropagation();
		onTogglePin?.(item);
	};

	const handleClick = (
		event: React.MouseEvent<HTMLElement, MouseEvent>,
	): void => {
		if (isDisabled) {
			event.preventDefault();
			return;
		}

		if (isExternalLink) {
			return;
		}

		if (
			href &&
			(event.metaKey ||
				event.ctrlKey ||
				event.shiftKey ||
				event.altKey ||
				event.button !== 0)
		) {
			return;
		}

		if (href) {
			event.preventDefault();
		}

		onClick(event);
	};

	const navItemContent = (
		<>
			{showIcon && <div className="nav-item-active-marker" />}
			<div className={cx('nav-item-data', isBeta ? 'beta-tag' : '')}>
				{showIcon && (
					<div className={cx('nav-item-icon', isEarlyAccess ? 'noz-wave' : '')}>
						{icon}
					</div>
				)}

				<div className="nav-item-label">{label}</div>

				{isBeta && (
					<div className="nav-item-beta">
						<Badge color="robin" className="sidenav-beta-tag">
							Beta
						</Badge>
					</div>
				)}

				{isNew && (
					<div className="nav-item-new">
						<Badge color="robin" className="sidenav-new-tag">
							New
						</Badge>
					</div>
				)}

				{isEarlyAccess && (
					<div className="nav-item-early-access">
						<Badge color="robin">Early Access</Badge>
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
		</>
	);

	const navItemClassName = cx(
		'nav-item',
		isActive ? 'active' : '',
		isDisabled ? 'disabled' : '',
	);

	const navItem = href ? (
		isExternalLink ? (
			<a
				href={href}
				target="_blank"
				rel="noopener noreferrer"
				className={navItemClassName}
				onClick={handleClick}
				data-testid={dataTestId}
				aria-disabled={isDisabled}
			>
				{navItemContent}
			</a>
		) : (
			<Link
				to={href}
				className={navItemClassName}
				onClick={handleClick}
				data-testid={dataTestId}
				aria-disabled={isDisabled}
			>
				{navItemContent}
			</Link>
		)
	) : (
		<button
			type="button"
			className={cx(navItemClassName, 'nav-item-button')}
			onClick={handleClick}
			data-testid={dataTestId}
			aria-disabled={isDisabled}
		>
			{navItemContent}
		</button>
	);

	// Only non-pinnable items set `tooltip`; it would nest with the pin tooltip.
	return tooltip ? (
		<Tooltip title={tooltip} placement="right">
			{navItem}
		</Tooltip>
	) : (
		navItem
	);
}

NavItem.defaultProps = {
	onTogglePin: undefined,
	isPinned: false,
	showIcon: false,
	dataTestId: undefined,
	href: undefined,
};

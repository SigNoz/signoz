import { ReactNode } from 'react';
import { Button } from '@signozhq/button';
import {
	CircleAlert,
	CircleCheckBig,
	Info,
	TriangleAlert,
	X,
} from '@signozhq/icons';
import cx from 'classnames';

import './AnnouncementBanner.styles.scss';

export type AnnouncementBannerType = 'warning' | 'info' | 'error' | 'success';

export interface AnnouncementBannerAction {
	label: string;
	onClick: () => void;
}

export interface AnnouncementBannerProps {
	message: ReactNode;
	type?: AnnouncementBannerType;
	icon?: ReactNode | null;
	action?: AnnouncementBannerAction;
	onClose?: () => void;
	className?: string;
}

const DEFAULT_ICONS: Record<AnnouncementBannerType, ReactNode> = {
	warning: <TriangleAlert size={14} />,
	info: <Info size={14} />,
	error: <CircleAlert size={14} />,
	success: <CircleCheckBig size={14} />,
};

export default function AnnouncementBanner({
	message,
	type = 'warning',
	icon,
	action,
	onClose,
	className,
}: AnnouncementBannerProps): JSX.Element {
	const resolvedIcon = icon === null ? null : icon ?? DEFAULT_ICONS[type];

	return (
		<div
			role="alert"
			className={cx(
				'announcement-banner',
				`announcement-banner--${type}`,
				className,
			)}
		>
			<div className="announcement-banner__body">
				{resolvedIcon && (
					<span className="announcement-banner__icon">{resolvedIcon}</span>
				)}
				<span className="announcement-banner__message">{message}</span>
				{action && (
					<Button
						type="button"
						className="announcement-banner__action"
						onClick={action.onClick}
					>
						{action.label}
					</Button>
				)}
			</div>

			{onClose && (
				<Button
					type="button"
					aria-label="Dismiss"
					className="announcement-banner__dismiss"
					onClick={onClose}
				>
					<X size={14} />
				</Button>
			)}
		</div>
	);
}

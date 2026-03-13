import { ReactNode, useState } from 'react';
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
	dismissible?: boolean;
	storageKey?: string;
	onDismiss?: () => void;
	className?: string;
}

const DEFAULT_ICONS: Record<AnnouncementBannerType, ReactNode> = {
	warning: <TriangleAlert size={14} />,
	info: <Info size={14} />,
	error: <CircleAlert size={14} />,
	success: <CircleCheckBig size={14} />,
};

function isDismissed(storageKey?: string): boolean {
	if (!storageKey) {
		return false;
	}
	return localStorage.getItem(storageKey) === 'true';
}

export default function AnnouncementBanner({
	message,
	type = 'warning',
	icon,
	action,
	dismissible = true,
	storageKey,
	onDismiss,
	className,
}: AnnouncementBannerProps): JSX.Element | null {
	const [visible, setVisible] = useState(() => !isDismissed(storageKey));

	if (!visible) {
		return null;
	}

	const handleDismiss = (): void => {
		if (storageKey) {
			localStorage.setItem(storageKey, 'true');
		}
		setVisible(false);
		onDismiss?.();
	};

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
				{typeof message === 'string' ? (
					<span
						className="announcement-banner__message"
						dangerouslySetInnerHTML={{ __html: message }}
					/>
				) : (
					<span className="announcement-banner__message">{message}</span>
				)}
				{action && (
					<button
						type="button"
						className="announcement-banner__action"
						onClick={action.onClick}
					>
						{action.label}
					</button>
				)}
			</div>

			{dismissible && (
				<button
					type="button"
					aria-label="Dismiss"
					className="announcement-banner__dismiss"
					onClick={handleDismiss}
				>
					<X size={14} />
				</button>
			)}
		</div>
	);
}

import './AnnouncementTooltip.styles.scss';

import { Button, Typography } from 'antd';
import classNames from 'classnames';
import { X } from 'lucide-react';
import { useState } from 'react';

type AnnouncementTooltipProps = {
	position: { top: number; left: number };
	title: string;
	message: string;
	show?: boolean;
	className?: string;
	onClose?: () => void;
};

// TEMPORARY HACK FOR ANNOUNCEMENTS: To be removed once proper system in place.
function AnnouncementTooltip({
	position,
	show,
	title,
	message,
	className,
	onClose,
}: AnnouncementTooltipProps): JSX.Element | null {
	const [visible, setVisible] = useState(show);

	const closeTooltip = (): void => {
		setVisible(false);
		onClose?.();
	};

	return visible ? (
		<>
			{/* Dot */}
			<div
				className={classNames('announcement-tooltip__dot', className)}
				style={{
					top: position.top,
					left: position.left,
				}}
			/>

			{/* Tooltip box */}
			<div
				className={classNames('announcement-tooltip__container', className)}
				style={{
					top: position.top,
					left: position.left + 30,
				}}
			>
				<div className="announcement-tooltip__header">
					<Typography.Text className="announcement-tooltip__title">
						{title}
					</Typography.Text>
					<X
						size={18}
						onClick={closeTooltip}
						className="announcement-tooltip__close-icon"
					/>
				</div>
				<p className="announcement-tooltip__message">{message}</p>
				<div className="announcement-tooltip__footer">
					<Button onClick={closeTooltip} className="announcement-tooltip__button">
						Okay
					</Button>
				</div>
			</div>
		</>
	) : null;
}

AnnouncementTooltip.defaultProps = {
	show: false,
	className: '',
	onClose: (): void => {},
};

export default AnnouncementTooltip;

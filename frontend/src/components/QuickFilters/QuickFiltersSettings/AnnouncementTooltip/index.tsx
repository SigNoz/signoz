import './AnnouncementTooltip.styles.scss';

import { Button } from 'antd';
import classNames from 'classnames';
import { Dot, X } from 'lucide-react';
import { useState } from 'react';

type AnnouncementTooltipProps = {
	position: { top: number; left: number };
	title: string;
	message: string;
	className?: string;
};

function AnnouncementTooltip({
	position,
	title,
	message,
	className,
}: AnnouncementTooltipProps): JSX.Element | null {
	const [visible, setVisible] = useState(true);

	const closeTooltip = (): void => setVisible(false);

	return visible ? (
		<>
			{/* Dot */}
			<Dot
				size={32}
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
					top: position.top + 10,
					left: position.left + 30,
				}}
			>
				<div className="announcement-tooltip__header">
					<strong>{title}</strong>
					<X
						size={18}
						onClick={closeTooltip}
						className="announcement-tooltip__close-icon"
					/>
				</div>
				<p className="announcement-tooltip__message">{message}</p>
				<Button onClick={closeTooltip} className="announcement-tooltip__button">
					Okay
				</Button>
			</div>
		</>
	) : null;
}

AnnouncementTooltip.defaultProps = {
	className: '',
};

export default AnnouncementTooltip;

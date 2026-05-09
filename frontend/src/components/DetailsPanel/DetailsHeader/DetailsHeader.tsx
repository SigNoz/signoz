import { ReactNode } from 'react';
import { Button } from '@signozhq/ui';
import { X } from '@signozhq/icons';

import './DetailsHeader.styles.scss';

export interface HeaderAction {
	key: string;
	component: ReactNode; // check later if we can use direct btn itself or not.
}

export interface DetailsHeaderProps {
	title: string;
	onClose: () => void;
	actions?: HeaderAction[];
	closePosition?: 'left' | 'right';
	className?: string;
}

function DetailsHeader({
	title,
	onClose,
	actions,
	closePosition = 'right',
	className,
}: DetailsHeaderProps): JSX.Element {
	const closeButton = (
		<Button
			variant="ghost"
			size="icon"
			color="secondary"
			onClick={onClose}
			aria-label="Close"
			prefix={<X size={14} />}
		></Button>
	);

	return (
		<div className={`details-header ${className || ''}`}>
			{closePosition === 'left' && closeButton}

			<span className="details-header__title">{title}</span>

			{actions && (
				<div className="details-header__actions">
					{actions.map((action) => (
						<div key={action.key}>{action.component}</div>
					))}
				</div>
			)}

			{closePosition === 'right' && closeButton}
		</div>
	);
}

export default DetailsHeader;

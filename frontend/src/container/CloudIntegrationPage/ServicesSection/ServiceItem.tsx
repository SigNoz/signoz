import cx from 'classnames';
import LineClampedText from 'periscope/components/LineClampedText/LineClampedText';

import { Service } from './types';

function ServiceItem({
	service,
	onClick,
	isActive,
}: {
	service: Service;
	onClick: (serviceName: string) => void;
	isActive?: boolean;
}): JSX.Element {
	return (
		<button
			className={cx('service-item', { active: isActive })}
			onClick={(): void => onClick(service.id)}
			type="button"
		>
			<div className="service-item__icon-wrapper">
				<img
					src={service.icon}
					alt={service.title}
					className="service-item__icon"
				/>
			</div>
			<div className="service-item__title">
				<LineClampedText text={service.title} />
			</div>
		</button>
	);
}

ServiceItem.defaultProps = {
	isActive: false,
};

export default ServiceItem;

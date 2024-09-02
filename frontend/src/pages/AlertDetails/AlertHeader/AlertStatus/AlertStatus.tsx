import './AlertStatus.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { CircleCheck, Siren } from 'lucide-react';
import { useMemo } from 'react';
import { getDurationFromNow } from 'utils/timeUtils';

import { AlertStatusProps, StatusConfig } from './types';

export default function AlertStatus({
	status,
	timestamp,
}: AlertStatusProps): JSX.Element {
	const statusConfig: StatusConfig = useMemo(
		() => ({
			firing: {
				icon: <Siren size={14} color={Color.TEXT_VANILLA_400} />,
				text: 'Firing since',
				extraInfo: timestamp ? (
					<>
						<div>⎯</div>
						<div className="time">{getDurationFromNow(timestamp)}</div>
					</>
				) : null,
				className: 'alert-status-info--firing',
			},
			resolved: {
				icon: (
					<CircleCheck
						size={14}
						fill={Color.BG_VANILLA_400}
						color={Color.BG_INK_400}
					/>
				),
				text: 'Resolved',
				extraInfo: null,
				className: 'alert-status-info--resolved',
			},
		}),
		[timestamp],
	);

	const currentStatus = statusConfig[status];

	return (
		<div className={`alert-status-info ${currentStatus.className}`}>
			<div className="alert-status-info__icon">{currentStatus.icon}</div>
			<div className="alert-status-info__details">
				<div className="text">{currentStatus.text}</div>
				{currentStatus.extraInfo}
			</div>
		</div>
	);
}

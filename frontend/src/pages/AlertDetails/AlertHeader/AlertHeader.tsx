import './alertHeader.styles.scss';

import dayjs from 'dayjs';

import AlertActionButtons from './ActionButtons';
import AlertLabels from './AlertLabels/AlertLabels';
import AlertSeverity from './AlertSeverity/AlertSeverity';
import AlertState from './AlertState/AlertState';
import AlertStatus from './AlertStatus/AlertStatus';

type AlertHeaderProps = {
	alertDetails: {
		state: string;
		alert: string;
		id: string;
		labels: Record<string, string>;
	};
};
function AlertHeader({ alertDetails }: AlertHeaderProps): JSX.Element {
	const { state, alert, id, labels } = alertDetails;

	return (
		<div className="alert-info">
			<div className="alert-info__top-section">
				<div className="alert-title-wrapper">
					<AlertState state={state} />
					<div className="alert-title">{alert}</div>
					<div className="alert-id">{id}</div>
				</div>
				<AlertActionButtons />
			</div>
			<div className="alert-info__bottom-section">
				<AlertSeverity severity="warning" />

				{/* // TODO(shaheer): Get actual data when we are able to get alert status from API */}
				<AlertStatus
					status="firing"
					timestamp={dayjs().subtract(1, 'd').valueOf()}
				/>
				<AlertLabels labels={labels} />
			</div>
		</div>
	);
}

export default AlertHeader;

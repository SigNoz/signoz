import './AlertHeader.styles.scss';

import CreateAlertV2Header from 'container/CreateAlertV2/CreateAlertHeader';
import LineClampedText from 'periscope/components/LineClampedText/LineClampedText';
import { useAlertRule } from 'providers/Alert';
import { useMemo, useState } from 'react';
import {
	NEW_ALERT_SCHEMA_VERSION,
	PostableAlertRuleV2,
} from 'types/api/alerts/alertTypesV2';
import { GettableAlert } from 'types/api/alerts/get';

import AlertActionButtons from './ActionButtons/ActionButtons';
import AlertLabels from './AlertLabels/AlertLabels';
import AlertSeverity from './AlertSeverity/AlertSeverity';
import AlertState from './AlertState/AlertState';

export type AlertHeaderProps = {
	alertDetails: GettableAlert | PostableAlertRuleV2;
};
function AlertHeader({ alertDetails }: AlertHeaderProps): JSX.Element {
	const { state, alert: alertName, labels } = alertDetails;
	const { alertRuleState } = useAlertRule();
	const [updatedName, setUpdatedName] = useState(alertName);

	const labelsWithoutSeverity = useMemo(() => {
		if (labels) {
			return Object.fromEntries(
				Object.entries(labels).filter(([key]) => key !== 'severity'),
			);
		}
		return {};
	}, [labels]);

	const isV2Alert = alertDetails.schemaVersion === NEW_ALERT_SCHEMA_VERSION;

	const CreateAlertV1Header = (
		<div className="alert-info__info-wrapper">
			<div className="top-section">
				<div className="alert-title-wrapper">
					<AlertState state={alertRuleState ?? state ?? ''} />
					<div className="alert-title">
						<LineClampedText text={updatedName || alertName} />
					</div>
				</div>
			</div>
			<div className="bottom-section">
				{labels?.severity && <AlertSeverity severity={labels.severity} />}

				{/* // TODO(shaheer): Get actual data when we are able to get alert firing from state from API */}
				{/* <AlertStatus
						status="firing"
						timestamp={dayjs().subtract(1, 'd').valueOf()}
					/> */}
				<AlertLabels labels={labelsWithoutSeverity} />
			</div>
		</div>
	);

	return (
		<div className="alert-info">
			{isV2Alert ? <CreateAlertV2Header /> : CreateAlertV1Header}
			<div className="alert-info__action-buttons">
				<AlertActionButtons
					alertDetails={alertDetails}
					ruleId={alertDetails?.id || ''}
					setUpdatedName={setUpdatedName}
				/>
			</div>
		</div>
	);
}

export default AlertHeader;

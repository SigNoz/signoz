import './AlertHeader.styles.scss';

import LineClampedText from 'periscope/components/LineClampedText/LineClampedText';
import { useAlertRule } from 'providers/Alert';
import { useEffect, useMemo } from 'react';

import AlertActionButtons from './ActionButtons/ActionButtons';
import AlertLabels from './AlertLabels/AlertLabels';
import AlertSeverity from './AlertSeverity/AlertSeverity';
import AlertState from './AlertState/AlertState';

export type AlertHeaderProps = {
	alertDetails: {
		state: string;
		alert: string;
		id: string;
		labels: Record<string, string>;
		disabled: boolean;
	};
};
function AlertHeader({ alertDetails }: AlertHeaderProps): JSX.Element {
	const { state, alert, labels, disabled } = alertDetails;

	const labelsWithoutSeverity = useMemo(
		() =>
			Object.fromEntries(
				Object.entries(labels).filter(([key]) => key !== 'severity'),
			),
		[labels],
	);

	const { isAlertRuleDisabled, setIsAlertRuleDisabled } = useAlertRule();

	useEffect(() => {
		if (isAlertRuleDisabled === undefined) {
			setIsAlertRuleDisabled(disabled);
		}
	}, [disabled, setIsAlertRuleDisabled, isAlertRuleDisabled]);

	return (
		<div className="alert-info">
			<div className="alert-info__info-wrapper">
				<div className="top-section">
					<div className="alert-title-wrapper">
						<AlertState state={isAlertRuleDisabled ? 'disabled' : state} />
						<div className="alert-title">
							<LineClampedText text={alert} />
						</div>
					</div>
				</div>
				<div className="bottom-section">
					<AlertSeverity severity="warning" />

					{/* // TODO(shaheer): Get actual data when we are able to get alert firing from state from API */}
					{/* <AlertStatus
						status="firing"
						timestamp={dayjs().subtract(1, 'd').valueOf()}
					/> */}
					<AlertLabels labels={labelsWithoutSeverity} />
				</div>
			</div>
			<div className="alert-info__action-buttons">
				<AlertActionButtons alertDetails={alertDetails} ruleId={alertDetails.id} />
			</div>
		</div>
	);
}

export default AlertHeader;

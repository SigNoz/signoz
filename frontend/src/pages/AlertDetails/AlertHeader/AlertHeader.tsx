import { useEffect } from 'react';
import type { RuletypesRuleDTO } from 'api/generated/services/sigNoz.schemas';
import CreateAlertHeader from 'container/CreateAlert/CreateAlertHeader';
import { useAlertRule } from 'providers/Alert';
import { PostableAlertRuleV2 } from 'types/api/alerts/alertTypes';

import AlertActionButtons from './ActionButtons/ActionButtons';

import './AlertHeader.styles.scss';

export type AlertHeaderProps = {
	alertDetails: RuletypesRuleDTO | PostableAlertRuleV2;
};
function AlertHeader({ alertDetails }: AlertHeaderProps): JSX.Element {
	const { alert: alertName } = alertDetails;
	const { alertRuleName, setAlertRuleName } = useAlertRule();

	useEffect(() => {
		if (alertRuleName === undefined && alertName) {
			setAlertRuleName(alertName);
		}
	}, [alertRuleName, alertName, setAlertRuleName]);

	useEffect(() => (): void => setAlertRuleName(undefined), [setAlertRuleName]);

	return (
		<div className="alert-info">
			<CreateAlertHeader />
			<div className="alert-info__action-buttons">
				<AlertActionButtons
					alertDetails={alertDetails}
					ruleId={alertDetails?.id || ''}
				/>
			</div>
		</div>
	);
}

export default AlertHeader;

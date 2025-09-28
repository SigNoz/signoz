import './styles.scss';

import { Button, Typography } from 'antd';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { Check, Send, X } from 'lucide-react';

import { useCreateAlertState } from '../context';
import { buildCreateThresholdAlertRulePayload } from './utils';

function Footer(): JSX.Element {
	const {
		alertType,
		alertState: basicAlertState,
		thresholdState,
		advancedOptions,
		evaluationWindow,
		notificationSettings,
		discardAlertRule,
		createAlertRule,
		isCreatingAlertRule,
		testAlertRule,
		isTestingAlertRule,
	} = useCreateAlertState();
	const { currentQuery } = useQueryBuilder();

	const handleDiscard = (): void => discardAlertRule();

	const handleTestNotification = (): void => {
		const payload = buildCreateThresholdAlertRulePayload({
			alertType,
			basicAlertState,
			thresholdState,
			advancedOptions,
			evaluationWindow,
			notificationSettings,
			query: currentQuery,
		});
		testAlertRule(payload, {
			onSuccess: () => {},
			onError: () => {},
		});
	};

	const handleSaveAlert = (): void => {
		const payload = buildCreateThresholdAlertRulePayload({
			alertType,
			basicAlertState,
			thresholdState,
			advancedOptions,
			evaluationWindow,
			notificationSettings,
			query: currentQuery,
		});
		createAlertRule(payload, {
			onSuccess: () => {},
			onError: () => {},
		});
	};

	const disableButtons = isCreatingAlertRule || isTestingAlertRule;

	return (
		<div className="create-alert-v2-footer">
			<Button type="text" onClick={handleDiscard} disabled={disableButtons}>
				<X size={14} /> Discard
			</Button>
			<div className="button-group">
				<Button
					type="default"
					onClick={handleTestNotification}
					disabled={disableButtons}
				>
					<Send size={14} />
					<Typography.Text>Test Notification</Typography.Text>
				</Button>
				<Button type="primary" onClick={handleSaveAlert} disabled={disableButtons}>
					<Check size={14} />
					<Typography.Text>Save Alert Rule</Typography.Text>
				</Button>
			</div>
		</div>
	);
}

export default Footer;

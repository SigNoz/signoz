import './styles.scss';

import { Button } from 'antd';
import classNames from 'classnames';
import { Activity, ChartLine } from 'lucide-react';
import { AlertTypes } from 'types/api/alerts/alertTypes';

import { useCreateAlertState } from '../context';
import Stepper from '../Stepper';
import AlertThreshold from './AlertThreshold';

function AlertCondition(): JSX.Element {
	const { alertType, setAlertType } = useCreateAlertState();

	const showMultipleTabs =
		alertType === AlertTypes.ANOMALY_BASED_ALERT ||
		alertType === AlertTypes.METRICS_BASED_ALERT;

	const tabs = [
		{
			label: 'Threshold',
			icon: <ChartLine size={14} data-testid="threshold-view" />,
			value: AlertTypes.METRICS_BASED_ALERT,
		},
		...(showMultipleTabs
			? [
					{
						label: 'Anomaly',
						icon: <Activity size={14} data-testid="anomaly-view" />,
						value: AlertTypes.ANOMALY_BASED_ALERT,
					},
			  ]
			: []),
	];

	const handleAlertTypeChange = (value: AlertTypes): void => {
		if (!showMultipleTabs) {
			return;
		}
		setAlertType(value);
	};

	return (
		<div className="alert-condition-container">
			<Stepper stepNumber={2} label="Set alert conditions" />
			<div className="alert-condition">
				<div className="alert-condition-tabs">
					{tabs.map((tab) => (
						<Button
							key={tab.value}
							className={classNames('list-view-tab', 'explorer-view-option', {
								'active-tab': alertType === tab.value,
							})}
							onClick={(): void => {
								handleAlertTypeChange(tab.value as AlertTypes);
							}}
						>
							{tab.icon}
							{tab.label}
						</Button>
					))}
				</div>
			</div>
			{alertType === AlertTypes.METRICS_BASED_ALERT && <AlertThreshold />}
		</div>
	);
}

export default AlertCondition;

import './styles.scss';

import { Button, Tooltip } from 'antd';
import classNames from 'classnames';
import { Activity, ChartLine } from 'lucide-react';
import { AlertTypes } from 'types/api/alerts/alertTypes';

import { useCreateAlertState } from '../context';
import Stepper from '../Stepper';
import AlertThreshold from './AlertThreshold';
import AnomalyThreshold from './AnomalyThreshold';
import { ANOMALY_TAB_TOOLTIP, THRESHOLD_TAB_TOOLTIP } from './constants';

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

	const getTabTooltip = (tab: { value: AlertTypes }): string => {
		if (tab.value === AlertTypes.ANOMALY_BASED_ALERT) {
			return ANOMALY_TAB_TOOLTIP;
		}
		return THRESHOLD_TAB_TOOLTIP;
	};

	return (
		<div className="alert-condition-container">
			<Stepper stepNumber={2} label="Set alert conditions" />
			<div className="alert-condition">
				<div className="alert-condition-tabs">
					{tabs.map((tab) => (
						<Tooltip key={tab.value} title={getTabTooltip(tab)}>
							<Button
								className={classNames('list-view-tab', 'explorer-view-option', {
									'active-tab': alertType === tab.value,
								})}
								onClick={(): void => {
									if (alertType !== tab.value) {
										handleAlertTypeChange(tab.value as AlertTypes);
									}
								}}
							>
								{tab.icon}
								{tab.label}
							</Button>
						</Tooltip>
					))}
				</div>
			</div>
			{alertType !== AlertTypes.ANOMALY_BASED_ALERT && <AlertThreshold />}
			{alertType === AlertTypes.ANOMALY_BASED_ALERT && <AnomalyThreshold />}
		</div>
	);
}

export default AlertCondition;

import { ReactNode } from 'react';
import { Button, Tooltip } from 'antd';
import classNames from 'classnames';
import { Activity, ChartLine } from '@signozhq/icons';
import { useChannelOptions } from 'hooks/notificationChannels/useChannelOptions';
import { AlertTypes } from 'types/api/alerts/alertTypes';

import { useCreateAlertState } from '../context';
import AdvancedOptions from '../EvaluationSettings/AdvancedOptions';
import Stepper from '../Stepper';
import { useIsAnomalyDetectionAvailable } from '../useIsAnomalyDetectionAvailable';
import AlertThreshold from './AlertThreshold';
import AnomalyThreshold from './AnomalyThreshold';
import {
	ANOMALY_TAB_SWITCH_NOTE,
	ANOMALY_TAB_TOOLTIP,
	THRESHOLD_TAB_SWITCH_NOTE,
	THRESHOLD_TAB_TOOLTIP,
} from './constants';
import { useAnomalyFunctionSync } from './useAnomalyFunctionSync';

import styles from './AlertCondition.module.scss';
import './styles.scss';

function AlertCondition(): JSX.Element {
	const { alertType, setAlertType } = useCreateAlertState();
	useAnomalyFunctionSync();

	const {
		data: channels,
		isLoading: isLoadingChannels,
		isError: isErrorChannels,
		refetch: refreshChannels,
	} = useChannelOptions();

	const isAnomalyDetectionEnabled = useIsAnomalyDetectionAvailable();

	// Anomaly rules stay editable even without a cloud or enterprise license.
	const showMultipleTabs =
		alertType === AlertTypes.ANOMALY_BASED_ALERT ||
		(isAnomalyDetectionEnabled && alertType === AlertTypes.METRICS_BASED_ALERT);

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

	const getTabTooltip = (tab: { value: AlertTypes }): ReactNode => {
		const isAnomalyTab = tab.value === AlertTypes.ANOMALY_BASED_ALERT;
		const description = isAnomalyTab
			? ANOMALY_TAB_TOOLTIP
			: THRESHOLD_TAB_TOOLTIP;
		if (tab.value === alertType) {
			return description;
		}
		const switchNote = isAnomalyTab
			? ANOMALY_TAB_SWITCH_NOTE
			: THRESHOLD_TAB_SWITCH_NOTE;
		return (
			<>
				<div>{description}</div>
				<div className={styles.switchNote}>{switchNote}</div>
			</>
		);
	};

	return (
		<div className="alert-condition-container">
			<Stepper stepNumber={2} label="Set alert conditions" />
			<div className="alert-condition">
				<div className="alert-condition-tabs">
					{tabs.map((tab) => (
						<Tooltip
							key={tab.value}
							title={getTabTooltip(tab)}
							overlayClassName={styles.tabTooltip}
						>
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
			{alertType !== AlertTypes.ANOMALY_BASED_ALERT && (
				<AlertThreshold
					channels={channels}
					isLoadingChannels={isLoadingChannels}
					isErrorChannels={isErrorChannels}
					refreshChannels={refreshChannels}
				/>
			)}
			{alertType === AlertTypes.ANOMALY_BASED_ALERT && (
				<AnomalyThreshold
					channels={channels}
					isLoadingChannels={isLoadingChannels}
					isErrorChannels={isErrorChannels}
					refreshChannels={refreshChannels}
				/>
			)}
			<div className="condensed-advanced-options-container">
				<AdvancedOptions />
			</div>
		</div>
	);
}

export default AlertCondition;

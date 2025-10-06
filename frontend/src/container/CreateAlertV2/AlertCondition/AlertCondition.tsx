import './styles.scss';

import { Button, Tooltip } from 'antd';
import getAllChannels from 'api/channels/getAll';
import classNames from 'classnames';
import { ChartLine } from 'lucide-react';
import { useQuery } from 'react-query';
import { SuccessResponseV2 } from 'types/api';
import { AlertTypes } from 'types/api/alerts/alertTypes';
import { Channels } from 'types/api/channels/getAll';
import APIError from 'types/api/error';

import { useCreateAlertState } from '../context';
import AdvancedOptions from '../EvaluationSettings/AdvancedOptions';
import Stepper from '../Stepper';
import AlertThreshold from './AlertThreshold';
import AnomalyThreshold from './AnomalyThreshold';
import { ANOMALY_TAB_TOOLTIP, THRESHOLD_TAB_TOOLTIP } from './constants';

function AlertCondition(): JSX.Element {
	const { alertType, setAlertType } = useCreateAlertState();

	const {
		data,
		isLoading: isLoadingChannels,
		isError: isErrorChannels,
		refetch: refreshChannels,
	} = useQuery<SuccessResponseV2<Channels[]>, APIError>(['getChannels'], {
		queryFn: () => getAllChannels(),
	});
	const channels = data?.data || [];

	const showMultipleTabs =
		alertType === AlertTypes.ANOMALY_BASED_ALERT ||
		alertType === AlertTypes.METRICS_BASED_ALERT;

	const tabs = [
		{
			label: 'Threshold',
			icon: <ChartLine size={14} data-testid="threshold-view" />,
			value: AlertTypes.METRICS_BASED_ALERT,
		},
		// Hide anomaly tab for now
		// ...(showMultipleTabs
		// 	? [
		// 			{
		// 				label: 'Anomaly',
		// 				icon: <Activity size={14} data-testid="anomaly-view" />,
		// 				value: AlertTypes.ANOMALY_BASED_ALERT,
		// 			},
		// 	  ]
		// 	: []),
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

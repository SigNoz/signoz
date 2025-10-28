import { Button, Input, Select, Tooltip, Typography } from 'antd';
import { CircleX, Trash } from 'lucide-react';
import { useAppContext } from 'providers/App/App';
import { useMemo, useState } from 'react';

import { useCreateAlertState } from '../context';
import { AlertThresholdOperator } from '../context/types';
import { ThresholdItemProps } from './types';
import { NotificationChannelsNotFoundContent } from './utils';

function ThresholdItem({
	threshold,
	updateThreshold,
	removeThreshold,
	showRemoveButton,
	channels,
	units,
	isErrorChannels,
	refreshChannels,
	isLoadingChannels,
}: ThresholdItemProps): JSX.Element {
	const { user } = useAppContext();
	const { thresholdState, notificationSettings } = useCreateAlertState();
	const [showRecoveryThreshold, setShowRecoveryThreshold] = useState(false);

	const yAxisUnitSelect = useMemo(() => {
		let component = (
			<Select
				placeholder="Unit"
				value={threshold.unit ? threshold.unit : null}
				onChange={(value): void => updateThreshold(threshold.id, 'unit', value)}
				style={{ width: 150 }}
				options={units}
				disabled={units.length === 0}
				data-testid="threshold-unit-select"
			/>
		);
		if (units.length === 0) {
			component = (
				<Tooltip
					trigger="hover"
					title="Please select a Y-axis unit for the query first"
				>
					<Select
						placeholder="Unit"
						value={threshold.unit ? threshold.unit : null}
						onChange={(value): void => updateThreshold(threshold.id, 'unit', value)}
						style={{ width: 150 }}
						options={units}
						disabled={units.length === 0}
						data-testid="threshold-unit-select"
					/>
				</Tooltip>
			);
		}
		return component;
	}, [units, threshold.unit, updateThreshold, threshold.id]);

	const getOperatorSymbol = (): string => {
		switch (thresholdState.operator) {
			case AlertThresholdOperator.IS_ABOVE:
				return '>';
			case AlertThresholdOperator.IS_BELOW:
				return '<';
			case AlertThresholdOperator.IS_EQUAL_TO:
				return '=';
			case AlertThresholdOperator.IS_NOT_EQUAL_TO:
				return '!=';
			default:
				return '';
		}
	};

	// const addRecoveryThreshold = (): void => {
	// 	setShowRecoveryThreshold(true);
	// 	updateThreshold(threshold.id, 'recoveryThresholdValue', 0);
	// };

	const removeRecoveryThreshold = (): void => {
		setShowRecoveryThreshold(false);
		updateThreshold(threshold.id, 'recoveryThresholdValue', null);
	};

	return (
		<div key={threshold.id} className="threshold-item">
			<div className="threshold-row">
				<div className="threshold-indicator">
					<div
						className="threshold-dot"
						style={{ backgroundColor: threshold.color }}
					/>
				</div>
				<div className="threshold-controls">
					<Input
						placeholder="Enter threshold name"
						value={threshold.label}
						onChange={(e): void =>
							updateThreshold(threshold.id, 'label', e.target.value)
						}
						style={{ width: 200 }}
						data-testid="threshold-name-input"
					/>
					<Typography.Text className="sentence-text">on value</Typography.Text>
					<Typography.Text className="sentence-text highlighted-text">
						{getOperatorSymbol()}
					</Typography.Text>
					<Input
						placeholder="Enter threshold value"
						value={threshold.thresholdValue}
						onChange={(e): void =>
							updateThreshold(threshold.id, 'thresholdValue', e.target.value)
						}
						style={{ width: 100 }}
						type="number"
						data-testid="threshold-value-input"
					/>
					{yAxisUnitSelect}
					{!notificationSettings.routingPolicies && (
						<>
							<Typography.Text className="sentence-text">send to</Typography.Text>
							<Select
								value={threshold.channels}
								onChange={(value): void =>
									updateThreshold(threshold.id, 'channels', value)
								}
								data-testid="threshold-notification-channel-select"
								style={{ width: 350 }}
								options={channels.map((channel) => ({
									value: channel.name,
									label: channel.name,
									'data-testid': `threshold-notification-channel-option-${threshold.label}`,
								}))}
								mode="multiple"
								placeholder="Select notification channels"
								showSearch
								maxTagCount={2}
								maxTagPlaceholder={(omittedValues): string =>
									`+${omittedValues.length} more`
								}
								maxTagTextLength={10}
								filterOption={(input, option): boolean =>
									option?.label?.toLowerCase().includes(input.toLowerCase()) || false
								}
								status={isErrorChannels ? 'error' : undefined}
								disabled={isLoadingChannels}
								notFoundContent={
									<NotificationChannelsNotFoundContent
										user={user}
										refreshChannels={refreshChannels}
									/>
								}
							/>
						</>
					)}
					{showRecoveryThreshold && (
						<>
							<Typography.Text className="sentence-text">recover on</Typography.Text>
							<Input
								placeholder="Enter recovery threshold value"
								value={threshold.recoveryThresholdValue ?? ''}
								onChange={(e): void =>
									updateThreshold(threshold.id, 'recoveryThresholdValue', e.target.value)
								}
								style={{ width: 100 }}
								type="number"
								data-testid="recovery-threshold-value-input"
							/>
							<Tooltip title="Remove recovery threshold">
								<Button
									type="default"
									icon={<Trash size={16} />}
									onClick={removeRecoveryThreshold}
									className="icon-btn"
									data-testid="remove-recovery-threshold-button"
								/>
							</Tooltip>
						</>
					)}
					<Button.Group>
						{/* TODO: Add recovery threshold back once the functionality is implemented */}
						{/* {!showRecoveryThreshold && (
							<Tooltip title="Add recovery threshold">
								<Button
									type="default"
									icon={<ChartLine size={16} />}
									className="icon-btn"
									onClick={addRecoveryThreshold}
								/>
							</Tooltip>
						)} */}
						{showRemoveButton && (
							<Tooltip title="Remove threshold">
								<Button
									type="default"
									icon={<CircleX size={16} />}
									onClick={(): void => removeThreshold(threshold.id)}
									className="icon-btn"
									data-testid="remove-threshold-button"
								/>
							</Tooltip>
						)}
					</Button.Group>
				</div>
			</div>
		</div>
	);
}

export default ThresholdItem;

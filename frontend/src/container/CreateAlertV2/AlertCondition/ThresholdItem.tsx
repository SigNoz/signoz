import { useMemo, useState } from 'react';
import { Button, Input, Tooltip } from 'antd';
import { ComboboxSimple } from '@signozhq/ui/combobox';
import { SelectSimple } from '@signozhq/ui/select';
import { Typography } from '@signozhq/ui/typography';
import { CircleX, Trash } from '@signozhq/icons';

import { useCreateAlertState } from '../context';
import { AlertThresholdOperator } from '../context/types';
import { normalizeOperator } from '../utils';
import { ThresholdItemProps } from './types';

function ThresholdItem({
	threshold,
	updateThreshold,
	removeThreshold,
	showRemoveButton,
	channels,
	units,
	isErrorChannels,
	isLoadingChannels,
}: ThresholdItemProps): JSX.Element {
	const { thresholdState, notificationSettings } = useCreateAlertState();
	const [showRecoveryThreshold, setShowRecoveryThreshold] = useState(false);

	const yAxisUnitSelect = useMemo(() => {
		let component = (
			<SelectSimple
				placeholder="Unit"
				value={threshold.unit ? threshold.unit : undefined}
				onChange={(value): void =>
					updateThreshold(threshold.id, 'unit', value as string)
				}
				style={{ width: 150 }}
				items={units}
				disabled={units.length === 0}
				testId="threshold-unit-select"
			/>
		);
		if (units.length === 0) {
			component = (
				<Tooltip trigger="hover" title="No compatible units available">
					<SelectSimple
						placeholder="Unit"
						value={threshold.unit ? threshold.unit : undefined}
						onChange={(value): void =>
							updateThreshold(threshold.id, 'unit', value as string)
						}
						style={{ width: 150 }}
						items={units}
						disabled={units.length === 0}
						testId="threshold-unit-select"
					/>
				</Tooltip>
			);
		}
		return component;
	}, [units, threshold.unit, updateThreshold, threshold.id]);

	const getOperatorSymbol = (): string => {
		switch (normalizeOperator(thresholdState.operator)) {
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
							<ComboboxSimple
								value={threshold.channels}
								onChange={(value): void =>
									updateThreshold(threshold.id, 'channels', value as string[])
								}
								testId="threshold-notification-channel-select"
								style={{ width: 350 }}
								items={channels.map((channel) => ({
									value: channel.name,
									label: channel.name,
								}))}
								multiple
								placeholder="Select notification channels"
								loading={isLoadingChannels}
								className={isErrorChannels ? 'error' : undefined}
								emptyPlaceholder="No channels found"
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

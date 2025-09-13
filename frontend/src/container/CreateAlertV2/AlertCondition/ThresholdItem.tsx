import { Button, Input, Select, Tag, Tooltip, Typography } from 'antd';
import { ChartLine, CircleX, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import { AlertThresholdOperator } from '../context/types';
import { ThresholdItemProps } from './types';

function ThresholdItem({
	threshold,
	updateThreshold,
	removeThreshold,
	showRemoveButton,
	channels,
	units,
	operator,
}: ThresholdItemProps): JSX.Element {
	const [showRecoveryThreshold, setShowRecoveryThreshold] = useState(
		threshold.recoveryThresholdValue !== null && threshold.recoveryThresholdValue !== undefined
	);

	const getOperatorSymbol = (op: AlertThresholdOperator): string => {
		switch (op) {
			case AlertThresholdOperator.IS_ABOVE:
				return '>';
			case AlertThresholdOperator.IS_BELOW:
				return '<';
			case AlertThresholdOperator.IS_EQUAL_TO:
				return '=';
			case AlertThresholdOperator.IS_NOT_EQUAL_TO:
				return '!=';
			default:
				return '>';
		}
	};

	const operatorSymbol = getOperatorSymbol(operator);

	const yAxisUnitDisplay = useMemo(() => {
		if (threshold.unit) {
			const selectedUnit = units.find((u) => u.value === threshold.unit);
			return selectedUnit?.label || threshold.unit;
		}
		return null;
	}, [units, threshold.unit]);

	const channelDisplay = useMemo(() => {
		if (!threshold.channels || threshold.channels.length === 0) {
			return null;
		}

		const selectedChannels = channels.filter((ch) =>
			threshold.channels.includes(ch.id),
		);

		if (selectedChannels.length === 0) {
			return null;
		}

		if (selectedChannels.length <= 2) {
			return selectedChannels.map((ch) => (
				<Tag key={ch.id} className="channel-tag">
					{ch.name}
				</Tag>
			));
		}

		return (
			<>
				<Tag className="channel-tag">{selectedChannels[0].name}</Tag>
				<Tag className="channel-tag">{selectedChannels[1].name}</Tag>
				<Tooltip
					title={selectedChannels
						.slice(2)
						.map((ch) => ch.name)
						.join(', ')}
				>
					<Tag className="channel-tag">+{selectedChannels.length - 2} more</Tag>
				</Tooltip>
			</>
		);
	}, [channels, threshold.channels]);

	return (
		<div key={threshold.id} className="threshold-item-compact">
			<div className="threshold-main-row">
				<div className="threshold-indicator">
					<div
						className="threshold-dot"
						style={{ backgroundColor: threshold.color }}
					/>
				</div>
				
				<div className="threshold-sentence">
					{/* Threshold Label */}
					<Input
						className="threshold-label-input"
						placeholder="Critical"
						value={threshold.label}
						onChange={(e): void =>
							updateThreshold(threshold.id, 'label', e.target.value)
						}
					/>
					
					<Typography.Text className="sentence-text">on value</Typography.Text>
					
					{/* Operator Symbol */}
					<Typography.Text className="operator-symbol">
						{operatorSymbol}
					</Typography.Text>
					
					{/* Threshold Value */}
					<Input
						className="threshold-value-input"
						placeholder="0"
						value={threshold.thresholdValue}
						onChange={(e): void =>
							updateThreshold(threshold.id, 'thresholdValue', e.target.value)
						}
						type="number"
					/>
					
					{/* Unit Selector */}
					{units.length > 0 ? (
						<Select
							className="unit-select"
							placeholder="unit"
							value={threshold.unit || undefined}
							onChange={(value): void =>
								updateThreshold(threshold.id, 'unit', value)
							}
							options={units}
						/>
					) : (
						<Tooltip title="Please select a Y-axis unit for the query first">
							<Select
								className="unit-select"
								placeholder="unit"
								value={threshold.unit || undefined}
								onChange={(value): void =>
									updateThreshold(threshold.id, 'unit', value)
								}
								options={units}
								disabled
							/>
					</Tooltip>
					)}
					
					<Typography.Text className="sentence-text">send to</Typography.Text>
					
					{/* Notification Channels */}
					<Select
						className="channels-select"
						value={threshold.channels}
						onChange={(value): void =>
							updateThreshold(threshold.id, 'channels', value)
						}
						options={channels.map((channel) => ({
							value: channel.id,
							label: channel.name,
						}))}
						mode="multiple"
						placeholder="channels"
						showSearch
						filterOption={(input, option) =>
							(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
						}
						maxTagCount="responsive"
						maxTagTextLength={12}
						allowClear
						maxTagPlaceholder={(omittedValues): JSX.Element => (
							<Tooltip
								title={omittedValues
									.map((item) => {
										const channel = channels.find((ch) => ch.id === item.value);
										return channel?.name || item.label;
									})
									.join(', ')}
							>
								<span>+{omittedValues.length}</span>
							</Tooltip>
						)}
					/>
					
					{/* Recovery threshold text if shown */}
					{showRecoveryThreshold && (
						<>
							<Typography.Text className="sentence-text">
								recover on
							</Typography.Text>
							<Input
								className="threshold-value-input"
								placeholder="0"
								value={threshold.recoveryThresholdValue ?? ''}
								onChange={(e): void => {
									const value = e.target.value;
									updateThreshold(
										threshold.id,
										'recoveryThresholdValue',
										value === '' ? null : value,
									);
								}}
								type="number"
							/>
							<Tooltip title="Remove recovery threshold">
								<Button
									type="text"
									icon={<CircleX size={10} />}
									className="recovery-remove-btn"
									onClick={(): void => {
										setShowRecoveryThreshold(false);
										updateThreshold(threshold.id, 'recoveryThresholdValue', null);
									}}
								/>
							</Tooltip>
						</>
					)}
				</div>
				
				{/* Action buttons */}
				<div className="threshold-actions">
					{!showRecoveryThreshold && (
						<Tooltip title="Add recovery threshold">
							<Button
								type="text"
								icon={<ChartLine size={14} />}
								className="icon-btn"
								onClick={(): void => setShowRecoveryThreshold(true)}
							/>
						</Tooltip>
					)}
					{showRemoveButton && (
						<Tooltip title="Remove threshold">
							<Button
								type="text"
								icon={<Trash2 size={14} />}
								onClick={(): void => removeThreshold(threshold.id)}
								className="icon-btn threshold-remove-btn"
							/>
						</Tooltip>
					)}
				</div>
			</div>
		</div>
	);
}

export default ThresholdItem;

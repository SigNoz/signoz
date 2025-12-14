import { Button, Input, Select, Space, Tooltip, Typography } from 'antd';
import { ChartLine, CircleX } from 'lucide-react';
import { useMemo, useState } from 'react';

import { ThresholdItemProps } from './types';

function ThresholdItem({
	threshold,
	updateThreshold,
	removeThreshold,
	showRemoveButton,
	channels,
	units,
}: ThresholdItemProps): JSX.Element {
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
					/>
				</Tooltip>
			);
		}
		return component;
	}, [units, threshold.unit, updateThreshold, threshold.id]);

	return (
		<div key={threshold.id} className="threshold-item">
			<div className="threshold-row">
				<div className="threshold-indicator">
					<div
						className="threshold-dot"
						style={{ backgroundColor: threshold.color }}
					/>
				</div>
				<Space className="threshold-controls">
					<div className="threshold-inputs">
						<Input.Group>
							<Input
								placeholder="Enter threshold name"
								value={threshold.label}
								onChange={(e): void =>
									updateThreshold(threshold.id, 'label', e.target.value)
								}
								style={{ width: 260 }}
							/>
							<Input
								placeholder="Enter threshold value"
								value={threshold.thresholdValue}
								onChange={(e): void =>
									updateThreshold(threshold.id, 'thresholdValue', e.target.value)
								}
								style={{ width: 210 }}
							/>
							{yAxisUnitSelect}
						</Input.Group>
					</div>
					<Typography.Text className="sentence-text">to</Typography.Text>
					<Select
						value={threshold.channels}
						onChange={(value): void =>
							updateThreshold(threshold.id, 'channels', value)
						}
						style={{ width: 260 }}
						options={channels.map((channel) => ({
							value: channel.id,
							label: channel.name,
						}))}
						mode="multiple"
						placeholder="Select notification channels"
					/>
					<Button.Group>
						{!showRecoveryThreshold && (
							<Button
								type="default"
								icon={<ChartLine size={16} />}
								className="icon-btn"
								onClick={(): void => setShowRecoveryThreshold(true)}
							/>
						)}
						{showRemoveButton && (
							<Button
								type="default"
								icon={<CircleX size={16} />}
								onClick={(): void => removeThreshold(threshold.id)}
								className="icon-btn"
							/>
						)}
					</Button.Group>
				</Space>
			</div>
			{showRecoveryThreshold && (
				<Input.Group className="recovery-threshold-input-group">
					<Input
						placeholder="Recovery threshold"
						disabled
						style={{ width: 260 }}
						className="recovery-threshold-label"
					/>
					<Input
						placeholder="Enter recovery threshold value"
						value={threshold.recoveryThresholdValue}
						onChange={(e): void =>
							updateThreshold(threshold.id, 'recoveryThresholdValue', e.target.value)
						}
						style={{ width: 210 }}
					/>
				</Input.Group>
			)}
		</div>
	);
}

export default ThresholdItem;

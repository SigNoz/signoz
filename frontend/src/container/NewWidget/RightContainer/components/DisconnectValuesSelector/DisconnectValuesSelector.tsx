import { useEffect, useState } from 'react';
import { Typography } from 'antd';
import { DisconnectedValuesMode } from 'lib/uPlotV2/config/types';

import DisconnectValuesModeToggle from './DisconnectValuesModeToggle';
import DisconnectValuesThresholdInput from './DisconnectValuesThresholdInput';

import './DisconnectValuesSelector.styles.scss';

const DEFAULT_THRESHOLD_SECONDS = 60;

interface DisconnectValuesSelectorProps {
	value: boolean | number;
	minValue: number;
	onChange: (value: boolean | number) => void;
}

export default function DisconnectValuesSelector({
	value,
	minValue,
	onChange,
}: DisconnectValuesSelectorProps): JSX.Element {
	const [mode, setMode] = useState<DisconnectedValuesMode>(() => {
		if (typeof value === 'number') {
			return DisconnectedValuesMode.Threshold;
		}
		return DisconnectedValuesMode.Never;
	});
	const [thresholdSeconds, setThresholdSeconds] = useState<number>(
		typeof value === 'number' ? value : (minValue ?? DEFAULT_THRESHOLD_SECONDS),
	);

	useEffect(() => {
		if (typeof value === 'boolean') {
			setMode(DisconnectedValuesMode.Never);
		} else if (typeof value === 'number') {
			setMode(DisconnectedValuesMode.Threshold);
			setThresholdSeconds(value);
		}
	}, [value]);

	useEffect(() => {
		if (minValue !== undefined) {
			setThresholdSeconds(minValue);
			if (mode === DisconnectedValuesMode.Threshold) {
				onChange(minValue);
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [minValue]);

	const handleModeChange = (newMode: DisconnectedValuesMode): void => {
		setMode(newMode);
		switch (newMode) {
			case DisconnectedValuesMode.Never:
				onChange(true);
				break;
			case DisconnectedValuesMode.Threshold:
				onChange(thresholdSeconds);
				break;
		}
	};

	const handleThresholdChange = (seconds: number): void => {
		setThresholdSeconds(seconds);
		onChange(seconds);
	};

	return (
		<section className="disconnect-values-selector control-container">
			<Typography.Text className="section-heading">
				Disconnect values
			</Typography.Text>
			<div className="disconnect-values-input-wrapper">
				<DisconnectValuesModeToggle value={mode} onChange={handleModeChange} />
				{mode === DisconnectedValuesMode.Threshold && (
					<section className="control-container">
						<Typography.Text className="section-heading">
							Threshold Value
						</Typography.Text>
						<DisconnectValuesThresholdInput
							value={thresholdSeconds}
							minValue={minValue}
							onChange={handleThresholdChange}
						/>
					</section>
				)}
			</div>
		</section>
	);
}

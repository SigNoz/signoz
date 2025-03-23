import './InterStepConfig.styles.scss';

import { Divider } from 'antd';
import SignozRadioGroup from 'components/SignozRadioGroup/SignozRadioGroup';
import { useState } from 'react';

export enum LatencyOptions {
	P99 = 'p99',
	P95 = 'p95',
	P90 = 'p90',
}

function InterStepConfig(): JSX.Element {
	const [
		selectedLatencyOption,
		setSelectedLatencyOption,
	] = useState<LatencyOptions>(LatencyOptions.P99);

	const options = Object.entries(LatencyOptions).map(([key, value]) => ({
		label: key,
		value,
	}));

	return (
		<div className="inter-step-config">
			<div className="inter-step-config__label">Latency type</div>
			<div className="inter-step-config__divider">
				<Divider dashed />
			</div>
			<div className="inter-step-config__latency-options">
				<SignozRadioGroup
					value={selectedLatencyOption}
					options={options}
					onChange={(e): void => setSelectedLatencyOption(e.target.value)}
				/>
			</div>
		</div>
	);
}

export default InterStepConfig;

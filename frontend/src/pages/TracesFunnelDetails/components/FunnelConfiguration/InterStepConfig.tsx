import './InterStepConfig.styles.scss';

import { Divider } from 'antd';
import SignozRadioGroup from 'components/SignozRadioGroup/SignozRadioGroup';
import { FunnelStepData, LatencyOptions } from 'types/api/traceFunnels';

function InterStepConfig({
	index,
	onStepChange,
	step,
}: {
	index: number;
	onStepChange: (index: number, step: FunnelStepData) => void;
	step: FunnelStepData;
}): JSX.Element {
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
					value={step.latency_type}
					options={options}
					onChange={(e): void =>
						onStepChange(index, {
							...step,
							latency_type: e.target.value,
						})
					}
				/>
			</div>
		</div>
	);
}

export default InterStepConfig;
